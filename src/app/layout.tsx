import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import Providers from './Providers'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'SonIQ - AI-powered Audio Analysis',
	description: 'Advanced audio analysis and stem separation tool',
	icons: {
		icon: [
			// SVG favicon with theme-aware primary color
			{ url: '/favicon.svg', type: 'image/svg+xml' },
			// ICO version for better compatibility with older browsers
			{ url: '/favicon.ico', type: 'image/x-icon' },
		],
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<Providers>
					<ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
						{children}
						<Toaster />
					</ThemeProvider>
				</Providers>
			</body>
		</html>
	)
}
