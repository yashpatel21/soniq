import { NodeBuilder } from '../../../utils/DAGPipeline/DAGPipeline'
import { StemAudioOutput } from '../AudioProcessing/loadStemAudioNode'
import { BasicPitch, noteFramesToTime, addPitchBendsToNoteEvents, outputToNotesPoly } from '@spotify/basic-pitch'
import { resampleAudio, convertToMono } from '../../../utils/audio/audioProcessing'
// Use the core TensorFlow.js package instead of the Node-specific one
import * as tf from '@tensorflow/tfjs'

// We'll load the model dynamically
let basicPitchInstance: BasicPitch | null = null
// Track model loading state
let isModelLoading = false
let modelLoadPromise: Promise<void> | null = null

// Default model URL from BasicPitch
const DEFAULT_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@spotify/basic-pitch/model/model.json'

/**
 * Initializes the BasicPitch model if not already loaded
 */
async function initializeBasicPitch() {
	if (basicPitchInstance) {
		return basicPitchInstance
	}

	if (isModelLoading && modelLoadPromise) {
		await modelLoadPromise
		return basicPitchInstance!
	}

	console.log('Initializing BasicPitch...')
	isModelLoading = true

	try {
		// Create promise for model loading
		modelLoadPromise = (async () => {
			// Load BasicPitch with the default model URL
			basicPitchInstance = new BasicPitch(DEFAULT_MODEL_URL)
			console.log('BasicPitch instance created successfully')
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

export interface MidiExtractionOutput extends StemAudioOutput {
	midiData: {
		notes: any[]
		frameRate: number
	}
}

/**
 * Creates a simple mono AudioBuffer from a Float32Array
 * @param monoData - Float32Array of mono audio samples
 * @param sampleRate - Sample rate of the audio
 * @returns AudioBuffer-like object with mono audio
 */
function createMonoBuffer(monoData: Float32Array, sampleRate: number): AudioBuffer {
	return {
		numberOfChannels: 1,
		length: monoData.length,
		sampleRate: sampleRate,
		duration: monoData.length / sampleRate,
		getChannelData: function (channel: number) {
			if (channel === 0) return monoData
			throw new Error(`Invalid channel index: ${channel}`)
		},
		_channelData: [monoData],
	} as unknown as AudioBuffer
}

/**
 * Pipeline node that extracts MIDI data from audio using Spotify's BasicPitch
 */
export const extractMidiNode = new NodeBuilder<StemAudioOutput, MidiExtractionOutput>('extractMidi', async (input, context) => {
	const { sessionId, stemName, filePath, audioData } = input
	console.log(`Extracting MIDI data from stem ${stemName}`)

	try {
		// First convert to mono if needed
		let processableBuffer = audioData.buffer

		if (processableBuffer.numberOfChannels > 1) {
			console.log(`Converting ${processableBuffer.numberOfChannels} channels to mono for ${stemName}`)
			const monoData = convertToMono(processableBuffer)
			processableBuffer = createMonoBuffer(monoData, processableBuffer.sampleRate)
		}

		// Check sample rate and resample if needed
		const BASIC_PITCH_SAMPLE_RATE = 22050

		if (processableBuffer.sampleRate !== BASIC_PITCH_SAMPLE_RATE) {
			console.log(
				`Resampling audio from ${processableBuffer.sampleRate}Hz to ${BASIC_PITCH_SAMPLE_RATE}Hz for BasicPitch compatibility`
			)
			try {
				// Use server-compatible resampling function
				processableBuffer = resampleAudio(processableBuffer, BASIC_PITCH_SAMPLE_RATE)
			} catch (resampleError) {
				console.error(`Error resampling audio: ${resampleError}`)
				throw new Error(`Failed to resample audio for MIDI extraction: ${resampleError}`)
			}
		}

		// Initialize BasicPitch model
		const pitchModel = await initializeBasicPitch()

		// Arrays to store the output data
		const frames: number[][] = []
		const onsets: number[][] = []
		const contours: number[][] = []
		let progress = 0

		// Process the audio with BasicPitch
		await pitchModel.evaluateModel(
			processableBuffer, // Use the mono, resampled buffer
			(f: number[][], o: number[][], c: number[][]) => {
				frames.push(...f)
				onsets.push(...o)
				contours.push(...c)
			},
			(p: number) => {
				progress = p
				if (p % 10 === 0) console.log(`MIDI extraction progress: ${p}%`)
			}
		)

		// Calculate frame rate - essential for timing
		const frameRate = BASIC_PITCH_SAMPLE_RATE / 512 // BasicPitch uses 512 samples per frame

		// BasicPitch parameters for note detection:
		// - onset_threshold: 0.5 (higher = fewer false positives but might miss quiet notes)
		// - frame_threshold: 0.3 (higher = more sustained notes required to detect a note)
		// - min_note_length: 1 (minimum number of frames for a note)
		//
		// For piano/sustained instruments, we want to be more lenient with frame threshold
		const onsetThreshold = stemName.toLowerCase().includes('drum') ? 0.5 : 0.4
		const frameThreshold =
			stemName.toLowerCase().includes('piano') || stemName.toLowerCase().includes('bass') || stemName.toLowerCase().includes('synth')
				? 0.1
				: 0.2
		const minNoteLength = 3 // At least 3 frames (more robust note detection)

		// Convert the output to note events with adjusted parameters
		const notes = noteFramesToTime(
			addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, onsetThreshold, frameThreshold, minNoteLength))
		)

		console.log(`MIDI extraction complete for ${stemName}, extracted ${notes.length} notes`)

		return {
			sessionId,
			stemName,
			filePath,
			audioData,
			midiData: {
				notes,
				frameRate: frameRate, // Use correct frame rate for timing
			},
		}
	} catch (error) {
		console.error(`Error extracting MIDI for stem ${stemName}:`, error)
		const errorMessage = error instanceof Error ? error.message : String(error)
		throw new Error(`Failed to extract MIDI for stem ${stemName}: ${errorMessage}`)
	}
})
	.dependsOn('loadStemAudio')
	.build()
