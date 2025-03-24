import { Job } from 'moises/sdk'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { ExecutionContext, PipelineNode, createMergeNode } from '../../../utils/DAGPipeline/DAGPipeline'
import { ProcessedAudioFile, MoisesStemsJobResult } from '../types'
import moisesClient from '../../../utils/moises/moisesClient'
import { updateComponentProgress } from '../../../utils/db/audioSessionCollection'

/**
 * Download the stems job results from Moises
 * @param inputs - The inputs to the node
 * @returns The files downloaded from Moises
 */
async function moisesDownloadStemsJobResults(inputs: any[]): Promise<MoisesStemsJobResult> {
	try {
		const [moisesJob, audioFileData] = inputs as [Job, ProcessedAudioFile]
		const { sessionDir, sessionId } = audioFileData

		// create the stems directory
		const stemsDir = join(sessionDir, 'stems')
		await mkdir(stemsDir, { recursive: true })

		// download the stems job results
		const files = await moisesClient.downloadJobResults(moisesJob, stemsDir)

		// delete the stems job
		await moisesClient.deleteJob(moisesJob.id)

		return files as unknown as MoisesStemsJobResult
	} catch (error) {
		console.error('Error downloading stems job results:', error)

		// Mark stems processing as failed in case of download error
		try {
			const { sessionId } = inputs[1] as ProcessedAudioFile
			await updateComponentProgress(sessionId, 'stems', 'failed')
		} catch (dbError) {
			console.error('Failed to update stems progress status after download error:', dbError)
		}

		throw error
	}
}

export const moisesDownloadStemsJobResultsNode = createMergeNode<MoisesStemsJobResult>(
	'moisesDownloadStemsJobResults',
	['moisesRunStemsJob', 'createSessionDocument'],
	moisesDownloadStemsJobResults
)
