import { NextRequest, NextResponse } from 'next/server'
import { getAudioSessionsCollection } from '@/lib/db/audioSessionCollection'

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
	try {
		const resolvedParams = await params
		if (!resolvedParams || !resolvedParams.sessionId) {
			return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
		}

		const sessionId = resolvedParams.sessionId

		const collection = await getAudioSessionsCollection()
		const session = await collection.findOne({ sessionId }, { projection: { stems: 1, 'progress.stems': 1 } })

		if (!session) {
			return NextResponse.json({ error: 'Session not found' }, { status: 404 })
		}

		return NextResponse.json({
			stems: session.stems,
			status: session.progress?.stems || 'pending',
		})
	} catch (error) {
		console.error('Error fetching stems data:', error)
		return NextResponse.json({ error: 'Failed to fetch stems data' }, { status: 500 })
	}
}
