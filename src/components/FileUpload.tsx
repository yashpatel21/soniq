'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Upload, File, Loader2, AlertCircle, Music } from 'lucide-react'
import { cn } from '@/lib/utils/ui/utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
const ACCEPTED_FILE_TYPES = {
	'audio/mpeg': ['.mp3'],
	'audio/wav': ['.wav'],
	'audio/flac': ['.flac'],
}

interface FileUploadResponse {
	success: boolean
	sessionId: string
	message: string
}

interface FileUploadProps {
	pageIsDragging?: boolean
	onExternalDrop?: (acceptedFiles: File[], rejectedFiles: any[]) => void
}

export function FileUpload({ pageIsDragging, onExternalDrop }: FileUploadProps) {
	const router = useRouter()
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Reset function to clear the state
	const resetUpload = useCallback(() => {
		setSelectedFile(null)
		setIsProcessing(false)
		setError(null)
	}, [])

	const handleFileUpload = useCallback(
		async (acceptedFiles: File[], rejectedFiles: any[]) => {
			// Clear any previous errors when attempting a new upload
			setError(null)

			if (rejectedFiles.length > 0) {
				const error = rejectedFiles[0].errors[0]
				if (error.code === 'file-too-large') {
					toast.error('File is too large. Maximum size is 10MB.')
				} else if (error.code === 'file-invalid-type') {
					toast.error('Invalid file type. Please upload MP3, WAV, or FLAC files only.')
				} else {
					toast.error('Error uploading file. Please try again.')
				}
				return
			}

			if (acceptedFiles.length > 0) {
				const file = acceptedFiles[0]
				setSelectedFile(file)
				setIsProcessing(true)

				try {
					// Create FormData and append the file
					const formData = new FormData()
					formData.append('audioFile', file)

					// Send to API endpoint
					const response = await fetch('/api/audio-analysis-upload', {
						method: 'POST',
						body: formData,
					})

					if (!response.ok) {
						throw new Error(`Upload failed: ${response.statusText}`)
					}

					// Process successful response
					const data: FileUploadResponse = await response.json()
					console.log('Analysis result:', data)

					if (data.success) {
						// Navigate to the analysis page with the results
						router.push(`/analysis?sessionId=${data.sessionId}`)
					} else {
						throw new Error(data.message)
					}

					// Keep processing state active for 1 second to show the UI, for testing purposes
					setTimeout(() => {
						setIsProcessing(false)
					}, 1000)
				} catch (err) {
					console.error('Error uploading file:', err)
					setError('Failed to process the file. Please try again.')
					setIsProcessing(false)
				}
			}
		},
		[router]
	)

	// Use the onDrop callback for both component dropzone and page-level drops
	const onDrop = useCallback(
		(acceptedFiles: File[], rejectedFiles: any[]) => {
			handleFileUpload(acceptedFiles, rejectedFiles)
			if (onExternalDrop) {
				onExternalDrop(acceptedFiles, rejectedFiles)
			}
		},
		[handleFileUpload, onExternalDrop]
	)

	const {
		getRootProps,
		getInputProps,
		isDragActive: isComponentDragActive,
	} = useDropzone({
		onDrop,
		accept: ACCEPTED_FILE_TYPES,
		maxSize: MAX_FILE_SIZE,
		multiple: false,
		disabled: isProcessing && !error,
	})

	// Expose method to process files dropped outside of this component
	useEffect(() => {
		if (typeof window !== 'undefined' && !window.handleExternalFileUpload) {
			window.handleExternalFileUpload = handleFileUpload
		}
		return () => {
			if (typeof window !== 'undefined') {
				delete window.handleExternalFileUpload
			}
		}
	}, [handleFileUpload])

	// Determine if we should show drag state (either component or page level)
	const isDragActive = isComponentDragActive || pageIsDragging

	return (
		<div className="w-full">
			<div
				{...getRootProps()}
				className={cn(
					'relative rounded-lg border transition-all duration-200',
					error && 'border-destructive bg-destructive/10',
					isDragActive && !error && 'border-primary bg-primary/5',
					isProcessing && !error && !isDragActive && 'border-primary bg-primary/5',
					!isProcessing && !error && !isDragActive && 'border-border hover:bg-accent/50'
				)}
			>
				<input {...getInputProps()} />
				<div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center min-h-[180px]">
					{isProcessing && !error ? (
						<>
							<div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20">
								<Loader2 className="h-5 w-5 text-primary animate-spin" />
							</div>
							<div>
								<p className="text-base font-medium">Processing audio...</p>
								<p className="text-sm text-muted-foreground mt-0.5">This may take a moment</p>
							</div>
						</>
					) : error ? (
						<>
							<div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/20">
								<AlertCircle className="h-5 w-5 text-destructive" />
							</div>
							<div>
								<p className="text-base font-medium text-destructive">{error}</p>
								<Button
									type="button"
									variant="destructive"
									className="mt-3"
									onClick={(e) => {
										e.stopPropagation()
										resetUpload()
									}}
								>
									Try Again
								</Button>
							</div>
						</>
					) : isDragActive ? (
						<>
							<div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/20">
								<Music className="h-6 w-6 text-primary" />
							</div>
							<div>
								<p className="text-lg font-medium text-primary">Drop your audio file</p>
								<p className="text-sm text-primary/80 mt-0.5">Release to upload and start analysis</p>
							</div>
						</>
					) : (
						<>
							<div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted">
								<Upload className="h-5 w-5 text-muted-foreground" />
							</div>
							<div>
								<p className="text-base font-medium">Drop your audio file here</p>
								<p className="text-sm text-muted-foreground mt-0.5">Or click to browse</p>
							</div>
							<Button type="button" variant="secondary" size="sm" className="mt-2">
								<File className="w-4 h-4 mr-1.5" />
								Select File
							</Button>
							<p className="text-xs text-muted-foreground mt-4">Supports MP3, WAV, and FLAC (max 10MB)</p>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

// Add type definition for the global window object
declare global {
	interface Window {
		handleExternalFileUpload?: (acceptedFiles: File[], rejectedFiles: any[]) => void
	}
}
