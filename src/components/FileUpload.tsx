'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Upload, File, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function FileUpload() {
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

	const onDrop = useCallback(
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

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_FILE_TYPES,
		maxSize: MAX_FILE_SIZE,
		multiple: false,
		disabled: isProcessing && !error,
	})

	return (
		<div className="w-full max-w-xl mx-auto">
			<div
				{...getRootProps()}
				className={cn(
					'relative min-h-[280px] border-2 border-dashed rounded-lg p-8 text-center transition-colors',
					error && 'border-destructive bg-destructive/10 cursor-pointer',
					isDragActive && !error && 'border-primary bg-primary/5 cursor-pointer',
					isProcessing && !error && !isDragActive && 'border-primary bg-primary/5 cursor-default',
					!isProcessing && !error && !isDragActive && 'border-muted-foreground/25 hover:border-primary cursor-pointer'
				)}
			>
				<input {...getInputProps()} />
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
					{isProcessing && !error ? (
						<>
							<Loader2 className="w-12 h-12 text-primary animate-spin" />
							<p className="text-lg font-medium text-primary">Selected: {selectedFile?.name}</p>
							<p className="text-sm text-muted-foreground">Processing your audio file...</p>
						</>
					) : error ? (
						<>
							<div className="flex flex-col items-center gap-4">
								<AlertCircle className="w-12 h-12 text-destructive" />
								<p className="text-lg font-medium text-destructive">{error}</p>
								<Button
									type="button"
									variant="destructive"
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
							<Upload className="w-12 h-12 text-primary" />
							<p className="text-lg font-medium text-primary">Drop the file here</p>
						</>
					) : (
						<>
							<Upload className="w-12 h-12 text-muted-foreground" />
							<p className="text-lg font-medium">Drag & drop your audio file here, or click to select</p>
							<p className="text-sm text-muted-foreground">Supports MP3, WAV, and FLAC (max 10MB)</p>
							<Button type="button" variant="secondary">
								<File className="w-4 h-4 mr-2" />
								Choose File
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
