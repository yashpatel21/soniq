import { BasicPitch, noteFramesToTime, addPitchBendsToNoteEvents, outputToNotesPoly } from '@spotify/basic-pitch'
import { Midi } from '@tonejs/midi'

// Global Basic Pitch model instance
let basicPitchInstance: BasicPitch | null = null
let isModelLoading = false
let modelLoadPromise: Promise<void> | null = null

// Local model URL instead of CDN
const LOCAL_MODEL_URL = '/models/basic-pitch/model.json'

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

	console.log('Initializing BasicPitch...')
	isModelLoading = true

	try {
		// Create promise for model loading
		modelLoadPromise = (async () => {
			// Load BasicPitch with local model URL
			basicPitchInstance = new BasicPitch(LOCAL_MODEL_URL)
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

/**
 * Extracts MIDI data from an audio buffer using BasicPitch
 */
export async function extractMidiFromAudioBuffer(
	audioBuffer: AudioBuffer,
	stemName: string
): Promise<{ midiData: Uint8Array; midiObject: Midi }> {
	// Initialize BasicPitch
	const basicPitch = await initializeBasicPitch()

	// Arrays to store the output data
	const frames: number[][] = []
	const onsets: number[][] = []
	const contours: number[][] = []

	// Process the audio with BasicPitch
	await basicPitch.evaluateModel(
		audioBuffer,
		(f: number[][], o: number[][], c: number[][]) => {
			frames.push(...f)
			onsets.push(...o)
			contours.push(...c)
		},
		() => {} // Empty callback for progress
	)

	// Convert the output to note events
	const notes = noteFramesToTime(addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, 0.5, 0.3, 11)))

	console.log(`MIDI extraction complete, extracted ${notes.length} notes`)

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
					time: note.startTimeSeconds + (i * note.durationSeconds) / note.pitchBends!.length,
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
	stemName: string
): Promise<{ url: string; filename: string; midiObject: Midi }> {
	// Extract MIDI data
	const { midiData, midiObject } = await extractMidiFromAudioBuffer(audioBuffer, stemName)

	// Create blob and downloadable URL
	const blob = new Blob([midiData], { type: 'audio/midi' })
	const url = URL.createObjectURL(blob)
	const filename = `${stemName}.mid`

	return { url, filename, midiObject }
}
