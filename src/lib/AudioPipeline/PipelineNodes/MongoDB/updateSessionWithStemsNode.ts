import { NodeBuilder, PipelineNode } from '../../../DAGPipeline/DAGPipeline'
import { MoisesStemsJobResult, ProcessedAudioFile } from '../types'
import { updateComponentProgress, updateSessionWithStems as updateSessionWithStemsInDB } from '../../../db/audioSessionCollection'

/**
 * Updates the MongoDB session document with Moises stems file paths
 * @param inputs - The inputs array containing Moises stems results and processed audio file data
 * @returns The Moises stems results, unchanged
 */
async function updateWithStems(inputs: [MoisesStemsJobResult, ProcessedAudioFile]): Promise<MoisesStemsJobResult> {
	try {
		const [stemsResult, audioFileData] = inputs
		const { sessionId } = audioFileData

		try {
			// Create an object mapping stem names to their file paths
			const stemPaths: { [stemName: string]: string } = {
				Vocals: stemsResult.Vocals,
				Bass: stemsResult.Bass,
				Drums: stemsResult.Drums,
				Guitars: stemsResult.Guitars,
				Strings: stemsResult.Strings,
				Piano: stemsResult.Piano,
				Keys: stemsResult.Keys,
				Wind: stemsResult.Wind,
				Other: stemsResult.Other,
			}

			// Update the MongoDB document with stem file paths
			// Note: updateSessionWithStemsInDB already sets progress.stems to 'completed'
			await updateSessionWithStemsInDB(sessionId, stemPaths)

			console.log(`Updated MongoDB session ${sessionId} with Moises stems results`)
		} catch (dbError) {
			// If database update fails, mark as failed
			console.error(`Failed to update session ${sessionId} with stems:`, dbError)
			await updateComponentProgress(sessionId, 'stems', 'failed')
		}

		// Return the original stems results unchanged
		return stemsResult
	} catch (error) {
		console.error('Error updating MongoDB with Moises stems:', error)
		// Continue the pipeline despite DB errors
		return inputs[0]
	}
}

export const updateSessionWithStemsNode = new NodeBuilder<[MoisesStemsJobResult, ProcessedAudioFile], MoisesStemsJobResult>(
	'updateSessionWithStems',
	updateWithStems
)
	.dependsOn('moisesDownloadStemsJobResults', 'createSessionDocument')
	.build()
