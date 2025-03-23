import * as esPkg from 'essentia.js'
import { NodeBuilder, PipelineNode } from '../../DAGPipeline/DAGPipeline'
import { EssentiaAnalysisResult, ProcessedAudioFile } from './types'
import { updateComponentProgress } from '../../db/audioSessionCollection'
import decode from 'audio-decode'

// Global variable to hold initialized essentia instance
let essentiaInstance: any = null

// Initialize essentia.js properly
async function initializeEssentia() {
	if (!essentiaInstance) {
		try {
			// Access the WASM module (it could be a direct module or function)
			let essentiaWasm = esPkg.EssentiaWASM

			// Create a new Essentia instance with the WASM backend
			essentiaInstance = new esPkg.Essentia(essentiaWasm)
			console.log('Essentia.js initialized successfully')
		} catch (error) {
			console.error('Failed to initialize Essentia.js:', error)
			throw error
		}
	}
	return essentiaInstance
}

/**
 * Decodes audio file using audio-decode library
 * @param buffer - The audio file buffer to decode
 * @returns A promise resolving to a decoded AudioBuffer
 */
async function decodeAudioFile(buffer: Buffer): Promise<any> {
	try {
		// Decode the audio file to get an AudioBuffer
		const audioBuffer = await decode(buffer)

		console.log(`Decoded audio: ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz, ${audioBuffer.length} samples`)

		return audioBuffer
	} catch (error) {
		console.error('Error decoding audio file:', error)
		throw error
	}
}

/**
 * Converts AudioBuffer to mono Float32Array by averaging all channels
 * @param audioBuffer - The AudioBuffer to convert
 * @returns Float32Array containing mono audio data
 */
function convertToMono(audioBuffer: any): Float32Array {
	// If already mono, return the channel data directly
	if (audioBuffer.numberOfChannels === 1) {
		return audioBuffer.getChannelData(0)
	}

	// Extract all channels
	const channels: Float32Array[] = []
	for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
		channels.push(audioBuffer.getChannelData(i))
	}

	// Mix down to mono by averaging all channels
	const monoData = new Float32Array(audioBuffer.length)
	for (let i = 0; i < audioBuffer.length; i++) {
		let sum = 0
		for (let c = 0; c < channels.length; c++) {
			sum += channels[c][i]
		}
		monoData[i] = sum / channels.length
	}

	return monoData
}

/**
 * Normalizes audio data to have peak amplitude of 1.0
 * @param audioData - Float32Array containing audio samples
 * @returns Normalized audio data
 */
function normalizeAudio(audioData: Float32Array): Float32Array {
	// Find the maximum absolute amplitude in the audio data
	let maxAmplitude = 0
	for (let i = 0; i < audioData.length; i++) {
		const absValue = Math.abs(audioData[i])
		if (absValue > maxAmplitude) {
			maxAmplitude = absValue
		}
	}

	// If the signal is already normalized or silent, return the original
	if (maxAmplitude === 0 || maxAmplitude >= 0.99) {
		return audioData
	}

	// Create a new array with normalized values
	const normalizedData = new Float32Array(audioData.length)
	const scaleFactor = 1.0 / maxAmplitude

	for (let i = 0; i < audioData.length; i++) {
		normalizedData[i] = audioData[i] * scaleFactor
	}

	console.log(`Audio normalized with scale factor: ${scaleFactor.toFixed(4)}`)
	return normalizedData
}

/**
 * Pipeline node that performs rhythm analysis and key detection on an audio file using Essentia
 * @param audioFile - The processed audio file to analyze
 * @returns A promise resolving to the Essentia analysis result
 */
async function essentiaAnalysis(audioFileData: ProcessedAudioFile): Promise<EssentiaAnalysisResult> {
	try {
		const { sessionId } = audioFileData

		// Update progress to indicate analysis is starting
		try {
			await updateComponentProgress(sessionId, 'essentia', 'processing')
		} catch (dbError) {
			console.error('Failed to update essentia progress status:', dbError)
			// Continue with analysis even if status update fails
		}

		// Initialize essentia if not already done
		const essentia = await initializeEssentia()

		// Decode the audio file
		const audioBuffer = await decodeAudioFile(audioFileData.audioFileBuffer)

		// Convert to mono
		const monoData = convertToMono(audioBuffer)

		// Normalize for better results
		const normalizedAudio = normalizeAudio(monoData)

		// Convert to Essentia vector format
		const audioSignal = essentia.arrayToVector(normalizedAudio)

		// Use Essentia's PercivalBpmEstimator for BPM detection
		console.log('Detecting BPM using Essentia PercivalBpmEstimator...')
		let bpm

		try {
			const bpmResult = essentia.PercivalBpmEstimator(audioSignal)
			bpm = bpmResult.bpm
			console.log(`Detected BPM with PercivalBpmEstimator: ${bpm.toFixed(2)}`)
		} catch (bpmError) {
			console.error('Error detecting BPM with Essentia:', bpmError)
			throw bpmError
		}

		// Run key detection with Essentia
		console.log('Running KeyExtractor with Essentia...')
		let key, scale

		try {
			const keyFeatures = essentia.KeyExtractor(audioSignal)
			key = keyFeatures.key
			scale = keyFeatures.scale
			console.log(`Detected key: ${key} ${scale}`)
		} catch (keyError) {
			console.error('Error detecting key with Essentia:', keyError)
			throw keyError
		}

		return {
			bpm,
			key,
			scale,
		} as EssentiaAnalysisResult
	} catch (error) {
		console.error('Error performing Essentia analysis:', error)

		// Mark as failed in database if possible
		try {
			await updateComponentProgress(audioFileData.sessionId, 'essentia', 'failed')
		} catch (dbError) {
			console.error('Failed to update essentia progress status after error:', dbError)
		}

		throw error
	}
}

export const essentiaAnalysisNode: PipelineNode<ProcessedAudioFile, EssentiaAnalysisResult> = new NodeBuilder<
	ProcessedAudioFile,
	EssentiaAnalysisResult
>('essentiaAnalysis', essentiaAnalysis)
	.dependsOn('createSessionDocument')
	.build()
