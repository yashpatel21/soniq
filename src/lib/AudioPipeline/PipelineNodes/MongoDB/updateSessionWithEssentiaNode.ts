import { NodeBuilder, PipelineNode } from '../../../DAGPipeline/DAGPipeline'
import { EssentiaAnalysisResult, ProcessedAudioFile } from '../types'
import { updateComponentProgress, updateSessionWithEssentiaAnalysis } from '../../../db/audioSessionCollection'

/**
 * Updates the MongoDB session document with Essentia analysis results
 * @param inputs - The inputs array containing Essentia results and processed audio file data
 * @returns The Essentia analysis results, unchanged
 */
async function updateSessionWithEssentia(inputs: any[]): Promise<EssentiaAnalysisResult> {
	try {
		const [essentiaResults, audioFileData] = inputs as [EssentiaAnalysisResult, ProcessedAudioFile]
		const { sessionId } = audioFileData

		try {
			// Update the MongoDB document with Essentia analysis results
			// Note: updateSessionWithEssentiaAnalysis already sets progress.essentia to 'completed'
			await updateSessionWithEssentiaAnalysis(sessionId, {
				bpm: essentiaResults.bpm,
				key: essentiaResults.key,
				scale: essentiaResults.scale,
			})

			console.log(`Updated MongoDB session ${sessionId} with Essentia analysis results`)
		} catch (dbError) {
			// If database update fails, mark as failed
			console.error(`Failed to update session ${sessionId} with Essentia results:`, dbError)
			await updateComponentProgress(sessionId, 'essentia', 'failed')
		}

		// Return the original Essentia results unchanged
		return essentiaResults
	} catch (error) {
		console.error('Error updating MongoDB with Essentia results:', error)
		// Continue the pipeline despite DB errors
		return inputs[0] as EssentiaAnalysisResult
	}
}

export const updateSessionWithEssentiaNode = new NodeBuilder<[EssentiaAnalysisResult, ProcessedAudioFile], EssentiaAnalysisResult>(
	'updateSessionWithEssentia',
	updateSessionWithEssentia
)
	.dependsOn('essentiaAnalysis', 'createSessionDocument')
	.build()
