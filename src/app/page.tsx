'use client'

import { FileUpload } from '@/components/FileUpload'
import { MainHeader } from '@/components/MainHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Wand2, Scissors, FileMusic, AudioWaveform, FileAudio } from 'lucide-react'
import { useCallback, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils/ui/utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
const ACCEPTED_FILE_TYPES = {
	'audio/mpeg': ['.mp3'],
	'audio/wav': ['.wav'],
	'audio/flac': ['.flac'],
}

// CSS keyframes for gradient animation
const gradientKeyframes = `
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`

export default function Home() {
	const [isDragging, setIsDragging] = useState(false)
	const fileUploadRef = useRef<HTMLDivElement>(null)

	// Handle files dropped anywhere on the page
	const onPageDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
		// We will let the FileUpload component handle the actual file processing
		if (typeof window !== 'undefined' && window.handleExternalFileUpload) {
			window.handleExternalFileUpload(acceptedFiles, rejectedFiles)
		}
		setIsDragging(false)
	}, [])

	// Set up page-wide drop zone that delegates to the FileUpload component
	const { getRootProps, isDragActive } = useDropzone({
		onDragEnter: () => setIsDragging(true),
		onDragLeave: () => setIsDragging(false),
		onDrop: onPageDrop,
		accept: ACCEPTED_FILE_TYPES,
		maxSize: MAX_FILE_SIZE,
		noClick: true,
		noKeyboard: true,
	})

	return (
		<div {...getRootProps()} className="min-h-screen flex flex-col bg-background overflow-hidden relative">
			{/* Background gradient */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>

			{/* Decorative elements */}
			<div className="absolute top-40 right-[5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
			<div
				className="absolute bottom-20 left-[10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"
				style={{ animationDelay: '1s', animationDuration: '8s' }}
			></div>

			{/* Semi-transparent overlay when dragging */}
			{isDragging && <div className="fixed inset-0 bg-background/70 backdrop-blur-[4px] z-10 pointer-events-none"></div>}

			{/* Reusable header */}
			<MainHeader isBlurred={isDragging} />

			{/* Hero section */}
			<main className="flex-1 flex items-center justify-center py-6">
				<div className="container max-w-7xl px-4 md:px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
					{/* Left side - text content */}
					<div className={cn('flex-1 space-y-8', isDragging && 'opacity-30 transition-opacity duration-300 blur-[3px]')}>
						<div className="space-y-5">
							<Badge variant="secondary" className="px-3 py-1 text-xs rounded-full">
								AI-Powered Audio Analysis
							</Badge>
							<h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
								Elevate Your{' '}
								<span className="text-primary relative inline-block">
									<style>{gradientKeyframes}</style>
									<span
										className="relative"
										style={{
											background: 'linear-gradient(90deg, #FF0080, #7928CA, #0070F3, #38bdf8, #a855f7)',
											backgroundSize: '300% 100%',
											WebkitBackgroundClip: 'text',
											WebkitTextFillColor: 'transparent',
											backgroundClip: 'text',
											display: 'inline-block',
											animation: 'gradient 4s ease infinite',
										}}
									>
										Sound
									</span>
								</span>
							</h1>
							<p className="text-xl text-muted-foreground font-light max-w-xl">
								Intelligent analysis and stem separation for music producers and DJs.
							</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
					<div className={cn('w-full lg:w-auto lg:min-w-[450px] relative', isDragging && 'z-20')}>
						<Card className="bg-accent/30 border-border/40">
							<CardContent className="p-6">
								<div className={cn('mb-4', isDragging && 'opacity-0 absolute pointer-events-none')}>
									<div className="flex items-start gap-3 mb-1">
										<div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary">
											<AudioWaveform className="h-5 w-5" />
										</div>
										<div>
											<h2 className="text-lg font-medium">Get Started</h2>
											<p className="text-sm text-muted-foreground">
												Upload your audio file to analyze and separate it into stems.
											</p>
										</div>
									</div>
								</div>
								<div ref={fileUploadRef}>
									<FileUpload pageIsDragging={isDragging} />
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	)
}
