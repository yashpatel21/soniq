declare module 'essentia.js' {
	// EssentiaWASM could be either a direct module or a function
	export const EssentiaWASM: any

	// Key and scale types for better type safety
	export type KeyType = string
	export type ScaleType = 'major' | 'minor'

	// Rhythm extractor return type
	export interface RhythmExtractorResult {
		bpm: number
		confidence: number
		[key: string]: any
	}

	// Key extractor return type
	export interface KeyExtractorResult {
		key: string
		scale: 'major' | 'minor'
		keyConfidence: number
		[key: string]: any
	}

	// Essentia constructor
	export const Essentia: {
		new (wasmModule: any): {
			// Core methods
			arrayToVector(array: Float32Array): any
			vectorToArray(vector: any): Float32Array

			// Analysis algorithms
			RhythmExtractor2013(signal: any, ...args: any[]): RhythmExtractorResult
			KeyExtractor(signal: any, ...args: any[]): KeyExtractorResult

			// Allow other methods
			[key: string]: any
		}
	}

	export const EssentiaModel: any
	export const EssentiaExtractor: any
	export const EssentiaPlot: any
}
