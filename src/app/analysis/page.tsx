'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AudioAnalysisResults } from '@/components/AudioAnalysisResults'
import { StemsContainer } from '@/components/StemsContainer'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Music, Info } from 'lucide-react'
import { AnalysisNavigation } from '@/components/AnalysisNavigation'
import { MainHeader } from '@/components/MainHeader'
import { motion, AnimatePresence } from 'framer-motion'

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

// Component that uses useSearchParams wrapped in Suspense boundary
function AnalysisContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const sessionId = searchParams.get('sessionId')
	const tabParam = searchParams.get('tab')

	const [activeTab, setActiveTab] = React.useState(tabParam === 'stems' ? 'stems' : 'analysis')

	// Handler to update both state and URL when tab changes
	const handleTabChange = (tab: string) => {
		setActiveTab(tab)

		// Update URL with new tab parameter while preserving sessionId
		const params = new URLSearchParams(searchParams.toString())
		params.set('tab', tab)
		router.push(`/analysis?${params.toString()}`)
	}

	// If there's no sessionId, show an error
	if (!sessionId) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-background">
				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
					<Alert variant="destructive" className="max-w-md mx-auto">
						<div className="flex gap-2 items-center">
							<Info className="h-5 w-5" />
							<AlertDescription>No session ID provided. You need to upload an audio file first.</AlertDescription>
						</div>
					</Alert>
				</motion.div>
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

	const pageVariants = {
		initial: { opacity: 0 },
		enter: { opacity: 1, transition: { duration: 0.25 } },
		exit: { opacity: 0, transition: { duration: 0.2 } },
	}

	const contentVariants = {
		initial: { opacity: 0, y: 10 },
		enter: { opacity: 1, y: 0, transition: { duration: 0.25, delay: 0.05 } },
		exit: { opacity: 0, y: 10, transition: { duration: 0.15 } },
	}

	return (
		<motion.div className="min-h-screen bg-background" initial="initial" animate="enter" exit="exit" variants={pageVariants}>
			{/* Header */}
			<MainHeader />

			{/* Main content with navigation */}
			<div className="flex">
				{/* Navigation - Left Side */}
				<motion.nav
					className="fixed top-1/2 -translate-y-1/2 left-0 w-20 bg-background/95 backdrop-blur-md"
					initial={{ x: -20, opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					transition={{ duration: 0.25, delay: 0.1 }}
				>
					<AnalysisNavigation activeTab={activeTab} onTabChange={handleTabChange} orientation="side" />
				</motion.nav>

				{/* Main content area */}
				<main className="flex-1 ml-20">
					<motion.div className="px-8 md:px-16 lg:px-24 flex justify-center" variants={contentVariants}>
						<div className="w-full max-w-7xl">
							<AnimatePresence mode="wait">
								{activeTab === 'analysis' && (
									<motion.div
										key="analysis"
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 10 }}
										transition={{ duration: 0.2 }}
									>
										<AudioAnalysisResults
											analysisData={analysisQuery.data}
											isLoading={analysisQuery.isLoading}
											isError={analysisQuery.isError}
										/>
									</motion.div>
								)}
								{activeTab === 'stems' && (
									<motion.div
										key="stems"
										initial={{ opacity: 0, x: 10 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -10 }}
										transition={{ duration: 0.2 }}
									>
										<StemsContainer
											stemsData={stemsQuery.data}
											isLoading={stemsQuery.isLoading}
											isError={stemsQuery.isError}
											sessionId={sessionId}
										/>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</motion.div>
				</main>
			</div>
		</motion.div>
	)
}

// Main page component with Suspense boundary
export default function AnalysisPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-background flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading analysis page...</p>
					</div>
				</div>
			}
		>
			<AnalysisContent />
		</Suspense>
	)
}
