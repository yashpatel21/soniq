'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

interface EssentiaData {
	essentiaAnalysis?: {
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

	// Query for Essentia analysis data
	const essentiaQuery = useQuery({
		queryKey: ['essentia', sessionId],
		queryFn: async (): Promise<EssentiaData> => {
			const response = await fetch(`/api/session/${sessionId}/essentia`)
			if (!response.ok) {
				throw new Error('Failed to fetch Essentia data')
			}
			return response.json()
		},
		// Keep polling until we get completed or failed status
		refetchInterval: (query) => {
			const data = query.state.data as EssentiaData
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
		if (essentiaQuery.data?.status === 'completed' && essentiaQuery.data?.essentiaAnalysis) {
			console.log('Essentia Analysis Results:', essentiaQuery.data.essentiaAnalysis)
		}

		if (stemsQuery.data?.status === 'completed' && stemsQuery.data?.stems) {
			console.log('Stems Results:', stemsQuery.data.stems)
		}
	}, [essentiaQuery.data, stemsQuery.data])

	if (!sessionId) {
		return <div className="p-8">Session ID is required</div>
	}

	return (
		<div className="container p-8">
			<h1 className="text-2xl font-bold mb-6">Analysis Results</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Essentia Analysis Box */}
				<div className="border rounded-lg p-6">
					<h2 className="text-xl font-semibold mb-4">Audio Analysis</h2>

					{essentiaQuery.isLoading && <p>Loading analysis data...</p>}

					{essentiaQuery.isError && <p className="text-red-500">Error loading analysis data</p>}

					{essentiaQuery.data && (
						<div>
							<p>Status: {essentiaQuery.data.status}</p>

							{essentiaQuery.data.status === 'completed' && essentiaQuery.data.essentiaAnalysis && (
								<div className="mt-4 space-y-2">
									<p>BPM: {essentiaQuery.data.essentiaAnalysis.bpm.toFixed(1)}</p>
									<p>
										Key: {essentiaQuery.data.essentiaAnalysis.key} {essentiaQuery.data.essentiaAnalysis.scale}
									</p>
								</div>
							)}

							{essentiaQuery.data.status === 'processing' && <p>Processing your audio...</p>}

							{essentiaQuery.data.status === 'failed' && <p className="text-red-500">Analysis failed</p>}
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
