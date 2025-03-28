import { NodeBuilder } from '../../../utils/DAGPipeline/DAGPipeline'
import { getAudioSessionsCollection } from '../../../utils/db/audioSessionCollection'

export interface StemInfoInput {
	sessionId: string
	stemName: string
}

export interface StemInfoOutput {
	sessionId: string
	stemName: string
	filePath: string
}

/**
 * Pipeline node that fetches a stem file path from MongoDB based on sessionId and stemName
 */
export const fetchStemFilePathNode = new NodeBuilder<StemInfoInput, StemInfoOutput>('fetchStemFilePath', async (input, context) => {
	const { sessionId, stemName } = input
	console.log(`Fetching stem file path for session ${sessionId}, stem: ${stemName}`)

	// Get the sessions collection
	const collection = await getAudioSessionsCollection()

	// Find the session document
	const session = await collection.findOne({ sessionId })

	if (!session) {
		throw new Error(`Session ${sessionId} not found in database`)
	}

	// Check if stems are available
	if (!session.stems || Object.keys(session.stems).length === 0) {
		throw new Error(`No stems found for session ${sessionId}`)
	}

	// Check if the requested stem exists
	if (!session.stems[stemName]) {
		throw new Error(`Stem '${stemName}' not found for session ${sessionId}`)
	}

	// Return the input data along with the file path
	return {
		sessionId,
		stemName,
		filePath: session.stems[stemName],
	}
}).build()
