import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAudioPipeline } from '@/lib/AudioPipeline/AudioPipeline'

export async function POST(request: NextRequest) {
	try {
		// Get the FormData from the request
		const formData = await request.formData()

		// Get the audio file from the FormData
		const audioFile = formData.get('audioFile') as File | null

		if (!audioFile) {
			return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
		}

		// Generate a session ID
		const sessionId = uuidv4()

		// Get the singleton pipeline instance
		const pipeline = getAudioPipeline()

		// Start the pipeline in the background with our pre-generated sessionId
		// We don't await this - it runs in the background
		pipeline.execute({ file: audioFile, sessionId }).catch((error) => {
			console.error('Background pipeline processing error:', error)
		})

		// Return the session ID immediately
		return NextResponse.json({
			success: true,
			sessionId,
			message: 'File upload successful. Processing started.',
		})
	} catch (error) {
		console.error('Error processing audio file:', error)
		return NextResponse.json({ error: 'Failed to process audio file' }, { status: 500 })
	}
}
