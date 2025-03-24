import { NextRequest, NextResponse } from 'next/server'
import { getAudioSessionsCollection } from '@/lib/utils/db/audioSessionCollection'

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
	try {
		const resolvedParams = await params
		if (!resolvedParams || !resolvedParams.sessionId) {
			return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
		}

		const sessionId = resolvedParams.sessionId

		const collection = await getAudioSessionsCollection()
		const session = await collection.findOne({ sessionId })

		if (!session) {
			return NextResponse.json({ error: 'Session not found' }, { status: 404 })
		}

		return NextResponse.json(session)
	} catch (error) {
		console.error('Error fetching session:', error)
		return NextResponse.json({ error: 'Failed to fetch session data' }, { status: 500 })
	}
}
