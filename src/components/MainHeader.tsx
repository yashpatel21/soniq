import { AudioWaveform } from 'lucide-react'
import { cn } from '@/lib/utils/ui/utils'
import Link from 'next/link'

interface MainHeaderProps {
	title?: string
	subtitle?: string
	isSticky?: boolean
	isBlurred?: boolean
}

export function MainHeader({ title = 'SonIQ', subtitle = 'Your Music, Our Magic', isSticky = true, isBlurred = false }: MainHeaderProps) {
	return (
		<header
			className={cn(
				`${isSticky ? 'sticky top-0 z-30' : ''} p-6 border-b border-border/40 bg-background/90 backdrop-blur-sm`,
				isBlurred && 'transition-all duration-300 blur-sm opacity-50'
			)}
		>
			<div className="flex items-center gap-3">
				<AudioWaveform className="h-7 w-7 text-primary" />
				<Link href="/" className="transition-all duration-300 group">
					<div className="relative">
						<h1 className="text-2xl font-bold tracking-tight relative z-10">
							{title}
							<span className="absolute inset-0 z-0 bg-primary opacity-0 blur-xl group-hover:opacity-30 transition-opacity"></span>
						</h1>
						<p className="text-sm text-muted-foreground mt-0.5 relative z-10">
							{subtitle}
							<span className="absolute inset-0 z-0 bg-primary opacity-0 blur-lg group-hover:opacity-20 transition-opacity"></span>
						</p>
						<span className="absolute -inset-2 bg-primary opacity-0 blur-2xl group-hover:opacity-20 transition-opacity"></span>
					</div>
				</Link>
			</div>
		</header>
	)
}
