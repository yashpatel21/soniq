import { NodeBuilder, PipelineNode } from '../../../utils/DAGPipeline/DAGPipeline'
import { ProcessedAudioFile, PreparedAudioData } from '../types'
import { decodeAudioBuffer, convertToMono, normalizeAudio } from '../../../utils/audio/audioProcessing'
import { updateComponentProgress } from '../../../utils/db/audioSessionCollection'

/**
 * Prepares audio for analysis by decoding, converting to mono, and normalizing.
 * This is a crucial step before any audio analysis can be performed.
 *
 * @param audioFileData - The processed audio file to prepare
 * @returns A promise resolving to prepared audio data ready for analysis
 */
async function prepareAudio(audioFileData: ProcessedAudioFile): Promise<PreparedAudioData> {
	try {
		const { sessionId } = audioFileData

		// Update progress to indicate audio preparation is starting
		// This marks the beginning of the audio analysis sub-pipeline
		try {
			await updateComponentProgress(sessionId, 'audio-analysis', 'processing')
		} catch (dbError) {
			console.error('Failed to update audio analysis progress status:', dbError)
			// Continue with preparation even if status update fails
		}

		// Decode the audio file
		const decodedAudio = await decodeAudioBuffer(audioFileData.audioFileBuffer)

		// Convert to mono
		const monoData = convertToMono(decodedAudio.buffer)

		// Normalize for better results
		const normalizedAudio = normalizeAudio(monoData)

		return {
			sessionId,
			audioData: normalizedAudio,
			sampleRate: decodedAudio.sampleRate,
			originalChannels: decodedAudio.numberOfChannels,
			length: decodedAudio.length,
		}
	} catch (error) {
		console.error('Error preparing audio for analysis:', error)

		// If error occurs, update progress to failed
		try {
			await updateComponentProgress(audioFileData.sessionId, 'audio-analysis', 'failed')
		} catch (dbError) {
			console.error('Failed to update audio analysis progress status after error:', dbError)
		}

		throw error
	}
}

/**
 * Pipeline node that prepares audio for analysis by decoding, converting to mono, and normalizing
 */
export const prepareAudioNode: PipelineNode<ProcessedAudioFile, PreparedAudioData> = new NodeBuilder<ProcessedAudioFile, PreparedAudioData>(
	'prepareAudio',
	prepareAudio
)
	.dependsOn('processInputAudio')
	.build()
