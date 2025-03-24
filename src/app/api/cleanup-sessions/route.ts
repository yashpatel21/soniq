import { NextRequest, NextResponse } from 'next/server'
import { rm } from 'fs/promises'
import { getAudioSessionsCollection } from '@/lib/utils/db/audioSessionCollection'

// Simple API key check for security
const API_KEY = process.env.CLEANUP_API_KEY

export async function POST(req: NextRequest) {
	try {
		// Verify API key from authorization header
		const authHeader = req.headers.get('authorization')
		if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Get the collection
		const collection = await getAudioSessionsCollection()

		// Calculate the date 24 hours ago
		const oneDayAgo = new Date()
		oneDayAgo.setHours(oneDayAgo.getHours() - 24)

		// Find all sessions older than 24 hours
		const oldSessions = await collection
			.find({
				createdAt: { $lt: oneDayAgo },
			})
			.toArray()

		console.log(`Found ${oldSessions.length} sessions to clean up`)

		// Prepare deletion results
		const results = {
			totalProcessed: oldSessions.length,
			filesDeleted: 0,
			documentsDeleted: 0,
			errors: [] as string[],
		}

		// Process each session
		for (const session of oldSessions) {
			try {
				// Delete the session directory and all files inside it
				if (session.sessionDir) {
					await rm(session.sessionDir, { recursive: true, force: true })
					results.filesDeleted++
				}

				// Delete the session document from MongoDB
				await collection.deleteOne({ sessionId: session.sessionId })
				results.documentsDeleted++
			} catch (error) {
				const errorMsg = `Error cleaning up session ${session.sessionId}: ${(error as Error).message}`
				console.error(errorMsg)
				results.errors.push(errorMsg)
			}
		}

		return NextResponse.json({
			success: true,
			...results,
		})
	} catch (error) {
		console.error('Session cleanup failed:', error)
		return NextResponse.json({ error: 'Session cleanup failed', message: (error as Error).message }, { status: 500 })
	}
}
