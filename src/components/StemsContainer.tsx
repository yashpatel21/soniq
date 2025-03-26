import React, { useState } from 'react'
import { StemPlayer } from './StemPlayer'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Headphones, Music, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StemsProcessingVisualization } from './StemsProcessingVisualization'

interface StemsData {
	stems?: {
		[stemName: string]: string
	}
	status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface StemsContainerProps {
	stemsData: StemsData | undefined
	isLoading: boolean
	isError: boolean
}

export function StemsContainer({ stemsData, isLoading, isError }: StemsContainerProps) {
	const [activeFilter, setActiveFilter] = useState<string | null>(null)

	// Get the stems data if available
	const stemItems = stemsData?.stems ? Object.entries(stemsData.stems) : []

	// Filter stems based on active filter
	const filteredStems = React.useMemo(() => {
		if (!activeFilter) return stemItems
		return stemItems.filter(([name]) => name.toLowerCase().includes(activeFilter.toLowerCase()))
	}, [stemItems, activeFilter])

	// Get unique stem types for filtering
	const stemTypes = React.useMemo(() => {
		if (!stemItems.length) return []

		const types = new Set<string>()
		stemItems.forEach(([name]) => {
			// Extract stem type from name (vocals, drums, etc.)
			const nameLC = name.toLowerCase()
			if (nameLC.includes('vocal')) types.add('Vocals')
			else if (nameLC.includes('drum')) types.add('Drums')
			else if (nameLC.includes('bass')) types.add('Bass')
			else if (nameLC.includes('guitar')) types.add('Guitar')
			else if (nameLC.includes('piano') || nameLC.includes('keys')) types.add('Keys')
			else if (nameLC.includes('strings')) types.add('Strings')
			else if (nameLC.includes('wind')) types.add('Wind')
			else types.add('Other')
		})

		return Array.from(types)
	}, [stemItems])

	// Show error message
	if (isError) {
		return (
			<div className="border-t border-border mt-2 pt-2">
				<div className="flex items-center justify-between py-3 mb-2">
					<div className="flex items-center gap-2.5">
						<Headphones className="h-6 w-6 text-primary" />
						<span className="text-2xl font-bold">Stems Separation</span>
					</div>
				</div>

				<div className="p-2.5">
					<Alert variant="destructive">
						<AlertDescription>Error loading stems data</AlertDescription>
					</Alert>
				</div>
			</div>
		)
	}

	// Handle data states
	return (
		<div className="border-t border-border mt-2 pt-2">
			<div className="flex items-center justify-between py-3 mb-2">
				<div className="flex items-center gap-2.5">
					<Headphones className="h-6 w-6 text-primary" />
					<span className="text-2xl font-bold">Stems Separation</span>
				</div>
			</div>

			<div>
				{/* Show blank skeleton for initial loading */}
				{!stemsData && (
					<div className="p-2.5">
						<div className="h-[300px] rounded-lg border border-border/40 animate-pulse bg-accent/30" />
					</div>
				)}

				{/* Show processing visualization when we have data and it's processing */}
				{stemsData?.status === 'processing' && (
					<div className="p-2.5">
						<Card className="border border-border/40 bg-accent/30">
							<CardContent className="p-0">
								<StemsProcessingVisualization />
								<div className="text-center py-4">
									<p className="text-sm">Separating stems from your audio</p>
									<p className="text-xs text-muted-foreground">This process can take a few minutes.</p>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Show stems players when ready */}
				{stemsData?.status === 'completed' && stemsData.stems && Object.keys(stemsData.stems).length > 0 && (
					<div className="flex flex-col">
						{/* Filters for stems */}
						{stemTypes.length > 0 && (
							<div className="flex items-center justify-between border-b border-border/40 px-2.5 py-1.5 flex-shrink-0">
								<div className="flex items-center gap-1 flex-wrap">
									<Button
										size="sm"
										variant={!activeFilter ? 'secondary' : 'outline'}
										className="h-7 px-2 text-xs rounded-sm"
										onClick={() => setActiveFilter(null)}
									>
										All
									</Button>
									{stemTypes.map((type) => (
										<Button
											key={type}
											size="sm"
											variant={activeFilter === type ? 'secondary' : 'outline'}
											className="h-7 px-2 text-xs rounded-sm"
											onClick={() => setActiveFilter(activeFilter === type ? null : type)}
										>
											{type}
										</Button>
									))}
								</div>

								{/* Stem count badge */}
								{stemsData.stems && (
									<Badge
										variant="outline"
										className="text-xs py-1 rounded-full bg-primary/5 border-primary/20 text-foreground hover:bg-primary/10 transition-colors ml-2"
									>
										<Music className="h-3 w-3 text-primary mr-1" />
										<span className="font-medium">{Object.keys(stemsData.stems).length} stems</span>
									</Badge>
								)}
							</div>
						)}

						{/* Stems list */}
						<div className="isolation-auto">
							<div className="flex flex-col gap-3 p-3">
								{filteredStems.map(([stemName, stemUrl]) => (
									<StemPlayer key={stemName} stemName={stemName} stemUrl={stemUrl} />
								))}
							</div>
						</div>
					</div>
				)}

				{/* Show error state if failed */}
				{stemsData?.status === 'failed' && (
					<div className="p-2.5">
						<Alert variant="destructive">
							<AlertDescription>Stem separation failed. Please try uploading your audio again.</AlertDescription>
						</Alert>
					</div>
				)}
			</div>
		</div>
	)
}
