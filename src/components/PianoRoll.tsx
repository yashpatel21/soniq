'use client'

import React, { useRef, useEffect, useState, WheelEvent } from 'react'
import { Midi, Track } from '@tonejs/midi'
import { cn } from '@/lib/utils/ui/utils'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

// Constants for piano roll display
const NOTE_HEIGHT = 8
const WHITE_KEY_WIDTH = 40
const MIN_PITCH = 21 // A0
const MAX_PITCH = 108 // C8
const PIXELS_PER_SECOND = 100
const VERTICAL_PADDING_NOTES = 4
const SCROLLBAR_HEIGHT = 12
const SCROLL_GAP = 4

// Helper to determine if a pitch is a white key (C, D, E, F, G, A, B)
const isWhiteKey = (pitch: number): boolean => {
	const note = pitch % 12
	return [0, 2, 4, 5, 7, 9, 11].includes(note)
}

// Convert MIDI pitch to note name with octave
const pitchToNoteName = (pitch: number): string => {
	const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
	const octave = Math.floor(pitch / 12) - 1
	const note = noteNames[pitch % 12]
	return `${note}${octave}`
}

interface PianoRollProps {
	midiObject: Midi
	currentTime: number
	playing: boolean
	className?: string
}

export function PianoRoll({ midiObject, currentTime, playing, className = '' }: PianoRollProps) {
	// Canvas and DOM refs
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const pianoKeysRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const rollAreaRef = useRef<HTMLDivElement>(null)
	const scrollbarRef = useRef<HTMLDivElement>(null)

	// Basic state
	const [containerWidth, setContainerWidth] = useState<number>(800)
	const [scrollLeft, setScrollLeft] = useState<number>(0)

	// MIDI data state
	const [midiMetadata, setMidiMetadata] = useState({
		duration: 10,
		rollWidth: 1000,
		minPitch: MIN_PITCH,
		maxPitch: MAX_PITCH,
		pianoRollHeight: 704,
		maxScrollLeft: 0,
		initialized: false,
	})

	// Animation state refs
	const playheadAnimationRef = useRef<number | null>(null)
	const scrollLeftRef = useRef<number>(scrollLeft)

	// Keep scroll position ref in sync with state
	useEffect(() => {
		scrollLeftRef.current = scrollLeft
	}, [scrollLeft])

	// Initialize the piano roll once on mount
	useEffect(() => {
		console.log('Initializing PianoRoll')

		// Calculate container width on mount
		if (containerRef.current) {
			const width = containerRef.current.clientWidth - WHITE_KEY_WIDTH
			setContainerWidth(width > 0 ? width : 800)
		}

		// Process MIDI data
		processMidiData()

		// Set up resize handler
		const handleResize = () => {
			if (containerRef.current) {
				const width = containerRef.current.clientWidth - WHITE_KEY_WIDTH
				setContainerWidth(width > 0 ? width : 800)
			}
		}

		window.addEventListener('resize', handleResize)

		// Clean up on unmount
		return () => {
			window.removeEventListener('resize', handleResize)
			if (playheadAnimationRef.current) {
				cancelAnimationFrame(playheadAnimationRef.current)
			}
		}
	}, [])

	// Process MIDI data
	const processMidiData = () => {
		if (!midiObject || !midiObject.tracks || midiObject.tracks.length === 0) {
			console.log('No valid MIDI data')
			return
		}

		console.log(`Processing MIDI data with ${midiObject.tracks.length} tracks`)

		// Calculate duration
		const maxDuration = Math.max(
			...midiObject.tracks.map((track) => {
				if (!track.notes || track.notes.length === 0) return 0
				const lastNote = track.notes[track.notes.length - 1]
				return lastNote.time + lastNote.duration
			})
		)
		const duration = Math.max(maxDuration + 2, 10)

		// Find pitch range
		let highestPitch = MIN_PITCH
		let lowestPitch = MAX_PITCH
		let totalNotes = 0

		midiObject.tracks.forEach((track) => {
			if (!track.notes || track.notes.length === 0) return

			totalNotes += track.notes.length

			track.notes.forEach((note) => {
				if (typeof note.midi !== 'number') return

				if (note.midi > highestPitch) highestPitch = note.midi
				if (note.midi < lowestPitch) lowestPitch = note.midi
			})
		})

		// Add padding to pitch range
		const minPitch = Math.max(MIN_PITCH, lowestPitch - VERTICAL_PADDING_NOTES)
		const maxPitch = Math.min(MAX_PITCH, highestPitch + VERTICAL_PADDING_NOTES)
		const pianoRollHeight = (maxPitch - minPitch + 1) * NOTE_HEIGHT

		// Calculate roll width based on duration
		const rollWidth = Math.max(duration * PIXELS_PER_SECOND, 1000)

		// Calculate max scroll
		const maxScrollLeft = Math.max(0, rollWidth - containerWidth)

		console.log(`MIDI contains ${totalNotes} notes from ${lowestPitch} to ${highestPitch}`)
		console.log(`Piano roll dimensions: ${rollWidth}x${pianoRollHeight}`)

		// Update state with all MIDI metadata
		setMidiMetadata({
			duration,
			rollWidth,
			minPitch,
			maxPitch,
			pianoRollHeight,
			maxScrollLeft,
			initialized: true,
		})

		// Schedule a single draw after state update
		setTimeout(() => {
			drawPianoKeys()
			drawPianoRoll()
		}, 50)
	}

	// Update max scroll when container width or roll width changes
	useEffect(() => {
		const maxScrollLeft = Math.max(0, midiMetadata.rollWidth - containerWidth)
		setMidiMetadata((prev) => ({ ...prev, maxScrollLeft }))

		// Adjust current scroll if needed
		if (scrollLeft > maxScrollLeft) {
			setScrollLeft(maxScrollLeft)
		}

		// Redraw piano keys when container dimensions change
		drawPianoKeys()
	}, [containerWidth, midiMetadata.rollWidth, midiMetadata.pianoRollHeight])

	// Handle playhead animation
	useEffect(() => {
		// Cancel any existing animation
		if (playheadAnimationRef.current) {
			cancelAnimationFrame(playheadAnimationRef.current)
			playheadAnimationRef.current = null
		}

		// If not playing, just draw once and exit
		if (!playing) {
			drawPianoRoll()
			return
		}

		// Reset to beginning if needed
		if (currentTime === 0) {
			console.log('Reset detected, scrolling to beginning')
			setScrollLeft(0)

			// Immediately update the scroll references to prevent flicker
			scrollLeftRef.current = 0
			if (scrollbarRef.current) {
				scrollbarRef.current.scrollLeft = 0
			}
		}

		// Start animation loop
		const animate = () => {
			// Draw piano roll with playhead
			drawPianoRoll()

			// Auto-scroll if needed
			autoScrollIfNeeded()

			// Continue animation
			playheadAnimationRef.current = requestAnimationFrame(animate)
		}

		playheadAnimationRef.current = requestAnimationFrame(animate)

		return () => {
			if (playheadAnimationRef.current) {
				cancelAnimationFrame(playheadAnimationRef.current)
			}
		}
	}, [playing, currentTime, midiMetadata.initialized])

	// Auto-scroll to keep playhead visible
	const autoScrollIfNeeded = () => {
		if (!playing) return

		const playheadX = currentTime * PIXELS_PER_SECOND
		const viewportWidth = containerWidth

		// Check if playhead is outside visible area
		const isOutsideRight = playheadX > scrollLeftRef.current + viewportWidth * 0.7
		const isOutsideLeft = playheadX < scrollLeftRef.current + viewportWidth * 0.3

		if (isOutsideRight || isOutsideLeft) {
			// Position playhead at 30% from left
			const newScrollLeft = Math.max(0, playheadX - viewportWidth * 0.3)
			setScrollLeft(Math.min(newScrollLeft, midiMetadata.maxScrollLeft))
		}
	}

	// Apply scroll position to content
	useEffect(() => {
		if (contentRef.current) {
			contentRef.current.style.transform = `translateX(-${scrollLeft}px)`
		}

		// Update scrollbar
		if (scrollbarRef.current) {
			scrollbarRef.current.scrollLeft = scrollLeft
		}
	}, [scrollLeft])

	// Draw piano keys
	const drawPianoKeys = () => {
		const canvas = pianoKeysRef.current
		if (!canvas) return

		// Set canvas dimensions - even if MIDI is not initialized, use a default height
		const height = midiMetadata.initialized ? midiMetadata.pianoRollHeight : 704 // Default height
		canvas.height = height
		canvas.width = WHITE_KEY_WIDTH

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		// Clear canvas with a background
		ctx.fillStyle = '#1a1a1a'
		ctx.fillRect(0, 0, WHITE_KEY_WIDTH, height)

		// If MIDI is not initialized, draw default piano keys
		const minPitch = midiMetadata.initialized ? midiMetadata.minPitch : MIN_PITCH
		const maxPitch = midiMetadata.initialized ? midiMetadata.maxPitch : MAX_PITCH

		// Draw each key
		for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
			const relativePosition = pitch - minPitch
			const y = height - (relativePosition + 1) * NOTE_HEIGHT

			// Fill based on key type
			const isWhiteK = isWhiteKey(pitch)
			ctx.fillStyle = isWhiteK ? '#ffffff' : '#222222'

			// Use different width for white and black keys
			const keyWidth = isWhiteK ? WHITE_KEY_WIDTH : WHITE_KEY_WIDTH * 0.65
			ctx.fillRect(0, y, keyWidth, NOTE_HEIGHT)

			// Add border with better contrast
			ctx.strokeStyle = isWhiteK ? '#888888' : '#444444'
			ctx.lineWidth = 1
			ctx.strokeRect(0, y, keyWidth, NOTE_HEIGHT)

			// Add note labels for all C and F notes for better reference
			if (pitch % 12 === 0 || pitch % 12 === 5) {
				// C or F notes
				ctx.fillStyle = isWhiteK ? '#000000' : '#ffffff'
				ctx.font = '10px Arial'
				ctx.textBaseline = 'bottom'
				ctx.fillText(pitchToNoteName(pitch), 3, y + NOTE_HEIGHT - 1)
			}
		}

		console.log('Piano keys drawn')
	}

	// Draw the piano roll
	const drawPianoRoll = () => {
		const canvas = canvasRef.current
		if (!canvas || !midiMetadata.initialized || !midiObject?.tracks) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		// Set canvas size if needed
		if (canvas.width !== midiMetadata.rollWidth || canvas.height !== midiMetadata.pianoRollHeight) {
			console.log(`Setting canvas size to ${midiMetadata.rollWidth}x${midiMetadata.pianoRollHeight}`)
			canvas.width = midiMetadata.rollWidth
			canvas.height = midiMetadata.pianoRollHeight
		}

		// Clear canvas
		ctx.clearRect(0, 0, midiMetadata.rollWidth, midiMetadata.pianoRollHeight)

		// Draw background
		ctx.fillStyle = '#121212'
		ctx.fillRect(0, 0, midiMetadata.rollWidth, midiMetadata.pianoRollHeight)

		// Draw piano roll grid
		drawGrid(ctx)

		// Draw notes
		drawNotes(ctx)

		// Draw playhead
		drawPlayhead(ctx)
	}

	// Draw grid lines
	const drawGrid = (ctx: CanvasRenderingContext2D) => {
		// Draw horizontal note lines
		for (let pitch = midiMetadata.minPitch; pitch <= midiMetadata.maxPitch; pitch++) {
			const relativePosition = pitch - midiMetadata.minPitch
			const y = midiMetadata.pianoRollHeight - (relativePosition + 1) * NOTE_HEIGHT

			// Highlight white keys
			if (isWhiteKey(pitch)) {
				ctx.fillStyle = '#1a1a1a'
				ctx.fillRect(0, y, midiMetadata.rollWidth, NOTE_HEIGHT)
			}

			// Draw line
			ctx.strokeStyle = pitch % 12 === 0 ? '#2a2a5a' : '#333333'
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.moveTo(0, y)
			ctx.lineTo(midiMetadata.rollWidth, y)
			ctx.stroke()
		}

		// Draw vertical beat lines
		const secondsPerBeat = 60 / ((midiObject.header.tempos && midiObject.header.tempos[0]?.bpm) || 120)
		const pixelsPerBeat = PIXELS_PER_SECOND * secondsPerBeat

		for (let beat = 0; beat < midiMetadata.duration / secondsPerBeat; beat++) {
			const x = beat * pixelsPerBeat

			ctx.beginPath()
			ctx.strokeStyle = beat % 4 === 0 ? '#555555' : '#333333'
			ctx.moveTo(x, 0)
			ctx.lineTo(x, midiMetadata.pianoRollHeight)
			ctx.stroke()
		}
	}

	// Draw MIDI notes
	const drawNotes = (ctx: CanvasRenderingContext2D) => {
		const trackColors = [
			'#7c4dff', // Purple
			'#00b0ff', // Blue
			'#00c853', // Green
			'#ffd600', // Yellow
			'#ff6d00', // Orange
			'#ff1744', // Red
		]

		let notesDrawn = 0

		midiObject.tracks.forEach((track, trackIndex) => {
			if (!track.notes || track.notes.length === 0) return

			const color = trackColors[trackIndex % trackColors.length]

			track.notes.forEach((note) => {
				if (typeof note.midi !== 'number' || typeof note.time !== 'number' || typeof note.duration !== 'number') {
					return
				}

				// Skip notes outside visible range
				if (note.midi < midiMetadata.minPitch || note.midi > midiMetadata.maxPitch) return

				const x = note.time * PIXELS_PER_SECOND
				const relativePosition = note.midi - midiMetadata.minPitch
				const y = midiMetadata.pianoRollHeight - (relativePosition + 1) * NOTE_HEIGHT
				const width = Math.max(note.duration * PIXELS_PER_SECOND, 2)

				// Draw note rectangle
				ctx.fillStyle = color
				ctx.fillRect(x, y, width, NOTE_HEIGHT)

				// Draw border
				ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
				ctx.lineWidth = 1
				ctx.strokeRect(x, y, width, NOTE_HEIGHT)

				notesDrawn++
			})
		})

		if (notesDrawn > 0) {
			console.log(`Drew ${notesDrawn} notes`)
		}
	}

	// Draw playhead
	const drawPlayhead = (ctx: CanvasRenderingContext2D) => {
		const playheadX = currentTime * PIXELS_PER_SECOND

		// Draw playhead line
		ctx.strokeStyle = '#ffffff'
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(playheadX, 0)
		ctx.lineTo(playheadX, midiMetadata.pianoRollHeight)
		ctx.stroke()

		// Add triangle marker at position 0
		if (currentTime === 0) {
			ctx.fillStyle = '#ffffff'
			ctx.beginPath()
			ctx.moveTo(playheadX, 0)
			ctx.lineTo(playheadX + 6, 10)
			ctx.lineTo(playheadX - 6, 10)
			ctx.fill()
		}
	}

	// Handle scrollbar events
	const handleScrollbarScroll = (e: React.UIEvent<HTMLDivElement>) => {
		if (playing) {
			// Restore scrollbar position during playback
			if (scrollbarRef.current) {
				scrollbarRef.current.scrollLeft = scrollLeftRef.current
			}
			return
		}

		const newScrollLeft = e.currentTarget.scrollLeft
		setScrollLeft(Math.min(newScrollLeft, midiMetadata.maxScrollLeft))
	}

	// Add wheel event handler
	useEffect(() => {
		const rollArea = rollAreaRef.current
		if (!rollArea) return

		const wheelHandler = (e: globalThis.WheelEvent) => {
			e.preventDefault()

			// Block scrolling during playback
			if (playing) return

			// Calculate new scroll position
			const delta = e.deltaX || e.deltaY
			const newScrollLeft = Math.max(0, Math.min(scrollLeftRef.current + delta, midiMetadata.maxScrollLeft))
			setScrollLeft(newScrollLeft)
		}

		rollArea.addEventListener('wheel', wheelHandler, { passive: false })

		return () => {
			rollArea.removeEventListener('wheel', wheelHandler)
		}
	}, [playing, midiMetadata.maxScrollLeft])

	// Block scrollbar interactions during playback
	useEffect(() => {
		const scrollbarArea = scrollbarRef.current
		if (!scrollbarArea) return

		const blockInteraction = (e: MouseEvent) => {
			if (playing) {
				e.preventDefault()
				e.stopPropagation()
				return false
			}
			return true
		}

		scrollbarArea.addEventListener('mousedown', blockInteraction, { capture: true })
		scrollbarArea.addEventListener('click', blockInteraction, { capture: true })
		scrollbarArea.addEventListener('mouseup', blockInteraction, { capture: true })

		return () => {
			scrollbarArea.removeEventListener('mousedown', blockInteraction, { capture: true })
			scrollbarArea.removeEventListener('click', blockInteraction, { capture: true })
			scrollbarArea.removeEventListener('mouseup', blockInteraction, { capture: true })
		}
	}, [playing])

	// Calculate container height
	const containerHeight = Math.max(200, midiMetadata.pianoRollHeight + SCROLL_GAP + SCROLLBAR_HEIGHT)

	// Process MIDI data when it changes
	useEffect(() => {
		processMidiData()
	}, [midiObject])

	// Reset scroll position when currentTime is reset to 0
	useEffect(() => {
		if (currentTime === 0) {
			console.log('Resetting scroll position to beginning')
			setScrollLeft(0)

			// Also update the scrollbar UI
			if (scrollbarRef.current) {
				scrollbarRef.current.scrollLeft = 0
			}
		}
	}, [currentTime])

	// Draw piano keys on component mount regardless of MIDI status
	useEffect(() => {
		drawPianoKeys()
	}, [])

	// Force redraw on metadata changes
	useEffect(() => {
		if (midiMetadata.initialized) {
			drawPianoKeys()
			drawPianoRoll()
		}
	}, [midiMetadata.initialized, midiMetadata.minPitch, midiMetadata.maxPitch])

	return (
		<div
			className={cn('flex flex-col border overflow-hidden rounded-lg', className)}
			style={{ height: `${containerHeight}px` }}
			ref={containerRef}
		>
			{/* Piano keys and roll area */}
			<div className="flex flex-row overflow-hidden">
				{/* Piano keys */}
				<div
					className="flex-shrink-0 border-r border-gray-600 bg-gray-800"
					style={{ width: WHITE_KEY_WIDTH, height: midiMetadata.pianoRollHeight }}
				>
					<canvas ref={pianoKeysRef} width={WHITE_KEY_WIDTH} height={midiMetadata.pianoRollHeight} />
				</div>

				{/* Piano roll */}
				<div
					ref={rollAreaRef}
					className="flex-grow overflow-hidden"
					style={{ height: midiMetadata.pianoRollHeight, position: 'relative' }}
				>
					<div
						ref={contentRef}
						style={{
							position: 'absolute',
							width: midiMetadata.rollWidth,
							height: midiMetadata.pianoRollHeight,
							willChange: 'transform',
						}}
					>
						<canvas ref={canvasRef} width={midiMetadata.rollWidth} height={midiMetadata.pianoRollHeight} />
					</div>
				</div>
			</div>

			{/* Gap */}
			<div style={{ height: SCROLL_GAP }}></div>

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
