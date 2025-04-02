'use client'

import { FileUpload } from '@/components/FileUpload'
import { MainHeader } from '@/components/MainHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Wand2, Scissors, FileMusic, AudioWaveform } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { WavyBackground } from '@/components/ui/wavy-background'
import { motion } from 'framer-motion'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
const ACCEPTED_FILE_TYPES = {
	'audio/mpeg': ['.mp3'],
	'audio/wav': ['.wav'],
	'audio/flac': ['.flac'],
}

export default function Home() {
	const [isDragging, setIsDragging] = useState(false)
	const fileUploadRef = useRef<HTMLDivElement>(null)

	// Handle files dropped anywhere on the page using document-level event listeners
	useEffect(() => {
		// Event handlers for drag-n-drop
		const handleDragEnter = (e: DragEvent) => {
			e.preventDefault()
			setIsDragging(true)
		}

		const handleDragLeave = (e: DragEvent) => {
			e.preventDefault()
			// Only set to false if we're leaving the document
			if (!e.relatedTarget) {
				setIsDragging(false)
			}
		}

		const handleDragOver = (e: DragEvent) => {
			e.preventDefault()
		}

		const handleDrop = (e: DragEvent) => {
			e.preventDefault()
			setIsDragging(false)

			// Convert FileList to Array
			const files = Array.from(e.dataTransfer?.files || [])

			// Process the files
			if (files.length > 0 && window.handleExternalFileUpload) {
				// Filter for accepted file types
				const acceptedFiles: File[] = []
				const rejectedFiles: any[] = []

				files.forEach((file) => {
					const fileType = file.type
					if (Object.keys(ACCEPTED_FILE_TYPES).includes(fileType) && file.size <= MAX_FILE_SIZE) {
						acceptedFiles.push(file)
					} else {
						rejectedFiles.push({
							file,
							errors: [fileType ? { code: 'file-invalid-type' } : { code: 'file-too-large' }],
						})
					}
				})

				window.handleExternalFileUpload(acceptedFiles, rejectedFiles)
			}
		}

		// Add event listeners
		document.addEventListener('dragenter', handleDragEnter)
		document.addEventListener('dragleave', handleDragLeave)
		document.addEventListener('dragover', handleDragOver)
		document.addEventListener('drop', handleDrop)

		// Clean up
		return () => {
			document.removeEventListener('dragenter', handleDragEnter)
			document.removeEventListener('dragleave', handleDragLeave)
			document.removeEventListener('dragover', handleDragOver)
			document.removeEventListener('drop', handleDrop)
			setIsDragging(false)
		}
	}, [])

	return (
		<div className="min-h-screen overflow-hidden relative">
			{/* WavyBackground positioned below */}
			<div className="absolute inset-0 top-[18%] -z-10">
				<WavyBackground
					colors={['#FF0080', '#7928CA', '#0070F3', '#38bdf8', '#9999ff']}
					waveWidth={50}
					backgroundFill="#020617"
					blur={50}
					speed="fast"
					waveOpacity={1}
					containerClassName="w-full h-full"
					className="w-full h-full"
				/>
			</div>

			{/* Overlay when dragging (matching dialog box behavior) */}
			{isDragging && <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-40" />}

			<div className="min-h-screen flex flex-col overflow-hidden relative bg-background/80">
				{/* Header */}
				<div className="relative z-10">
					<MainHeader />
				</div>

				{/* Hero section */}
				<main className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div className="container max-w-6xl px-6 md:px-8 lg:px-10 flex flex-col lg:flex-row items-start gap-10 lg:gap-16 pointer-events-auto">
						{/* Left side - text content */}
						<motion.div
							className="flex-1 space-y-8 flex flex-col justify-between"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, ease: 'easeOut' }}
						>
							<div className="space-y-5">
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.3, delay: 0.2 }}
								>
									<Badge variant="secondary" className="px-3 py-1 text-xs rounded-full">
										AI-Powered Audio Analysis
									</Badge>
								</motion.div>
								<motion.h1
									className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, delay: 0.3 }}
								>
									Elevate Your{' '}
									<span className="text-primary relative inline-block">
										<span className="animate-gradient-text">Sound</span>
									</span>
								</motion.h1>
								<motion.p
									className="text-xl text-muted-foreground font-light max-w-xl"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, delay: 0.4 }}
								>
									Intelligent analysis and stem separation for music producers and DJs.
								</motion.p>
							</div>

							<motion.div
								className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-11"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.5 }}
							>
								{[
									{
										icon: <Wand2 className="h-5 w-5" />,
										title: 'Audio Analysis',
										description: 'BPM, key detection, and DJ insights',
									},
									{
										icon: <Scissors className="h-5 w-5" />,
										title: 'Stem Separation',
										description: 'Isolate vocals, drums, bass and get high-quality stems',
									},
									{
										icon: <FileMusic className="h-5 w-5" />,
										title: 'MIDI Extraction',
										description: 'Convert stems to MIDI notes for your DAW projects',
									},
								].map((feature, index) => (
									<motion.div
										key={index}
										className="flex flex-col gap-1.5 group"
										initial={{ opacity: 0, y: 15 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
										whileHover={{ y: -5 }}
									>
										<div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
											{feature.icon}
										</div>
										<h3 className="font-medium">{feature.title}</h3>
										<p className="text-sm text-muted-foreground">{feature.description}</p>
									</motion.div>
								))}
							</motion.div>
						</motion.div>

						{/* Right side - file upload */}
						<motion.div
							className="w-full lg:w-[450px] self-start mt-6 relative z-50 bg-background/60 rounded-xl"
							initial={{ opacity: 0, scale: 0.95, x: 20 }}
							animate={{ opacity: 1, scale: 1, x: 0 }}
							transition={{
								duration: 0.5,
								delay: 0.4,
								ease: [0.19, 1.0, 0.22, 1.0],
							}}
						>
							<Card className="bg-accent/30 border-border/40 w-full">
								<CardContent className="px-6 pt-4 pb-3">
									<div className="mb-3">
										<div className="flex items-start gap-3 mb-1">
											<motion.div
												className="min-w-10 min-h-10 w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary shrink-0"
												initial={{ scale: 0.8, opacity: 0 }}
												animate={{ scale: 1, opacity: 1 }}
												transition={{ duration: 0.3, delay: 0.7 }}
											>
												<AudioWaveform size={20} strokeWidth={2} className="h-5 w-5" />
											</motion.div>
											<motion.div
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ duration: 0.3, delay: 0.8 }}
											>
												<h2 className="text-lg font-medium">Get Started</h2>
												<p className="text-sm text-muted-foreground">
													Upload your audio file to analyze and separate it into stems.
												</p>
											</motion.div>
										</div>
									</div>
									<div ref={fileUploadRef} className="w-full">
										<FileUpload pageIsDragging={isDragging} />
									</div>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				</main>
			</div>
		</div>
	)
}
