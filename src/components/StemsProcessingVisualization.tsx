'use client'

import React, { forwardRef, useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils/ui/utils'
import { AnimatedBeam } from '@/components/magicui/animated-beam'
import { Music, Brain, Mic, Drum, Guitar, Piano, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface StemsProcessingVisualizationProps {
	mode?: 'processing' | 'loading'
}

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode; size?: 'sm' | 'lg' }>(
	({ className, children, size = 'sm' }, ref) => {
		return (
			<div className="relative">
				{/* Opaque background circle */}
				<div
					className={cn(
						'absolute inset-0 z-20 flex items-center justify-center rounded-full border-2 bg-background shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]',
						size === 'sm' ? 'size-12' : 'size-16'
					)}
				/>
				{/* Translucent icon circle */}
				<div
					ref={ref}
					className={cn(
						'relative z-30 flex items-center justify-center rounded-full border-2 p-3',
						size === 'sm' ? 'size-12' : 'size-16',
						className
					)}
				>
					{children}
				</div>
			</div>
		)
	}
)

Circle.displayName = 'Circle'

export function StemsProcessingVisualization({ mode = 'processing' }: StemsProcessingVisualizationProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLDivElement>(null)
	const processorRef = useRef<HTMLDivElement>(null)
	const vocalsRef = useRef<HTMLDivElement>(null)
	const drumsRef = useRef<HTMLDivElement>(null)
	const bassRef = useRef<HTMLDivElement>(null)
	const otherRef = useRef<HTMLDivElement>(null)

	// Track previous mode to detect transitions
	const [prevMode, setPrevMode] = useState(mode)

	// Update previous mode when current mode changes
	useEffect(() => {
		setPrevMode(mode)
	}, [mode])

	return (
		<div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden" ref={containerRef}>
			<AnimatePresence mode="wait">
				{mode === 'loading' ? (
					<motion.div
						key="loading-spinner"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.4 }}
						className="flex flex-col items-center gap-4"
					>
						<Loader2 className="h-12 w-12 animate-spin text-primary/70" />
						<p className="text-base text-muted-foreground">Loading stems audio...</p>
					</motion.div>
				) : (
					<motion.div
						key="processing-visualization"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.4 }}
						className="w-full h-full flex items-center justify-center p-10"
					>
						<div className="flex size-full max-w-lg flex-row items-stretch justify-between gap-10">
							{/* Input - Music Note */}
							<div className="flex flex-col justify-center">
								<Circle ref={inputRef} className="bg-purple-100/10 dark:bg-purple-950/10">
									<Music className="h-5 w-5 text-purple-600 dark:text-purple-400" />
								</Circle>
							</div>

							{/* Processor - Brain */}
							<div className="flex flex-col justify-center">
								<Circle ref={processorRef} size="lg" className="bg-amber-100/10 dark:bg-amber-950/10">
									<Brain className="h-7 w-7 text-amber-600 dark:text-amber-400" />
								</Circle>
							</div>

							{/* Output Stems */}
							<div className="flex flex-col justify-center gap-2">
								<Circle ref={vocalsRef} className="bg-teal-100/10 dark:bg-teal-950/10">
									<Mic className="h-5 w-5 text-teal-600 dark:text-teal-400" />
								</Circle>
								<Circle ref={drumsRef} className="bg-teal-100/10 dark:bg-teal-950/10">
									<Drum className="h-5 w-5 text-teal-600 dark:text-teal-400" />
								</Circle>
								<Circle ref={bassRef} className="bg-teal-100/10 dark:bg-teal-950/10">
									<Guitar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
								</Circle>
								<Circle ref={otherRef} className="bg-teal-100/10 dark:bg-teal-950/10">
									<Piano className="h-5 w-5 text-teal-600 dark:text-teal-400" />
								</Circle>
							</div>
						</div>

						{/* Animated Beams */}
						<div className="absolute inset-0 z-10">
							{/* Music to Brain - Straight line */}
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={inputRef}
								toRef={processorRef}
								duration={3}
								pathColor="#94a3b8"
								pathOpacity={0.15}
								pathWidth={2}
								gradientStartColor="#9c40ff"
								gradientStopColor="#ffaa40"
							/>

							{/* Brain to Mic - Upward curve */}
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={processorRef}
								toRef={vocalsRef}
								duration={3}
								pathColor="#94a3b8"
								pathOpacity={0.15}
								pathWidth={2}
								gradientStartColor="#ffaa40"
								gradientStopColor="#2dd4bf"
								curvature={100}
							/>

							{/* Brain to Drums - Slightly curved */}
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={processorRef}
								toRef={drumsRef}
								duration={3}
								pathColor="#94a3b8"
								pathOpacity={0.15}
								pathWidth={2}
								gradientStartColor="#ffaa40"
								gradientStopColor="#2dd4bf"
								curvature={30}
							/>

							{/* Brain to Bass - Slightly curved */}
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={processorRef}
								toRef={bassRef}
								duration={3}
								pathColor="#94a3b8"
								pathOpacity={0.15}
								pathWidth={2}
								gradientStartColor="#ffaa40"
								gradientStopColor="#2dd4bf"
								curvature={-30}
							/>

							{/* Brain to Piano - Downward curve */}
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={processorRef}
								toRef={otherRef}
								duration={3}
								pathColor="#94a3b8"
								pathOpacity={0.15}
								pathWidth={2}
								gradientStartColor="#ffaa40"
								gradientStopColor="#2dd4bf"
								curvature={-100}
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
