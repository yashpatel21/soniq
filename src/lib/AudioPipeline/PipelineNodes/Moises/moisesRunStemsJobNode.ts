import { Job } from 'moises/sdk'
import { NodeBuilder, PipelineNode } from '../../../DAGPipeline/DAGPipeline'
import { MoisesUploadResult } from '../types'
import moisesClient from './moisesClient'
import { updateComponentProgress } from '../../../db/audioSessionCollection'

/**
 * Pipeline node that runs a Moises stems job
 * @param moisesUploadResult - The Moises upload result
 * @returns The Moises stems job
 */
async function moisesRunStemsJob(moisesUploadResult: MoisesUploadResult): Promise<Job> {
	try {
		const { downloadUrl, sessionId } = moisesUploadResult

		// Add the job to Moises
		const jobId = await moisesClient.addJob(sessionId, 'soniq-dynamic-stem-separation', { inputUrl: downloadUrl })

		// Wait for the job to complete
		const job = await moisesClient.waitForJobCompletion(jobId)

		if (job.status != 'SUCCEEDED') {
			// Update progress to failed if job didn't succeed
			try {
				await updateComponentProgress(sessionId, 'stems', 'failed')
			} catch (dbError) {
				console.error('Failed to update stems progress status after job failure:', dbError)
			}
			throw new Error(`Moises stems job ${sessionId} failed with status ${job.status}`)
		}

		return job as Job
	} catch (error) {
		console.error('Error running Moises stems job:', error)

		// Ensure progress is marked as failed in case of any error
		try {
			await updateComponentProgress(moisesUploadResult.sessionId, 'stems', 'failed')
		} catch (dbError) {
			console.error('Failed to update stems progress status after error:', dbError)
		}

		throw error
	}
}

export const moisesRunStemsJobNode: PipelineNode<MoisesUploadResult, Job> = new NodeBuilder<MoisesUploadResult, Job>(
	'moisesRunStemsJob',
	moisesRunStemsJob
)
	.dependsOn('moisesUploadFile')
	.build()
