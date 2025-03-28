import { DAGPipeline } from '../utils/DAGPipeline/DAGPipeline'
import { fetchStemFilePathNode } from './PipelineNodes/MongoDB'
import { loadStemAudioNode } from './PipelineNodes/AudioProcessing'
import { extractMidiNode } from './PipelineNodes/MidiExtraction'
import { generateMidiFileNode } from './PipelineNodes/MidiFile'

// Singleton instance
let midiPipelineInstance: DAGPipeline | null = null

// Helper function to create the pipeline
function initializeMidiPipeline(): DAGPipeline {
	const pipeline = new DAGPipeline()

	// Add nodes to the pipeline
	pipeline.addNode(fetchStemFilePathNode)
	pipeline.addNode(loadStemAudioNode)
	pipeline.addNode(extractMidiNode)
	pipeline.addNode(generateMidiFileNode)

	// Set the entry node
	pipeline.setEntryNode('fetchStemFilePath')

	return pipeline
}

/**
 * Returns a singleton instance of the MIDI extraction pipeline
 * @returns The shared DAGPipeline instance
 */
export function getMidiPipeline(): DAGPipeline {
	// In development, recreate the pipeline on each call to allow for hot reloading
	if (process.env.NODE_ENV === 'development') {
		return initializeMidiPipeline()
	}

	// In production, use the singleton pattern
	if (!midiPipelineInstance) {
		midiPipelineInstance = initializeMidiPipeline()
		console.log('MIDI Pipeline singleton initialized')
	}

	return midiPipelineInstance
}
