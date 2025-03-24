import { ObjectId } from 'mongodb'
import clientPromise from './mongoClient'

// Simplified status options - removing 'created' as it's immediately set to 'processing'
export type SessionStatus = 'processing' | 'completed' | 'failed'

// Progress tracking for different pipeline components
export interface ProcessingProgress {
	'audio-analysis': 'pending' | 'processing' | 'completed' | 'failed'
	stems: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface AudioSession {
	_id?: ObjectId
	sessionId: string
	filePath: string
	sessionDir: string
	createdAt: Date
	status: SessionStatus

	// Track progress of individual components
	progress: ProcessingProgress

	// Last update timestamp
	updatedAt: Date

	// Audio analysis results (added later)
	essentiaAnalysis?: {
		bpm: number
		key: string
		scale: string
	}

	// Moises stems results (added later)
	stems?: {
		[stemName: string]: string // Maps stem name to file path
	}
}

export async function getAudioSessionsCollection() {
	const client = await clientPromise
	const db = client.db('audio-processor')
	return db.collection<AudioSession>('sessions')
}

// Create a new session document
export async function createAudioSession(sessionData: Omit<AudioSession, '_id' | 'createdAt' | 'status' | 'progress' | 'updatedAt'>) {
	const collection = await getAudioSessionsCollection()
	const now = new Date()

	const result = await collection.insertOne({
		...sessionData,
		status: 'processing',
		progress: {
			'audio-analysis': 'pending',
			stems: 'pending',
		},
		createdAt: now,
		updatedAt: now,
	})
	return result
}

// Update session with Essentia analysis using atomic operations
export async function updateSessionWithEssentiaAnalysis(sessionId: string, essentiaAnalysis: AudioSession['essentiaAnalysis']) {
	const collection = await getAudioSessionsCollection()
	return collection.updateOne(
		{ sessionId },
		{
			$set: {
				essentiaAnalysis,
				'progress.audio-analysis': 'completed',
				updatedAt: new Date(),
			},
		}
	)
}

// Update session with Moises stems using atomic operations
export async function updateSessionWithStems(sessionId: string, stems: AudioSession['stems']) {
	const collection = await getAudioSessionsCollection()
	return collection.updateOne(
		{ sessionId },
		{
			$set: {
				stems,
				'progress.stems': 'completed',
				updatedAt: new Date(),
			},
		}
	)
}

// Update progress status of specific components
export async function updateComponentProgress(
	sessionId: string,
	component: keyof ProcessingProgress,
	status: ProcessingProgress[keyof ProcessingProgress]
) {
	const collection = await getAudioSessionsCollection()
	return collection.updateOne(
		{ sessionId },
		{
			$set: {
				[`progress.${component}`]: status,
				updatedAt: new Date(),
			},
		}
	)
}

// Update session status
export async function updateSessionStatus(sessionId: string, status: SessionStatus) {
	const collection = await getAudioSessionsCollection()
	return collection.updateOne(
		{ sessionId },
		{
			$set: {
				status,
				updatedAt: new Date(),
			},
		}
	)
}
