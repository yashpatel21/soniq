import { NextRequest, NextResponse } from 'next/server'
import { getAudioSessionsCollection } from '@/lib/utils/db/audioSessionCollection'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'
import { existsSync } from 'fs'

// GET endpoint to get information about available stems
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
	try {
		const resolvedParams = await params
		if (!resolvedParams || !resolvedParams.sessionId) {
			return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
		}

		const sessionId = resolvedParams.sessionId
		const collection = await getAudioSessionsCollection()
		const session = await collection.findOne({ sessionId }, { projection: { stems: 1, 'progress.stems': 1, sessionDir: 1 } })

		if (!session) {
			return NextResponse.json({ error: 'Session not found' }, { status: 404 })
		}

		// Check if query parameter 'stem' exists to serve a specific stem file
		const url = new URL(request.url)
		const stemName = url.searchParams.get('stem')

		// If a specific stem is requested, stream the audio file
		if (stemName && session.stems && session.stems[stemName]) {
			const stemPath = session.stems[stemName]

			// Verify the file exists
			if (!existsSync(stemPath)) {
				return NextResponse.json({ error: 'Stem file not found' }, { status: 404 })
			}

			// Get file stats for content-length header
			const stat = statSync(stemPath)
			const fileSize = stat.size

			// Determine the content type based on file extension
			// Default to mp3 if can't determine
			let contentType = 'audio/mpeg'
			if (stemPath.endsWith('.wav')) contentType = 'audio/wav'
			if (stemPath.endsWith('.ogg')) contentType = 'audio/ogg'
			if (stemPath.endsWith('.m4a')) contentType = 'audio/m4a'

			// Handle range request for better audio streaming
			const range = request.headers.get('range')

			if (range) {
				const parts = range.replace(/bytes=/, '').split('-')
				const start = parseInt(parts[0], 10)
				const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

				// Ensure valid ranges
				const chunkSize = end - start + 1
				if (start >= fileSize || end >= fileSize) {
					// Return 416 Range Not Satisfiable if range is invalid
					return new NextResponse('Range Not Satisfiable', {
						status: 416,
						headers: {
							'Content-Range': `bytes */${fileSize}`,
						},
					})
				}

				// Create stream for the requested range
				const stream = createReadStream(stemPath, { start, end })

				// Return 206 Partial Content
				return new NextResponse(stream as any, {
					status: 206,
					headers: {
						'Content-Type': contentType,
						'Content-Length': chunkSize.toString(),
						'Content-Range': `bytes ${start}-${end}/${fileSize}`,
						'Accept-Ranges': 'bytes',
						'Cache-Control': 'public, max-age=3600',
					},
				})
			} else {
				// Return the full file if no range requested
				const stream = createReadStream(stemPath)

				return new NextResponse(stream as any, {
					headers: {
						'Content-Type': contentType,
						'Content-Length': fileSize.toString(),
						'Accept-Ranges': 'bytes',
						'Cache-Control': 'public, max-age=3600',
					},
				})
			}
		}

		// If no specific stem requested, return metadata about available stems
		return NextResponse.json({
			stems: session.stems
				? Object.keys(session.stems).reduce((acc, stemName) => {
						acc[stemName] = `/api/session/${sessionId}/stems?stem=${stemName}`
						return acc
				  }, {} as Record<string, string>)
				: undefined,
			status: session.progress?.stems || 'pending',
		})
	} catch (error) {
		console.error('Error fetching stems data:', error)
		return NextResponse.json({ error: 'Failed to fetch stems data' }, { status: 500 })
	}
}
