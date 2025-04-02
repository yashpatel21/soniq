import React, { useState } from 'react'
import { StemPlayer } from './StemPlayer'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Scissors, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StemsProcessingVisualization } from './StemsProcessingVisualization'
import { motion, AnimatePresence } from 'framer-motion'

interface StemsData {
	stems?: {
		[stemName: string]: string
	}
	status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface StemsContainerProps {
	stemsData: StemsData | undefined
	isLoading: boolean
	isError: boolean
	sessionId: string
}

export function StemsContainer({ stemsData, isLoading, isError, sessionId }: StemsContainerProps) {
	const [activeFilter, setActiveFilter] = useState<string | null>(null)

	// Get the stems data if available
	const stemItems = stemsData?.stems ? Object.entries(stemsData.stems) : []

	// Filter stems based on active filter
	const filteredStems = React.useMemo(() => {
		if (!activeFilter) return stemItems
		return stemItems.filter(([name]) => name.toLowerCase().includes(activeFilter.toLowerCase()))
	}, [stemItems, activeFilter])

	// Get unique stem types for filtering
	const stemTypes = React.useMemo(() => {
		if (!stemItems.length) return []

		const types = new Set<string>()
		stemItems.forEach(([name]) => {
			// Extract stem type from name (vocals, drums, etc.)
			const nameLC = name.toLowerCase()
			if (nameLC.includes('vocal')) types.add('Vocals')
			else if (nameLC.includes('drum')) types.add('Drums')
			else if (nameLC.includes('bass')) types.add('Bass')
			else if (nameLC.includes('guitar')) types.add('Guitar')
			else if (nameLC.includes('piano') || nameLC.includes('keys')) types.add('Keys')
			else if (nameLC.includes('strings')) types.add('Strings')
			else if (nameLC.includes('wind')) types.add('Wind')
			else types.add('Other')
		})

		return Array.from(types)
	}, [stemItems])

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.03,
				delayChildren: 0.05,
			},
		},
		exit: {
			opacity: 0,
			transition: {
				staggerChildren: 0.02,
				staggerDirection: -1,
			},
		},
	}

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
		exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
	}

	// Show error message
	if (isError) {
		return (
			<div className="h-full flex flex-col">
				<motion.div
					className="py-8 mb-6"
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.25 }}
				>
					<div className="flex items-center gap-4 mb-3">
						<div className="flex-shrink-0">
							<Scissors className="h-8 w-8 text-primary" />
						</div>
						<div>
							<h1 className="text-4xl font-bold tracking-tight">Stems Separation</h1>
							<p className="text-muted-foreground text-base leading-relaxed mt-2 max-w-2xl">
								Split your track into individual stems. Isolate vocals, drums, bass, and more for remixing, sampling, or
								creating acapellas.
							</p>
						</div>
					</div>
				</motion.div>

				<motion.div
					className="flex-1 flex items-center justify-center"
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					<Alert variant="destructive">
						<AlertDescription>Error loading stems data</AlertDescription>
					</Alert>
				</motion.div>
			</div>
		)
	}

	// Handle data states
	return (
		<div className="h-full flex flex-col">
			{/* Header section */}
			<motion.div
				className="bg-background/95 backdrop-blur-md"
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25 }}
			>
				<div className="py-8">
					<div className="flex items-center gap-4 mb-3">
						<motion.div
							className="flex-shrink-0"
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 0.2, delay: 0.1 }}
						>
							<Scissors className="h-8 w-8 text-primary" />
						</motion.div>
						<motion.div
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.25, delay: 0.15 }}
						>
							<h1 className="text-4xl font-bold tracking-tight">Stems Separation</h1>
							<p className="text-muted-foreground text-base leading-relaxed mt-2 max-w-2xl">
								Split your track into individual stems. Isolate vocals, drums, bass, and more for remixing, sampling, or
								creating acapellas.
							</p>
						</motion.div>
					</div>
				</div>
			</motion.div>

			{/* Filter row */}
			<AnimatePresence>
				{stemTypes.length > 0 && (
					<motion.div
						className="sticky top-[102px] z-20 bg-background/95 backdrop-blur-md border-b border-border/40"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<div className="flex items-center justify-between px-2.5 py-3">
							<div className="flex items-center gap-1 flex-wrap">
								<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
									<Button
										size="sm"
										variant={!activeFilter ? 'secondary' : 'outline'}
										className="h-7 px-2 text-xs rounded-sm"
										onClick={() => setActiveFilter(null)}
									>
										All
									</Button>
								</motion.div>
								{stemTypes.map((type) => (
									<motion.div key={type} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
										<Button
											size="sm"
											variant={activeFilter === type ? 'secondary' : 'outline'}
											className="h-7 px-2 text-xs rounded-sm"
											onClick={() => setActiveFilter(activeFilter === type ? null : type)}
										>
											{type}
										</Button>
									</motion.div>
								))}
							</div>

							{/* Stem count badge */}
							{stemsData?.stems && (
								<motion.div
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.2, delay: 0.25 }}
								>
									<Badge
										variant="outline"
										className="text-xs py-1 rounded-full bg-primary/5 border-primary/20 text-foreground hover:bg-primary/10 transition-colors ml-2"
									>
										<Music className="h-3 w-3 text-primary mr-1" />
										<span className="font-medium">{Object.keys(stemsData.stems).length} stems</span>
									</Badge>
								</motion.div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Content */}
			<div className="flex-1 overflow-hidden">
				{/* Show blank skeleton for initial loading */}
				{!stemsData && (
					<motion.div
						className="flex-1 flex items-center justify-center"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.2 }}
					>
						<div className="h-[300px] w-full rounded-lg border border-border/40 animate-pulse bg-accent/30" />
					</motion.div>
				)}

				{/* Show processing visualization when we have data and it's processing */}
				<AnimatePresence>
					{stemsData?.status === 'processing' && (
						<motion.div
							className="flex-1 p-3 pb-8"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.25 }}
						>
							<Card className="w-full border border-border/40 bg-accent/30">
								<CardContent className="p-0">
									<StemsProcessingVisualization />
									<motion.div
										className="text-center py-4"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.15, duration: 0.3 }}
									>
										<p className="text-sm">Separating stems from your audio</p>
										<p className="text-xs text-muted-foreground">This process can take a few minutes.</p>
									</motion.div>
								</CardContent>
							</Card>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Show stems players when ready */}
				<AnimatePresence>
					{stemsData?.status === 'completed' && stemsData.stems && Object.keys(stemsData.stems).length > 0 && (
						<motion.div
							className="grid gap-3 p-3 pb-8 overflow-y-auto"
							variants={containerVariants}
							initial="hidden"
							animate="visible"
							exit="exit"
						>
							{filteredStems.map(([stemName, stemUrl], index) => (
								<motion.div
									key={stemName}
									variants={itemVariants}
									transition={{ duration: 0.25, delay: index * 0.03 }}
									layoutId={stemName}
								>
									<StemPlayer stemName={stemName} stemUrl={stemUrl} sessionId={sessionId} />
								</motion.div>
							))}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Show error state if failed */}
				<AnimatePresence>
					{stemsData?.status === 'failed' && (
						<motion.div
							className="flex-1 flex items-center justify-center"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
						>
							<Alert variant="destructive">
								<AlertDescription>Stem separation failed. Please try uploading your audio again.</AlertDescription>
							</Alert>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	)
}
