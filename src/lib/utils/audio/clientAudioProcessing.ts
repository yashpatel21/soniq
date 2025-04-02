import WaveSurfer from 'wavesurfer.js'

/**
 * Converts WaveSurfer audio to mono and resamples to 22050Hz
 * Uses the Web Audio API's OfflineAudioContext for high-quality processing
 *
 * @param wavesurfer - The WaveSurfer instance with loaded audio
 * @returns A promise that resolves to a new mono AudioBuffer at 22050Hz
 */
export async function convertToMonoAndResample(wavesurfer: WaveSurfer): Promise<AudioBuffer> {
	// Get the original audio buffer from WaveSurfer
	const originalBuffer = wavesurfer.getDecodedData()

	if (!originalBuffer) {
		throw new Error('No audio data found in WaveSurfer')
	}

	// Get original buffer properties
	const originalSampleRate = originalBuffer.sampleRate
	const originalChannels = originalBuffer.numberOfChannels
	const targetSampleRate = 22050

	// Log original properties
	// console.log(`Original audio: ${originalChannels} channels at ${originalSampleRate}Hz`)

	// Calculate the new length after resampling
	const duration = originalBuffer.duration
	const newLength = Math.round(duration * targetSampleRate)

	// Create an offline audio context for processing
	// Setting 1 channel ensures mono output
	const offlineContext = new OfflineAudioContext(
		1, // mono (1 channel)
		newLength,
		targetSampleRate
	)

	// Create a buffer source
	const source = offlineContext.createBufferSource()
	source.buffer = originalBuffer

	// Connect source to destination
	// The offline context is mono by default when created with 1 channel,
	// so this automatically handles the stereo-to-mono conversion
	source.connect(offlineContext.destination)

	// Start the source
	source.start(0)

	try {
		// Render and return the processed buffer
		const monoResampledBuffer = await offlineContext.startRendering()

		// Log processed properties
		// console.log(`Processed audio: ${monoResampledBuffer.numberOfChannels} channel at ${monoResampledBuffer.sampleRate}Hz`)

		// Verify that conversion worked as expected
		if (monoResampledBuffer.numberOfChannels !== 1) {
			console.warn('Warning: Output buffer is not mono as expected')
		}

		if (monoResampledBuffer.sampleRate !== targetSampleRate) {
			console.warn(`Warning: Output sample rate (${monoResampledBuffer.sampleRate}Hz) doesn't match target (${targetSampleRate}Hz)`)
		}

		return monoResampledBuffer
	} catch (error) {
		console.error('Error processing audio:', error)
		throw error
	}
}
