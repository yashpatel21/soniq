'use client'

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { Stage, Layer, Rect, Line, Text, Group } from 'react-konva'
import type Konva from 'konva'
import { Midi } from '@tonejs/midi'
import { cn } from '@/lib/utils/ui/utils'

// Constants for piano roll display
const NOTE_HEIGHT = 8
const WHITE_KEY_WIDTH = 40
const MIN_PITCH = 21 // A0
const MAX_PITCH = 108 // C8
const PIXELS_PER_SECOND = 100
const VERTICAL_PADDING_NOTES = 4
const SCROLLBAR_HEIGHT = 12
const MIN_NOTE_RANGE = 37 // Minimum range of notes to display

// Helper functions
const isWhiteKey = (pitch: number): boolean => {
	const note = pitch % 12
	return [0, 2, 4, 5, 7, 9, 11].includes(note)
}

const pitchToNoteName = (pitch: number): string => {
	const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
	const octave = Math.floor(pitch / 12) - 1
	const note = noteNames[pitch % 12]
	return `${note}${octave}`
}

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface PianoRollProps {
	midiObject: Midi
	currentTime: number
	playing: boolean
	className?: string
}

export function PianoRoll({ midiObject, currentTime, playing, className = '' }: PianoRollProps) {
	// DOM Container refs
	const containerRef = useRef<HTMLDivElement>(null)
	const rollAreaRef = useRef<HTMLDivElement>(null)
	const scrollbarRef = useRef<HTMLDivElement>(null)

	// Konva refs
	const stageRef = useRef<Konva.Stage>(null)
	const contentGroupRef = useRef<Konva.Group>(null)

	// Basic UI state
	const [containerWidth, setContainerWidth] = useState<number>(800)
	const [scrollPosition, setScrollPosition] = useState<number>(0)

	// Scroll syncing flags
	const isScrollingSyncRef = useRef<boolean>(false)

	// MIDI data state (processed from midiObject)
	const [midiMetadata, setMidiMetadata] = useState({
		duration: 10,
		rollWidth: 1000,
		minPitch: 48, // C3 default
		maxPitch: 84, // C6 default
		pianoRollHeight: MIN_NOTE_RANGE * NOTE_HEIGHT,
		maxScrollLeft: 0,
		initialized: false,
	})

	// Process MIDI data on mount/change
	useEffect(() => {
		console.log('Processing MIDI data')
		processMidiData()
	}, [midiObject])

	// Initialize container dimensions
	useEffect(() => {
		console.log('PianoRoll component mounted, initializing dimensions...')

		// Set initial container width
		if (containerRef.current) {
			const width = containerRef.current.clientWidth - WHITE_KEY_WIDTH
			setContainerWidth(width > 0 ? width : 800)
		}

		// Set up resize handler
		const handleResize = () => {
			if (containerRef.current) {
				const width = containerRef.current.clientWidth - WHITE_KEY_WIDTH
				setContainerWidth(width > 0 ? width : 800)
			}
		}

		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [])

	// Reset scroll position when currentTime is 0
	useEffect(() => {
		if (currentTime === 0) {
			console.log('Resetting scroll position to beginning')
			updateScrollPosition(0)
		}
	}, [currentTime])

	// Process MIDI data to extract metadata
	const processMidiData = () => {
		if (!midiObject || !midiObject.tracks || midiObject.tracks.length === 0) {
			console.log('No valid MIDI data, using default range')

			// Set default range centered around middle C
			const defaultMinPitch = 48 // C3
			const defaultMaxPitch = defaultMinPitch + MIN_NOTE_RANGE - 1
			const pianoRollHeight = MIN_NOTE_RANGE * NOTE_HEIGHT

			setMidiMetadata({
				duration: 10,
				rollWidth: 1000,
				minPitch: defaultMinPitch,
				maxPitch: defaultMaxPitch,
				pianoRollHeight,
				maxScrollLeft: Math.max(0, 1000 - containerWidth),
				initialized: true,
			})

			return
		}

		console.log(`Processing MIDI data with ${midiObject.tracks.length} tracks`)

		// Calculate duration from the last note end time
		const maxDuration = Math.max(
			...midiObject.tracks.map((track) => {
				if (!track.notes || track.notes.length === 0) return 0
				const lastNote = track.notes[track.notes.length - 1]
				return lastNote.time + lastNote.duration
			})
		)

		// Add 2 seconds of padding to the end
		const duration = Math.max(maxDuration + 2, 10)

		// Find actual pitch range from MIDI data
		let highestPitch = MIN_PITCH
		let lowestPitch = MAX_PITCH
		let totalNotes = 0

		midiObject.tracks.forEach((track) => {
			if (!track.notes || track.notes.length === 0) return

			totalNotes += track.notes.length

			track.notes.forEach((note) => {
				if (typeof note.midi !== 'number') return

				highestPitch = Math.max(highestPitch, note.midi)
				lowestPitch = Math.min(lowestPitch, note.midi)
			})
		})

		console.log(
			`Found MIDI note range: ${lowestPitch} (${pitchToNoteName(lowestPitch)}) to ${highestPitch} (${pitchToNoteName(highestPitch)})`
		)

		// If no valid notes, use a default range
		if (totalNotes === 0 || lowestPitch > highestPitch) {
			lowestPitch = 48 // C3
			highestPitch = 84 // C6
			console.log(`No valid notes found, using default range: ${lowestPitch}-${highestPitch}`)
		}

		// Add padding around the note range
		let minPitch = Math.max(MIN_PITCH, lowestPitch - VERTICAL_PADDING_NOTES)
		let maxPitch = Math.min(MAX_PITCH, highestPitch + VERTICAL_PADDING_NOTES)

		// Ensure minimum note range
		let noteRange = maxPitch - minPitch + 1

		if (noteRange < MIN_NOTE_RANGE) {
			// Calculate additional padding needed
			const additionalPadding = MIN_NOTE_RANGE - noteRange

			// Split padding evenly
			const paddingBelow = Math.floor(additionalPadding / 2)
			const paddingAbove = additionalPadding - paddingBelow

			// Apply padding evenly (or as much as possible)
			minPitch = Math.max(MIN_PITCH, minPitch - paddingBelow)
			maxPitch = Math.min(MAX_PITCH, maxPitch + paddingAbove)

			// If we hit one boundary, add remaining padding to other side
			if (minPitch === MIN_PITCH && maxPitch - minPitch + 1 < MIN_NOTE_RANGE) {
				maxPitch = Math.min(MAX_PITCH, minPitch + MIN_NOTE_RANGE - 1)
			} else if (maxPitch === MAX_PITCH && maxPitch - minPitch + 1 < MIN_NOTE_RANGE) {
				minPitch = Math.max(MIN_PITCH, maxPitch - MIN_NOTE_RANGE + 1)
			}
		}

		// Final check to ensure minimum range
		noteRange = maxPitch - minPitch + 1
		if (noteRange < MIN_NOTE_RANGE) {
			console.warn(`Note range (${noteRange}) still below minimum (${MIN_NOTE_RANGE}), forcing adjustment`)
			if (minPitch === MIN_PITCH) {
				maxPitch = minPitch + MIN_NOTE_RANGE - 1
			} else {
				minPitch = maxPitch - MIN_NOTE_RANGE + 1
			}
		}

		// Calculate dimensions
		const pianoRollHeight = noteRange * NOTE_HEIGHT
		const rollWidth = Math.max(duration * PIXELS_PER_SECOND, 1000)
		const maxScrollLeft = Math.max(0, rollWidth - containerWidth)

		console.log(
			`Final display range: ${minPitch} (${pitchToNoteName(minPitch)}) to ${maxPitch} (${pitchToNoteName(
				maxPitch
			)}) - ${noteRange} notes`
		)
		console.log(`Piano roll dimensions: ${rollWidth}x${pianoRollHeight}px`)

		// Update state with calculated metadata
		setMidiMetadata({
			duration,
			rollWidth,
			minPitch,
			maxPitch,
			pianoRollHeight,
			maxScrollLeft,
			initialized: true,
		})
	}

	// Update max scroll when container width changes
	useEffect(() => {
		const maxScrollLeft = Math.max(0, midiMetadata.rollWidth - containerWidth)
		setMidiMetadata((prev) => ({ ...prev, maxScrollLeft }))

		// Adjust current scroll if needed
		if (scrollPosition > maxScrollLeft) {
			updateScrollPosition(maxScrollLeft)
		}
	}, [containerWidth, midiMetadata.rollWidth, scrollPosition])

	// Apply scroll position to both scrollbar and content group
	const updateScrollPosition = useCallback(
		(newPosition: number) => {
			// Ensure position is within bounds
			const boundedPosition = Math.max(0, Math.min(newPosition, midiMetadata.maxScrollLeft))

			// Only update if position has changed
			if (boundedPosition === scrollPosition) return

			// Set flag to prevent feedback loops
			isScrollingSyncRef.current = true

			// Update the content group position directly (no React state update yet)
			if (contentGroupRef.current) {
				contentGroupRef.current.x(-boundedPosition)
				// Batch draw for performance
				if (stageRef.current) {
					stageRef.current.batchDraw()
				}
			}

			// Update scrollbar directly
			if (scrollbarRef.current) {
				scrollbarRef.current.scrollLeft = boundedPosition
			}

			// Finally update React state (will trigger rerender, but visuals already updated)
			setScrollPosition(boundedPosition)

			// Reset flag after a short delay
			setTimeout(() => {
				isScrollingSyncRef.current = false
			}, 50)
		},
		[midiMetadata.maxScrollLeft, scrollPosition]
	)

	// Handle auto-scrolling during playback
	const autoScrollIfNeeded = useCallback(() => {
		if (!playing) return

		const playheadX = currentTime * PIXELS_PER_SECOND
		const viewportWidth = containerWidth

		// Check if playhead is outside visible area
		const isOutsideRight = playheadX > scrollPosition + viewportWidth * 0.7
		const isOutsideLeft = playheadX < scrollPosition + viewportWidth * 0.3

		if (isOutsideRight || isOutsideLeft) {
			// Position playhead at 30% from left
			const newScrollPosition = Math.max(0, playheadX - viewportWidth * 0.3)
			updateScrollPosition(Math.min(newScrollPosition, midiMetadata.maxScrollLeft))
		}
	}, [playing, currentTime, containerWidth, midiMetadata.maxScrollLeft, scrollPosition, updateScrollPosition])

	// Auto-scroll during playback
	useEffect(() => {
		if (playing) {
			autoScrollIfNeeded()
		}
	}, [playing, currentTime, autoScrollIfNeeded])

	// Handle scrollbar events
	const handleScrollbarScroll = (e: React.UIEvent<HTMLDivElement>) => {
		// Skip if we're already processing a scroll update or during playback
		if (isScrollingSyncRef.current || playing) {
			if (playing && scrollbarRef.current) {
				// Force scrollbar to match current position during playback
				scrollbarRef.current.scrollLeft = scrollPosition
			}
			return
		}

		const newPosition = e.currentTarget.scrollLeft

		// Update content group position directly for immediate feedback
		if (contentGroupRef.current) {
			contentGroupRef.current.x(-newPosition)
			if (stageRef.current) {
				stageRef.current.batchDraw()
			}
		}

		// Debounced state update
		updateScrollPosition(newPosition)
	}

	// Handle wheel events on roll area
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			// Prevent default browser behavior
			e.preventDefault()

			// Skip during playback
			if (playing) return

			// Skip if we're already processing a scroll update
			if (isScrollingSyncRef.current) return

			// Calculate new position
			const delta = e.deltaX || e.deltaY
			const newPosition = Math.max(0, Math.min(scrollPosition + delta, midiMetadata.maxScrollLeft))

			updateScrollPosition(newPosition)
		},
		[playing, scrollPosition, midiMetadata.maxScrollLeft, updateScrollPosition]
	)

	// Set up wheel event handler
	useEffect(() => {
		const rollArea = rollAreaRef.current
		if (!rollArea) return

		// Add wheel event listener
		rollArea.addEventListener('wheel', handleWheel, { passive: false })

		return () => {
			rollArea.removeEventListener('wheel', handleWheel)
		}
	}, [handleWheel])

	// Generate piano keys data
	const pianoKeysData = useMemo(() => {
		if (!midiMetadata.initialized) return []

		const { minPitch, maxPitch, pianoRollHeight } = midiMetadata
		const keys = []

		for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
			const isWhite = isWhiteKey(pitch)
			const relativePosition = pitch - minPitch
			const y = pianoRollHeight - (relativePosition + 1) * NOTE_HEIGHT

			keys.push({
				pitch,
				isWhite,
				y,
				height: NOTE_HEIGHT,
				width: isWhite ? WHITE_KEY_WIDTH : WHITE_KEY_WIDTH * 0.65,
				label: pitch % 12 === 0 || pitch % 12 === 5 ? pitchToNoteName(pitch) : '', // Show labels for C and F notes
			})
		}

		return keys
	}, [midiMetadata.initialized, midiMetadata.minPitch, midiMetadata.maxPitch, midiMetadata.pianoRollHeight])

	// Generate grid lines data
	const gridLinesData = useMemo(() => {
		if (!midiMetadata.initialized) return { horizontalLines: [], verticalLines: [] }

		const { minPitch, maxPitch, pianoRollHeight, rollWidth, duration } = midiMetadata
		const horizontalLines = []
		const verticalLines: { time: number; x: number }[] = [] // Empty array with explicit type

		// Horizontal lines (pitch divisions)
		for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
			const relativePosition = pitch - minPitch
			const y = pianoRollHeight - (relativePosition + 1) * NOTE_HEIGHT

			horizontalLines.push({
				pitch,
				y,
				isWhite: isWhiteKey(pitch),
				isC: pitch % 12 === 0,
			})
		}

		// No time markers or vertical lines

		return { horizontalLines, verticalLines }
	}, [
		midiMetadata.initialized,
		midiMetadata.minPitch,
		midiMetadata.maxPitch,
		midiMetadata.pianoRollHeight,
		midiMetadata.rollWidth,
		midiMetadata.duration,
	])

	// Process MIDI notes data
	const notesData = useMemo(() => {
		if (!midiObject || !midiObject.tracks || !midiMetadata.initialized) return []

		const { minPitch, pianoRollHeight } = midiMetadata
		const result: {
			id: string
			x: number
			y: number
			width: number
			height: number
			color: string
			borderColor: string
			pitch: number
			time: number
			duration: number
			isLongNote: boolean
		}[] = []

		// Track colors that match theme but use direct color values
		const trackColors = [
			'rgba(59, 130, 246, 0.8)', // Blue - Primary-like
			'rgba(239, 68, 68, 0.8)', // Red - Chart-1-like
			'rgba(16, 185, 129, 0.8)', // Green - Chart-2-like
			'rgba(245, 158, 11, 0.8)', // Amber - Chart-3-like
			'rgba(168, 85, 247, 0.8)', // Purple - Chart-5-like
		]

		// Process each track
		midiObject.tracks.forEach((track, trackIndex) => {
			if (!track.notes || track.notes.length === 0) return

			const trackColor = trackColors[trackIndex % trackColors.length]
			const trackBorderColor = trackColor.replace('0.8', '1') // Full opacity for border

			// Process each note
			track.notes.forEach((note, noteIndex) => {
				if (typeof note.midi !== 'number') return

				// Calculate position and dimensions
				const x = note.time * PIXELS_PER_SECOND
				const width = Math.max(note.duration * PIXELS_PER_SECOND, 2) // Ensure minimum width
				const y = pianoRollHeight - (note.midi - minPitch + 1) * NOTE_HEIGHT

				result.push({
					id: `${trackIndex}-${noteIndex}`,
					x,
					y,
					width,
					height: NOTE_HEIGHT,
					color: trackColor,
					borderColor: trackBorderColor,
					pitch: note.midi,
					time: note.time,
					duration: note.duration,
					isLongNote: width > 40, // Special rendering for long notes
				})
			})
		})

		return result
	}, [midiObject, midiMetadata.initialized, midiMetadata.minPitch, midiMetadata.pianoRollHeight])

	// Calculate minimum container height
	const MIN_CONTAINER_HEIGHT = useMemo(() => {
		return MIN_NOTE_RANGE * NOTE_HEIGHT + SCROLLBAR_HEIGHT
	}, [])

	return (
		<div
			className={cn('flex flex-col border overflow-hidden rounded-lg', className)}
			style={{ minHeight: MIN_CONTAINER_HEIGHT }}
			ref={containerRef}
		>
			{/* Piano keys and roll area */}
			<div className="flex flex-row overflow-hidden flex-grow">
				{/* Piano keys */}
				<div
					className="flex-shrink-0 relative bg-zinc-900"
					style={{ width: WHITE_KEY_WIDTH, height: midiMetadata.pianoRollHeight, minHeight: 100 }}
				>
					{midiMetadata.initialized && (
						<Stage width={WHITE_KEY_WIDTH} height={midiMetadata.pianoRollHeight}>
							<Layer>
								{/* Piano keys */}
								{pianoKeysData.map((key) => (
									<React.Fragment key={key.pitch}>
										{/* Key background */}
										<Rect
											x={0}
											y={key.y}
											width={key.width}
											height={key.height}
											fill={key.isWhite ? 'white' : '#222'}
											stroke="#555"
											strokeWidth={0.5}
										/>

										{/* Key label (for C and F notes) - Fixed alignment */}
										{key.label && (
											<Text
												x={3}
												y={key.y + key.height / 2 - 3} // Adjusted up by 2 more pixels for better alignment
												text={key.label}
												fontSize={8}
												fill={key.isWhite ? '#333' : '#ccc'}
												verticalAlign="middle"
												align="left"
											/>
										)}
									</React.Fragment>
								))}
							</Layer>
						</Stage>
					)}
				</div>

				{/* Piano roll */}
				<div
					ref={rollAreaRef}
					className="flex-grow overflow-hidden"
					style={{
						height: midiMetadata.pianoRollHeight,
						position: 'relative',
					}}
				>
					{midiMetadata.initialized && (
						<Stage
							ref={stageRef}
							width={containerWidth}
							height={midiMetadata.pianoRollHeight}
							perfectDrawEnabled={false}
							shadowForStrokeEnabled={false}
						>
							<Layer imageSmoothingEnabled={false}>
								{/* Background */}
								<Rect
									x={0}
									y={0}
									width={containerWidth}
									height={midiMetadata.pianoRollHeight}
									fill="rgba(18, 18, 23, 0.2)"
								/>

								{/* Scrollable content */}
								<Group ref={contentGroupRef}>
									{/* Grid lines */}
									{gridLinesData.horizontalLines.map((line) => (
										<React.Fragment key={`h-${line.pitch}`}>
											{/* Row background */}
											<Rect
												x={0}
												y={line.y}
												width={midiMetadata.rollWidth}
												height={NOTE_HEIGHT}
												fill={line.isWhite ? 'rgba(226, 232, 240, 0.08)' : 'rgba(18, 18, 23, 0.15)'}
											/>

											{/* Horizontal line */}
											<Line
												points={[0, line.y, midiMetadata.rollWidth, line.y]}
												stroke={line.isWhite ? 'rgba(203, 213, 225, 0.2)' : 'rgba(148, 163, 184, 0.1)'}
												strokeWidth={0.5}
											/>
										</React.Fragment>
									))}

									{/* No vertical lines or time markers */}

									{/* MIDI Notes */}
									{notesData.map((note) => (
										<React.Fragment key={note.id}>
											{/* Note rectangle */}
											<Rect
												x={note.x}
												y={note.y}
												width={note.width}
												height={note.height}
												fill={note.color}
												stroke={note.borderColor}
												strokeWidth={1}
												cornerRadius={2}
											/>

											{/* Gradient for long notes */}
											{note.isLongNote && (
												<Rect
													x={note.x}
													y={note.y}
													width={note.width}
													height={note.height}
													fillLinearGradientStartPoint={{ x: 0, y: 0 }}
													fillLinearGradientEndPoint={{ x: note.width, y: 0 }}
													fillLinearGradientColorStops={[0, note.color, 0.5, 'white', 1, note.color]}
													opacity={0.2}
													cornerRadius={2}
												/>
											)}
										</React.Fragment>
									))}
								</Group>

								{/* Playhead (positioned absolutely) - fixed in viewport */}
								<Group>
									{/* Playhead line */}
									<Line
										points={[
											currentTime * PIXELS_PER_SECOND - scrollPosition,
											0,
											currentTime * PIXELS_PER_SECOND - scrollPosition,
											midiMetadata.pianoRollHeight,
										]}
										stroke="#3B82F6"
										strokeWidth={2}
									/>

									{/* Triangle indicator */}
									<Line
										points={[
											currentTime * PIXELS_PER_SECOND - scrollPosition - 6,
											0,
											currentTime * PIXELS_PER_SECOND - scrollPosition + 6,
											0,
											currentTime * PIXELS_PER_SECOND - scrollPosition,
											8,
										]}
										closed={true}
										fill="#3B82F6"
									/>
								</Group>
							</Layer>
						</Stage>
					)}
				</div>
			</div>

			{/* Scrollbar */}
			<div className="w-full flex-shrink-0" style={{ height: SCROLLBAR_HEIGHT }}>
				<div
					ref={scrollbarRef}
					className={cn('overflow-x-auto w-full h-full scrollbar-thumb-rounded', playing && 'pointer-events-none opacity-50')}
					style={{ overflowY: 'hidden' }}
					onScroll={handleScrollbarScroll}
				>
					<div style={{ width: midiMetadata.rollWidth, height: '1px' }} />
				</div>
			</div>
		</div>
	)
}
