'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AudioAnalysisResults } from '@/components/AudioAnalysisResults'
import { StemsContainer } from '@/components/StemsContainer'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Music, Info } from 'lucide-react'
import { AnalysisNavigation } from '@/components/AnalysisNavigation'
import { MainHeader } from '@/components/MainHeader'

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
	const [activeTab, setActiveTab] = React.useState('analysis')

	// If there's no sessionId, show an error
	if (!sessionId) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-background">
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
		<div className="min-h-screen bg-background">
			{/* Header */}
			<MainHeader />

			{/* Main content with navigation */}
			<div className="flex">
				{/* Navigation - Left Side */}
				<nav className="fixed top-1/2 -translate-y-1/2 left-0 w-20 bg-background/95 backdrop-blur-md">
					<AnalysisNavigation activeTab={activeTab} onTabChange={setActiveTab} orientation="side" />
				</nav>

				{/* Main content area */}
				<main className="flex-1 ml-20">
					<div className="px-8 md:px-16 lg:px-24 flex justify-center">
						<div className="w-full max-w-7xl">
							{activeTab === 'analysis' && (
								<AudioAnalysisResults
									analysisData={analysisQuery.data}
									isLoading={analysisQuery.isLoading}
									isError={analysisQuery.isError}
								/>
							)}
							{activeTab === 'stems' && (
								<StemsContainer stemsData={stemsQuery.data} isLoading={stemsQuery.isLoading} isError={stemsQuery.isError} />
							)}
						</div>
					</div>
				</main>
			</div>
		</div>
	)
}
