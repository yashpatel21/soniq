'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

interface AudioAnalysisData {
	analysisResults?: {
		bpm: number
		key: string
		scale: string
	}
	status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface StemsData {
	stems?: {
		[stemName: string]: string
	}
	status: 'pending' | 'processing' | 'completed' | 'failed'
}

export default function AnalysisPage() {
	const searchParams = useSearchParams()
	const sessionId = searchParams.get('sessionId')

	// Query for audio analysis data
	const analysisQuery = useQuery({
		queryKey: ['audio-analysis', sessionId],
		queryFn: async (): Promise<AudioAnalysisData> => {
			const response = await fetch(`/api/session/${sessionId}/audio-analysis`)
			if (!response.ok) {
				throw new Error('Failed to fetch audio analysis data')
			}
			return response.json()
		},
		// Keep polling until we get completed or failed status
		refetchInterval: (query) => {
			const data = query.state.data as AudioAnalysisData
			return data?.status === 'completed' || data?.status === 'failed' ? false : 3000
		},
		enabled: !!sessionId,
	})

	// Query for Stems data
	const stemsQuery = useQuery({
		queryKey: ['stems', sessionId],
		queryFn: async (): Promise<StemsData> => {
			const response = await fetch(`/api/session/${sessionId}/stems`)
			if (!response.ok) {
				throw new Error('Failed to fetch Stems data')
			}
			return response.json()
		},
		// Keep polling until we get completed or failed status
		refetchInterval: (query) => {
			const data = query.state.data as StemsData
			return data?.status === 'completed' || data?.status === 'failed' ? false : 3000
		},
		enabled: !!sessionId,
	})

	// Log the results once available
	useEffect(() => {
		if (analysisQuery.data?.status === 'completed' && analysisQuery.data?.analysisResults) {
			console.log('Audio Analysis Results:', analysisQuery.data.analysisResults)
		}

		if (stemsQuery.data?.status === 'completed' && stemsQuery.data?.stems) {
			console.log('Stems Results:', stemsQuery.data.stems)
		}
	}, [analysisQuery.data, stemsQuery.data])

	if (!sessionId) {
		return <div className="p-8">Session ID is required</div>
	}

	return (
		<div className="container p-8">
			<h1 className="text-2xl font-bold mb-6">Analysis Results</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Audio Analysis Box */}
				<div className="border rounded-lg p-6">
					<h2 className="text-xl font-semibold mb-4">Audio Analysis</h2>

					{analysisQuery.isLoading && <p>Loading analysis data...</p>}

					{analysisQuery.isError && <p className="text-red-500">Error loading analysis data</p>}

					{analysisQuery.data && (
						<div>
							<p>Status: {analysisQuery.data.status}</p>

							{analysisQuery.data.status === 'completed' && analysisQuery.data.analysisResults && (
								<div className="mt-4 space-y-2">
									<p>BPM: {analysisQuery.data.analysisResults.bpm.toFixed(1)}</p>
									<p>
										Key: {analysisQuery.data.analysisResults.key} {analysisQuery.data.analysisResults.scale}
									</p>
								</div>
							)}

							{analysisQuery.data.status === 'processing' && <p>Processing your audio...</p>}

							{analysisQuery.data.status === 'failed' && <p className="text-red-500">Analysis failed</p>}
						</div>
					)}
				</div>

				{/* Stems Box */}
				<div className="border rounded-lg p-6">
					<h2 className="text-xl font-semibold mb-4">Stems Separation</h2>

					{stemsQuery.isLoading && <p>Loading stems data...</p>}

					{stemsQuery.isError && <p className="text-red-500">Error loading stems data</p>}

					{stemsQuery.data && (
						<div>
							<p>Status: {stemsQuery.data.status}</p>

							{stemsQuery.data.status === 'completed' && stemsQuery.data.stems && (
								<div className="mt-4">
									<p>{Object.keys(stemsQuery.data.stems).length} stems generated</p>
								</div>
							)}

							{stemsQuery.data.status === 'processing' && <p>Processing stems...</p>}

							{stemsQuery.data.status === 'failed' && <p className="text-red-500">Stems processing failed</p>}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
