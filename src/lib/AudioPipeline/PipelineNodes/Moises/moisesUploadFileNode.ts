import { NodeBuilder, PipelineNode } from '../../../DAGPipeline/DAGPipeline'
import { ProcessedAudioFile, MoisesUploadResult } from '../types'
import moisesClient from './moisesClient'
import { updateComponentProgress } from '../../../db/audioSessionCollection'

/**
 * Pipeline node that uploads an audio file to Moises
 * @param audioFile - The processed audio file to upload
 * @returns The Moises upload result
 */
async function moisesUploadFile(audioFileData: ProcessedAudioFile): Promise<MoisesUploadResult> {
	try {
		const { filePath, sessionId } = audioFileData

		// Update progress to indicate Moises processing is starting
		try {
			await updateComponentProgress(sessionId, 'stems', 'processing')
		} catch (dbError) {
			console.error('Failed to update stems progress status:', dbError)
			// Continue with upload even if status update fails
		}

		// Upload the file to Moises
		const downloadUrl = await moisesClient.uploadFile(filePath)

		return {
			downloadUrl,
			sessionId,
		} as MoisesUploadResult
	} catch (error) {
		console.error('Error uploading file to Moises:', error)

		// Mark as failed in database if possible
		try {
			await updateComponentProgress(audioFileData.sessionId, 'stems', 'failed')
		} catch (dbError) {
			console.error('Failed to update stems progress status after error:', dbError)
		}

		throw error
	}
}

export const moisesUploadFileNode: PipelineNode<ProcessedAudioFile, MoisesUploadResult> = new NodeBuilder<
	ProcessedAudioFile,
	MoisesUploadResult
>('moisesUploadFile', moisesUploadFile)
	.dependsOn('createSessionDocument')
	.build()
