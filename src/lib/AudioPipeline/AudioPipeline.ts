import { DAGPipeline } from '../DAGPipeline/DAGPipeline'
import { processInputAudioNode } from './PipelineNodes/processInputAudioNode'
import { createSessionDocumentNode } from './PipelineNodes/MongoDB/createSessionDocumentNode'
import { essentiaAnalysisNode } from './PipelineNodes/essentiaAnalysisNode'
import { updateSessionWithEssentiaNode } from './PipelineNodes/MongoDB/updateSessionWithEssentiaNode'
import { moisesUploadFileNode } from './PipelineNodes/Moises/moisesUploadFileNode'
import { moisesRunStemsJobNode } from './PipelineNodes/Moises/moisesRunStemsJobNode'
import { moisesDownloadStemsJobResultsNode } from './PipelineNodes/Moises/moisesDownloadStemsJobResultsNode'
import { updateSessionWithStemsNode } from './PipelineNodes/MongoDB/updateSessionWithStemsNode'
import { updateCompletionStatusNode } from './PipelineNodes/MongoDB/updateCompletionStatusNode'

// Singleton instance
let audioPipelineInstance: DAGPipeline | null = null

// Helper function to actually create the pipeline
function initializeAudioPipeline(): DAGPipeline {
	const pipeline = new DAGPipeline()

	// Add initial processing nodes
	pipeline.addNode(processInputAudioNode)
	pipeline.addNode(createSessionDocumentNode)

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

// For backward compatibility
export function createAudioPipeline(): DAGPipeline {
	return getAudioPipeline()
}
