import { getEssentiaInstance } from './essentiaClient'
import { BpmDetectionAlgorithm, PercivalBpmParams, RhythmExtractorParams, KeyDetectionResult, KeyExtractorParams } from './types'

/**
 * Detect BPM (tempo) from audio data using selected algorithm
 * @param audioData - Float32Array of mono audio samples
 * @param algorithm - Which algorithm to use ('percival' or 'rhythmextractor2013')
 * @param sampleRate - Sample rate of the audio (default: 44100)
 * @param percivalParams - Optional parameters for PercivalBpmEstimator
 * @param rhythmParams - Optional parameters for RhythmExtractor2013
 * @returns Detected BPM value
 */
export async function detectBPM(
	audioData: Float32Array,
	algorithm: BpmDetectionAlgorithm = 'percival',
	sampleRate: number = 44100,
	percivalParams: PercivalBpmParams = {},
	rhythmParams: RhythmExtractorParams = {}
): Promise<number> {
	const essentia = await getEssentiaInstance()

	// Convert to Essentia vector format
	const audioSignal = essentia.arrayToVector(audioData)
	let bpm: number

	if (algorithm === 'percival') {
		console.log('Detecting BPM using Essentia PercivalBpmEstimator...')
		try {
			// Set up parameters with defaults if not provided
			const params = {
				frameSize: percivalParams.frameSize ?? 1024,
				frameSizeOSS: percivalParams.frameSizeOSS ?? 2048,
				hopSize: percivalParams.hopSize ?? 128,
				hopSizeOSS: percivalParams.hopSizeOSS ?? 128,
				maxBPM: percivalParams.maxBPM ?? 210,
				minBPM: percivalParams.minBPM ?? 50,
				sampleRate: sampleRate,
			}

			const bpmResult = essentia.PercivalBpmEstimator(
				audioSignal,
				params.frameSize,
				params.frameSizeOSS,
				params.hopSize,
				params.hopSizeOSS,
				params.maxBPM,
				params.minBPM,
				params.sampleRate
			)
			bpm = bpmResult.bpm
			console.log(`Detected BPM with PercivalBpmEstimator: ${bpm.toFixed(2)}`)
		} catch (bpmError) {
			console.error('Error detecting BPM with PercivalBpmEstimator:', bpmError)
			throw bpmError
		}
	} else {
		console.log('Detecting BPM using Essentia RhythmExtractor2013...')
		try {
			// Set up parameters with defaults if not provided
			const params = {
				maxTempo: rhythmParams.maxTempo ?? 208,
				method: rhythmParams.method ?? 'multifeature',
				minTempo: rhythmParams.minTempo ?? 40,
			}

			// Use RhythmExtractor2013 with configured parameters
			const rhythmResult = essentia.RhythmExtractor2013(audioSignal, params.maxTempo, params.method, params.minTempo)
			bpm = rhythmResult.bpm
			console.log(`Detected BPM with RhythmExtractor2013: ${bpm.toFixed(2)}`)
		} catch (bpmError) {
			console.error('Error detecting BPM with RhythmExtractor2013:', bpmError)
			throw bpmError
		}
	}

	return bpm
}

/**
 * Detect musical key from audio data
 * @param audioData - Float32Array of mono audio samples
 * @param sampleRate - Sample rate of the audio
 * @param params - Optional parameters for KeyExtractor
 * @returns Object with detected key and scale
 */
export async function detectKey(
	audioData: Float32Array,
	sampleRate: number = 44100,
	params: KeyExtractorParams = {}
): Promise<KeyDetectionResult> {
	const essentia = await getEssentiaInstance()

	// Convert to Essentia vector format
	const audioSignal = essentia.arrayToVector(audioData)

	console.log('Running KeyExtractor with Essentia...')

	try {
		// Set up parameters with defaults if not provided
		const keyExtractorParams = {
			// Pass the sample rate from the audio data
			sampleRate: sampleRate,
			// Default parameters
			averageDetuningCorrection: params.averageDetuningCorrection ?? true,
			frameSize: params.frameSize ?? 4096,
			hopSize: params.hopSize ?? 4096,
			hpcpSize: params.hpcpSize ?? 12,
			maxFrequency: params.maxFrequency ?? 3500,
			maximumSpectralPeaks: params.maximumSpectralPeaks ?? 60,
			minFrequency: params.minFrequency ?? 25,
			pcpThreshold: params.pcpThreshold ?? 0.2,
			profileType: params.profileType ?? 'bgate',
			spectralPeaksThreshold: params.spectralPeaksThreshold ?? 0.0001,
			tuningFrequency: params.tuningFrequency ?? 440,
			weightType: params.weightType ?? 'cosine',
			windowType: params.windowType ?? 'hann',
		}

		const keyFeatures = essentia.KeyExtractor(
			audioSignal,
			keyExtractorParams.averageDetuningCorrection,
			keyExtractorParams.frameSize,
			keyExtractorParams.hopSize,
			keyExtractorParams.hpcpSize,
			keyExtractorParams.maxFrequency,
			keyExtractorParams.maximumSpectralPeaks,
			keyExtractorParams.minFrequency,
			keyExtractorParams.pcpThreshold,
			keyExtractorParams.profileType,
			keyExtractorParams.sampleRate,
			keyExtractorParams.spectralPeaksThreshold,
			keyExtractorParams.tuningFrequency,
			keyExtractorParams.weightType,
			keyExtractorParams.windowType
		)

		const key = keyFeatures.key
		const scale = keyFeatures.scale
		console.log(`Detected key: ${key} ${scale}`)

		return {
			key,
			scale,
		}
	} catch (keyError) {
		console.error('Error detecting key with Essentia:', keyError)
		throw keyError
	}
}
