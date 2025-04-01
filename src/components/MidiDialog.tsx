'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PianoRoll } from '@/components/PianoRoll'
import { Download, FileMusic, Pause, Play, SkipBack, Volume, Volume1, Volume2, VolumeX, RefreshCw } from 'lucide-react'
import { formatTime } from '@/lib/utils/ui/utils'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { extractMidiFromAudioBuffer, createDownloadableMidiFromAudioBuffer } from '@/lib/utils/midi/midiExtraction'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

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

	// State for MIDI extraction parameters
	const [onsetThreshold, setOnsetThreshold] = useState(0.5)
	const [frameThreshold, setFrameThreshold] = useState(0.3)
	const [minNoteLength, setMinNoteLength] = useState(11)

	// Refs
	const synth = useRef<Tone.PolySynth | null>(null)
	const part = useRef<Tone.Part | null>(null)
	const startTime = useRef<number>(0)
	const updateInterval = useRef<NodeJS.Timeout | null>(null)
	const audioBufferRef = useRef<AudioBuffer | null>(null)

	// Initialize when dialog opens
	useEffect(() => {
		if (!open) return

		console.log('MidiDialog opened')
		audioBufferRef.current = audioBuffer

		// Reset playback state
		setIsPlaying(false)
		setCurrentTime(0)
		setIsReady(false)

		// Create synth if it doesn't exist yet
		if (!synth.current) {
			try {
				// Create a more robust synth with proper configuration
				synth.current = new Tone.PolySynth(Tone.Synth, {
					oscillator: {
						type: 'sine',
					},
					envelope: {
						attack: 0.02,
						decay: 0.1,
						sustain: 0.3,
						release: 1,
					},
				}).toDestination()
				console.log('Initialized PolySynth with clean sine wave configuration')
				synth.current.volume.value = isMuted ? -Infinity : Tone.gainToDb(volume)
			} catch (error) {
				console.error('Error initializing synth:', error)
			}
		} else {
			// Ensure proper volume
			if (synth.current) {
				synth.current.volume.value = isMuted ? -Infinity : Tone.gainToDb(volume)
			}
		}

		// Process audio buffer to MIDI if available
		if (audioBuffer) {
			processAudioBuffer(audioBuffer)
		}

		return () => {
			// Clean up on dialog close
			stopPlayback()
			setIsReady(false)
		}
	}, [open, audioBuffer])

	// Process the audio buffer to extract MIDI
	const processAudioBuffer = async (buffer: AudioBuffer) => {
		setIsProcessing(true)
		try {
			const { url, filename, midiObject } = await createDownloadableMidiFromAudioBuffer(
				buffer,
				stemName,
				onsetThreshold,
				frameThreshold,
				minNoteLength
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
				console.log(`MIDI extraction successful with ${totalNotes} notes`)
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
				console.log(`MIDI duration: ${calculatedDuration} seconds`)
			}

			setIsReady(true)
		} catch (error) {
			console.error('Error processing audio buffer:', error)
			toast.error('Failed to extract MIDI data')
		} finally {
			setIsProcessing(false)
		}
	}

	// Re-process MIDI with updated parameters
	const handleReprocessMidi = () => {
		if (!audioBufferRef.current) return

		// Stop any current playback
		stopPlayback()
		setCurrentTime(0)
		setIsReady(false)

		// Process with new parameters
		processAudioBuffer(audioBufferRef.current)
	}

	// Update volume when changed
	useEffect(() => {
		if (synth.current) {
			synth.current.volume.value = isMuted ? -Infinity : Tone.gainToDb(volume)
		}
	}, [volume, isMuted])

	// Clean up on unmount
	useEffect(() => {
		return () => {
			// Stop playback and clean up
			stopPlayback()

			// Dispose synth
			if (synth.current) {
				synth.current.dispose()
				synth.current = null
			}

			// Release object URLs
			if (downloadUrl) {
				URL.revokeObjectURL(downloadUrl)
			}
		}
	}, [downloadUrl])

	// Start playback
	const startPlayback = async () => {
		if (!midiObject || isPlaying) return

		try {
			// Try to start audio context
			await Tone.start()
			console.log('Tone.js audio context started')

			// Make sure the audio is unmuted
			if (isMuted) {
				setIsMuted(false)
			}

			// Ensure synth is properly initialized and connected
			if (!synth.current) {
				console.log('Creating new PolySynth')
				synth.current = new Tone.PolySynth(Tone.Synth).toDestination()
				// Set volume explicitly
				synth.current.volume.value = Tone.gainToDb(volume)
			} else {
				// Reconnect synth to destination if needed
				console.log('Using existing PolySynth')
				// Always reconnect to be safe
				synth.current.toDestination()
				synth.current.volume.value = Tone.gainToDb(volume)
			}

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
			console.log(`Starting playback at time ${currentTime}`)

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
						console.log('Playback completed, resetting to beginning')
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

		console.log('Playback stopped and all resources cleaned up')
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

		console.log(`Processed ${noteCount} MIDI notes for playback`)

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
			console.log(`Playing note ${value.note} at ${time} for ${value.duration}s with velocity ${value.velocity}`)
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
		console.log('Resetting playback to beginning')

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
			console.log('Forced piano roll redraw after reset')
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
			<DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
				<div className="flex items-center justify-between">
					<DialogHeader className="p-2">
						<DialogTitle className="flex items-center gap-2">
							<FileMusic className="h-5 w-5" style={{ color: stemColor }} />
							<span>{stemName} MIDI</span>
						</DialogTitle>
						<DialogDescription>Preview and export extracted MIDI notes</DialogDescription>
					</DialogHeader>
				</div>

				{isProcessing ? (
					<div className="flex items-center justify-center h-[300px] w-full">
						<div className="text-center">
							<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
							<p className="mt-2">Extracting MIDI data...</p>
						</div>
					</div>
				) : midiObject ? (
					<div className="flex-1 overflow-hidden flex flex-col">
						{!isReady ? (
							<div className="flex items-center justify-center h-[300px] w-full">
								<div className="text-center">
									<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
									<p className="mt-2">Preparing MIDI visualization...</p>
								</div>
							</div>
						) : (
							<>
								{/* Main flex container with proper scrolling */}
								<div className="flex flex-col flex-1 overflow-auto">
									{/* Piano roll container with fixed height and scrolling */}
									<div className="min-h-[280px] p-4 pb-0">
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
									<div className="p-4 pt-2 flex-shrink-0">
										{/* MIDI extraction parameters */}
										<Accordion type="single" collapsible className="w-full">
											<AccordionItem value="extraction-params">
												<AccordionTrigger className="text-sm font-medium py-2">
													MIDI Extraction Parameters
												</AccordionTrigger>
												<AccordionContent className="pt-1 pb-2">
													<div className="space-y-3">
														{/* Parameters in 3 columns */}
														<div className="grid grid-cols-3 gap-3">
															{/* Onset Threshold */}
															<div className="space-y-2">
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
																	className="stem-colored-slider"
																	style={
																		{
																			'--slider-range': stemColor,
																			'--slider-thumb': stemColor,
																		} as React.CSSProperties
																	}
																/>
															</div>

															{/* Frame Threshold */}
															<div className="space-y-2">
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
																	className="stem-colored-slider"
																	style={
																		{
																			'--slider-range': stemColor,
																			'--slider-thumb': stemColor,
																		} as React.CSSProperties
																	}
																/>
															</div>

															{/* Min Note Length */}
															<div className="space-y-2">
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
																				Filters out notes shorter than this threshold (in frames).
																				Higher values remove more short notes.
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
																	className="stem-colored-slider"
																	style={
																		{
																			'--slider-range': stemColor,
																			'--slider-thumb': stemColor,
																		} as React.CSSProperties
																	}
																/>
															</div>
														</div>

														<Button
															onClick={handleReprocessMidi}
															className="w-full h-7 mt-1"
															variant="outline"
															size="sm"
															style={{ borderColor: `${stemColor}40` }}
														>
															<RefreshCw className="h-3 w-3 mr-1.5" />
															Re-extract MIDI
														</Button>
													</div>
												</AccordionContent>
											</AccordionItem>
										</Accordion>

										<Separator className="my-4" />

										{/* Playback controls only */}
										<div className="flex items-center flex-wrap gap-4">
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="icon"
													onClick={resetPlayback}
													className="rounded-full h-10 w-10 flex items-center justify-center text-muted-foreground"
												>
													<SkipBack className="h-5 w-5" />
												</Button>

												<Button
													variant="outline"
													size="icon"
													onClick={togglePlayback}
													className="rounded-full h-10 w-10 flex items-center justify-center"
													style={{
														borderColor: `${stemColor}40`,
														...(isPlaying
															? { backgroundColor: stemColor, color: 'white' }
															: {
																	backgroundColor: `${
																		stemColor.startsWith('#')
																			? `rgba(${parseInt(stemColor.slice(1, 3), 16)}, ${parseInt(
																					stemColor.slice(3, 5),
																					16
																			  )}, ${parseInt(stemColor.slice(5, 7), 16)}, 0.25)`
																			: stemColor.replace('rgb(', 'rgba(').replace(')', ', 0.75)')
																	}`,
																	color: 'white',
															  }),
													}}
												>
													{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
												</Button>
											</div>

											<div className="text-sm text-muted-foreground">
												{formatTime(currentTime)} / {formatTime(duration)}
											</div>

											<div className="flex items-center gap-3 ml-auto">
												<Button
													variant="ghost"
													size="icon"
													onClick={toggleMute}
													className="rounded-full h-8 w-8 flex items-center justify-center"
													style={{ color: stemColor }}
												>
													{getVolumeIcon()}
												</Button>

												<Slider
													value={[isMuted ? 0 : volume * 100]}
													max={100}
													step={1}
													className="w-24 stem-colored-slider"
													onValueChange={handleVolumeChange}
													style={
														{
															'--slider-range': stemColor,
															'--slider-thumb': stemColor,
														} as React.CSSProperties
													}
												/>

												{/* Download button moved next to volume slider */}
												{midiObject && isReady && (
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="outline"
																	size="icon"
																	onClick={handleDownload}
																	className="rounded-full h-10 w-10 flex items-center justify-center text-muted-foreground"
																>
																	<Download className="h-5 w-5" />
																</Button>
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
							</>
						)}
					</div>
				) : (
					<div className="p-8 text-center">No MIDI data available</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
