'use client'

import { FileUpload } from '@/components/FileUpload'
import { MainHeader } from '@/components/MainHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Wand2, Scissors, FileMusic, AudioWaveform } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { WavyBackground } from '@/components/ui/wavy-background'

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
						<div className="flex-1 space-y-8 flex flex-col justify-between">
							<div className="space-y-5">
								<Badge variant="secondary" className="px-3 py-1 text-xs rounded-full">
									AI-Powered Audio Analysis
								</Badge>
								<h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
									Elevate Your{' '}
									<span className="text-primary relative inline-block">
										<span className="animate-gradient-text">Sound</span>
									</span>
								</h1>
								<p className="text-xl text-muted-foreground font-light max-w-xl">
									Intelligent analysis and stem separation for music producers and DJs.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-11">
								<div className="flex flex-col gap-1.5 group">
									<div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
										<Wand2 className="h-5 w-5" />
									</div>
									<h3 className="font-medium">Audio Analysis</h3>
									<p className="text-sm text-muted-foreground">BPM, key detection, and DJ insights</p>
								</div>

								<div className="flex flex-col gap-1.5 group">
									<div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
										<Scissors className="h-5 w-5" />
									</div>
									<h3 className="font-medium">Stem Separation</h3>
									<p className="text-sm text-muted-foreground">Isolate vocals, drums, bass and get high-quality stems</p>
								</div>

								<div className="flex flex-col gap-1.5 group">
									<div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
										<FileMusic className="h-5 w-5" />
									</div>
									<h3 className="font-medium">MIDI Extraction</h3>
									<p className="text-sm text-muted-foreground">Convert stems to MIDI notes for your DAW projects</p>
								</div>
							</div>
						</div>

						{/* Right side - file upload */}
						<div className="w-full lg:w-[450px] self-start mt-6 relative z-50 bg-background/60 rounded-xl">
							<Card className="bg-accent/30 border-border/40 w-full">
								<CardContent className="px-6 pt-4 pb-3">
									<div className="mb-3">
										<div className="flex items-start gap-3 mb-1">
											<div className="min-w-10 min-h-10 w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary shrink-0">
												<AudioWaveform size={20} strokeWidth={2} className="h-5 w-5" />
											</div>
											<div>
												<h2 className="text-lg font-medium">Get Started</h2>
												<p className="text-sm text-muted-foreground">
													Upload your audio file to analyze and separate it into stems.
												</p>
											</div>
										</div>
									</div>
									<div ref={fileUploadRef} className="w-full">
										<FileUpload pageIsDragging={isDragging} />
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</main>
			</div>
		</div>
	)
}
