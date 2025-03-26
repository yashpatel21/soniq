import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Clock, Music2, AlertTriangle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface AudioAnalysisData {
	analysisResults?: {
		bpm: number
		key: string
		scale: string
	}
	status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface AudioAnalysisResultsProps {
	analysisData: AudioAnalysisData | undefined
	isLoading: boolean
	isError: boolean
}

export function AudioAnalysisResults({ analysisData, isLoading, isError }: AudioAnalysisResultsProps) {
	// Helper function to get camelot key notation (for DJs)
	const getCamelotKey = (key: string, scale: string): string => {
		const camelotMap: Record<string, { major: string; minor: string }> = {
			C: { major: '8B', minor: '5A' },
			G: { major: '9B', minor: '6A' },
			D: { major: '10B', minor: '7A' },
			A: { major: '11B', minor: '8A' },
			E: { major: '12B', minor: '9A' },
			B: { major: '1B', minor: '10A' },
			'F#': { major: '2B', minor: '11A' },
			Gb: { major: '2B', minor: '11A' },
			'C#': { major: '3B', minor: '12A' },
			Db: { major: '3B', minor: '12A' },
			'G#': { major: '4B', minor: '1A' },
			Ab: { major: '4B', minor: '1A' },
			'D#': { major: '5B', minor: '2A' },
			Eb: { major: '5B', minor: '2A' },
			'A#': { major: '6B', minor: '3A' },
			Bb: { major: '6B', minor: '3A' },
			F: { major: '7B', minor: '4A' },
		}

		// Properly type the scale and provide a default
		const scaleType = scale?.toLowerCase() === 'minor' ? 'minor' : 'major'
		return key in camelotMap ? camelotMap[key][scaleType] : '1A'
	}

	// Function to get compatible keys based on Camelot code
	const getCompatibleKeys = (key: string, scale: string): { name: string; code: string; reason: string }[] => {
		const camelotCode = getCamelotKey(key, scale)
		const number = parseInt(camelotCode.replace(/[AB]$/, ''))
		const letter = camelotCode.slice(-1)

		const compatible = []

		// Add only unique compatibility options with explanations

		// +1 position (next key clockwise)
		const nextNum = number === 12 ? 1 : number + 1
		const nextCode = `${nextNum}${letter}`
		compatible.push({
			name: getKeyNameFromCamelot(nextCode),
			code: nextCode,
			reason: 'Perfect match: adjacent key on Camelot wheel',
		})

		// -1 position (next key counter-clockwise)
		const prevNum = number === 1 ? 12 : number - 1
		const prevCode = `${prevNum}${letter}`
		compatible.push({
			name: getKeyNameFromCamelot(prevCode),
			code: prevCode,
			reason: 'Perfect match: adjacent key on Camelot wheel',
		})

		// Relative major/minor
		const relLetter = letter === 'A' ? 'B' : 'A'
		const relCode = `${number}${relLetter}`
		compatible.push({
			name: getKeyNameFromCamelot(relCode),
			code: relCode,
			reason: 'Energy change: relative major/minor key',
		})

		return compatible
	}

	// Convert a camelot code to key name
	const getKeyNameFromCamelot = (camelotCode: string): string => {
		const keyMap: Record<string, string> = {
			'1A': 'Ab minor',
			'1B': 'B major',
			'2A': 'Eb minor',
			'2B': 'F# major',
			'3A': 'Bb minor',
			'3B': 'Db major',
			'4A': 'F minor',
			'4B': 'Ab major',
			'5A': 'C minor',
			'5B': 'Eb major',
			'6A': 'G minor',
			'6B': 'Bb major',
			'7A': 'D minor',
			'7B': 'F major',
			'8A': 'A minor',
			'8B': 'C major',
			'9A': 'E minor',
			'9B': 'G major',
			'10A': 'B minor',
			'10B': 'D major',
			'11A': 'F# minor',
			'11B': 'A major',
			'12A': 'C# minor',
			'12B': 'E major',
		}

		return keyMap[camelotCode] || camelotCode
	}

	// Calculate tempo animation duration based on BPM
	const calculateTempoDuration = (bpm: number): string => {
		const normalizedBpm = Math.min(Math.max(bpm, 60), 200)
		return `${60 / normalizedBpm}s`
	}

	// Format key and scale into a readable string
	const formatKeyScale = (key: string, scale: string): string => {
		return `${key} ${scale.toLowerCase()}`
	}

	// Render the DJ insights content with compatible keys and explanations
	const renderDJInsightsContent = (key: string, scale: string) => {
		const camelotCode = getCamelotKey(key, scale)
		const compatibleKeys = getCompatibleKeys(key, scale)

		return (
			<div className="w-full flex flex-col items-center gap-1">
				<span className="text-2xl font-bold leading-tight mt-1">{camelotCode}</span>
				<span className="text-xs text-muted-foreground mb-2">Camelot Code</span>

				<div className="w-full flex flex-row flex-wrap justify-center gap-2 mt-1">
					{compatibleKeys.map((ck, index) => (
						<div key={index} className="flex items-center gap-1">
							<Badge
								variant="outline"
								className="bg-amber-100/30 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/30"
							>
								{ck.code}
							</Badge>
							<span className="text-xs">{ck.name}</span>
						</div>
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="mt-2 pt-2">
			<div>
				{/* Loading state */}
				{isLoading && (
					<div className="p-2.5">
						<div className="grid grid-cols-3 gap-4">
							{[1, 2, 3].map((i) => (
								<Card key={i} className="border border-border/40">
									<CardContent className="p-4 flex flex-col items-center justify-center text-center">
										<Skeleton className="h-10 w-10 rounded-full my-2" />
										<div className="flex-1 flex flex-col items-center mt-2">
											<Skeleton className="h-3 w-20 mb-2" />
											<Skeleton className="h-6 w-16 mb-1" />
											<Skeleton className="h-3 w-24" />
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				)}

				{/* Error state */}
				{isError && (
					<div className="p-2.5">
						<Alert variant="destructive" className="py-1.5">
							<AlertTriangle className="h-4 w-4 mr-2" />
							<AlertDescription>Error loading analysis data</AlertDescription>
						</Alert>
					</div>
				)}

				{/* Processing state */}
				{analysisData?.status === 'processing' && (
					<div className="p-2.5">
						<div className="bg-accent/30 rounded-lg p-2.5 border border-border/40">
							<div className="flex items-center gap-3">
								<div className="relative h-10 w-10 flex-shrink-0">
									<div className="absolute inset-0 flex justify-center items-center">
										<Clock className="h-7 w-7 text-primary opacity-80 animate-pulse" />
									</div>
								</div>
								<div className="flex-1">
									<div className="h-2 bg-primary/10 rounded-full overflow-hidden mb-1.5">
										<div className="h-full bg-primary animate-waveProgress"></div>
									</div>
									<p className="text-sm">Analyzing your audio track...</p>
									<p className="text-xs text-muted-foreground">Detecting tempo, key and other musical elements</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Failed state */}
				{analysisData?.status === 'failed' && (
					<div className="p-2.5">
						<Alert variant="destructive">
							<div className="flex items-center gap-2">
								<AlertTriangle className="h-5 w-5 text-red-600" />
								<div>
									<p className="font-medium">Analysis failed</p>
									<p className="text-xs">Please try uploading a different audio file.</p>
								</div>
							</div>
						</Alert>
					</div>
				)}

				{/* Completed state with results */}
				{analysisData?.status === 'completed' && analysisData.analysisResults && (
					<div className="grid grid-cols-3 gap-4 p-3">
						{/* Tempo card with animated ring */}
						<AnalysisResult
							icon={<Activity className="h-5 w-5 z-10 relative" />}
							title="Tempo"
							value={`${analysisData.analysisResults.bpm.toFixed(1)}`}
							subValue="BPM"
							iconBgClass="bg-primary/10 relative"
							iconTextClass="text-primary"
							ringClass="absolute inset-0 rounded-full border-2 border-primary/40 animate-subtle-ping"
							customStyle={
								{
									'--tempo-duration': calculateTempoDuration(analysisData.analysisResults.bpm),
								} as React.CSSProperties
							}
						/>

						{/* Combined Key+Scale card */}
						<AnalysisResult
							icon={<Music2 className="h-5 w-5" />}
							title="Key"
							value={formatKeyScale(analysisData.analysisResults.key, analysisData.analysisResults.scale)}
							subValue="Musical Key"
							iconBgClass="bg-purple-100 dark:bg-purple-950/50"
							iconTextClass="text-purple-600 dark:text-purple-400"
						/>

						{/* SonIQ Insights card */}
						<Card className="border border-border/40 bg-accent/30">
							<CardContent className="p-4 flex flex-col items-center justify-center text-center">
								<div className="rounded-full p-2.5 flex-shrink-0 my-2 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
									<Lightbulb className="h-5 w-5" />
								</div>
								<span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">SonIQ Insights</span>
								{renderDJInsightsContent(analysisData.analysisResults.key, analysisData.analysisResults.scale)}
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	)
}

interface AnalysisResultProps {
	icon: React.ReactNode
	title: string
	value: string
	subValue: string
	iconBgClass: string
	iconTextClass: string
	customStyle?: React.CSSProperties
	ringClass?: string
	hasLongText?: boolean
}

function AnalysisResult({
	icon,
	title,
	value,
	subValue,
	iconBgClass,
	iconTextClass,
	customStyle,
	ringClass,
	hasLongText,
}: AnalysisResultProps) {
	return (
		<Card className="border border-border/40 bg-accent/30">
			<CardContent className="p-4 flex flex-col items-center justify-center text-center">
				<div className={cn('rounded-full p-2.5 flex-shrink-0 my-2', iconBgClass, iconTextClass)} style={customStyle}>
					{ringClass && <div className={ringClass}></div>}
					{icon}
				</div>
				<div className="flex flex-col items-center mt-1">
					<span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</span>
					<span className="text-2xl font-bold leading-tight mt-1">{value}</span>
					<span className={cn('text-xs text-muted-foreground mt-1', hasLongText && 'max-w-[200px] text-center')}>{subValue}</span>
				</div>
			</CardContent>
		</Card>
	)
}
