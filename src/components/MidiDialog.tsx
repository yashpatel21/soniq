'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PianoRoll } from '@/components/PianoRoll'
import { Download, FileMusic, Pause, Play, SkipBack, Volume, Volume1, Volume2, VolumeX } from 'lucide-react'
import { formatTime } from '@/lib/utils/ui/utils'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MidiDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	midiObject: Midi | null
	stemName: string
	downloadUrl: string
	filename: string
	stemColor?: string
}

export function MidiDialog({ open, onOpenChange, midiObject, stemName, downloadUrl, filename, stemColor = '#3B82F6' }: MidiDialogProps) {
	// State for MIDI playback
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [volume, setVolume] = useState(0.75)
	const [isMuted, setIsMuted] = useState(false)
	const [isReady, setIsReady] = useState(false)

	// Refs
	const synth = useRef<Tone.PolySynth | null>(null)
	const part = useRef<Tone.Part | null>(null)
	const startTime = useRef<number>(0)
	const updateInterval = useRef<NodeJS.Timeout | null>(null)

	// Initialize when dialog opens
	useEffect(() => {
		if (!open) return

		console.log('MidiDialog opened')

		// Reset playback state
		setIsPlaying(false)
		setCurrentTime(0)

		// Create synth if it doesn't exist yet
		if (!synth.current) {
			synth.current = new Tone.PolySynth().toDestination()
		}

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

		// Set initial volume
		if (synth.current) {
			synth.current.volume.value = isMuted ? -Infinity : Tone.gainToDb(volume)
		}

		// Wait a moment to allow initialization
		setTimeout(() => {
			setIsReady(true)
		}, 100)

		return () => {
			// Clean up on dialog close
			stopPlayback()
			setIsReady(false)
		}
	}, [open, midiObject])

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
		}
	}, [])

	// Start playback
	const startPlayback = async () => {
		if (!midiObject || isPlaying) return

		try {
			// Try to start audio context
			await Tone.start()

			// Create events from MIDI data
			createMidiEvents()

			// Mark the start time
			startTime.current = Tone.now()

			// Start the part/sequence
			if (part.current) {
				part.current.start(0, currentTime)
			}

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
				part.current.dispose()
				part.current = null
			} catch (error) {
				console.warn('Error disposing part:', error)
			}
		}
	}

	// Create MIDI events for playback
	const createMidiEvents = () => {
		if (!midiObject || !synth.current) return

		// Dispose existing part if any
		if (part.current) {
			try {
				part.current.dispose()
			} catch (error) {
				// Ignore
			}
		}

		// Create events array from MIDI notes
		const events: Array<[number, { note: string; duration: number; velocity: number }]> = []

		midiObject.tracks.forEach((track) => {
			if (!track.notes || track.notes.length === 0) return

			track.notes.forEach((note) => {
				events.push([
					note.time,
					{
						note: Tone.Frequency(note.midi, 'midi').toNote(),
						duration: note.duration,
						velocity: note.velocity,
					},
				])
			})
		})

		// Sort events by time
		events.sort((a, b) => a[0] - b[0])

		// Create new part
		part.current = new Tone.Part((time, value) => {
			synth.current?.triggerAttackRelease(value.note, value.duration, time, value.velocity)
		}, events)

		part.current.loop = false
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader className="p-2">
					<DialogTitle className="flex items-center gap-2">
						<FileMusic className="h-5 w-5" style={{ color: stemColor }} />
						<span>{stemName} MIDI</span>
					</DialogTitle>
					<DialogDescription>Preview and export extracted MIDI notes</DialogDescription>
				</DialogHeader>

				{midiObject ? (
					<div className="flex-1 overflow-hidden flex flex-col min-h-0">
						{!isReady ? (
							<div className="flex items-center justify-center h-[300px] w-full">
								<div className="text-center">
									<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
									<p className="mt-2">Preparing MIDI visualization...</p>
								</div>
							</div>
						) : (
							<>
								<div className="flex-1 min-h-0 overflow-hidden bg-black/10 dark:bg-white/5 rounded-lg">
									<PianoRoll
										midiObject={midiObject}
										currentTime={currentTime}
										playing={isPlaying}
										className="w-full h-full"
										stemColor={stemColor}
									/>
								</div>

								<div className="p-4 mt-2 flex flex-wrap items-center gap-4">
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
									</div>

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
												<p>Download MIDI</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
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
