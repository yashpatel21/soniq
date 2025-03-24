import { DAGPipeline } from '../utils/DAGPipeline/DAGPipeline'
import { processInputAudioNode, prepareAudioNode } from './PipelineNodes/AudioProcessing'
import { essentiaAnalysisNode } from './PipelineNodes/AudioAnalysis'
import {
	createSessionDocumentNode,
	updateSessionWithEssentiaNode,
	updateSessionWithStemsNode,
	updateCompletionStatusNode,
} from './PipelineNodes/MongoDB'
import { moisesUploadFileNode, moisesRunStemsJobNode, moisesDownloadStemsJobResultsNode } from './PipelineNodes/Moises'

// Singleton instance
let audioPipelineInstance: DAGPipeline | null = null

// Helper function to actually create the pipeline
function initializeAudioPipeline(): DAGPipeline {
	const pipeline = new DAGPipeline()

	// Add initial processing nodes
	pipeline.addNode(processInputAudioNode)
	pipeline.addNode(createSessionDocumentNode)

	// Add audio preparation node
	pipeline.addNode(prepareAudioNode)

	// Add Essentia analysis branch
	pipeline.addNode(essentiaAnalysisNode)
	pipeline.addNode(updateSessionWithEssentiaNode)

	// Add Moises stems extraction branch
	pipeline.addNode(moisesUploadFileNode)
	pipeline.addNode(moisesRunStemsJobNode)
	pipeline.addNode(moisesDownloadStemsJobResultsNode)
	pipeline.addNode(updateSessionWithStemsNode)

	// Add final node that marks the processing as complete
	pipeline.addNode(updateCompletionStatusNode)

	// Set the entry node explicitly
	pipeline.setEntryNode('processInputAudio')

	return pipeline
}

/**
 * Returns a singleton instance of the audio processing pipeline
 * @returns The shared DAGPipeline instance
 */
export function getAudioPipeline(): DAGPipeline {
	// In development, we want to recreate the pipeline on each call to allow for hot reloading
	if (process.env.NODE_ENV === 'development') {
		return initializeAudioPipeline()
	}

	// In production, use the singleton pattern
	if (!audioPipelineInstance) {
		audioPipelineInstance = initializeAudioPipeline()
		console.log('Audio Pipeline singleton initialized')
	}

	return audioPipelineInstance
}
