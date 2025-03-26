'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AudioAnalysisResults } from '@/components/AudioAnalysisResults'
import { StemsContainer } from '@/components/StemsContainer'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AudioWaveform, AlertTriangle, Music, Info } from 'lucide-react'

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
		[stemName: string]: string // Contains URLs to stream each stem
	}
	status: 'pending' | 'processing' | 'completed' | 'failed'
}

export default function AnalysisPage() {
	const searchParams = useSearchParams()
	const sessionId = searchParams.get('sessionId')

	// If there's no sessionId, show an error
	if (!sessionId) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-background h-screen w-screen">
				<Alert variant="destructive" className="max-w-md mx-auto">
					<div className="flex gap-2 items-center">
						<Info className="h-5 w-5" />
						<AlertDescription>No session ID provided. You need to upload an audio file first.</AlertDescription>
					</div>
				</Alert>
			</div>
		)
	}

	// Query for audio analysis data
	const analysisQuery = useQuery({
		queryKey: ['analysis', sessionId],
		queryFn: async () => {
			const response = await fetch(`/api/session/${sessionId}/audio-analysis`)
			if (!response.ok) {
				throw new Error('Failed to fetch analysis data')
			}
			return (await response.json()) as AudioAnalysisData
		},
	})

	// Query for stems data
	const stemsQuery = useQuery({
		queryKey: ['stems', sessionId],
		queryFn: async () => {
			const response = await fetch(`/api/session/${sessionId}/stems`)
			if (!response.ok) {
				throw new Error('Failed to fetch stems data')
			}
			return (await response.json()) as StemsData
		},
	})

	// Check if the audio file is still being processed
	React.useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null

		// Only poll if we're processing
		const shouldPoll = analysisQuery.data?.status === 'processing' || stemsQuery.data?.status === 'processing'

		if (shouldPoll) {
			// Start polling every 5 seconds
			intervalId = setInterval(() => {
				analysisQuery.refetch()
				stemsQuery.refetch()
			}, 5000)
		}

		// Clean up interval on unmount or when no longer needed
		return () => {
			if (intervalId) clearInterval(intervalId)
		}
	}, [analysisQuery.data?.status, stemsQuery.data?.status, analysisQuery.refetch, stemsQuery.refetch])

	return (
		<div className="relative min-h-screen flex flex-col bg-background">
			{/* Main content container */}
			<div className="mx-auto w-full max-w-5xl px-6 sm:px-8 lg:px-12 pt-2 pb-1 relative z-10 flex flex-col">
				{/* Improved header with proper sizing and less whitespace */}
				<header className="flex items-center justify-between mb-2 pb-1 border-b border-border/20 flex-shrink-0">
					<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
						<AudioWaveform className="h-6 w-6 text-blue-500" />
						<span>Analysis Results</span>
					</h1>
					<p className="text-sm text-muted-foreground max-w-md">Insights into your track's musical properties and stems</p>
				</header>

				{/* Content area with flex-grow to fill available space */}
				<div className="flex flex-col gap-2">
					{/* Audio Analysis Results Component */}
					<div>
						<AudioAnalysisResults
							analysisData={analysisQuery.data}
							isLoading={analysisQuery.isLoading}
							isError={analysisQuery.isError}
						/>
					</div>

					{/* Stems Container Component with flex-grow to take remaining space */}
					<div>
						<StemsContainer stemsData={stemsQuery.data} isLoading={stemsQuery.isLoading} isError={stemsQuery.isError} />
					</div>

					<div className="flex justify-end pt-1">
						<div className="text-xs text-muted-foreground flex items-center gap-1">
							<Music className="h-3 w-3" />
							<span>SonIQ Audio Analysis</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
