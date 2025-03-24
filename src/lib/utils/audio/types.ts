/**
 * Interface for decoded audio buffer with essential properties
 */
export interface DecodedAudio {
	buffer: AudioBuffer
	numberOfChannels: number
	sampleRate: number
	length: number
}

/**
 * BPM detection algorithm options
 */
export type BpmDetectionAlgorithm = 'percival' | 'rhythmextractor2013'

/**
 * Interface for PercivalBpmEstimator parameters
 */
export interface PercivalBpmParams {
	frameSize?: number
	frameSizeOSS?: number
	hopSize?: number
	hopSizeOSS?: number
	maxBPM?: number
	minBPM?: number
}

/**
 * Interface for RhythmExtractor2013 parameters
 */
export interface RhythmExtractorParams {
	maxTempo?: number
	method?: 'multifeature' | 'degara'
	minTempo?: number
}

/**
 * Interface for key detection result
 */
export interface KeyDetectionResult {
	key: string
	scale: string
}

/**
 * Interface for KeyExtractor configuration parameters
 */
export interface KeyExtractorParams {
	averageDetuningCorrection?: boolean
	frameSize?: number
	hopSize?: number
	hpcpSize?: number
	maxFrequency?: number
	maximumSpectralPeaks?: number
	minFrequency?: number
	pcpThreshold?: number
	profileType?: string
	spectralPeaksThreshold?: number
	tuningFrequency?: number
	weightType?: string
	windowType?: string
}
