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

// Global variable to track if connection has been initialized
let isConnectionInitialized = false

// Connect to the MongoDB client with pooling
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
	// In development mode, use a global variable to preserve connection across hot-reloads
	let globalWithMongo = global as typeof globalThis & {
		_mongoClientPromise?: Promise<MongoClient>
		_isMongoInitialized?: boolean
	}

	// Only create a new client if one doesn't already exist
	if (!globalWithMongo._mongoClientPromise) {
		// Create a MongoClient instance that can be reused
		const client = new MongoClient(uri, options)
		globalWithMongo._mongoClientPromise = client.connect()

		// Only log the initialization once
		if (!globalWithMongo._isMongoInitialized) {
			globalWithMongo._mongoClientPromise.then((connectedClient) => {
				console.log('MongoDB connection pool initialized')
				globalWithMongo._isMongoInitialized = true

				// Log when the application is shutting down
				process.on('SIGINT', async () => {
					await connectedClient.close()
					console.log('MongoDB connection pool closed')
					process.exit(0)
				})
			})
		}
	}
	clientPromise = globalWithMongo._mongoClientPromise
} else {
	// In production, create a managed connection pool
	// Create a MongoClient instance that can be reused
	const client = new MongoClient(uri, options)
	clientPromise = client.connect()

	// Only log once in production too
	if (!isConnectionInitialized) {
		clientPromise.then(() => {
			console.log('MongoDB connection pool initialized (production)')
			isConnectionInitialized = true
		})
	}
}

export default clientPromise
