# SonIQ

SonIQ is an advanced audio processing web application that allows users to analyze, manipulate, and extract meaningful information from audio files. The application offers audio analysis, stem separation, and MIDI extraction capabilities, all within a modern web interface.

## Live Demo

**Live Deployment**: [https://soniq-production.up.railway.app/](https://soniq-production.up.railway.app/)

Try out SonIQ's features in the live environment where you can upload your audio files for analysis, stem separation, and MIDI extraction.

## Tech Stack

-   **Frontend**: Next.js 15 with React 19
-   **Backend**: Next.js API routes
-   **Database**: MongoDB
-   **Audio Processing**: Custom pipeline leveraging multiple audio analysis utilities
-   **UI Components**: Radix UI primitives with custom styling
-   **Styling**: Tailwind CSS
-   **State Management**: React Query for server state

## Project Architecture

The SonIQ application follows a modular architecture that separates concerns and enables scalable development:

### Core Directories

-   `src/app`: Next.js app router with frontend pages and API routes
-   `src/app/api`: API endpoints for audio processing and session management
-   `src/lib/AudioPipeline`: Implementation of the audio processing pipeline
-   `src/lib/utils`: Utility functions and custom libraries including:
    -   DAGPipeline framework for dependency-based execution
    -   Database connection and session management utilities
    -   Low-level audio processing utilities (decoding, conversion, analysis)
    -   MIDI extraction and manipulation utilities

## Audio Processing Pipeline

The application implements a sophisticated audio processing pipeline that handles:

1. **Audio Preprocessing**: Low-level operations like audio decoding, mono conversion, resampling, and normalization
2. **Audio Analysis**: Extraction of key musical features like tempo, key, chord progression, and more
3. **Stem Separation**: Splitting audio into individual components (vocals, drums, bass, etc.)
4. **MIDI Extraction**: Converting audio to symbolic music representation

The pipeline is built on a custom DAG (Directed Acyclic Graph) implementation that enables efficient, parallelized processing of complex audio tasks.

## DAGPipeline: Custom Pipeline Framework

A core architectural component of this project is the custom `DAGPipeline` library, which provides:

-   **Modular Processing Nodes**: Self-contained units of work with clear inputs/outputs
-   **Dependency Management**: Automatic execution order based on dependencies
-   **Parallel Execution**: Running independent nodes concurrently for optimal performance
-   **Conditional Processing**: Nodes can be executed conditionally based on pipeline state
-   **Error Handling**: Robust error management throughout the pipeline

The `DAGPipeline` implementation uses advanced JavaScript/TypeScript features:

```typescript
// Example of DAGPipeline usage
const pipeline = new DAGPipeline()
	.addNode(processInputAudioNode)
	.addNode(createSessionDocumentNode)
	.addNode(prepareAudioNode)
	// More nodes...
	.setEntryNode('processInputAudio')

// Execute the pipeline
const result = await pipeline.execute(inputData)
```

## Design Patterns

The application leverages several software design patterns:

1. **Method Chaining / Fluent Interface**: Used in the DAGPipeline API design, allowing for an expressive interface to construct pipelines by chaining method calls
2. **Singleton Pattern**: Used in multiple places:

    - Audio processing pipeline instance to ensure consistent state
    - MongoDB client to maintain a single database connection across the application
    - Various audio analysis service clients for resource efficiency

3. **Builder Pattern**: Implemented in the `NodeBuilder` class for creating pipeline nodes with a fluent API

4. **Repository Pattern**: Abstracts database access logic:

    - Audio session collection access and management
    - Processing metadata storage and retrieval operations

5. **Strategy Pattern**: Used for implementing different approaches:

    - Audio processing strategies based on file types
    - Visualization rendering approaches

6. **Dependency Injection**: Component dependencies are injected rather than directly instantiated:

    - Pipeline nodes receive context and dependencies
    - Service instances are provided to components that need them

7. **Module Pattern**: Encapsulating related functionality in cohesive modules:
    - Audio processing modules
    - Database access modules

## Data Structures and Algorithms

Key data structures and algorithms used:

-   **Directed Acyclic Graph (DAG)**: Core structure for representing pipeline dependencies
-   **Dependency-based Execution**: Custom algorithm that traverses the graph and executes nodes once their dependencies are satisfied
-   **Maps and Sets**: Used for efficient lookups and tracking of nodes and execution state
-   **Promises and Async/Await**: For handling asynchronous operations throughout the pipeline
-   **Functional Programming**: Utilizing pure functions for processing steps
-   **Binary Data Manipulation**: Handling audio data at the byte level
-   **Fast Fourier Transform (FFT)**: For spectral analysis of audio signals
-   **Memoization**: Caching intermediate results in complex processing chains

## Audio Processing Features

The audio processing capabilities include:

-   **Audio Feature Extraction**: Analyzing audio for tempo, key, loudness, etc.
-   **Spectral Analysis**: Frequency domain analysis of audio signals
-   **Source Separation**: ML-based algorithms for isolating audio components
-   **MIDI Conversion**: Converting audio to symbolic music representation
-   **Waveform Visualization**: Client-side audio waveform rendering
-   **Piano Roll Visualization**: Custom canvas-based MIDI visualization
-   **Audio Preprocessing**: Converting stereo to mono, resampling, normalization
-   **Time-Frequency Analysis**: Spectrogram generation and processing

## Database Structure

The application uses MongoDB to store:

-   User sessions data
-   Audio analysis results
-   Processing metadata
-   Extracted stem references

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment Variables

SonIQ requires the following environment variables to be configured for the application to function correctly:

```bash
MOISES_API_KEY=your_moises_api_key # API key for the Moises audio processing service
MONGODB_URI=your_mongodb_connection_string # MongoDB connection string
CLEANUP_API_KEY=your_cleanup_api_key # API key for the audio cleanup service
```

You can set these variables either by:

1. Creating a `.env` file at the root of the project with the variables listed above, or
2. Setting the environment variables manually in your shell or deployment environment

The application will not function correctly without these environment variables properly configured.

## Development Principles

-   **Modularity**: Each component and processing node is self-contained
-   **Scalability**: Architecture supports adding new features and processing nodes
-   **Performance**: Parallel processing and efficient algorithms
-   **Type Safety**: Comprehensive TypeScript types throughout the codebase
