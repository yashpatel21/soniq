import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
	/* config options here */
	transpilePackages: ['moises'],
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
					},
				],
			},
		]
	},
}

export default nextConfig
