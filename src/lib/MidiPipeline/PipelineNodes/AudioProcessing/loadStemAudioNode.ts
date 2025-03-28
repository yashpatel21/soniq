import { NodeBuilder } from '../../../utils/DAGPipeline/DAGPipeline'
import { decodeAudioFromFile } from '../../../utils/audio/audioProcessing'
import { StemInfoOutput } from '../MongoDB/fetchStemFilePathNode'

export interface StemAudioOutput extends StemInfoOutput {
	audioData: {
		buffer: AudioBuffer
		numberOfChannels: number
		sampleRate: number
		length: number
	}
}

/**
 * Pipeline node that loads and decodes audio data from the stem file path
 */
export const loadStemAudioNode = new NodeBuilder<StemInfoOutput, StemAudioOutput>('loadStemAudio', async (input, context) => {
	const { sessionId, stemName, filePath } = input
	console.log(`Loading audio data for stem ${stemName} from ${filePath}`)

	try {
		// Decode the audio file
		const audioData = await decodeAudioFromFile(filePath)

		// Return the input data along with the decoded audio
		return {
			sessionId,
			stemName,
			filePath,
			audioData,
		}
	} catch (error) {
		console.error(`Error loading audio for stem ${stemName}:`, error)
		const errorMessage = error instanceof Error ? error.message : String(error)
		throw new Error(`Failed to load audio for stem ${stemName}: ${errorMessage}`)
	}
})
	.dependsOn('fetchStemFilePath')
	.build()
