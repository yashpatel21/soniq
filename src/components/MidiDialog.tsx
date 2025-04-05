'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PianoRoll } from '@/components/PianoRoll'
import {
	Download,
	FileMusic,
	Pause,
	Play,
	SkipBack,
	Volume,
	Volume1,
	Volume2,
	VolumeX,
	RefreshCw,
	SlidersHorizontal,
	ChevronDown,
} from 'lucide-react'
import { formatTime } from '@/lib/utils/ui/utils'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createDownloadableMidiFromAudioBuffer } from '@/lib/utils/midi/midiExtraction'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils/ui/utils'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { MIDI_DIALOG_OPENED_EVENT, createMidiDialogOpenedEvent } from '@/lib/utils/audio/audioEvents'

interface MidiDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	audioBuffer: AudioBuffer | null
	stemName: string
	stemColor?: string
}

export function MidiDialog({ open, onOpenChange, audioBuffer, stemName, stemColor = '#3B82F6' }: MidiDialogProps) {
	// State for MIDI playback
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [volume, setVolume] = useState(0.75)
	const [isMuted, setIsMuted] = useState(false)
	const [isReady, setIsReady] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)

	// State for MIDI data
	const [midiObject, setMidiObject] = useState<Midi | null>(null)
	const [downloadUrl, setDownloadUrl] = useState<string>('')
	const [filename, setFilename] = useState<string>('')

	// Default parameter values (as constants for easy reference)
	const DEFAULT_ONSET_THRESHOLD = 0.5
	const DEFAULT_FRAME_THRESHOLD = 0.3
	const DEFAULT_MIN_NOTE_LENGTH = 11

	// State for MIDI extraction parameters
	const [onsetThreshold, setOnsetThreshold] = useState(DEFAULT_ONSET_THRESHOLD)
	const [frameThreshold, setFrameThreshold] = useState(DEFAULT_FRAME_THRESHOLD)
	const [minNoteLength, setMinNoteLength] = useState(DEFAULT_MIN_NOTE_LENGTH)

	// Track previous open state to detect when dialog opens
	const prevOpenRef = useRef(false)
	const hasDispatchedEventRef = useRef(false)

	// Refs
	const synth = useRef<Tone.Sampler | null>(null)
	const part = useRef<Tone.Part | null>(null)
	const startTime = useRef<number>(0)
	const updateInterval = useRef<NodeJS.Timeout | null>(null)
	const audioBufferRef = useRef<AudioBuffer | null>(null)

	// Detect dialog open state changes and dispatch event when it opens
	useEffect(() => {
		if (open && !hasDispatchedEventRef.current) {
			// Broadcast event to pause all stem players when dialog opens
			window.dispatchEvent(
				createMidiDialogOpenedEvent({
					stemName: stemName,
					sourceId: 'midi-dialog',
				})
			)
			// console.log('MIDI dialog opened, dispatched pause event')
			hasDispatchedEventRef.current = true
		} else if (!open) {
			// Reset the flag when dialog closes
			hasDispatchedEventRef.current = false
		}
	}, [open, stemName])

	// Initialize when dialog opens
	useEffect(() => {
		if (!open) {
			prevOpenRef.current = false
			return
		}

		// console.log('MidiDialog opened')
		audioBufferRef.current = audioBuffer

		// Reset playback state
		setIsPlaying(false)
		setCurrentTime(0)
		setIsReady(false)
		setIsProcessing(true)

		// Reset extraction parameters to defaults if this is a new opening (not a re-render)
		if (!prevOpenRef.current) {
			// console.log('Resetting extraction parameters to defaults')
			// Reset to default values
			setOnsetThreshold(DEFAULT_ONSET_THRESHOLD)
			setFrameThreshold(DEFAULT_FRAME_THRESHOLD)
			setMinNoteLength(DEFAULT_MIN_NOTE_LENGTH)

			// Mark dialog as opened to prevent re-resets
			prevOpenRef.current = true

			// Use a small delay to ensure states are updated before extraction
			setTimeout(() => {
				initializePianoAndExtractMidi(DEFAULT_ONSET_THRESHOLD, DEFAULT_FRAME_THRESHOLD, DEFAULT_MIN_NOTE_LENGTH)
			}, 0)
		} else {
			// Continue with current parameters if it's just a re-render
			initializePianoAndExtractMidi(onsetThreshold, frameThreshold, minNoteLength)
		}

		// Cleanup on dialog close
		return () => {
			stopPlayback()
		}
	}, [open, audioBuffer])

	// Function to initialize piano and extract MIDI with specific parameters
	const initializePianoAndExtractMidi = async (onset: number, frame: number, minLength: number) => {
		try {
			// Create piano sampler if it doesn't exist yet
			if (!synth.current) {
				synth.current = new Tone.Sampler({
					urls: {
						A0: 'A0.mp3',
						C1: 'C1.mp3',
						'D#1': 'Ds1.mp3',
						'F#1': 'Fs1.mp3',
						A1: 'A1.mp3',
						C2: 'C2.mp3',
						'D#2': 'Ds2.mp3',
						'F#2': 'Fs2.mp3',
						A2: 'A2.mp3',
						C3: 'C3.mp3',
						'D#3': 'Ds3.mp3',
						'F#3': 'Fs3.mp3',
						A3: 'A3.mp3',
						C4: 'C4.mp3',
						'D#4': 'Ds4.mp3',
						'F#4': 'Fs4.mp3',
						A4: 'A4.mp3',
						C5: 'C5.mp3',
						'D#5': 'Ds5.mp3',
						'F#5': 'Fs5.mp3',
						A5: 'A5.mp3',
						C6: 'C6.mp3',
						'D#6': 'Ds6.mp3',
						'F#6': 'Fs6.mp3',
						A6: 'A6.mp3',
						C7: 'C7.mp3',
						'D#7': 'Ds7.mp3',
						'F#7': 'Fs7.mp3',
						A7: 'A7.mp3',
						C8: 'C8.mp3',
					},
					release: 1,
					baseUrl: 'https://tonejs.github.io/audio/salamander/',
					onload: () => {
						// console.log('Piano sampler loaded successfully')
					},
				}).toDestination()

				// console.log('Initialized Piano Sampler')
			}

			// Set initial volume
			if (synth.current) {
				synth.current.volume.value = isMuted ? -Infinity : Tone.gainToDb(volume)
			}

			// Process audio buffer to extract MIDI if available
			if (audioBufferRef.current) {
				try {
					// console.log(`Extracting MIDI with parameters: onset=${onset}, frame=${frame}, minLength=${minLength}`)
					const { url, filename, midiObject } = await createDownloadableMidiFromAudioBuffer(
						audioBufferRef.current,
						stemName,
						onset,
						frame,
						minLength
					)

					// Validate MIDI data
					let totalNotes = 0
					if (midiObject && midiObject.tracks) {
						midiObject.tracks.forEach((track) => {
							if (track.notes) {
								totalNotes += track.notes.length
							}
						})
					}

					if (totalNotes === 0) {
						console.warn('Extraction completed but no MIDI notes were detected')
						toast.warning('No MIDI notes detected. Try adjusting the parameters.')
					} else {
						// console.log(`MIDI extraction successful with ${totalNotes} notes`)
					}

					setDownloadUrl(url)
					setFilename(filename)
					setMidiObject(midiObject)

					// Calculate duration from MIDI
					if (midiObject && midiObject.tracks.length > 0) {
						const calculatedDuration = Math.max(
							...midiObject.tracks.map((track) => {
								if (!track.notes || track.notes.length === 0) return 0
								const lastNote = track.notes[track.notes.length - 1]
								return lastNote.time + lastNote.duration
							})
						)

						setDuration(Math.max(calculatedDuration, 1))
						// console.log(`MIDI duration: ${calculatedDuration} seconds`)
					}

					// Mark as ready
					setIsReady(true)
					setIsProcessing(false)
				} catch (error) {
					console.error('Error processing audio buffer:', error)
					toast.error('Failed to extract MIDI data')
					setIsProcessing(false)
				}
			} else {
				setIsProcessing(false)
			}
		} catch (error) {
			console.error('Error initializing piano sampler:', error)
			toast.error('Failed to load piano samples')
			setIsProcessing(false)
		}
	}

	// Separate effect for handling volume changes
	useEffect(() => {
		if (synth.current) {
			synth.current.volume.value = isMuted ? -Infinity : Tone.gainToDb(volume)
			// console.log(`Volume updated: ${isMuted ? 'muted' : volume}`)
		}
	}, [volume, isMuted])

	// Re-process MIDI with updated parameters
	const handleReprocessMidi = () => {
		if (!audioBufferRef.current) return

		// Stop any current playback
		stopPlayback()
		setCurrentTime(0)
		setIsReady(false)
		setIsProcessing(true)

		// Process with current parameters
		initializePianoAndExtractMidi(onsetThreshold, frameThreshold, minNoteLength)
	}

	// Start playback
	const startPlayback = async () => {
		if (!midiObject || isPlaying) return
		if (!synth.current) {
			console.error('Piano sampler not available')
			toast.error('Piano sampler not initialized')
			return
		}

		// Make sure the piano samples are loaded
		if (!synth.current.loaded) {
			console.warn('Piano samples still loading, waiting...')
			toast.warning('Piano samples are still loading...')
			return
		}

		try {
			// Try to start audio context
			await Tone.start()
			// console.log('Tone.js audio context started')

			// Make sure the audio is unmuted
			if (isMuted) {
				setIsMuted(false)
			}

			// Always reconnect to be safe
			synth.current.toDestination()
			synth.current.volume.value = Tone.gainToDb(volume)

			// Create events from MIDI data
			createMidiEvents()

			// Check if part was successfully created
			if (!part.current) {
				console.error('Failed to create MIDI part')
				return
			}

			// Mark the start time
			startTime.current = Tone.now()

			// Stop any existing transport
			Tone.Transport.stop()
			Tone.Transport.cancel()

			// Set transport position
			Tone.Transport.seconds = currentTime

			// Start the part/sequence
			part.current.start(0)
			// console.log(`Starting playback at time ${currentTime}`)

			// Start transport
			Tone.Transport.start()

			// Update state
			setIsPlaying(true)

			// Start update interval for playhead
			const intervalId = setInterval(() => {
				if (Tone.Transport.state === 'started') {
					const newTime = Math.min(Tone.now() - startTime.current + currentTime, duration)
					setCurrentTime(newTime)

					// Check if we've reached the end
					if (newTime >= duration) {
						stopPlayback()
						// Explicitly reset the currentTime to 0 which will trigger the scroll reset
						setCurrentTime(0)
						// console.log('Playback completed, resetting to beginning')
					}
				}
			}, 100)

			updateInterval.current = intervalId
		} catch (error) {
			console.error('Error starting playback:', error)
		}
	}

	// Stop playback
	const stopPlayback = () => {
		// Update UI state first
		setIsPlaying(false)

		// Clear interval
		if (updateInterval.current) {
			clearInterval(updateInterval.current)
			updateInterval.current = null
		}

		// Stop all active notes
		if (synth.current) {
			try {
				synth.current.releaseAll()
			} catch (error) {
				console.warn('Error releasing synth notes:', error)
			}
		}

		// Stop transport
		try {
			Tone.Transport.stop()
			Tone.Transport.cancel()
		} catch (error) {
			console.warn('Error stopping Tone.js transport:', error)
		}

		// Dispose and recreate part to avoid memory leaks
		if (part.current) {
			try {
				part.current.stop(0)
				part.current.dispose()
				part.current = null
			} catch (error) {
				console.warn('Error disposing part:', error)
			}
		}

		// console.log('Playback stopped and all resources cleaned up')
	}

	// Create MIDI events for playback
	const createMidiEvents = () => {
		if (!midiObject || !synth.current) {
			console.error('Missing midiObject or synth for createMidiEvents')
			return
		}

		// Dispose existing part if any
		if (part.current) {
			try {
				part.current.dispose()
			} catch (error) {
				console.warn('Error disposing existing part:', error)
			}
			part.current = null
		}

		// Create events array from MIDI notes
		const events: Array<[number, { note: string; duration: number; velocity: number }]> = []
		let noteCount = 0

		midiObject.tracks.forEach((track, trackIndex) => {
			if (!track.notes || track.notes.length === 0) return

			track.notes.forEach((note) => {
				const noteName = Tone.Frequency(note.midi, 'midi').toNote()
				events.push([
					note.time,
					{
						note: noteName,
						duration: note.duration,
						velocity: note.velocity,
					},
				])
				noteCount++
			})
		})

		// Check if we have notes to play
		if (noteCount === 0) {
			console.warn('No notes found in MIDI data')
			return
		}

		// console.log(`Processed ${noteCount} MIDI notes for playback`)

		// Sort events by time
		events.sort((a, b) => a[0] - b[0])

		// Create new part with callback that explicitly uses the synth
		const newPart = new Tone.Part((time, value) => {
			// Verify synth exists
			if (!synth.current) {
				console.error('Synth not available at note trigger time')
				return
			}

			// Trigger note with explicit parameters
			// console.log(`Playing note ${value.note} at ${time} for ${value.duration}s with velocity ${value.velocity}`)
			try {
				synth.current.triggerAttackRelease(value.note, value.duration, time, value.velocity)
			} catch (e) {
				console.error('Error triggering note:', e)
			}
		}, events)

		// Configure part
		newPart.loop = false

		// Store reference
		part.current = newPart
	}

	// Toggle playback
	const togglePlayback = () => {
		if (isPlaying) {
			stopPlayback()
		} else {
			startPlayback()
		}
	}

	// Reset playback to beginning
	const resetPlayback = () => {
		// console.log('Resetting playback to beginning')

		// Stop playback first
		stopPlayback()

		// Reset the Tone.js transport position explicitly
		try {
			Tone.Transport.position = 0
		} catch (error) {
			console.warn('Error resetting Transport position:', error)
		}

		// Reset UI state
		setCurrentTime(0)

		// Force component to redraw with playhead at position 0
		setTimeout(() => {
			// This will trigger a re-render of the piano roll
			// The timeout helps ensure state updates have completed
			// console.log('Forced piano roll redraw after reset')
		}, 50)
	}

	// Handle volume change
	const handleVolumeChange = (values: number[]) => {
		const newVolume = values[0] / 100
		setVolume(newVolume)

		if (newVolume === 0) {
			setIsMuted(true)
		} else if (isMuted) {
			setIsMuted(false)
		}
	}

	// Toggle mute
	const toggleMute = () => {
		setIsMuted(!isMuted)
	}

	// Handle download
	const handleDownload = () => {
		if (!downloadUrl || !filename) return

		const link = document.createElement('a')
		link.href = downloadUrl
		link.download = filename
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)

		toast.success(`Downloaded ${stemName} MIDI file`)
	}

	// Get volume icon based on volume level and mute state
	const getVolumeIcon = () => {
		if (isMuted) return <VolumeX className="h-4 w-4" />
		if (volume < 0.01) return <VolumeX className="h-4 w-4" />
		if (volume < 0.4) return <Volume className="h-4 w-4" />
		if (volume < 0.7) return <Volume1 className="h-4 w-4" />
		return <Volume2 className="h-4 w-4" />
	}

	// Format slider value as percentage
	const formatPercentage = (value: number) => `${Math.round(value * 100)}%`

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open && (
				<DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col bg-background/60 backdrop-blur-sm border-border/60 p-0 rounded-xl">
					<div className="bg-accent/30 p-6 rounded-xl flex-1 flex flex-col overflow-hidden">
						<div className="flex items-center justify-between">
							<DialogHeader className="p-2">
								<DialogTitle className="flex items-center gap-2">
									<FileMusic className="h-5 w-5" color={stemColor} />
									<span>{stemName} MIDI</span>
								</DialogTitle>
								<DialogDescription>Preview and export extracted MIDI notes</DialogDescription>
							</DialogHeader>
						</div>

						{isProcessing ? (
							<div className="flex items-center justify-center h-[300px] w-full">
								<div className="text-center">
									<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
									<p className="mt-2">Extracting MIDI data...</p>
								</div>
							</div>
						) : midiObject ? (
							<div className="flex-1 overflow-hidden flex flex-col">
								{/* Main flex container with proper scrolling */}
								<div className="flex flex-col flex-1 overflow-hidden">
									{/* Piano roll container with fixed height and scrolling */}
									<div className="min-h-[280px] px-4 pt-2 pb-0">
										<div className="w-full h-full min-h-[280px] bg-black/10 dark:bg-white/5 rounded-lg overflow-hidden">
											<PianoRoll
												midiObject={midiObject}
												currentTime={currentTime}
												playing={isPlaying}
												className="w-full h-full"
												stemColor={stemColor}
											/>
										</div>
									</div>

									{/* Controls in a separately scrollable area */}
									<div className="p-4 pt-2 pb-0 flex-shrink-0">
										{/* MIDI extraction parameters */}
										<div className="w-full mb-4 mt-1">
											<Accordion type="single" collapsible className="w-full">
												<AccordionItem
													value="extraction-params"
													className="border-0 rounded-md overflow-hidden bg-muted/30 relative"
												>
													{/* Subtle left border that's always visible */}
													<div
														className="absolute left-0 top-0 bottom-0 w-0.5"
														style={{ backgroundColor: stemColor, opacity: 0.25 }}
													/>

													{/* Strong left border that shows when open */}
													<div
														className="accordion-accent-border absolute left-0 top-0 bottom-0 w-0.5 opacity-0 transition-opacity duration-300"
														style={{ backgroundColor: stemColor }}
													/>

													<AccordionTrigger className="text-sm py-2 px-3 flex items-center hover:no-underline hover:bg-muted/50 transition-colors">
														<div className="font-medium flex items-center gap-1.5">
															<SlidersHorizontal className="h-3.5 w-3.5" />
															<span>MIDI Extraction Parameters</span>
														</div>
													</AccordionTrigger>

													<AccordionContent className="px-3 py-3">
														<div className="space-y-4">
															{/* Parameters in 3 columns */}
															<div className="grid grid-cols-3 gap-3">
																{/* Onset Threshold */}
																<div className="space-y-3">
																	<div className="flex items-center gap-1">
																		<Label className="text-xs">
																			Onset: {formatPercentage(onsetThreshold)}
																		</Label>
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<div className="h-3.5 w-3.5 rounded-full bg-muted flex items-center justify-center text-[10px] cursor-help">
																						i
																					</div>
																				</TooltipTrigger>
																				<TooltipContent side="top" className="max-w-[180px]">
																					Controls how sensitive the algorithm is to detecting new
																					notes. Higher values require stronger onsets.
																				</TooltipContent>
																			</Tooltip>
																		</TooltipProvider>
																	</div>
																	<Slider
																		value={[onsetThreshold * 100]}
																		min={10}
																		max={90}
																		step={5}
																		onValueChange={(values) => setOnsetThreshold(values[0] / 100)}
																		className={cn('stem-colored-slider', 'w-full')}
																		style={
																			{
																				'--slider-range': stemColor,
																				'--slider-thumb': stemColor,
																			} as React.CSSProperties
																		}
																	/>
																</div>

																{/* Frame Threshold */}
																<div className="space-y-3">
																	<div className="flex items-center gap-1">
																		<Label className="text-xs">
																			Frame: {formatPercentage(frameThreshold)}
																		</Label>
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<div className="h-3.5 w-3.5 rounded-full bg-muted flex items-center justify-center text-[10px] cursor-help">
																						i
																					</div>
																				</TooltipTrigger>
																				<TooltipContent side="top" className="max-w-[180px]">
																					Determines how loud a note needs to be to be detected.
																					Higher values require louder notes.
																				</TooltipContent>
																			</Tooltip>
																		</TooltipProvider>
																	</div>
																	<Slider
																		value={[frameThreshold * 100]}
																		min={10}
																		max={90}
																		step={5}
																		onValueChange={(values) => setFrameThreshold(values[0] / 100)}
																		className={cn('stem-colored-slider', 'w-full')}
																		style={
																			{
																				'--slider-range': stemColor,
																				'--slider-thumb': stemColor,
																			} as React.CSSProperties
																		}
																	/>
																</div>

																{/* Min Note Length */}
																<div className="space-y-3">
																	<div className="flex items-center gap-1">
																		<Label className="text-xs">Length: {minNoteLength}</Label>
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<div className="h-3.5 w-3.5 rounded-full bg-muted flex items-center justify-center text-[10px] cursor-help">
																						i
																					</div>
																				</TooltipTrigger>
																				<TooltipContent side="top" className="max-w-[180px]">
																					Filters out notes shorter than this threshold (in
																					frames). Higher values remove more short notes.
																				</TooltipContent>
																			</Tooltip>
																		</TooltipProvider>
																	</div>
																	<Slider
																		value={[minNoteLength]}
																		min={1}
																		max={30}
																		step={1}
																		onValueChange={(values) => setMinNoteLength(values[0])}
																		className={cn('stem-colored-slider', 'w-full')}
																		style={
																			{
																				'--slider-range': stemColor,
																				'--slider-thumb': stemColor,
																			} as React.CSSProperties
																		}
																	/>
																</div>
															</div>

															<div>
																<Button
																	onClick={handleReprocessMidi}
																	className="w-full h-7 mt-3 font-medium text-white shadow-sm transition-all duration-200 ease-in-out opacity-85 hover:opacity-100 hover:shadow-md group"
																	variant="outline"
																	size="sm"
																	style={{
																		backgroundColor: stemColor,
																		borderColor: stemColor,
																	}}
																>
																	<RefreshCw className="h-3 w-3 mr-1.5 transition-transform duration-300 group-hover:rotate-180" />
																	Re-extract MIDI
																</Button>
															</div>
														</div>
													</AccordionContent>
												</AccordionItem>
											</Accordion>
										</div>

										<Separator className="mt-4 mb-5" />

										{/* Playback controls only */}
										<div className="flex items-center flex-wrap gap-4 w-full pr-2 max-w-full">
											<div className="flex items-center gap-2">
												<div>
													<Button
														variant="outline"
														size="icon"
														onClick={resetPlayback}
														className="rounded-full h-10 w-10 flex items-center justify-center hover:brightness-110"
													>
														<SkipBack className="h-5 w-5" />
													</Button>
												</div>

												<div>
													<Button
														variant="outline"
														size="icon"
														onClick={togglePlayback}
														className={cn(
															'rounded-full h-10 w-10 flex items-center justify-center hover:brightness-125 hover:shadow-md transition-all duration-200 text-white',
															isPlaying ? 'bg-opacity-100' : 'bg-opacity-25'
														)}
														style={{
															backgroundColor: stemColor,
															borderColor: `${stemColor}40`,
														}}
													>
														{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
													</Button>
												</div>
											</div>

											<div className="text-sm text-muted-foreground">
												{formatTime(currentTime)} / {formatTime(duration)}
											</div>

											<div className="flex items-center gap-3 ml-auto">
												<div>
													<Button
														variant="ghost"
														size="icon"
														onClick={toggleMute}
														className="rounded-full h-8 w-8 flex items-center justify-center"
													>
														{React.cloneElement(getVolumeIcon(), { color: stemColor })}
													</Button>
												</div>

												<Slider
													value={[isMuted ? 0 : volume * 100]}
													max={100}
													step={1}
													className={cn('stem-colored-slider', 'w-24')}
													style={
														{
															'--slider-range': stemColor,
															'--slider-thumb': stemColor,
														} as React.CSSProperties
													}
													onValueChange={handleVolumeChange}
												/>

												{/* Download button moved next to volume slider */}
												{midiObject && isReady && (
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<div>
																	<Button
																		variant="outline"
																		size="icon"
																		onClick={handleDownload}
																		className="rounded-full h-10 w-10 flex items-center justify-center"
																	>
																		<Download className="h-5 w-5" />
																	</Button>
																</div>
															</TooltipTrigger>
															<TooltipContent>
																<p>Download MIDI file</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className="p-8 text-center">No MIDI data available</div>
						)}
					</div>
				</DialogContent>
			)}
		</Dialog>
	)
}
