import Moises from 'moises/sdk'

// Create a singleton instance of the Moises client
const moisesClient = new Moises({
	apiKey: process.env.MOISES_API_KEY as string,
})

export default moisesClient
