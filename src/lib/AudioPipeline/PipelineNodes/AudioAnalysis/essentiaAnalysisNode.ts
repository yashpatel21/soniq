import { NodeBuilder, PipelineNode } from '../../../utils/DAGPipeline/DAGPipeline'
import { EssentiaAnalysisResult, PreparedAudioData } from '../types'
import { updateComponentProgress } from '../../../utils/db/audioSessionCollection'
import { detectBPM, detectKey } from '../../../utils/audio/audioAnalysis'
import { BpmDetectionAlgorithm, PercivalBpmParams, RhythmExtractorParams } from '../../../utils/audio/types'

/**
 * Pipeline node that performs rhythm analysis and key detection on prepared audio using Essentia
 * @param preparedAudioData - The prepared audio data ready for analysis
 * @returns A promise resolving to the Essentia analysis result
 */
async function essentiaAnalysis(preparedAudioData: PreparedAudioData): Promise<EssentiaAnalysisResult> {
	try {
		const { sessionId, audioData, sampleRate } = preparedAudioData

		// Set BPM detection algorithm (can be changed to 'rhythmextractor2013' if needed)
		const bpmAlgorithm: BpmDetectionAlgorithm = 'percival'

		// Configure BPM detection parameters (using defaults in this case)
		const percivalParams: PercivalBpmParams = {
			// Example of custom parameters (commented out as using defaults now)
			// minBPM: 60,
			// maxBPM: 200
		}

		const rhythmParams: RhythmExtractorParams = {
			// Example of custom parameters (commented out as using defaults now)
			// method: 'multifeature'
		}

		// Analyze audio features in parallel for efficiency
		const [bpm, keyResult] = await Promise.all([
			detectBPM(audioData, bpmAlgorithm, sampleRate, percivalParams, rhythmParams),
			detectKey(audioData, sampleRate),
		])

		return {
			bpm,
			key: keyResult.key,
			scale: keyResult.scale,
		} as EssentiaAnalysisResult
	} catch (error) {
		console.error('Error performing Essentia analysis:', error)

		// Mark as failed in database if possible
		try {
			await updateComponentProgress(preparedAudioData.sessionId, 'audio-analysis', 'failed')
		} catch (dbError) {
			console.error('Failed to update audio analysis progress status after error:', dbError)
		}

		throw error
	}
}

export const essentiaAnalysisNode: PipelineNode<PreparedAudioData, EssentiaAnalysisResult> = new NodeBuilder<
	PreparedAudioData,
	EssentiaAnalysisResult
>('essentiaAnalysis', essentiaAnalysis)
	.dependsOn('prepareAudio')
	.build()
