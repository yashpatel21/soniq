import React from 'react'
import { Scissors, AudioWaveform } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

interface AnalysisNavigationProps {
	activeTab: string
	onTabChange: (tab: string) => void
	orientation?: 'side' | 'bottom'
}

export function AnalysisNavigation({ activeTab, onTabChange, orientation = 'side' }: AnalysisNavigationProps) {
	const isSide = orientation === 'side'

	return (
		<div className={cn('flex items-center justify-center', isSide ? 'h-full flex-col' : 'w-full flex-row')}>
			{/* Navigation buttons with integrated indicators */}
			<div className={cn('flex gap-2', isSide ? 'flex-col' : 'flex-row')}>
				<TooltipProvider delayDuration={0}>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="relative flex items-center">
								<div
									className={cn(
										'absolute rounded-full transition-all duration-300',
										isSide ? 'left-0 w-1.5 h-14' : 'top-0 h-1 w-14',
										activeTab === 'analysis' ? 'bg-primary' : 'bg-muted/30'
									)}
								/>
								<Button
									onClick={() => onTabChange('analysis')}
									variant="ghost"
									size="icon"
									className={cn(
										'relative w-14 h-14 rounded-xl transition-all duration-300',
										isSide ? 'ml-4' : 'mt-2',
										'group flex items-center justify-center',
										activeTab === 'analysis'
											? 'text-primary bg-primary/5 hover:bg-primary/10'
											: 'text-muted-foreground hover:text-primary/80 hover:bg-accent/30',
										'after:absolute after:inset-0 after:rounded-xl after:transition-all after:duration-300',
										activeTab === 'analysis' && 'after:shadow-[0_0_15px_rgba(var(--primary),0.1)]'
									)}
								>
									<AudioWaveform className="h-7 w-7" />
								</Button>
							</div>
						</TooltipTrigger>
						<TooltipContent side={isSide ? 'right' : 'top'} sideOffset={5} align="center">
							<p className="font-medium">Musical Analysis</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<div className="relative flex items-center">
								<div
									className={cn(
										'absolute rounded-full transition-all duration-300',
										isSide ? 'left-0 w-1.5 h-14' : 'top-0 h-1 w-14',
										activeTab === 'stems' ? 'bg-primary' : 'bg-muted/30'
									)}
								/>
								<Button
									onClick={() => onTabChange('stems')}
									variant="ghost"
									size="icon"
									className={cn(
										'relative w-14 h-14 rounded-xl transition-all duration-300',
										isSide ? 'ml-4' : 'mt-2',
										'group flex items-center justify-center',
										activeTab === 'stems'
											? 'text-primary bg-primary/5 hover:bg-primary/10'
											: 'text-muted-foreground hover:text-primary/80 hover:bg-accent/30',
										'after:absolute after:inset-0 after:rounded-xl after:transition-all after:duration-300',
										activeTab === 'stems' && 'after:shadow-[0_0_15px_rgba(var(--primary),0.1)]'
									)}
								>
									<Scissors className="h-7 w-7" />
								</Button>
							</div>
						</TooltipTrigger>
						<TooltipContent side={isSide ? 'right' : 'top'} sideOffset={5} align="center">
							<p className="font-medium">Stems Separation</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	)
}
