import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
	if (isNaN(seconds) || seconds < 0) return '0:00'

	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}
