import decode from 'audio-decode'
import { DecodedAudio } from './types'

/**
 * Decodes audio file using audio-decode library
 * @param buffer - The audio file buffer to decode
 * @returns A promise resolving to a decoded audio with metadata
 */
export async function decodeAudioBuffer(buffer: Buffer): Promise<DecodedAudio> {
	try {
		// Decode the audio file to get an AudioBuffer
		const audioBuffer = await decode(buffer)

		console.log(`Decoded audio: ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz, ${audioBuffer.length} samples`)

		return {
			buffer: audioBuffer,
			numberOfChannels: audioBuffer.numberOfChannels,
			sampleRate: audioBuffer.sampleRate,
			length: audioBuffer.length,
		}
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
export function convertToMono(audioBuffer: AudioBuffer): Float32Array {
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
export function normalizeAudio(audioData: Float32Array): Float32Array {
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
