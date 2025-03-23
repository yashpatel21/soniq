import { createMergeNode } from '../../../DAGPipeline/DAGPipeline'
import { EssentiaAnalysisResult, MoisesStemsJobResult, ProcessedAudioFile } from '../types'
import { AudioSession, ProcessingProgress, getAudioSessionsCollection, updateSessionStatus } from '../../../db/audioSessionCollection'

/**
 * Compares two numerical values with a small tolerance for floating point imprecision
 * @param a - First number
 * @param b - Second number
 * @param tolerance - Acceptable difference (default 0.0001)
 * @returns True if the values are approximately equal
 */
function approximatelyEqual(a: number, b: number, tolerance = 0.0001): boolean {
	// Handle null and undefined values
	if (a === null || a === undefined || b === null || b === undefined) {
		return a === b || (a === null && b === undefined) || (a === undefined && b === null)
	}
	return Math.abs(a - b) <= tolerance
}

/**
 * Verifies that MongoDB document data aligns with pipeline processing results
 * @param sessionId - The session ID
 * @param essentiaResults - Essentia analysis results
 * @param stemResults - Moises stems job results
 * @returns Object containing verification result and any mismatches
 */
async function verifySessionData(
	sessionId: string,
	essentiaResults: EssentiaAnalysisResult,
	stemResults: MoisesStemsJobResult
): Promise<{ verified: boolean; mismatches?: string[] }> {
	// Get the session document from MongoDB
	const collection = await getAudioSessionsCollection()
	const sessionDoc = await collection.findOne({ sessionId })

	if (!sessionDoc) {
		return { verified: false, mismatches: ['Session document not found'] }
	}

	// First check if both essentia and stems processing are marked as completed
	if (sessionDoc.progress.essentia !== 'completed' || sessionDoc.progress.stems !== 'completed') {
		return {
			verified: false,
			mismatches: [`Incomplete processing: Essentia (${sessionDoc.progress.essentia}), Stems (${sessionDoc.progress.stems})`],
		}
	}

	const mismatches: string[] = []

	// Verify Essentia analysis data
	if (sessionDoc.essentiaAnalysis) {
		// Check each field individually to provide specific mismatch information
		const numericFields: (keyof EssentiaAnalysisResult)[] = ['bpm']
		const stringFields: (keyof EssentiaAnalysisResult)[] = ['key', 'scale']

		// Compare numeric fields with tolerance for floating point errors
		for (const field of numericFields) {
			const dbValue = sessionDoc.essentiaAnalysis[field] as number
			const pipelineValue = essentiaResults[field] as number

			if (!approximatelyEqual(dbValue, pipelineValue)) {
				mismatches.push(`Essentia ${field} mismatch: MongoDB (${dbValue}) vs. Pipeline (${pipelineValue})`)
			}
		}

		// Compare string fields with strict equality
		for (const field of stringFields) {
			if (sessionDoc.essentiaAnalysis[field] !== essentiaResults[field]) {
				mismatches.push(
					`Essentia ${field} mismatch: MongoDB (${sessionDoc.essentiaAnalysis[field]}) vs. Pipeline (${essentiaResults[field]})`
				)
			}
		}
	} else {
		mismatches.push('Essentia analysis data missing in MongoDB document')
	}

	// Verify Stems data
	if (sessionDoc.stems) {
		// Get all stem names from both sources
		const stemNames = Object.keys(stemResults)

		// Check for missing stems in MongoDB
		for (const stem of stemNames) {
			if (!sessionDoc.stems[stem]) {
				mismatches.push(`Stem missing in MongoDB: ${stem}`)
			}
		}

		// Check for extra stems in MongoDB (shouldn't happen, but being thorough)
		for (const stem of Object.keys(sessionDoc.stems)) {
			if (!(stem in stemResults)) {
				mismatches.push(`Unexpected stem in MongoDB: ${stem}`)
			}
		}

		// Note: We're not comparing actual file paths as they might be normalized or stored differently
	} else {
		mismatches.push('Stems data missing in MongoDB document')
	}

	return {
		verified: mismatches.length === 0,
		mismatches: mismatches.length > 0 ? mismatches : undefined,
	}
}

/**
 * Final pipeline node that marks the audio processing session as completed in MongoDB
 * after verifying data consistency between pipeline results and MongoDB
 * @param inputs - Array containing results from essentia analysis, stems processing, and the original audio file data
 * @returns The session ID as a string (for backward compatibility)
 */
async function updateCompletionStatus(inputs: any[]): Promise<string> {
	try {
		// Extract data from inputs with proper typing
		const essentiaResults = inputs[0] as EssentiaAnalysisResult
		const stemResults = inputs[1] as MoisesStemsJobResult
		const audioFileData = inputs[2] as ProcessedAudioFile
		const { sessionId } = audioFileData

		// Verify that MongoDB document data aligns with pipeline results
		const verification = await verifySessionData(sessionId, essentiaResults, stemResults)

		if (verification.verified) {
			// Data is consistent, update status to completed using atomic operation
			await updateSessionStatus(sessionId, 'completed')
			console.log(`Audio processing complete for session: ${sessionId}`)
		} else {
			// Data inconsistency found, log details and mark as failed
			console.error(`Data verification failed for session ${sessionId}:`, verification.mismatches)
			await updateSessionStatus(sessionId, 'failed')
		}

		// Return the session ID
		return sessionId
	} catch (error) {
		console.error('Error in final pipeline node:', error)

		// Try to update the status to 'failed' if we can extract the session ID
		try {
			const audioFileData = inputs[2] as ProcessedAudioFile
			if (audioFileData?.sessionId) {
				await updateSessionStatus(audioFileData.sessionId, 'failed')
				console.error(`Marked session ${audioFileData.sessionId} as failed due to error`)
			}
		} catch (e) {
			console.error('Failed to update session status to failed:', e)
		}

		// Return a fallback value if everything fails
		return 'unknown-session-id'
	}
}

// Create a merge node that depends on both update session nodes and the original audio data
export const updateCompletionStatusNode = createMergeNode<string>(
	'updateCompletionStatus',
	['updateSessionWithEssentia', 'updateSessionWithStems', 'createSessionDocument'],
	updateCompletionStatus
)
