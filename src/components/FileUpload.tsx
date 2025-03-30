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
	const [isSuccess, setIsSuccess] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Reset function to clear the state
	const resetUpload = useCallback(() => {
		setSelectedFile(null)
		setIsProcessing(false)
		setIsSuccess(false)
		setError(null)
	}, [])

	const handleFileUpload = useCallback(
		async (acceptedFiles: File[], rejectedFiles: any[]) => {
			// Clear any previous errors when attempting a new upload
			setError(null)
			setIsSuccess(false)

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
						// Show success state
						setIsProcessing(false)
						setIsSuccess(true)

						// Navigate to the analysis page with the results
						router.push(`/analysis?sessionId=${data.sessionId}`)
					} else {
						throw new Error(data.message)
					}
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
		disabled: isProcessing || isSuccess || !!error,
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

	return (
		<div className="w-full">
			<div
				{...getRootProps()}
				className={cn(
					'relative rounded-lg border w-full transition-all duration-200 h-56',
					error && 'border-destructive bg-destructive/10',
					isSuccess && 'border-green-500 bg-green-500/10',
					isProcessing && !error && 'border-primary bg-primary/5',
					!isProcessing && !isSuccess && !error && 'border-border hover:bg-accent/50'
				)}
			>
				<input {...getInputProps()} />
				<div className="flex flex-col items-center justify-center px-5 text-center w-full h-full">
					{isProcessing ? (
						<div className="space-y-3.5">
							<div className="w-11 h-11 rounded-full flex items-center justify-center bg-primary/20 mx-auto">
								<Loader2 className="h-5 w-5 text-primary animate-spin" />
							</div>
							<div>
								<p className="text-base font-medium">Processing audio...</p>
								<p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
							</div>
						</div>
					) : isSuccess ? (
						<div className="space-y-3.5">
							<div className="w-11 h-11 rounded-full flex items-center justify-center bg-green-500/20 mx-auto">
								<svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<div>
								<p className="text-base font-medium text-green-500">Upload successful!</p>
								<p className="text-sm text-muted-foreground mt-1">Redirecting to analysis...</p>
							</div>
						</div>
					) : error ? (
						<div className="space-y-3.5">
							<div className="w-11 h-11 rounded-full flex items-center justify-center bg-destructive/20 mx-auto">
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
						</div>
					) : pageIsDragging ? (
						<div className="space-y-3">
							<div className="w-11 h-11 rounded-full flex items-center justify-center bg-primary/20 mx-auto">
								<Upload className="h-5 w-5 text-primary" />
							</div>
							<div className="space-y-1">
								<p className="text-base font-medium text-primary">Drop anywhere to upload</p>
								<p className="text-sm text-primary/80">Release to analyze your audio</p>
							</div>
							<p className="text-xs text-muted-foreground pt-4">Supports MP3, WAV, and FLAC (max 10MB)</p>
						</div>
					) : (
						<div className="space-y-3">
							<div className="w-11 h-11 rounded-full flex items-center justify-center bg-muted mx-auto">
								<Upload className="h-5 w-5 text-muted-foreground" />
							</div>
							<div className="space-y-1">
								<p className="text-base font-medium">Drop your audio file here</p>
								<p className="text-sm text-muted-foreground">Or click to browse</p>
							</div>
							<Button type="button" variant="secondary" size="sm" className="mt-1">
								<File className="w-4 h-4 mr-1.5" />
								Select File
							</Button>
							<p className="text-xs text-muted-foreground pt-1.5">Supports MP3, WAV, and FLAC (max 10MB)</p>
						</div>
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
