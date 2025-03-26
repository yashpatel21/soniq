import React from 'react'
import { WaveformPlayer } from './WaveformPlayer'

interface StemPlayerProps {
	stemName: string
	stemUrl: string
	stemColor?: string
}

export function StemPlayer({ stemName, stemUrl, stemColor }: StemPlayerProps) {
	// Get stem color based on stem name
	const getColorForStem = () => {
		if (stemColor) return stemColor

		const stemLower = stemName.toLowerCase()
		if (stemLower.includes('vocals')) return 'rgb(79, 70, 229)' // indigo-600
		if (stemLower.includes('drum')) return 'rgb(220, 38, 38)' // red-600
		if (stemLower.includes('bass')) return 'rgb(234, 88, 12)' // orange-600
		if (stemLower.includes('guitar')) return 'rgb(217, 119, 6)' // amber-600
		if (stemLower.includes('piano') || stemLower.includes('keys')) return 'rgb(5, 150, 105)' // emerald-600
		if (stemLower.includes('wind')) return 'rgb(56, 189, 248)' // sky-400
		if (stemLower.includes('strings')) return 'rgb(139, 92, 246)' // violet-500
		return 'rgb(124, 58, 237)' // violet-600 (default)
	}

	// Get the stem color
	const progressColor = getColorForStem()

	return (
		<div className="isolate z-10">
			<WaveformPlayer
				stemName={stemName}
				stemUrl={stemUrl}
				waveColor="rgb(148, 163, 184)"
				progressColor={progressColor}
				className="transform transition-all duration-300 hover:scale-[1.005] hover:shadow-md active:scale-[0.995]"
			/>
		</div>
	)
}
