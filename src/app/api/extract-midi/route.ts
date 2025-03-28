import { NextRequest, NextResponse } from 'next/server'
import { getMidiPipeline } from '@/lib/MidiPipeline/MidiPipeline'
import fs from 'fs/promises'

// Force this route to use Node.js runtime, not Edge
export const runtime = 'nodejs'

/**
 * API route for extracting MIDI from audio stems
 * Receives session ID and stem name to identify which file to process
 */
export async function POST(request: NextRequest) {
	try {
		// Parse the request body to get sessionId and stemName
		const body = await request.json()
		const { sessionId, stemName } = body

		if (!sessionId || !stemName) {
			return NextResponse.json({ error: 'Missing required parameters: sessionId and stemName are required' }, { status: 400 })
		}

		// Log the request (for debugging)
		console.log(`Received MIDI extraction request for session ${sessionId}, stem: ${stemName}`)

		// Get the MIDI pipeline instance
		const midiPipeline = getMidiPipeline()

		// Execute the pipeline with the sessionId and stemName
		const result = await midiPipeline.execute({ sessionId, stemName })

		// Read the generated MIDI file
		const midiData = await fs.readFile(result.midiFilePath)

		// Return the MIDI file data along with metadata
		return new NextResponse(midiData, {
			status: 200,
			headers: {
				'Content-Type': 'audio/midi',
				'Content-Disposition': `attachment; filename="${stemName}.mid"`,
			},
		})
	} catch (error) {
		console.error('Error processing MIDI extraction:', error)
		return NextResponse.json({ error: 'Failed to process MIDI extraction request' }, { status: 500 })
	}
}
