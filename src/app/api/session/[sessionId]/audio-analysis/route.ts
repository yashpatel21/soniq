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
		const session = await collection.findOne({ sessionId }, { projection: { essentiaAnalysis: 1, 'progress.audio-analysis': 1 } })

		if (!session) {
			return NextResponse.json({ error: 'Session not found' }, { status: 404 })
		}

		return NextResponse.json({
			analysisResults: session.essentiaAnalysis,
			status: session.progress?.['audio-analysis'] || 'pending',
		})
	} catch (error) {
		console.error('Error fetching audio analysis data:', error)
		return NextResponse.json({ error: 'Failed to fetch audio analysis data' }, { status: 500 })
	}
}
