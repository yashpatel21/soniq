import * as esPkg from 'essentia.js'

// Global variable to hold initialized essentia instance
let essentiaInstance: any = null

/**
 * Initializes and returns a singleton instance of Essentia
 * @returns The initialized Essentia instance
 */
export async function getEssentiaInstance() {
	if (!essentiaInstance) {
		try {
			// Access the WASM module (it could be a direct module or function)
			let essentiaWasm = esPkg.EssentiaWASM

			// Create a new Essentia instance with the WASM backend
			essentiaInstance = new esPkg.Essentia(essentiaWasm)
			console.log('Essentia.js initialized successfully')
		} catch (error) {
			console.error('Failed to initialize Essentia.js:', error)
			throw error
		}
	}
	return essentiaInstance
}
