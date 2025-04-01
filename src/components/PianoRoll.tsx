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
const SCROLLBAR_WIDTH = 12
const VISIBLE_NOTE_RANGE = 37 // Exactly 37 notes are visible at any time

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

// Add a helper function to add opacity to any color format
const addOpacity = (color: string, opacity: number): string => {
	// Check if it's an RGB or RGBA color
	if (color.startsWith('rgb')) {
		// Extract RGB components
		const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
		if (rgbMatch) {
			return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`
		}

		// It's already an RGBA color
		const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/)
		if (rgbaMatch) {
			return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`
		}
	}

	// Handle hex colors
	if (color.startsWith('#')) {
		// Convert hex to rgb and add opacity
		const r = parseInt(color.slice(1, 3), 16)
		const g = parseInt(color.slice(3, 5), 16)
		const b = parseInt(color.slice(5, 7), 16)
		return `rgba(${r}, ${g}, ${b}, ${opacity})`
	}

	// For any other color format, default to a gray with the requested opacity
	return `rgba(128, 128, 128, ${opacity})`
}

interface PianoRollProps {
	midiObject: Midi
	currentTime: number
	playing: boolean
	className?: string
	stemColor?: string
}

export function PianoRoll({ midiObject, currentTime, playing, className = '', stemColor = '#3B82F6' }: PianoRollProps) {
	// DOM Container refs
	const containerRef = useRef<HTMLDivElement>(null)
	const rollAreaRef = useRef<HTMLDivElement>(null)
	const horizontalScrollbarRef = useRef<HTMLDivElement>(null)
	const verticalScrollbarRef = useRef<HTMLDivElement>(null)

	// Konva refs
	const stageRef = useRef<Konva.Stage>(null)
	const contentGroupRef = useRef<Konva.Group>(null)

	// Basic UI state
	const [containerWidth, setContainerWidth] = useState<number>(800)
	const [horizontalScrollPosition, setHorizontalScrollPosition] = useState<number>(0)
	const [verticalScrollPosition, setVerticalScrollPosition] = useState<number>(0)

	// Scroll syncing flags
	const isScrollingSyncRef = useRef<boolean>(false)

	// MIDI data state (processed from midiObject)
	const [midiMetadata, setMidiMetadata] = useState({
		duration: 10,
		rollWidth: 1000,
		minPitch: 48, // C3 default
		maxPitch: 84, // C6 default
		visibleMinPitch: 48, // Visible min pitch (for scrolling)
		visibleMaxPitch: 84, // Visible max pitch (for scrolling)
		totalPianoRollHeight: VISIBLE_NOTE_RANGE * NOTE_HEIGHT,
		visiblePianoRollHeight: VISIBLE_NOTE_RANGE * NOTE_HEIGHT,
		maxScrollLeft: 0,
		maxScrollTop: 0,
		needsVerticalScroll: false,
		initialized: false,
	})

	// Add these new references and state for custom scrollbar
	const customScrollbarRef = useRef<HTMLDivElement>(null)
	const scrollThumbRef = useRef<HTMLDivElement>(null)
	const [isDraggingThumb, setIsDraggingThumb] = useState(false)
	const dragStartY = useRef<number>(0)
	const dragStartScrollPosition = useRef<number>(0)

	// New refs and state for custom horizontal scrollbar
	const customHorizontalScrollbarRef = useRef<HTMLDivElement>(null)
	const scrollHorizontalThumbRef = useRef<HTMLDivElement>(null)
	const [isDraggingHorizontalThumb, setIsDraggingHorizontalThumb] = useState(false)
	const dragStartX = useRef<number>(0)
	const dragStartHorizontalScrollPosition = useRef<number>(0)

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
			console.log('Resetting horizontal scroll position to beginning')
			updateHorizontalScrollPosition(0)
		}
	}, [currentTime])

	// Process MIDI data to extract metadata
	const processMidiData = () => {
		if (!midiObject || !midiObject.tracks || midiObject.tracks.length === 0) {
			console.log('No valid MIDI data, using default range')

			// Set default range centered around middle C
			const defaultMinPitch = 48 // C3
			const defaultMaxPitch = defaultMinPitch + VISIBLE_NOTE_RANGE - 1
			const pianoRollHeight = VISIBLE_NOTE_RANGE * NOTE_HEIGHT

			setMidiMetadata({
				duration: 10,
				rollWidth: 1000,
				minPitch: defaultMinPitch,
				maxPitch: defaultMaxPitch,
				visibleMinPitch: defaultMinPitch,
				visibleMaxPitch: defaultMaxPitch,
				totalPianoRollHeight: pianoRollHeight,
				visiblePianoRollHeight: pianoRollHeight,
				maxScrollLeft: Math.max(0, 1000 - containerWidth),
				maxScrollTop: 0,
				needsVerticalScroll: false,
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

		// Calculate the actual note range
		const actualNoteRange = maxPitch - minPitch + 1

		// Set up vertical scrolling if needed
		let needsVerticalScroll = actualNoteRange > VISIBLE_NOTE_RANGE
		let visibleMinPitch = minPitch
		let visibleMaxPitch = maxPitch
		let maxScrollTop = 0

		if (needsVerticalScroll) {
			// For vertical scrolling we need to calculate both the total range and initial visible range

			// The visible height is always fixed at VISIBLE_NOTE_RANGE
			const visiblePianoRollHeight = VISIBLE_NOTE_RANGE * NOTE_HEIGHT

			// For scrolling, we want to represent the actual range of notes that need to be visible
			// Initially set the visible range to show the highest notes (consistent with piano layout)
			visibleMinPitch = maxPitch - VISIBLE_NOTE_RANGE + 1
			visibleMaxPitch = maxPitch

			// Set maxScrollTop to match the number of scrollable notes
			// This is the number of notes beyond the visible range
			maxScrollTop = actualNoteRange - VISIBLE_NOTE_RANGE

			console.log(
				`Setting up vertical scroll: total range ${minPitch}-${maxPitch} (${actualNoteRange} notes), initial visible range ${visibleMinPitch}-${visibleMaxPitch}`
			)

			setMidiMetadata({
				duration,
				rollWidth: Math.max(duration * PIXELS_PER_SECOND, 1000),
				minPitch,
				maxPitch,
				visibleMinPitch,
				visibleMaxPitch,
				totalPianoRollHeight: actualNoteRange * NOTE_HEIGHT,
				visiblePianoRollHeight,
				maxScrollLeft: Math.max(0, Math.max(duration * PIXELS_PER_SECOND, 1000) - containerWidth),
				maxScrollTop,
				needsVerticalScroll,
				initialized: true,
			})

			// Reset vertical scroll position
			setVerticalScrollPosition(0)
		} else {
			// If the actual range is less than VISIBLE_NOTE_RANGE, pad it to VISIBLE_NOTE_RANGE
			if (actualNoteRange < VISIBLE_NOTE_RANGE) {
				// Calculate additional padding needed
				const additionalPadding = VISIBLE_NOTE_RANGE - actualNoteRange

				// Split padding evenly
				const paddingBelow = Math.floor(additionalPadding / 2)
				const paddingAbove = additionalPadding - paddingBelow

				// Apply padding evenly (or as much as possible)
				minPitch = Math.max(MIN_PITCH, minPitch - paddingBelow)
				maxPitch = Math.min(MAX_PITCH, maxPitch + paddingAbove)

				// If we hit one boundary, add remaining padding to other side
				if (minPitch === MIN_PITCH && maxPitch - minPitch + 1 < VISIBLE_NOTE_RANGE) {
					maxPitch = Math.min(MAX_PITCH, minPitch + VISIBLE_NOTE_RANGE - 1)
				} else if (maxPitch === MAX_PITCH && maxPitch - minPitch + 1 < VISIBLE_NOTE_RANGE) {
					minPitch = Math.max(MIN_PITCH, maxPitch - VISIBLE_NOTE_RANGE + 1)
				}
			}

			// Ensure exact VISIBLE_NOTE_RANGE even after padding
			const paddedNoteRange = maxPitch - minPitch + 1
			if (paddedNoteRange > VISIBLE_NOTE_RANGE) {
				// If we somehow got more than VISIBLE_NOTE_RANGE, trim it down
				maxPitch = minPitch + VISIBLE_NOTE_RANGE - 1
			} else if (paddedNoteRange < VISIBLE_NOTE_RANGE) {
				// If we still have less than VISIBLE_NOTE_RANGE, extend the max
				maxPitch = Math.min(MAX_PITCH, minPitch + VISIBLE_NOTE_RANGE - 1)
				// If we hit MAX_PITCH, adjust minPitch
				if (maxPitch - minPitch + 1 < VISIBLE_NOTE_RANGE) {
					minPitch = Math.max(MIN_PITCH, maxPitch - VISIBLE_NOTE_RANGE + 1)
				}
			}

			// Since no vertical scrolling, visible range equals full range
			visibleMinPitch = minPitch
			visibleMaxPitch = maxPitch

			const pianoRollHeight = VISIBLE_NOTE_RANGE * NOTE_HEIGHT

			console.log(
				`Fixed display range: ${minPitch} (${pitchToNoteName(minPitch)}) to ${maxPitch} (${pitchToNoteName(maxPitch)}) - ${
					maxPitch - minPitch + 1
				} notes`
			)

			setMidiMetadata({
				duration,
				rollWidth: Math.max(duration * PIXELS_PER_SECOND, 1000),
				minPitch,
				maxPitch,
				visibleMinPitch,
				visibleMaxPitch,
				totalPianoRollHeight: pianoRollHeight,
				visiblePianoRollHeight: pianoRollHeight,
				maxScrollLeft: Math.max(0, Math.max(duration * PIXELS_PER_SECOND, 1000) - containerWidth),
				maxScrollTop: 0,
				needsVerticalScroll: false,
				initialized: true,
			})
		}
	}

	// Update max horizontal scroll when container width changes
	useEffect(() => {
		const maxScrollLeft = Math.max(0, midiMetadata.rollWidth - containerWidth)
		setMidiMetadata((prev) => ({ ...prev, maxScrollLeft }))

		// Adjust current scroll if needed
		if (horizontalScrollPosition > maxScrollLeft) {
			updateHorizontalScrollPosition(maxScrollLeft)
		}
	}, [containerWidth, midiMetadata.rollWidth, horizontalScrollPosition])

	// Apply horizontal scroll position
	const updateHorizontalScrollPosition = useCallback(
		(newPosition: number) => {
			// Ensure position is within bounds
			const boundedPosition = Math.max(0, Math.min(newPosition, midiMetadata.maxScrollLeft))

			// Only update if position has changed
			if (boundedPosition === horizontalScrollPosition) return

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

			// Update scrollbar thumb position if we're using custom scrollbar
			if (scrollHorizontalThumbRef.current && customHorizontalScrollbarRef.current) {
				const scrollbarWidth = customHorizontalScrollbarRef.current.clientWidth
				const thumbWidth = scrollHorizontalThumbRef.current.clientWidth
				const availableTravel = scrollbarWidth - thumbWidth

				if (availableTravel > 0) {
					// Convert absolute position to normalized position (0-1)
					const normalizedPosition = boundedPosition / midiMetadata.maxScrollLeft
					scrollHorizontalThumbRef.current.style.left = `${normalizedPosition * availableTravel}px`
				}
			}

			// Finally update React state (will trigger rerender, but visuals already updated)
			setHorizontalScrollPosition(boundedPosition)

			// Reset flag after a short delay
			setTimeout(() => {
				isScrollingSyncRef.current = false
			}, 50)
		},
		[midiMetadata.maxScrollLeft, horizontalScrollPosition]
	)

	// Apply vertical scroll position
	const updateVerticalScrollPosition = useCallback(
		(newPosition: number) => {
			// Only process if we need vertical scrolling
			if (!midiMetadata.needsVerticalScroll) return

			// Ensure position is within bounds (0 to 1)
			const boundedPosition = Math.max(0, Math.min(newPosition, 1))

			// Only update if position has changed
			if (boundedPosition === verticalScrollPosition) return

			// Set flag to prevent feedback loops
			isScrollingSyncRef.current = true

			// Calculate the total range of pitches
			const totalRange = midiMetadata.maxPitch - midiMetadata.minPitch + 1

			// Calculate how many notes we can scroll through
			const scrollableNotes = totalRange - VISIBLE_NOTE_RANGE

			// At position 0, we show the highest notes
			// At position 1, we show the lowest notes
			// Calculate which notes should be visible based on scroll position
			const noteOffset = Math.round(boundedPosition * scrollableNotes)

			// Calculate the new visible pitch range
			const newVisibleMaxPitch = midiMetadata.maxPitch - noteOffset
			const newVisibleMinPitch = newVisibleMaxPitch - VISIBLE_NOTE_RANGE + 1

			// Update the state with new visible pitch range
			setMidiMetadata((prev) => ({
				...prev,
				visibleMinPitch: newVisibleMinPitch,
				visibleMaxPitch: newVisibleMaxPitch,
			}))

			// Finally update React state
			setVerticalScrollPosition(boundedPosition)

			// Batch draw for performance
			if (stageRef.current) {
				stageRef.current.batchDraw()
			}

			// Reset flag after a short delay
			setTimeout(() => {
				isScrollingSyncRef.current = false
			}, 50)
		},
		[midiMetadata]
	)

	// Handle auto-scrolling during playback
	const autoScrollIfNeeded = useCallback(() => {
		if (!playing) return

		const playheadX = currentTime * PIXELS_PER_SECOND
		const viewportWidth = containerWidth

		// Check if playhead is outside visible area
		const isOutsideRight = playheadX > horizontalScrollPosition + viewportWidth * 0.7
		const isOutsideLeft = playheadX < horizontalScrollPosition + viewportWidth * 0.3

		if (isOutsideRight || isOutsideLeft) {
			// Position playhead at 30% from left
			const newScrollPosition = Math.max(0, playheadX - viewportWidth * 0.3)
			updateHorizontalScrollPosition(Math.min(newScrollPosition, midiMetadata.maxScrollLeft))
		}
	}, [playing, currentTime, containerWidth, midiMetadata.maxScrollLeft, horizontalScrollPosition, updateHorizontalScrollPosition])

	// Auto-scroll during playback
	useEffect(() => {
		if (playing) {
			autoScrollIfNeeded()
		}
	}, [playing, currentTime, autoScrollIfNeeded])

	// Handle horizontal scrollbar events
	const handleHorizontalScrollbarScroll = (e: React.UIEvent<HTMLDivElement>) => {
		// Skip if we're already processing a scroll update or during playback
		if (isScrollingSyncRef.current || playing) {
			if (playing && horizontalScrollbarRef.current) {
				// Force scrollbar to match current position during playback
				horizontalScrollbarRef.current.scrollLeft = horizontalScrollPosition
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
		updateHorizontalScrollPosition(newPosition)
	}

	// Handle vertical scrollbar events
	const handleVerticalScrollbarScroll = (e: React.UIEvent<HTMLDivElement>) => {
		// Skip if we're already processing a scroll update
		if (isScrollingSyncRef.current) return

		// Here we map the scrollbar position directly to our custom scroll range
		// The scrollbar's scrollTop range is from 0 to scrollHeight - clientHeight
		// We need to map this to 0 to maxScrollTop for our note range
		const scrollbarElement = e.currentTarget
		const scrollRange = scrollbarElement.scrollHeight - scrollbarElement.clientHeight

		if (scrollRange <= 0) return // Avoid division by zero

		const scrollRatio = scrollbarElement.scrollTop / scrollRange
		const newPosition = Math.round(scrollRatio * midiMetadata.maxScrollTop)

		updateVerticalScrollPosition(newPosition)
	}

	// Handle wheel events on roll area
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			// Prevent default browser behavior
			e.preventDefault()

			// Skip if we're already processing a scroll update
			if (isScrollingSyncRef.current) return

			// Check if this is a horizontal touchpad gesture (significant deltaX)
			const isHorizontalGesture = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 0

			// Check if this is a vertical touchpad gesture (significant deltaY)
			const isVerticalGesture = Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 0

			// CASE 1: Horizontal gesture (touchpad swipe left/right)
			if (isHorizontalGesture) {
				// Block ALL horizontal touchpad gestures during playback
				if (playing) return

				// Otherwise allow horizontal scrolling
				const newPosition = Math.max(0, Math.min(horizontalScrollPosition + e.deltaX, midiMetadata.maxScrollLeft))
				updateHorizontalScrollPosition(newPosition)
				return
			}

			// CASE 2: Vertical gesture (touchpad swipe up/down)
			if (isVerticalGesture && midiMetadata.needsVerticalScroll) {
				// Allow vertical scrolling even during playback
				const baseIncrement = 0.15
				const deltaScale = Math.min(Math.abs(e.deltaY) / 100, 3)
				const scrollIncrement = baseIncrement * Math.sign(e.deltaY) * deltaScale

				const newPosition = Math.max(0, Math.min(verticalScrollPosition + scrollIncrement, 1))
				updateVerticalScrollPosition(newPosition)
				return
			}

			// CASE 3: Shift key for horizontal scrolling with mousewheel
			if (e.shiftKey) {
				// Block shift+wheel horizontal scrolling during playback
				if (playing) return

				const delta = e.deltaY
				const newPosition = Math.max(0, Math.min(horizontalScrollPosition + delta, midiMetadata.maxScrollLeft))
				updateHorizontalScrollPosition(newPosition)
				return
			}

			// CASE 4: Default mouse wheel (vertical scrolling)
			if (midiMetadata.needsVerticalScroll) {
				// Always allow vertical mouse wheel scrolling
				const baseIncrement = 0.15
				const deltaScale = Math.min(Math.abs(e.deltaY) / 100, 3)
				const scrollIncrement = baseIncrement * Math.sign(e.deltaY) * deltaScale

				const newPosition = Math.max(0, Math.min(verticalScrollPosition + scrollIncrement, 1))
				updateVerticalScrollPosition(newPosition)
				return
			} else {
				// When no vertical scrolling needed, wheel scrolls horizontally
				if (playing) return // But block during playback

				const delta = e.deltaY
				const newPosition = Math.max(0, Math.min(horizontalScrollPosition + delta, midiMetadata.maxScrollLeft))
				updateHorizontalScrollPosition(newPosition)
			}
		},
		[
			playing,
			midiMetadata.needsVerticalScroll,
			midiMetadata.maxScrollLeft,
			horizontalScrollPosition,
			verticalScrollPosition,
			updateHorizontalScrollPosition,
			updateVerticalScrollPosition,
		]
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

		const { visibleMinPitch, visibleMaxPitch, visiblePianoRollHeight } = midiMetadata
		const keys = []

		for (let pitch = visibleMinPitch; pitch <= visibleMaxPitch; pitch++) {
			const isWhite = isWhiteKey(pitch)
			const relativePosition = pitch - visibleMinPitch
			const y = visiblePianoRollHeight - (relativePosition + 1) * NOTE_HEIGHT

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
	}, [midiMetadata.initialized, midiMetadata.visibleMinPitch, midiMetadata.visibleMaxPitch, midiMetadata.visiblePianoRollHeight])

	// Generate grid lines data
	const gridLinesData = useMemo(() => {
		if (!midiMetadata.initialized) return { horizontalLines: [], verticalLines: [] }

		const { visibleMinPitch, visibleMaxPitch, visiblePianoRollHeight, rollWidth, duration } = midiMetadata
		const horizontalLines = []
		const verticalLines: { time: number; x: number }[] = [] // Empty array with explicit type

		// Horizontal lines (pitch divisions)
		for (let pitch = visibleMinPitch; pitch <= visibleMaxPitch; pitch++) {
			const relativePosition = pitch - visibleMinPitch
			const y = visiblePianoRollHeight - (relativePosition + 1) * NOTE_HEIGHT

			horizontalLines.push({
				pitch,
				y,
				isWhite: isWhiteKey(pitch),
				isC: pitch % 12 === 0, // Keep this for styling rows
			})
		}

		// No time markers or vertical lines

		return { horizontalLines, verticalLines }
	}, [
		midiMetadata.initialized,
		midiMetadata.visibleMinPitch,
		midiMetadata.visibleMaxPitch,
		midiMetadata.visiblePianoRollHeight,
		midiMetadata.rollWidth,
		midiMetadata.duration,
	])

	// Process MIDI notes data
	const notesData = useMemo(() => {
		if (!midiObject || !midiObject.tracks || !midiMetadata.initialized) return []

		const { minPitch, visibleMinPitch, visibleMaxPitch, visiblePianoRollHeight } = midiMetadata
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

		// Use stem color for tracks with proper opacity handling
		const trackColors = [
			addOpacity(stemColor, 0.8), // Main stem color with opacity
			'rgba(239, 68, 68, 0.8)', // Alternative colors for multi-track MIDIs
			'rgba(16, 185, 129, 0.8)',
			'rgba(245, 158, 11, 0.8)',
			'rgba(168, 85, 247, 0.8)',
		]

		// Process each track
		midiObject.tracks.forEach((track, trackIndex) => {
			if (!track.notes || track.notes.length === 0) return

			// Use the stem color for the main track, fallback to alternate colors for additional tracks
			const trackColor = trackIndex === 0 ? addOpacity(stemColor, 0.8) : trackColors[trackIndex % trackColors.length]
			const trackBorderColor = trackIndex === 0 ? stemColor : trackColor.replace('0.8', '1')

			// Process each note
			track.notes.forEach((note, noteIndex) => {
				if (typeof note.midi !== 'number') return

				// Skip notes outside of visible pitch range
				if (note.midi < visibleMinPitch || note.midi > visibleMaxPitch) return

				// Calculate position and dimensions
				const x = note.time * PIXELS_PER_SECOND
				const width = Math.max(note.duration * PIXELS_PER_SECOND, 2) // Ensure minimum width
				const y = visiblePianoRollHeight - (note.midi - visibleMinPitch + 1) * NOTE_HEIGHT

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
	}, [
		midiObject,
		midiMetadata.initialized,
		midiMetadata.minPitch,
		midiMetadata.visibleMinPitch,
		midiMetadata.visibleMaxPitch,
		midiMetadata.visiblePianoRollHeight,
		stemColor,
	])

	// Calculate minimum container height
	const MIN_CONTAINER_HEIGHT = useMemo(() => {
		return VISIBLE_NOTE_RANGE * NOTE_HEIGHT + SCROLLBAR_HEIGHT
	}, [])

	// Set up custom scrollbar handlers
	useEffect(() => {
		const scrollThumb = scrollThumbRef.current
		const scrollbarContainer = customScrollbarRef.current

		if (!scrollThumb || !scrollbarContainer) return

		// Handle mouse down on thumb
		const handleMouseDown = (e: MouseEvent) => {
			setIsDraggingThumb(true)
			dragStartY.current = e.clientY
			dragStartScrollPosition.current = verticalScrollPosition

			// Prevent text selection during drag
			document.body.style.userSelect = 'none'
		}

		// Handle mouse move for dragging
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDraggingThumb) return

			const deltaY = e.clientY - dragStartY.current
			const scrollbarHeight = scrollbarContainer.clientHeight
			const thumbHeight = scrollThumb.clientHeight

			// Calculate the available travel distance
			const availableTravel = scrollbarHeight - thumbHeight

			if (availableTravel <= 0) return

			// Calculate new position (0-1)
			const newScrollPosition = Math.max(0, Math.min(1, dragStartScrollPosition.current + deltaY / availableTravel))

			// Update the scroll position
			updateVerticalScrollPosition(newScrollPosition)

			// Update thumb position visually
			scrollThumb.style.top = `${newScrollPosition * availableTravel}px`
		}

		// Handle mouse up to end dragging
		const handleMouseUp = () => {
			setIsDraggingThumb(false)
			document.body.style.userSelect = ''
		}

		// Handle click on scrollbar track (not on thumb)
		const handleTrackClick = (e: MouseEvent) => {
			// Ignore if clicked on thumb
			if (e.target === scrollThumb) return

			const scrollbarHeight = scrollbarContainer.clientHeight
			const thumbHeight = scrollThumb.clientHeight

			// Calculate available travel
			const availableTravel = scrollbarHeight - thumbHeight

			if (availableTravel <= 0) return

			// Get click position relative to scrollbar
			const rect = scrollbarContainer.getBoundingClientRect()
			const clickPositionY = e.clientY - rect.top

			// Calculate scroll position (0-1), accounting for thumb height
			const clickPositionRatio = (clickPositionY - thumbHeight / 2) / availableTravel
			const newScrollPosition = Math.max(0, Math.min(1, clickPositionRatio))

			// Update scroll position
			updateVerticalScrollPosition(newScrollPosition)

			// Update thumb position visually
			scrollThumb.style.top = `${newScrollPosition * availableTravel}px`
		}

		// Set up event listeners
		scrollThumb.addEventListener('mousedown', handleMouseDown)
		scrollbarContainer.addEventListener('click', handleTrackClick)
		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)

		// Update thumb position when vertical scroll position changes
		const updateThumbPosition = () => {
			const scrollbarHeight = scrollbarContainer.clientHeight
			const thumbHeight = scrollThumb.clientHeight
			const availableTravel = scrollbarHeight - thumbHeight

			if (availableTravel <= 0) return

			scrollThumb.style.top = `${verticalScrollPosition * availableTravel}px`
		}

		// Set initial thumb position
		updateThumbPosition()

		// Clean up
		return () => {
			scrollThumb.removeEventListener('mousedown', handleMouseDown)
			scrollbarContainer.removeEventListener('click', handleTrackClick)
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	}, [isDraggingThumb, verticalScrollPosition, updateVerticalScrollPosition])

	// Set up custom horizontal scrollbar handlers
	useEffect(() => {
		const scrollThumb = scrollHorizontalThumbRef.current
		const scrollbarContainer = customHorizontalScrollbarRef.current

		if (!scrollThumb || !scrollbarContainer) return

		// Handle mouse down on thumb
		const handleMouseDown = (e: MouseEvent) => {
			// Skip during playback
			if (playing) return

			setIsDraggingHorizontalThumb(true)
			dragStartX.current = e.clientX
			dragStartHorizontalScrollPosition.current = horizontalScrollPosition

			// Prevent text selection during drag
			document.body.style.userSelect = 'none'
		}

		// Handle mouse move for dragging
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDraggingHorizontalThumb || playing) return

			const deltaX = e.clientX - dragStartX.current
			const scrollbarWidth = scrollbarContainer.clientWidth
			const thumbWidth = scrollThumb.clientWidth

			// Calculate the available travel distance
			const availableTravel = scrollbarWidth - thumbWidth

			if (availableTravel <= 0) return

			// Calculate normalized position (0-1)
			const normalizedPosition = Math.max(
				0,
				Math.min(1, dragStartHorizontalScrollPosition.current / midiMetadata.maxScrollLeft + deltaX / availableTravel)
			)

			// Calculate absolute position
			const absolutePosition = normalizedPosition * midiMetadata.maxScrollLeft

			// Update the scroll position
			updateHorizontalScrollPosition(absolutePosition)
		}

		// Handle mouse up to end dragging
		const handleMouseUp = () => {
			setIsDraggingHorizontalThumb(false)
			document.body.style.userSelect = ''
		}

		// Handle click on scrollbar track (not on thumb)
		const handleTrackClick = (e: MouseEvent) => {
			// Skip during playback
			if (playing) return

			// Ignore if clicked on thumb
			if (e.target === scrollThumb) return

			const scrollbarWidth = scrollbarContainer.clientWidth
			const thumbWidth = scrollThumb.clientWidth

			// Calculate available travel
			const availableTravel = scrollbarWidth - thumbWidth

			if (availableTravel <= 0) return

			// Get click position relative to scrollbar
			const rect = scrollbarContainer.getBoundingClientRect()
			const clickPositionX = e.clientX - rect.left

			// Calculate normalized position (0-1), accounting for thumb width
			const normalizedPosition = (clickPositionX - thumbWidth / 2) / availableTravel
			const boundedPosition = Math.max(0, Math.min(1, normalizedPosition))

			// Calculate absolute position
			const absolutePosition = boundedPosition * midiMetadata.maxScrollLeft

			// Update scroll position
			updateHorizontalScrollPosition(absolutePosition)
		}

		// Set up event listeners
		scrollThumb.addEventListener('mousedown', handleMouseDown)
		scrollbarContainer.addEventListener('click', handleTrackClick)
		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)

		// Update thumb position when horizontal scroll position changes
		const updateThumbPosition = () => {
			if (playing) return // Skip updates during playback

			const scrollbarWidth = scrollbarContainer.clientWidth
			const thumbWidth = scrollThumb.clientWidth
			const availableTravel = scrollbarWidth - thumbWidth

			if (availableTravel <= 0 || midiMetadata.maxScrollLeft <= 0) return

			// Calculate normalized position (0-1)
			const normalizedPosition = horizontalScrollPosition / midiMetadata.maxScrollLeft

			// Update thumb position
			scrollThumb.style.left = `${normalizedPosition * availableTravel}px`
		}

		// Set initial thumb position
		updateThumbPosition()

		// Clean up
		return () => {
			scrollThumb.removeEventListener('mousedown', handleMouseDown)
			scrollbarContainer.removeEventListener('click', handleTrackClick)
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	}, [isDraggingHorizontalThumb, horizontalScrollPosition, updateHorizontalScrollPosition, midiMetadata.maxScrollLeft, playing])

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
					style={{ width: WHITE_KEY_WIDTH, height: midiMetadata.visiblePianoRollHeight, minHeight: 100 }}
				>
					{midiMetadata.initialized && (
						<Stage width={WHITE_KEY_WIDTH} height={midiMetadata.visiblePianoRollHeight}>
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
					className="flex-grow overflow-hidden relative"
					style={{
						height: midiMetadata.visiblePianoRollHeight,
						position: 'relative',
					}}
				>
					{midiMetadata.initialized && (
						<Stage
							ref={stageRef}
							width={containerWidth}
							height={midiMetadata.visiblePianoRollHeight}
							perfectDrawEnabled={false}
							shadowForStrokeEnabled={false}
						>
							<Layer imageSmoothingEnabled={false}>
								{/* Background */}
								<Rect
									x={0}
									y={0}
									width={containerWidth}
									height={midiMetadata.visiblePianoRollHeight}
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
											currentTime * PIXELS_PER_SECOND - horizontalScrollPosition,
											0,
											currentTime * PIXELS_PER_SECOND - horizontalScrollPosition,
											midiMetadata.visiblePianoRollHeight,
										]}
										stroke={stemColor}
										strokeWidth={2}
									/>

									{/* Triangle indicator */}
									<Line
										points={[
											currentTime * PIXELS_PER_SECOND - horizontalScrollPosition - 6,
											0,
											currentTime * PIXELS_PER_SECOND - horizontalScrollPosition + 6,
											0,
											currentTime * PIXELS_PER_SECOND - horizontalScrollPosition,
											8,
										]}
										closed={true}
										fill={stemColor}
									/>
								</Group>
							</Layer>
						</Stage>
					)}

					{/* Custom vertical scrollbar */}
					{midiMetadata.needsVerticalScroll && (
						<div
							ref={customScrollbarRef}
							className="absolute right-0 top-0 bottom-0"
							style={{
								width: SCROLLBAR_WIDTH,
								backgroundColor: 'hsl(222.2 84% 5.9%)', // Very dark blue, slightly lighter than background
								border: 'none',
							}}
						>
							<div
								ref={scrollThumbRef}
								className="absolute cursor-pointer"
								style={{
									width: '60%',
									height: '60px',
									backgroundColor: 'hsl(217 15% 65%)', // Muted blue-gray color
									borderRadius: '3px',
									top: 0,
									left: '20%', // Center it horizontally (20% on each side)
									transition: isDraggingThumb ? 'none' : 'top 0.1s',
								}}
							/>
						</div>
					)}
				</div>
			</div>

			{/* Horizontal scrollbar */}
			<div className="w-full flex-shrink-0" style={{ height: SCROLLBAR_HEIGHT }}>
				<div
					ref={customHorizontalScrollbarRef}
					className="relative h-full"
					style={{
						backgroundColor: 'hsl(222.2 84% 5.9%)', // Very dark blue, slightly lighter than background
						border: 'none',
						width: midiMetadata.needsVerticalScroll ? `calc(100% - ${SCROLLBAR_WIDTH}px)` : '100%',
					}}
				>
					<div
						ref={scrollHorizontalThumbRef}
						className="absolute cursor-pointer"
						style={{
							height: '60%',
							top: '20%', // Center it vertically (20% on each side)
							width:
								midiMetadata.maxScrollLeft > 0
									? `${Math.max(40, (containerWidth / midiMetadata.rollWidth) * 100)}%`
									: '100%',
							backgroundColor: 'hsl(217 15% 65%)', // Muted blue-gray color
							borderRadius: '3px',
							left: 0,
							transition: isDraggingHorizontalThumb || playing ? 'none' : 'left 0.1s',
						}}
					/>
				</div>

				{/* Add the corner square for when both scrollbars are visible */}
				{midiMetadata.needsVerticalScroll && (
					<div
						className="absolute bottom-0 right-0"
						style={{
							width: SCROLLBAR_WIDTH,
							height: SCROLLBAR_HEIGHT,
							backgroundColor: 'hsl(222.2 84% 5.9%)', // Match scrollbar track color
						}}
					/>
				)}
			</div>
		</div>
	)
}
