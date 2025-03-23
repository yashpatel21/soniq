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
		const session = await collection.findOne({ sessionId }, { projection: { essentiaAnalysis: 1, 'progress.essentia': 1 } })

		if (!session) {
			return NextResponse.json({ error: 'Session not found' }, { status: 404 })
		}

		return NextResponse.json({
			essentiaAnalysis: session.essentiaAnalysis,
			status: session.progress?.essentia || 'pending',
		})
	} catch (error) {
		console.error('Error fetching essentia data:', error)
		return NextResponse.json({ error: 'Failed to fetch essentia data' }, { status: 500 })
	}
}
