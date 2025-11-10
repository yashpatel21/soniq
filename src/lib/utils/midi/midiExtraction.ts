import {
	BasicPitch,
	noteFramesToTime,
	addPitchBendsToNoteEvents,
	outputToNotesPoly,
} from '@spotify/basic-pitch'
import { Midi } from '@tonejs/midi'
import * as tf from '@tensorflow/tfjs'

// Global Basic Pitch model instance
let basicPitchInstance: BasicPitch | null = null
let isModelLoading = false
let modelLoadPromise: Promise<void> | null = null
let backendConfigured = false

// Local model URL instead of CDN
const LOCAL_MODEL_URL = '/models/basic-pitch/model.json'

/**
 * Checks if WebGL is available and functional
 */
function isWebGLSupported(): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	try {
		const canvas = document.createElement('canvas')
		const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
		if (!gl) {
			return false
		}

		// Test shader compilation
		const vertexShader = gl.createShader(gl.VERTEX_SHADER)
		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)

		if (!vertexShader || !fragmentShader) {
			return false
		}

		// Simple test shaders
		gl.shaderSource(vertexShader, 'attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}')
		gl.shaderSource(
			fragmentShader,
			'precision mediump float;void main(){gl_FragColor=vec4(1);}'
		)

		gl.compileShader(vertexShader)
		gl.compileShader(fragmentShader)

		const vertexOk = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)
		const fragmentOk = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)

		gl.deleteShader(vertexShader)
		gl.deleteShader(fragmentShader)

		return vertexOk && fragmentOk
	} catch (error) {
		console.warn('WebGL support check failed:', error)
		return false
	}
}

/**
 * Configures TensorFlow.js backend with WebGL fallback to CPU
 */
async function configureTensorFlowBackend(): Promise<void> {
	if (backendConfigured) {
		return
	}

	// Check WebGL support first
	const webglSupported = isWebGLSupported()

	if (webglSupported) {
		try {
			// Try to set WebGL backend first
			await tf.setBackend('webgl')
			await tf.ready()
			console.log('TensorFlow.js using WebGL backend')
		} catch (error) {
			console.warn('WebGL backend initialization failed, falling back to CPU:', error)
			await setCPUBackend()
		}
	} else {
		console.log('WebGL not supported, using CPU backend')
		await setCPUBackend()
	}

	backendConfigured = true
}

/**
 * Sets CPU backend for TensorFlow.js
 */
async function setCPUBackend(): Promise<void> {
	try {
		await tf.setBackend('cpu')
		await tf.ready()
		console.log('TensorFlow.js using CPU backend')
	} catch (cpuError) {
		console.error('Failed to initialize CPU backend:', cpuError)
		throw cpuError
	}
}

/**
 * Initializes the BasicPitch model if not already loaded
 */
export async function initializeBasicPitch(): Promise<BasicPitch> {
	if (basicPitchInstance) {
		return basicPitchInstance
	}

	if (isModelLoading && modelLoadPromise) {
		await modelLoadPromise
		return basicPitchInstance!
	}

	// console.log('Initializing BasicPitch...')
	isModelLoading = true

	try {
		// Create promise for model loading
		modelLoadPromise = (async () => {
			// Configure TensorFlow.js backend before initializing BasicPitch
			await configureTensorFlowBackend()

			// Load BasicPitch with local model URL
			basicPitchInstance = new BasicPitch(LOCAL_MODEL_URL)
			// console.log('BasicPitch instance created successfully')
		})()

		await modelLoadPromise
		return basicPitchInstance!
	} catch (error) {
		console.error('Failed to initialize BasicPitch model:', error)
		isModelLoading = false
		modelLoadPromise = null
		throw error
	}
}

/**
 * Extracts MIDI data from an audio buffer using BasicPitch
 */
export async function extractMidiFromAudioBuffer(
	audioBuffer: AudioBuffer,
	stemName: string,
	onsetThreshold: number = 0.5,
	frameThreshold: number = 0.3,
	minNoteLength: number = 11
): Promise<{ midiData: Uint8Array; midiObject: Midi }> {
	// Initialize BasicPitch
	const basicPitch = await initializeBasicPitch()

	// Arrays to store the output data
	const frames: number[][] = []
	const onsets: number[][] = []
	const contours: number[][] = []

	// Process the audio with BasicPitch with error handling for WebGL failures
	try {
		await basicPitch.evaluateModel(
			audioBuffer,
			(f: number[][], o: number[][], c: number[][]) => {
				frames.push(...f)
				onsets.push(...o)
				contours.push(...c)
			},
			() => {} // Empty callback for progress
		)
	} catch (error: any) {
		// Check if error is related to WebGL shader compilation
		const errorMessage = error?.message || String(error)
		const isWebGLError =
			errorMessage.includes('fragment shader') ||
			errorMessage.includes('Failed to compile') ||
			errorMessage.includes('WebGL') ||
			errorMessage.includes('shader')

		if (isWebGLError && tf.getBackend() === 'webgl') {
			console.warn(
				'WebGL error detected during evaluation, switching to CPU backend and retrying...',
				error
			)

			try {
				// Switch to CPU backend
				await setCPUBackend()

				// Reset BasicPitch instance to reinitialize with CPU backend
				basicPitchInstance = null
				isModelLoading = false
				modelLoadPromise = null
				backendConfigured = false

				// Reinitialize with CPU backend
				const basicPitchCPU = await initializeBasicPitch()

				// Clear arrays and retry
				frames.length = 0
				onsets.length = 0
				contours.length = 0

				// Retry evaluation with CPU backend
				await basicPitchCPU.evaluateModel(
					audioBuffer,
					(f: number[][], o: number[][], c: number[][]) => {
						frames.push(...f)
						onsets.push(...o)
						contours.push(...c)
					},
					() => {} // Empty callback for progress
				)

				console.log('Successfully processed with CPU backend')
			} catch (retryError) {
				console.error('Failed to process with CPU backend:', retryError)
				throw new Error(
					`MIDI extraction failed: ${
						retryError instanceof Error ? retryError.message : String(retryError)
					}`
				)
			}
		} else {
			// Re-throw if it's not a WebGL error or if we're already on CPU
			throw error
		}
	}

	// Convert the output to note events using the provided parameters
	const notes = noteFramesToTime(
		addPitchBendsToNoteEvents(
			contours,
			outputToNotesPoly(frames, onsets, onsetThreshold, frameThreshold, minNoteLength)
		)
	)

	// console.log(
	// 	`MIDI extraction complete, extracted ${notes.length} notes with parameters: onsetThreshold=${onsetThreshold}, frameThreshold=${frameThreshold}, minNoteLength=${minNoteLength}`
	// )

	// Create MIDI file using Tone.js/MIDI
	const midi = new Midi()
	const track = midi.addTrack()

	// Set track name
	track.name = stemName

	// Add notes to the track
	notes.forEach((note) => {
		track.addNote({
			midi: note.pitchMidi,
			time: note.startTimeSeconds,
			duration: note.durationSeconds,
			velocity: note.amplitude,
		})
		if (note.pitchBends && note.pitchBends.length > 0) {
			note.pitchBends.forEach((bend, i) => {
				track.addPitchBend({
					time:
						note.startTimeSeconds +
						(i * note.durationSeconds) / note.pitchBends!.length,
					value: bend,
				})
			})
		}
	})

	// Convert to binary MIDI data
	return {
		midiData: new Uint8Array(midi.toArray()),
		midiObject: midi,
	}
}

/**
 * Creates a downloadable MIDI file from an audio buffer
 */
export async function createDownloadableMidiFromAudioBuffer(
	audioBuffer: AudioBuffer,
	stemName: string,
	onsetThreshold: number = 0.5,
	frameThreshold: number = 0.3,
	minNoteLength: number = 11
): Promise<{ url: string; filename: string; midiObject: Midi }> {
	// Extract MIDI data with the provided parameters
	const { midiData, midiObject } = await extractMidiFromAudioBuffer(
		audioBuffer,
		stemName,
		onsetThreshold,
		frameThreshold,
		minNoteLength
	)

	// Create blob and downloadable URL
	const blob = new Blob([midiData as BlobPart], { type: 'audio/midi' })
	const url = URL.createObjectURL(blob)
	const filename = `${stemName}.mid`

	return { url, filename, midiObject }
}
