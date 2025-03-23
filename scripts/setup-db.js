import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
dotenv.config()

async function setupDatabase() {
	// Get MongoDB URI from environment variables
	const uri = process.env.MONGODB_URI

	if (!uri) {
		console.error('Error: MONGODB_URI environment variable is not set')
		process.exit(1)
	}

	const client = new MongoClient(uri)

	try {
		await client.connect()
		console.log('Connected to MongoDB Atlas')

		const db = client.db('audio-processor')
		const collection = db.collection('sessions')

		// Create a unique index on sessionId
		await collection.createIndex({ sessionId: 1 }, { unique: true })
		console.log('Created unique index on sessionId')

		// Create index on createdAt for efficient time-based queries
		await collection.createIndex({ createdAt: 1 })
		console.log('Created index on createdAt')

		console.log('Database setup completed successfully')
	} catch (error) {
		console.error('Error setting up database:', error)
	} finally {
		await client.close()
		console.log('Disconnected from MongoDB')
	}
}

setupDatabase().catch(console.error)
