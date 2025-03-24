import { NodeBuilder, PipelineNode } from '../../../utils/DAGPipeline/DAGPipeline'
import { ProcessedAudioFile } from '../types'
import { createAudioSession } from '../../../utils/db/audioSessionCollection'

/**
 * Creates an initial MongoDB document for the audio processing session
 * @param audioFileData - The processed audio file data
 * @returns The same processed audio file data, unchanged
 */
async function createSessionDocument(audioFileData: ProcessedAudioFile): Promise<ProcessedAudioFile> {
	try {
		const { sessionId, filePath, sessionDir } = audioFileData

		// Create the initial session document with minimal information
		// Note: createAudioSession already sets status to 'processing'
		await createAudioSession({
			sessionId,
			filePath,
			sessionDir,
		})

		console.log(`Created MongoDB session document for ${sessionId}`)

		// Return the original data unchanged to continue the pipeline
		return audioFileData
	} catch (error) {
		console.error('Error creating MongoDB session document:', error)
		// Continue the pipeline despite DB errors
		return audioFileData
	}
}

export const createSessionDocumentNode: PipelineNode<ProcessedAudioFile, ProcessedAudioFile> = new NodeBuilder<
	ProcessedAudioFile,
	ProcessedAudioFile
>('createSessionDocument', createSessionDocument)
	.dependsOn('processInputAudio')
	.build()
