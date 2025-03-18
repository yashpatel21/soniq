import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		// Get the FormData from the request
		const formData = await request.formData()

		// Get the audio file from the FormData
		const audioFile = formData.get('audioFile') as File | null

		if (!audioFile) {
			return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
		}

		// Log the file name
		console.log('Received audio file:', audioFile.name)

		// Log file details for debugging
		console.log('File size:', audioFile.size, 'bytes')
		console.log('File type:', audioFile.type)

		// process the audio file here

		// for now, just returning a success response with some mock data
		return NextResponse.json({
			success: true,
			fileName: audioFile.name,
			message: 'File processed successfully',
			mockResults: {
				duration: 120, // seconds
				format: audioFile.type,
				fileSize: audioFile.size,
				timestamp: new Date().toISOString(),
			},
		})
	} catch (error) {
		console.error('Error processing audio file:', error)
		return NextResponse.json({ error: 'Failed to process audio file' }, { status: 500 })
	}
}
