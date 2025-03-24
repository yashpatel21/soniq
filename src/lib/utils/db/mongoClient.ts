import { MongoClient, ServerApiVersion } from 'mongodb'

// Get the MongoDB URI from the environment variable
const uri = process.env.MONGODB_URI

// If the URI is not defined, throw an error
if (!uri) {
	throw new Error('MONGODB_URI environment variable is not defined')
}

// Connection pool configuration
// For free tier Atlas (M0), we keep the pool size modest
const options = {
	maxPoolSize: 10, // Modest pool size for free tier
	minPoolSize: 1, // Keep at least one connection ready
	maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
	// Monitor the connection pool for better diagnostics
	monitorCommands: process.env.NODE_ENV === 'development',
}

// Define a custom global variable to track MongoDB state across the application
declare global {
	var mongodb: {
		client?: MongoClient
		clientPromise?: Promise<MongoClient>
		isInitialized: boolean
	}
}

// Initialize the global variable if it doesn't exist
global.mongodb = global.mongodb || { isInitialized: false }

let clientPromise: Promise<MongoClient>

if (!global.mongodb.clientPromise) {
	// Create a MongoClient instance that can be reused
	const client = new MongoClient(uri, options)

	// Connect to the client and store the promise
	global.mongodb.clientPromise = client
		.connect()
		.then((connectedClient) => {
			// Store the connected client
			global.mongodb.client = connectedClient

			// Only log once when initializing for the first time
			if (!global.mongodb.isInitialized) {
				console.log('MongoDB connection pool initialized')
				global.mongodb.isInitialized = true

				// Set up cleanup handler on application shutdown
				process.on('SIGINT', async () => {
					if (global.mongodb.client) {
						await global.mongodb.client.close()
						console.log('MongoDB connection pool closed')
					}
					process.exit(0)
				})
			}

			return connectedClient
		})
		.catch((err) => {
			console.error('Failed to connect to MongoDB:', err)
			throw err
		})
}

// Export the global promise
clientPromise = global.mongodb.clientPromise

export default clientPromise
