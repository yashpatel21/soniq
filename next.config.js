/** @type {import('next').NextConfig} */
const nextConfig = {
	// Skip type checking during builds for faster builds
	typescript: {
		ignoreBuildErrors: true,
	},

	// Configure webpack to handle native dependencies
	webpack: (config, { isServer }) => {
		// If we're on the server, ignore certain dependencies
		if (isServer) {
			config.externals = [...config.externals, '@tensorflow/tfjs-node', 'canvas', 'node-pre-gyp']
		}

		return config
	},

	// External packages that should be handled by the Node.js runtime
	serverExternalPackages: ['@tensorflow/tfjs-node', 'canvas'],

	// Configure Turbopack loaders
	experimental: {
		turbo: {
			rules: {
				// Configure specific file handling
				'*.html': ['raw-loader'],
				'*.node': ['file-loader'],
			},
		},
	},
}

export default nextConfig
