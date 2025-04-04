import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Play, Pause, Volume2, VolumeX, Download, FileMusic } from 'lucide-react'
import { formatTime } from '@/lib/utils/ui/utils'
import { cn } from '@/lib/utils/ui/utils'
import { toast } from 'sonner'
import WaveSurfer from 'wavesurfer.js'
import { convertToMonoAndResample } from '@/lib/utils/audio/clientAudioProcessing'
import { MidiDialog } from '@/components/MidiDialog'
import { MIDI_DIALOG_OPENED_EVENT, MidiDialogEventDetail, createMidiDialogOpenedEvent } from '@/lib/utils/audio/audioEvents'

// Use a safe version of useLayoutEffect that falls back to useEffect in SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface WaveformPlayerProps {
	stemName: string
	stemUrl: string
	sessionId: string
	waveColor?: string
	progressColor?: string
	className?: string
}

export function WaveformPlayer({
	stemName,
	stemUrl,
	sessionId,
	waveColor = 'rgb(148, 163, 184)',
	progressColor = 'rgb(79, 70, 229)',
	className = '',
}: WaveformPlayerProps) {
	// Essential state
	const [isPlaying, setIsPlaying] = useState(false)
	const [isMuted, setIsMuted] = useState(false)
	const [volume, setVolume] = useState(0.75)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [isReady, setIsReady] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [containerReady, setContainerReady] = useState(false)
	const [isHoveringDownload, setIsHoveringDownload] = useState(false)
	const [isHoveringMidi, setIsHoveringMidi] = useState(false)
	const [isExtractingMidi, setIsExtractingMidi] = useState(false)
	const [audioSampleRate, setAudioSampleRate] = useState(44100) // Default to 44.1kHz as fallback

	// MIDI Dialog state
	const [midiDialogOpen, setMidiDialogOpen] = useState(false)
	const [processedAudioBuffer, setProcessedAudioBuffer] = useState<AudioBuffer | null>(null)

	// Refs
	const containerRef = useRef<HTMLDivElement>(null)
	const wavesurferRef = useRef<WaveSurfer | null>(null)
	const timeUpdateIntervalRef = useRef<number | null>(null)
	const isCleanedUpRef = useRef(false)

	// First, ensure container is properly sized and ready before WaveSurfer initialization
	useIsomorphicLayoutEffect(() => {
		if (!containerRef.current) return

		// Force container to have explicit dimensions before WaveSurfer initialization
		const container = containerRef.current
		const rect = container.getBoundingClientRect()

		// Apply explicit dimensions if needed
		if (rect.width === 0) {
			container.style.width = '100%'
		}

		if (rect.height === 0) {
			container.style.height = '24px'
		}

		// Ensure any existing inline styles don't conflict
		container.style.position = 'relative'
		container.style.display = 'block'

		// Signal that container is ready for WaveSurfer initialization
		setContainerReady(true)

		return () => {
			setContainerReady(false)
		}
	}, [])

	// Set up event listener to pause when any MIDI dialog opens
	useEffect(() => {
		// Handler for pausing playback when a MIDI dialog opens
		const handleMidiDialogOpened = (event: Event) => {
			// Cast to custom event type
			const customEvent = event as CustomEvent<MidiDialogEventDetail>
			const eventDetail = customEvent.detail

			// Only pause if we are playing and this event wasn't from this component
			if (isPlaying && wavesurferRef.current) {
				// Don't log if this is our own stem
				if (eventDetail.stemName !== stemName) {
					console.log(`Pausing ${stemName} because MIDI dialog opened for ${eventDetail.stemName}`)
				}
				wavesurferRef.current.pause()
				// Note: The 'pause' event will update isPlaying state
			}
		}

		// Add event listener
		window.addEventListener(MIDI_DIALOG_OPENED_EVENT, handleMidiDialogOpened)

		// Clean up event listener
		return () => {
			window.removeEventListener(MIDI_DIALOG_OPENED_EVENT, handleMidiDialogOpened)
		}
	}, [isPlaying, stemName])

	// Initialize WaveSurfer once container is ready
	useEffect(() => {
		// Exit early if server-side rendering, container not ready, or containerReady not set
		if (typeof window === 'undefined' || !containerRef.current || !containerReady) return

		// Reset cleanup flag on each initialization
		isCleanedUpRef.current = false

		// Create and configure WaveSurfer instance
		try {
			if (!containerRef.current) return

			const ws = WaveSurfer.create({
				container: containerRef.current,
				height: 24,
				waveColor,
				progressColor,
				barWidth: 1,
				barGap: 1,
				barRadius: 2,
				cursorWidth: 2,
				cursorColor: 'rgba(255, 255, 255, 0.5)',
				normalize: true,
				sampleRate: 44100, // Use standard CD-quality sample rate
				// Settings to improve visualization without user interaction
				backend: 'MediaElement',
				autoplay: false,
			})

			// Save reference
			wavesurferRef.current = ws

			// Add universal AudioContext handling for first user interaction
			const resumeAudioContext = () => {
				if (!ws || isCleanedUpRef.current) return

				try {
					// For WaveSurfer v7, try to access audio context
					if (ws.getMediaElement) {
						const audioElement = ws.getMediaElement()
						// Cast to any since the context property is added by WaveSurfer but not in HTMLMediaElement type
						const audioElementWithContext = audioElement as any
						if (audioElementWithContext?.context && audioElementWithContext.context.state === 'suspended') {
							audioElementWithContext.context.resume().catch((error: Error) => {
								console.warn('Could not resume AudioContext:', error)
							})
						}
					}
				} catch (e) {
					console.warn('Error accessing AudioContext:', e)
				}
			}

			// Add global listener for first user interaction
			const handleFirstInteraction = () => {
				resumeAudioContext()
				// Remove listeners after first interaction
				;['click', 'touchstart', 'keydown'].forEach((eventType: string) => {
					document.removeEventListener(eventType, handleFirstInteraction)
				})
			}

			// Add listeners to handle first user interaction
			;['click', 'touchstart', 'keydown'].forEach((eventType: string) => {
				document.addEventListener(eventType, handleFirstInteraction, { once: true })
			})

			// Handle waveform decoded event - force refreshing
			ws.on('decode', () => {
				if (isCleanedUpRef.current) return

				try {
					// After decode, force a refresh of the waveform
					setTimeout(() => {
						if (ws && !isCleanedUpRef.current) {
							// In v7, waveform should render automatically
							// If needed, we could use setOptions to force a re-render
							ws.setOptions({ waveColor })
						}
					}, 50)
				} catch (e) {
					console.warn(`Could not force waveform display for ${stemName}:`, e)
				}
			})

			// Set up event listeners
			ws.on('ready', () => {
				if (isCleanedUpRef.current) return
				setDuration(ws.getDuration())
				setIsReady(true)

				// Set initial volume after the audio is fully loaded
				try {
					ws.setVolume(isMuted ? 0 : volume)
				} catch (e) {
					console.error('Error setting initial volume:', e)
				}

				// Run a second refresh to ensure visualization is visible
				try {
					// In v7, force a re-render by setting options
					ws.setOptions({ waveColor, progressColor })
				} catch (e) {
					console.warn(`Secondary refresh failed for ${stemName}:`, e)
				}

				// Enable clicking on waveform to play from that position
				ws.on('click', () => {
					if (isCleanedUpRef.current) return

					// If not playing, start playback
					if (!ws.isPlaying()) {
						try {
							// Try to resume AudioContext before playing
							resumeAudioContext()
							ws.play()
						} catch (e) {
							console.error('Error starting playback after waveform click:', e)
						}
					}
				})
			})

			ws.on('play', () => {
				if (isCleanedUpRef.current) return
				setIsPlaying(true)
			})

			ws.on('pause', () => {
				if (isCleanedUpRef.current) return
				setIsPlaying(false)
			})

			ws.on('error', (err) => {
				if (isCleanedUpRef.current) return

				const errorStr = String(err)

				// Don't treat AudioContext errors as fatal
				if (errorStr.includes('AudioContext') || errorStr.includes('user aborted') || errorStr.includes('play()')) {
					console.warn(`Non-critical audio error for ${stemName}:`, errorStr)
					return
				}

				// Ignore AbortError when it's related to volume changes
				if (err.name === 'AbortError' && err.message.includes('user aborted')) {
					console.warn(`Non-critical abort error for ${stemName}:`, err)
					return
				}

				console.error(`WaveSurfer error for ${stemName}:`, err)
				setError('Failed to load audio')
			})

			// Set up time update interval
			timeUpdateIntervalRef.current = window.setInterval(() => {
				if (isCleanedUpRef.current) return
				if (ws && ws.isPlaying()) {
					setCurrentTime(ws.getCurrentTime())
				}
			}, 250)

			// Load audio
			try {
				ws.load(stemUrl)

				// Add a fallback to ensure waveform always appears
				const displayTimeout = setTimeout(() => {
					if (!isCleanedUpRef.current && ws) {
						try {
							// In v7, force a re-render by setting options
							ws.setOptions({ waveColor, progressColor })
						} catch (e) {
							console.warn(`Fallback waveform refresh failed for ${stemName}:`, e)
						}
					}
				}, 2000)
			} catch (err) {
				console.error(`Error loading audio for ${stemName}:`, err)
				if (!isCleanedUpRef.current) {
					setError('Failed to load audio')
				}
			}
		} catch (initError) {
			console.error('Failed to initialize WaveSurfer:', initError)
			if (!isCleanedUpRef.current) {
				setError('Failed to initialize audio player')
			}
		}

		// Cleanup function
		return () => {
			// Mark as cleaned up to prevent state updates
			isCleanedUpRef.current = true

			// Remove document-level event listeners
			const handleFirstInteraction = () => {} // Empty function for TypeScript
			;['click', 'touchstart', 'keydown'].forEach((eventType: string) => {
				document.removeEventListener(eventType, handleFirstInteraction)
			})

			// Clear time update interval
			if (timeUpdateIntervalRef.current) {
				clearInterval(timeUpdateIntervalRef.current)
				timeUpdateIntervalRef.current = null
			}

			// Safely destroy wavesurfer instance
			try {
				if (wavesurferRef.current) {
					// Try/catch here in case wavesurfer is already being destroyed or has issues
					try {
						wavesurferRef.current.destroy()
					} catch (e) {
						console.log('Wavesurfer already destroyed or errored during cleanup')
					}
					wavesurferRef.current = null
				}
			} catch (e) {
				console.error('Error cleaning up WaveSurfer:', e)
			}
		}
	}, [stemName, stemUrl, waveColor, progressColor, containerReady])

	// Handle MIDI dialog open/close
	useEffect(() => {
		if (midiDialogOpen) {
			// Pause this player if it's playing
			if (isPlaying && wavesurferRef.current) {
				wavesurferRef.current.pause()
			}

			// Dispatch event to pause all other players
			window.dispatchEvent(
				createMidiDialogOpenedEvent({
					stemName,
					sourceId: sessionId,
				})
			)
		}
	}, [midiDialogOpen, isPlaying, stemName, sessionId])

	// Maintain a reference to the current volume and mute state
	const volumeRef = useRef(volume)
	const isMutedRef = useRef(isMuted)

	// Update refs when state changes
	useEffect(() => {
		volumeRef.current = volume
		isMutedRef.current = isMuted
	}, [volume, isMuted])

	// Update volume when it changes in a separate effect with debounce
	useEffect(() => {
		if (!wavesurferRef.current || !isReady || isCleanedUpRef.current) return

		// Use debounce to prevent rapid sequential volume changes
		const debounceTimeout = setTimeout(() => {
			if (!wavesurferRef.current || isCleanedUpRef.current) return

			try {
				wavesurferRef.current.setVolume(isMuted ? 0 : volume)
			} catch (e: any) {
				// Ignore AbortError
				if (e.name === 'AbortError') {
					console.warn('Volume change aborted, ignoring:', e)
				} else {
					console.error('Error setting volume:', e)
				}
				// Don't set error state for volume errors
			}
		}, 100)

		return () => clearTimeout(debounceTimeout)
	}, [volume, isMuted, isReady])

	// Handle play/pause with AudioContext resuming
	const togglePlayPause = () => {
		if (!wavesurferRef.current || !isReady || isCleanedUpRef.current) return

		try {
			// Try to resume AudioContext before playing
			if (wavesurferRef.current.getMediaElement) {
				const audioElement = wavesurferRef.current.getMediaElement()
				// Cast to any since the context property is added by WaveSurfer but not in HTMLMediaElement type
				const audioElementWithContext = audioElement as any
				if (audioElementWithContext?.context && audioElementWithContext.context.state === 'suspended') {
					audioElementWithContext.context
						.resume()
						.then(() => {
							if (wavesurferRef.current) {
								wavesurferRef.current.playPause()
							}
						})
						.catch((error: Error) => {
							// Try playback anyway if resume fails
							if (wavesurferRef.current) {
								wavesurferRef.current.playPause()
							}
						})
				} else {
					wavesurferRef.current.playPause()
				}
			} else {
				wavesurferRef.current.playPause()
			}
		} catch (e) {
			console.error('Error toggling playback:', e)
			// Try direct playback as fallback
			try {
				if (wavesurferRef.current) {
					wavesurferRef.current.playPause()
				}
			} catch (innerE) {
				console.error('Final playback attempt failed:', innerE)
			}
		}
	}

	// Handle volume change with error trapping
	const handleVolumeChange = (values: number[]) => {
		if (!isReady) return

		try {
			const newVolume = values[0] / 100
			setVolume(newVolume)

			if (newVolume === 0) {
				setIsMuted(true)
			} else if (isMuted) {
				setIsMuted(false)
			}
		} catch (e) {
			console.error('Error handling volume change:', e)
			// Don't set error state for volume changes
		}
	}

	// Handle mute toggle
	const toggleMute = () => {
		try {
			setIsMuted(!isMuted)
		} catch (e) {
			console.error('Error toggling mute:', e)
			// Don't set error state for mute toggle
		}
	}

	// Handle MIDI extraction - also broadcasts MIDI dialog opened event
	const handleMidiExtraction = async () => {
		if (isExtractingMidi || !wavesurferRef.current || !isReady) return

		try {
			setIsExtractingMidi(true)

			// Convert audio to mono and resample to 22050Hz
			const processedBuffer = await convertToMonoAndResample(wavesurferRef.current)

			// Store the processed audio buffer
			setProcessedAudioBuffer(processedBuffer)

			// Open the MIDI dialog
			setMidiDialogOpen(true)
		} catch (e) {
			console.error('Error processing audio for MIDI extraction:', e)
			toast.error(e instanceof Error ? e.message : 'Failed to process audio')
		} finally {
			setIsExtractingMidi(false)
		}
	}

	// Handle download
	const handleDownload = () => {
		try {
			// First create a link with the source URL
			const link = document.createElement('a')
			link.href = stemUrl
			console.log('stemUrl', stemUrl)

			// Determine file extension based on content-type
			const determineExtension = async () => {
				try {
					// Make a HEAD request to get content-type
					const response = await fetch(stemUrl, { method: 'HEAD' })
					const contentType = response.headers.get('content-type') || ''
					console.log('Content-Type:', contentType)

					// Map content type to extension
					let fileExtension = '.mp3' // Default fallback
					if (contentType.includes('audio/wav') || contentType.includes('audio/x-wav')) {
						fileExtension = '.wav'
					} else if (contentType.includes('audio/ogg')) {
						fileExtension = '.ogg'
					} else if (contentType.includes('audio/mp4') || contentType.includes('audio/x-m4a')) {
						fileExtension = '.m4a'
					} else if (contentType.includes('audio/flac')) {
						fileExtension = '.flac'
					} else if (contentType.includes('audio/mpeg')) {
						fileExtension = '.mp3'
					}

					// Complete the download with the determined extension
					link.download = `${stemName}${fileExtension}`
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)

					// Show success message
					toast.success(`Downloaded ${stemName} audio file`)
				} catch (error) {
					// Fallback to URL-based extension if header request fails
					console.warn('Could not detect content-type, falling back to URL pattern', error)

					// Try to determine extension from URL
					let fileExtension = '.mp3' // Default fallback
					if (stemUrl.includes('.wav')) fileExtension = '.wav'
					else if (stemUrl.includes('.ogg')) fileExtension = '.ogg'
					else if (stemUrl.includes('.m4a')) fileExtension = '.m4a'
					else if (stemUrl.includes('.flac')) fileExtension = '.flac'

					link.download = `${stemName}${fileExtension}`
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)

					// Show success message
					toast.success(`Downloaded ${stemName} audio file`)
				}
			}

			// Execute the async function
			determineExtension()
		} catch (e) {
			console.error('Error downloading file:', e)
			toast.error('Failed to download audio file')
		}
	}

	// Get stem icon
	const getStemIcon = () => {
		const stemLower = stemName.toLowerCase()
		if (stemLower.includes('vocal')) return '🎤'
		if (stemLower.includes('drum')) return '🥁'
		if (stemLower.includes('bass')) return '🎸'
		if (stemLower.includes('guitar')) return '🎸'
		if (stemLower.includes('piano')) return '🎹'
		if (stemLower.includes('keys')) return '🎹'
		if (stemLower.includes('strings')) return '🎻'
		if (stemLower.includes('wind')) return '🎷'
		return '🎵'
	}

	// Card style based on stem type
	const cardStyle = {
		borderLeft: `3px solid ${progressColor}`,
		background: `linear-gradient(135deg, rgba(${progressColor.match(/\d+/g)?.[0]},${progressColor.match(/\d+/g)?.[1]},${
			progressColor.match(/\d+/g)?.[2]
		},0.05), rgba(${progressColor.match(/\d+/g)?.[0]},${progressColor.match(/\d+/g)?.[1]},${progressColor.match(/\d+/g)?.[2]},0.12))`,
	}

	// Error state
	if (error) {
		return (
			<Card className={cn('border border-destructive/30 text-xs p-2 text-center', className)}>
				<p className="font-medium text-destructive">Error loading audio</p>
				<p className="text-xs text-muted-foreground">Unable to process this stem</p>
			</Card>
		)
	}

	// Normal state
	return (
		<>
			<Card className={cn('border px-1.5 py-2.5', className)} style={cardStyle}>
				{/* Header row with title and download */}
				<div className="flex items-center justify-between mb-0 mt-0.5 relative z-10">
					<div className="flex items-center gap-1.5">
						<span className="text-lg">{getStemIcon()}</span>
						<span className="text-lg font-medium line-clamp-1">{stemName}</span>
					</div>

					<div className="flex items-center gap-1">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										onClick={handleDownload}
										className={cn(
											'h-7 w-7 rounded-full',
											isHoveringDownload
												? 'bg-primary text-primary-foreground shadow-sm'
												: 'text-muted-foreground hover:bg-muted/80'
										)}
										onMouseEnter={() => setIsHoveringDownload(true)}
										onMouseLeave={() => setIsHoveringDownload(false)}
									>
										<Download className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Download {stemName}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										onClick={handleMidiExtraction}
										disabled={isExtractingMidi}
										className={cn(
											'h-7 w-7 rounded-full',
											isExtractingMidi && 'opacity-50 cursor-not-allowed',
											isHoveringMidi && !isExtractingMidi
												? 'bg-primary text-primary-foreground shadow-sm'
												: 'text-muted-foreground hover:bg-muted/80'
										)}
										onMouseEnter={() => setIsHoveringMidi(true)}
										onMouseLeave={() => setIsHoveringMidi(false)}
									>
										<FileMusic className={cn('h-4 w-4', isExtractingMidi && 'animate-pulse')} />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>{isExtractingMidi ? 'Extracting MIDI...' : `Extract MIDI from ${stemName}`}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>

				{/* Waveform container */}
				<div ref={containerRef} className="w-full rounded-md overflow-hidden bg-card/50 my-0 relative z-10" />

				{/* Controls row */}
				<div className="flex items-center relative text-xs mt-0 mb-0.5 px-1.5 z-10">
					<Button
						size="sm"
						variant={isPlaying ? 'default' : 'secondary'}
						className={cn(
							'h-8 w-8 rounded-full p-0 shadow-sm transition-all duration-200',
							isPlaying
								? 'text-primary-foreground hover:brightness-110 hover:shadow-md'
								: 'bg-gradient-to-br from-background/90 to-background/60 hover:shadow-md hover:scale-105 hover:brightness-110',
							!isReady && 'opacity-50'
						)}
						onClick={togglePlayPause}
						disabled={!isReady}
						style={
							isPlaying
								? ({
										backgroundColor: progressColor,
										boxShadow: 'none',
								  } as React.CSSProperties)
								: ({
										borderColor: `${progressColor}40`,
										background: `linear-gradient(135deg, rgba(${progressColor.match(/\d+/g)?.[0]},${
											progressColor.match(/\d+/g)?.[1]
										},${progressColor.match(/\d+/g)?.[2]},0.1), rgba(${progressColor.match(/\d+/g)?.[0]},${
											progressColor.match(/\d+/g)?.[1]
										},${progressColor.match(/\d+/g)?.[2]},0.2))`,
										'--tw-ring-color': `${progressColor}40`,
										'--tw-ring-offset-shadow':
											'var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)',
										'--tw-ring-shadow':
											'var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)',
								  } as React.CSSProperties)
						}
						onMouseEnter={(e) => {
							if (isPlaying) {
								// Remove box-shadow and add scale effect for pause button
								e.currentTarget.style.boxShadow = 'none'
								e.currentTarget.style.transform = 'scale(1.05)'
								e.currentTarget.style.filter = 'brightness(1.1)'
							} else {
								// No ring for play button, just enhance the background
								e.currentTarget.style.boxShadow = 'none'
								e.currentTarget.style.background = `linear-gradient(135deg, rgba(${progressColor.match(/\d+/g)?.[0]},${
									progressColor.match(/\d+/g)?.[1]
								},${progressColor.match(/\d+/g)?.[2]},0.4), rgba(${progressColor.match(/\d+/g)?.[0]},${
									progressColor.match(/\d+/g)?.[1]
								},${progressColor.match(/\d+/g)?.[2]},0.6))`
								const playIcon = e.currentTarget.querySelector('.h-4.w-4')
								if (playIcon) {
									;(playIcon as HTMLElement).style.color = 'white'
								}
							}
						}}
						onMouseLeave={(e) => {
							if (isPlaying) {
								e.currentTarget.style.boxShadow = 'none'
								e.currentTarget.style.transform = ''
								e.currentTarget.style.filter = ''
							} else {
								e.currentTarget.style.boxShadow = ''
								e.currentTarget.style.borderColor = `${progressColor}40`
								e.currentTarget.style.background = `linear-gradient(135deg, rgba(${progressColor.match(/\d+/g)?.[0]},${
									progressColor.match(/\d+/g)?.[1]
								},${progressColor.match(/\d+/g)?.[2]},0.1), rgba(${progressColor.match(/\d+/g)?.[0]},${
									progressColor.match(/\d+/g)?.[1]
								},${progressColor.match(/\d+/g)?.[2]},0.2))`
								const playIcon = e.currentTarget.querySelector('.h-4.w-4')
								if (playIcon) {
									;(playIcon as HTMLElement).style.color = ''
								}
							}
						}}
					>
						{isPlaying ? (
							<Pause className="h-4 w-4" style={{ color: 'white' }} />
						) : (
							<Play className="h-4 w-4" style={{ color: 'white' }} />
						)}
					</Button>

					{/* Centered timestamp */}
					<div className="absolute left-0 right-0 mx-auto w-fit text-center">
						<span className="text-xs text-muted-foreground">
							{isReady ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '--:--'}
						</span>
					</div>

					{/* Right-aligned volume controls */}
					<div className="ml-auto flex items-center gap-1.5">
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleMute}
							className={cn(
								'h-5 w-5 p-0 rounded-full',
								isMuted ? 'text-muted-foreground/60' : 'text-muted-foreground',
								!isReady && 'opacity-50'
							)}
							disabled={!isReady}
						>
							{isMuted ? <VolumeX className="h-2.5 w-2.5" /> : <Volume2 className="h-2.5 w-2.5" />}
						</Button>

						<Slider
							value={[isMuted ? 0 : volume * 100]}
							max={100}
							step={1}
							className={cn('cursor-pointer h-1 w-12 sm:w-16 stem-colored-slider', !isReady && 'opacity-50')}
							onValueChange={handleVolumeChange}
							disabled={!isReady}
							style={
								{
									// Dark background with a subtle hint of the stem color
									'--slider-track': `rgba(${progressColor.match(/\d+/g)?.[0]},${progressColor.match(/\d+/g)?.[1]},${
										progressColor.match(/\d+/g)?.[2]
									},0.08)`,
									'--slider-range': progressColor,
									'--slider-thumb': progressColor,
								} as React.CSSProperties
							}
						/>
					</div>
				</div>
			</Card>

			{/* MIDI Dialog */}
			{processedAudioBuffer && (
				<MidiDialog
					open={midiDialogOpen}
					onOpenChange={setMidiDialogOpen}
					audioBuffer={processedAudioBuffer}
					stemName={stemName}
					stemColor={progressColor}
				/>
			)}
		</>
	)
}
