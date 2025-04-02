import React, { useState, useCallback, useEffect } from 'react'
import { Scissors, AudioWaveform, Upload } from 'lucide-react'
import { cn } from '@/lib/utils/ui/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FileUpload } from '@/components/FileUpload'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'

// Same constants as in home page
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
const ACCEPTED_FILE_TYPES = {
	'audio/mpeg': ['.mp3'],
	'audio/wav': ['.wav'],
	'audio/flac': ['.flac'],
}

interface AnalysisNavigationProps {
	activeTab: string
	onTabChange: (tab: string) => void
	orientation?: 'side' | 'bottom'
}

export function AnalysisNavigation({ activeTab, onTabChange, orientation = 'side' }: AnalysisNavigationProps) {
	const isSide = orientation === 'side'
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
	const [isDragging, setIsDragging] = useState(false)

	// Handle files dropped anywhere on the page
	const onPageDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
		// We will let the FileUpload component handle the actual file processing
		if (typeof window !== 'undefined' && window.handleExternalFileUpload) {
			window.handleExternalFileUpload(acceptedFiles, rejectedFiles)
		}
		setIsDragging(false)
		// Close dialog after successful drop
		if (acceptedFiles.length > 0) {
			setUploadDialogOpen(false)
		}
	}, [])

	// Set up document-level drag events
	useEffect(() => {
		if (!uploadDialogOpen) return

		// Only add listeners when dialog is open
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

				// Close dialog after successful drop
				if (acceptedFiles.length > 0) {
					setUploadDialogOpen(false)
				}
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
	}, [uploadDialogOpen])

	// Handle external file drops within the FileUpload component
	const handleExternalDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
		// Close the dialog after upload starts
		if (acceptedFiles.length > 0) {
			setUploadDialogOpen(false)
		}
	}, [])

	return (
		<>
			<div className={cn('flex items-center justify-center', isSide ? 'h-full flex-col' : 'w-full flex-row')}>
				{/* Navigation buttons with integrated indicators */}
				<div className={cn('flex gap-2', isSide ? 'flex-col' : 'flex-row')}>
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="relative flex items-center">
									<motion.div
										className={cn('absolute rounded-full', isSide ? 'left-0 w-1.5 h-14' : 'top-0 h-1 w-14')}
										animate={{
											backgroundColor: activeTab === 'analysis' ? 'var(--primary)' : 'var(--muted)',
											opacity: activeTab === 'analysis' ? 1 : 0.3,
										}}
										transition={{ duration: 0.3 }}
									/>
									<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
										<Button
											onClick={() => onTabChange('analysis')}
											variant="ghost"
											size="icon"
											className={cn(
												'relative w-14 h-14 rounded-xl transition-all duration-300',
												isSide ? 'ml-4' : 'mt-2',
												'group flex items-center justify-center',
												activeTab === 'analysis'
													? 'text-primary bg-primary/5 hover:bg-primary/10'
													: 'text-muted-foreground hover:text-primary/80 hover:bg-accent/30',
												'after:absolute after:inset-0 after:rounded-xl after:transition-all after:duration-300',
												activeTab === 'analysis' && 'after:shadow-[0_0_15px_rgba(var(--primary),0.1)]'
											)}
										>
											<AudioWaveform className="h-7 w-7" />
										</Button>
									</motion.div>
								</div>
							</TooltipTrigger>
							<TooltipContent side={isSide ? 'right' : 'top'} sideOffset={5} align="center">
								<p className="font-medium">Musical Analysis</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<div className="relative flex items-center">
									<motion.div
										className={cn('absolute rounded-full', isSide ? 'left-0 w-1.5 h-14' : 'top-0 h-1 w-14')}
										animate={{
											backgroundColor: activeTab === 'stems' ? 'var(--primary)' : 'var(--muted)',
											opacity: activeTab === 'stems' ? 1 : 0.3,
										}}
										transition={{ duration: 0.3 }}
									/>
									<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
										<Button
											onClick={() => onTabChange('stems')}
											variant="ghost"
											size="icon"
											className={cn(
												'relative w-14 h-14 rounded-xl transition-all duration-300',
												isSide ? 'ml-4' : 'mt-2',
												'group flex items-center justify-center',
												activeTab === 'stems'
													? 'text-primary bg-primary/5 hover:bg-primary/10'
													: 'text-muted-foreground hover:text-primary/80 hover:bg-accent/30',
												'after:absolute after:inset-0 after:rounded-xl after:transition-all after:duration-300',
												activeTab === 'stems' && 'after:shadow-[0_0_15px_rgba(var(--primary),0.1)]'
											)}
										>
											<Scissors className="h-7 w-7" />
										</Button>
									</motion.div>
								</div>
							</TooltipTrigger>
							<TooltipContent side={isSide ? 'right' : 'top'} sideOffset={5} align="center">
								<p className="font-medium">Stems Separation</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

				{/* New Analysis button - Only shown in side orientation */}
				{isSide && (
					<div className="mt-auto mb-4 flex items-center">
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="relative flex items-center">
										<motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
											<Button
												onClick={() => setUploadDialogOpen(true)}
												variant="ghost"
												size="icon"
												className={cn(
													'relative w-14 h-14 rounded-xl ml-4 transition-all duration-300',
													'text-muted-foreground hover:text-primary/80 hover:bg-accent/30'
												)}
											>
												<Upload className="h-7 w-7" />
											</Button>
										</motion.div>
									</div>
								</TooltipTrigger>
								<TooltipContent side="right" sideOffset={5} align="center">
									<p className="font-medium">New Analysis</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				)}

				{/* Upload Dialog */}
				{uploadDialogOpen && (
					<Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
						<DialogContent className="sm:max-w-md p-0 rounded-xl bg-background/60 backdrop-blur-sm border-border/60">
							<div className="bg-accent/30 p-6 rounded-xl">
								<div className="flex items-start gap-3 mb-4">
									<div className="min-w-10 min-h-10 w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary shrink-0">
										<AudioWaveform size={20} strokeWidth={2} className="h-5 w-5" />
									</div>
									<DialogHeader className="text-left">
										<DialogTitle className="text-lg font-medium">New Analysis</DialogTitle>
										<DialogDescription className="text-sm text-muted-foreground">
											Upload another audio file to analyze and separate it into stems.
										</DialogDescription>
									</DialogHeader>
								</div>
								<div className="w-full">
									<FileUpload pageIsDragging={isDragging} onExternalDrop={handleExternalDrop} />
								</div>
							</div>
						</DialogContent>
					</Dialog>
				)}
			</div>
		</>
	)
}
