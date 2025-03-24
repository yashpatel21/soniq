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
		[stemName: string]: string // Now contains URLs to stream each stem
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
								<div className="mt-4 space-y-4">
									<h3 className="text-lg font-medium">Stem Tracks ({Object.keys(stemsQuery.data.stems).length})</h3>

									<div className="grid grid-cols-1 gap-4">
										{Object.entries(stemsQuery.data.stems).map(([stemName, stemUrl]) => (
											<div key={stemName} className="border rounded-lg p-4 bg-slate-50 shadow-sm">
												<div className="flex items-center justify-between mb-3">
													<h4 className="font-semibold text-slate-800">{stemName}</h4>
													<span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
														Ready
													</span>
												</div>
												<audio controls className="w-full" src={stemUrl} preload="metadata">
													Your browser does not support the audio element.
												</audio>
											</div>
										))}
									</div>
								</div>
							)}

							{stemsQuery.data.status === 'processing' && (
								<div className="mt-4 p-6 border rounded-lg bg-blue-50">
									<div className="flex items-center gap-3">
										<div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
										<p className="text-blue-800">Separating stems from your audio...</p>
									</div>
									<p className="mt-2 text-sm text-blue-600">
										This can take a few minutes depending on the length of your track.
									</p>
								</div>
							)}

							{stemsQuery.data.status === 'failed' && (
								<div className="mt-4 p-6 border rounded-lg bg-red-50">
									<p className="text-red-700">Stem separation failed. Please try uploading your audio again.</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
