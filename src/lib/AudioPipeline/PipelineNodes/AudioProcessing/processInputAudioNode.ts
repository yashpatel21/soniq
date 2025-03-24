import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import { NodeBuilder, PipelineNode } from '../../../utils/DAGPipeline/DAGPipeline'
import { ProcessedAudioFile } from '../types'

/**
 * Processes an audio file and stores it in a temporary directory.
 *
 * @param input - Object containing the audio file and optional session ID
 * @returns A promise resolving to an object containing the sessionId, filePath, and fileBuffer
 */
async function processInputAudio(input: { file: File; sessionId?: string }): Promise<ProcessedAudioFile> {
	try {
		// Use provided sessionId or generate one if not provided
		const { file, sessionId = uuidv4() } = input

		// Create a folder structure for this session
		const sessionDir = join(tmpdir(), 'audio-processing', sessionId)
		try {
			await mkdir(sessionDir, { recursive: true })
		} catch (dirError) {
			console.error(`Error creating directory ${sessionDir}:`, dirError)
			throw new Error(`Failed to create processing directory: ${(dirError as Error).message}`)
		}

		// Get file extension from the original filename
		const fileExtension = file.name.split('.').pop()

		// Define the file path where we'll save the uploaded file
		const filePath = join(sessionDir, `original.${fileExtension}`)

		// Convert File object to ArrayBuffer
		let audioFileBuffer: Buffer
		try {
			const fileBuffer = await file.arrayBuffer()
			audioFileBuffer = Buffer.from(fileBuffer)
		} catch (bufferError) {
			console.error('Error reading file data:', bufferError)
			throw new Error(`Failed to read audio file data: ${(bufferError as Error).message}`)
		}

		// Write the file to the temporary directory
		try {
			await writeFile(filePath, audioFileBuffer)
		} catch (writeError) {
			console.error(`Error writing file to ${filePath}:`, writeError)
			throw new Error(`Failed to save audio file: ${(writeError as Error).message}`)
		}

		return {
			sessionId,
			filePath,
			audioFileBuffer,
			sessionDir,
		} as ProcessedAudioFile
	} catch (error) {
		// Log error for debugging purposes
		console.error('Error processing audio file:', error)
		// Rethrow the error to be handled by the caller
		throw error
	}
}

/**
 * Pipeline node that processes an audio file and stores it in a temporary directory
 */
export const processInputAudioNode: PipelineNode<{ file: File; sessionId?: string }, ProcessedAudioFile> = new NodeBuilder<
	{ file: File; sessionId?: string },
	ProcessedAudioFile
>('processInputAudio', processInputAudio).build()
