import { NodeBuilder } from '../../../utils/DAGPipeline/DAGPipeline'
import { MidiExtractionOutput } from '../MidiExtraction/extractMidiNode'
import MidiWriter from 'midi-writer-js'
import * as fs from 'fs/promises'
import * as path from 'path'
import { tmpdir } from 'os'
import { join } from 'path'

export interface MidiFileOutput extends MidiExtractionOutput {
	midiFilePath: string
}

/**
 * Pipeline node that generates a MIDI file from the extracted MIDI data
 */
export const generateMidiFileNode = new NodeBuilder<MidiExtractionOutput, MidiFileOutput>('generateMidiFile', async (input, context) => {
	const { sessionId, stemName, midiData } = input
	console.log(`Generating MIDI file for stem ${stemName}`)

	try {
		// Create a new MIDI track
		const track = new MidiWriter.Track()

		// Determine a reasonable timebase (ticks per beat) for precise timing
		const TICKS_PER_BEAT = 960

		console.log(`Processing ${midiData.notes.length} notes for MIDI generation`)

		// Track note statistics for debugging
		let totalDuration = 0
		let minDuration = Infinity
		let maxDuration = 0

		// Convert BasicPitch notes to MIDI events
		for (const note of midiData.notes) {
			try {
				// Validate note properties
				const pitch = typeof note.pitch === 'number' ? note.pitch : 60 // Default to middle C if invalid

				// Get duration in seconds
				const durationInSeconds = typeof note.duration === 'number' && !isNaN(note.duration) ? note.duration : 0.25

				// Track statistics
				totalDuration += durationInSeconds
				minDuration = Math.min(minDuration, durationInSeconds)
				maxDuration = Math.max(maxDuration, durationInSeconds)

				// Convert to MIDI duration in ticks (using a conversion factor of 1 second = 960 ticks)
				// This preserves actual durations without relying on tempo
				const durationInTicks = Math.max(
					TICKS_PER_BEAT / 16, // Minimum duration (1/16 note)
					Math.round(durationInSeconds * TICKS_PER_BEAT)
				)

				// Convert to timing string
				const durationString = `T${durationInTicks}`

				// Convert start time from seconds to ticks using the same conversion
				const startTimeInSeconds = typeof note.start_time === 'number' && !isNaN(note.start_time) ? note.start_time : 0
				const startTick = Math.round(startTimeInSeconds * TICKS_PER_BEAT)

				// Set velocity based on amplitude (with reasonable limits)
				const velocity =
					typeof note.amplitude === 'number' && !isNaN(note.amplitude)
						? Math.round(Math.min(100, Math.max(30, note.amplitude * 100)))
						: 80

				// Create note with validated properties
				const midiNote = new MidiWriter.NoteEvent({
					pitch: pitch,
					duration: durationString,
					startTick: startTick,
					velocity: velocity,
				})

				track.addEvent(midiNote)

				// Add pitch bends if available and valid
				if (note.pitch_bend && Array.isArray(note.pitch_bend) && note.pitch_bend.length > 0) {
					for (const bend of note.pitch_bend) {
						if (
							typeof bend === 'object' &&
							bend !== null &&
							typeof bend.bend === 'number' &&
							!isNaN(bend.bend) &&
							typeof bend.time === 'number' &&
							!isNaN(bend.time)
						) {
							// Add pitch bend events with validation
							const pitchBendEvent = new MidiWriter.PitchBendEvent({
								bend: Math.round(bend.bend * 8192),
								tick: Math.round((startTimeInSeconds + bend.time) * TICKS_PER_BEAT),
							})
							track.addEvent(pitchBendEvent)
						}
					}
				}
			} catch (noteError: unknown) {
				const errorMessage = noteError instanceof Error ? noteError.message : String(noteError)
				console.warn(`Skipping invalid note in ${stemName}: ${errorMessage}`)
			}
		}

		// Log duration statistics
		if (midiData.notes.length > 0) {
			const avgDuration = totalDuration / midiData.notes.length
			console.log(
				`Note duration stats - Min: ${minDuration.toFixed(3)}s, Max: ${maxDuration.toFixed(3)}s, Avg: ${avgDuration.toFixed(3)}s`
			)
		}

		// Create a write stream
		const write = new MidiWriter.Writer(track)

		// Use the same sessionDir as audio processing
		const sessionDir = join(tmpdir(), 'audio-processing', sessionId)

		// Create a midi subdirectory inside the sessionDir
		const midiDir = join(sessionDir, 'midi')
		await fs.mkdir(midiDir, { recursive: true })

		// Define the file path
		const fileName = `${stemName}.mid`
		const filePath = join(midiDir, fileName)

		// Write the MIDI file
		await fs.writeFile(filePath, Buffer.from(write.buildFile()))

		console.log(`MIDI file generated successfully: ${filePath}`)

		// Return the input data along with the MIDI file path
		return {
			...input,
			midiFilePath: filePath,
		}
	} catch (error) {
		console.error(`Error generating MIDI file for stem ${stemName}:`, error)
		const errorMessage = error instanceof Error ? error.message : String(error)
		throw new Error(`Failed to generate MIDI file for stem ${stemName}: ${errorMessage}`)
	}
})
	.dependsOn('extractMidi')
	.build()
