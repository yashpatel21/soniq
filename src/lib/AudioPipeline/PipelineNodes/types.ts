/**
 * Interface for the result of audio file processing
 */
export interface ProcessedAudioFile {
	/** Unique identifier for the audio processing session */
	sessionId: string
	/** Directory path where session files are stored */
	sessionDir: string
	/** Path to the processed audio file */
	filePath: string
	/** Binary buffer containing the audio file data */
	audioFileBuffer: Buffer
}

/**
 * Interface for the result of Essentia analysis
 */
export interface EssentiaAnalysisResult {
	/** Beats per minute of the audio */
	bpm: number
	/** Detected musical key (e.g., C, D, E, etc.) */
	key: string
	/** Musical scale of the audio (e.g., major, minor) */
	scale: string
}

/**
 * Interface for the result of Moises upload
 */
export interface MoisesUploadResult {
	/** URL to download the processed audio from Moises */
	downloadUrl: string
	/** Unique identifier for the Moises processing session */
	sessionId: string
}

/**
 * Interface for the result of Moises stems job
 */
export interface MoisesStemsJobResult {
	/** URL to the isolated vocals stem */
	Vocals: string
	/** URL to the isolated bass stem */
	Bass: string
	/** URL to the isolated drums stem */
	Drums: string
	/** URL to the isolated guitars stem */
	Guitars: string
	/** URL to the isolated strings stem */
	Strings: string
	/** URL to the isolated piano stem */
	Piano: string
	/** URL to the isolated keys stem */
	Keys: string
	/** URL to the isolated wind instruments stem */
	Wind: string
	/** URL to other isolated sounds not fitting in above categories */
	Other: string
}
