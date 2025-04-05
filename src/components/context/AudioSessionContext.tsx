import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react'

// Create a context to track which sessions have loaded stems
interface AudioSessionContextType {
	loadedSessions: Set<string>
	markSessionLoaded: (sessionId: string) => void
}

const defaultContext: AudioSessionContextType = {
	loadedSessions: new Set<string>(),
	markSessionLoaded: () => {},
}

export const AudioSessionContext = createContext<AudioSessionContextType>(defaultContext)

interface AudioSessionProviderProps {
	children: ReactNode
}

export function AudioSessionProvider({ children }: AudioSessionProviderProps) {
	const [loadedSessions, setLoadedSessions] = useState<Set<string>>(new Set())

	const markSessionLoaded = useCallback((sessionId: string) => {
		setLoadedSessions((prev) => {
			const newSet = new Set(prev)
			newSet.add(sessionId)
			return newSet
		})
	}, [])

	return <AudioSessionContext.Provider value={{ loadedSessions, markSessionLoaded }}>{children}</AudioSessionContext.Provider>
}

// Custom hook to use the audio session context
export function useAudioSession() {
	return useContext(AudioSessionContext)
}
