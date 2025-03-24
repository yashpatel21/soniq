declare module 'essentia.js' {
	// EssentiaWASM could be either a direct module or a function
	export const EssentiaWASM: any

	// Key and scale types for better type safety
	export type KeyType = string
	export type ScaleType = 'major' | 'minor'

	// Rhythm extractor method type
	export type RhythmExtractorMethod = 'multifeature' | 'degara'

	// Rhythm extractor return type
	export interface RhythmExtractorResult {
		bpm: number
		ticks: number[]
		confidence: number
		estimates: number[]
		bpmIntervals: number[]
	}

	// Key extractor profile type
	export type KeyExtractorProfileType = 'bgate' | 'edma' | 'temperley' | 'krumhansl' | 'weich'

	// Key extractor weight type
	export type KeyExtractorWeightType = 'cosine' | 'linear' | 'none'

	// Key extractor window type
	export type KeyExtractorWindowType =
		| 'hamming'
		| 'hann'
		| 'triangular'
		| 'square'
		| 'blackmanharris62'
		| 'blackmanharris70'
		| 'blackmanharris74'
		| 'blackmanharris92'

	// Key extractor return type
	export interface KeyExtractorResult {
		key: string
		scale: 'major' | 'minor'
		strength: number
	}

	// PercivalBpmEstimator parameters interface
	export interface PercivalBpmEstimatorParams {
		frameSize?: number
		frameSizeOSS?: number
		hopSize?: number
		hopSizeOSS?: number
		maxBPM?: number
		minBPM?: number
		sampleRate?: number
	}

	// PercivalBpmEstimator return type
	export interface PercivalBpmEstimatorResult {
		bpm: number
	}

	// Essentia constructor
	export const Essentia: {
		new (wasmModule: any): {
			// Core methods
			arrayToVector(array: Float32Array): any
			vectorToArray(vector: any): Float32Array

			// Analysis algorithms
			PercivalBpmEstimator(
				signal: any,
				frameSize?: number,
				frameSizeOSS?: number,
				hopSize?: number,
				hopSizeOSS?: number,
				maxBPM?: number,
				minBPM?: number,
				sampleRate?: number
			): PercivalBpmEstimatorResult
			RhythmExtractor2013(signal: any, maxTempo?: number, method?: RhythmExtractorMethod, minTempo?: number): RhythmExtractorResult
			KeyExtractor(
				audio: any,
				averageDetuningCorrection?: boolean,
				frameSize?: number,
				hopSize?: number,
				hpcpSize?: number,
				maxFrequency?: number,
				maximumSpectralPeaks?: number,
				minFrequency?: number,
				pcpThreshold?: number,
				profileType?: KeyExtractorProfileType,
				sampleRate?: number,
				spectralPeaksThreshold?: number,
				tuningFrequency?: number,
				weightType?: KeyExtractorWeightType,
				windowType?: KeyExtractorWindowType
			): KeyExtractorResult

			// Allow other methods
			[key: string]: any
		}
	}

	export const EssentiaModel: any
	export const EssentiaExtractor: any
	export const EssentiaPlot: any
}
