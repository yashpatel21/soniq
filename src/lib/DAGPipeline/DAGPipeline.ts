/**
 * Type definition for pipeline execution context
 * Maintains the state of pipeline execution, including intermediate results
 */
export interface ExecutionContext {
	// Store outputs from each node
	results: Map<string, any>
	// Track nodes that have been processed
	processed: Set<string>
}

/**
 * Interface for nodes in our pipeline
 * Each node represents a processing step that transforms input data
 */
export interface PipelineNode<Input = any, Output = any> {
	// Unique identifier for the node
	id: string

	// Optional list of node IDs this node depends on
	// If undefined, node has no dependencies
	dependsOn?: string | string[]

	// Function that determines if this node should be executed
	// If not provided, node is always executed
	condition?: (context: ExecutionContext) => boolean

	// Main processing logic
	process: (input: Input, context: ExecutionContext) => Promise<Output>
}

/**
 * Main pipeline class that orchestrates execution of nodes
 */
export class DAGPipeline<FinalOutput = any> {
	// Map of all registered nodes
	private nodes: Map<string, PipelineNode> = new Map()
	// Store entry point node ID
	private entryNodeId: string | null = null

	/**
	 * Register a node with the pipeline
	 * @param node - The node to register
	 * @returns The pipeline instance for chaining
	 */
	addNode<I, O>(node: PipelineNode<I, O>): DAGPipeline<FinalOutput> {
		// Check for duplicate node ID
		if (this.nodes.has(node.id)) {
			throw new Error(`Node with ID ${node.id} already exists`)
		}

		// Add node to the registry
		this.nodes.set(node.id, node)
		// return the pipeline instance for chaining
		return this
	}

	/**
	 * Set the entry point for the pipeline
	 * @param nodeId - ID of the entry node
	 * @returns The pipeline instance for chaining
	 */
	setEntryNode(nodeId: string): DAGPipeline<FinalOutput> {
		// Verify node exists
		if (!this.nodes.has(nodeId)) {
			throw new Error(`Node with ID ${nodeId} does not exist`)
		}

		// Set the entry node
		this.entryNodeId = nodeId

		// return the pipeline instance for chaining
		return this
	}

	/**
	 * Build a dependency graph for all nodes
	 * @returns Object containing dependency graph and end node IDs
	 */
	private buildDependencyGraph(): {
		dependencyGraph: Map<string, Set<string>>
		endNodeIds: Set<string>
	} {
		// Maps each node to the nodes that depend on it
		const dependencyGraph = new Map<string, Set<string>>()

		// Track nodes that have dependents
		const hasDependent = new Set<string>()

		// Initialize the graph with empty dependency sets
		for (const nodeId of this.nodes.keys()) {
			dependencyGraph.set(nodeId, new Set())
		}

		// Populate the dependency graph
		for (const node of this.nodes.values()) {
			if (!node.dependsOn) continue

			// Convert dependsOn to array for consistent handling
			const dependencies = Array.isArray(node.dependsOn) ? node.dependsOn : [node.dependsOn]

			// Register this node as a dependent for each of its dependencies
			for (const depId of dependencies) {
				// Check if dependency exists
				if (!this.nodes.has(depId)) {
					throw new Error(`Node ${node.id} depends on non-existent node ${depId}`)
				}

				// Add node to its dependency's dependent set
				const dependents = dependencyGraph.get(depId) || new Set()
				dependents.add(node.id)

				// Update the dependency graph
				dependencyGraph.set(depId, dependents)

				// Mark the dependency as having dependents
				hasDependent.add(depId)
			}
		}

		// Find nodes with no dependents (end nodes)
		const endNodeIds = new Set<string>()
		for (const nodeId of this.nodes.keys()) {
			if (!hasDependent.has(nodeId)) {
				endNodeIds.add(nodeId)
			}
		}

		return { dependencyGraph, endNodeIds }
	}

	/**
	 * Execute a single node and its dependents
	 * @param nodeId - ID of the node to execute
	 * @param input - Input data for the node
	 * @param context - Current execution context
	 * @param dependencyGraph - Graph of node dependencies
	 */
	private async executeNode(
		nodeId: string,
		input: any,
		context: ExecutionContext,
		dependencyGraph: Map<string, Set<string>>
	): Promise<void> {
		// get the node
		const node = this.nodes.get(nodeId)
		if (!node) {
			throw new Error(`Node with ID ${nodeId} does not exist`)
		}

		// Check if node should be executed based on its condition
		if (node.condition && !node.condition(context)) {
			// skip execution if condition is not met
			return
		}

		// Execute the node
		const result = await node.process(input, context)

		// store the result and mark the node as processed
		context.results.set(nodeId, result)
		context.processed.add(nodeId)

		// get dependents of this node
		const dependentNodeIds = dependencyGraph.get(nodeId) || new Set()

		// Execute dependent nodes in parallel
		await Promise.all(
			Array.from(dependentNodeIds).map(async (depedentNodeId) => {
				const dependentNode = this.nodes.get(depedentNodeId)

				// check if all dependencies are processed
				if (!dependentNode) {
					throw new Error(`Node with ID ${depedentNodeId} does not exist`)
				}

				const dependencies = Array.isArray(dependentNode.dependsOn)
					? dependentNode.dependsOn
					: dependentNode.dependsOn
					? [dependentNode.dependsOn]
					: []

				const allDependenciesProcessed = dependencies.every((depId) => context.processed.has(depId))

				// Only execute if all dependencies are satisfied
				if (allDependenciesProcessed) {
					// For nodes with multiple dependencies, gather all inputs
					if (dependencies.length > 1) {
						const inputs = dependencies.map((depId) => context.results.get(depId))
						await this.executeNode(depedentNodeId, inputs, context, dependencyGraph)
					} else {
						// For nodes with single dependency, pass the result directly
						await this.executeNode(depedentNodeId, result, context, dependencyGraph)
					}
				}
			})
		)
	}

	/**
	 * Execute the pipeline with the given input
	 * @param input - Input data for the entry node
	 * @returns The output of the pipeline
	 */
	async execute(input: any): Promise<FinalOutput> {
		// Ensure entry node is set
		if (!this.entryNodeId) {
			throw new Error('Entry node not set')
		}

		// Initialize execution context
		const context: ExecutionContext = {
			results: new Map(),
			processed: new Set(),
		}

		// Build dependency graph and find end nodes
		const { dependencyGraph, endNodeIds } = this.buildDependencyGraph()

		// Execute the pipeline
		await this.executeNode(this.entryNodeId, input, context, dependencyGraph)

		// Once all nodes are processed, find the final result
		// Use the first end node as the final output
		for (const nodeId of endNodeIds) {
			if (context.processed.has(nodeId)) {
				return context.results.get(nodeId) as FinalOutput
			}
		}

		// If no end node was processed, return the last processed result
		const lastProcessedNodeId = Array.from(context.processed).pop()
		if (lastProcessedNodeId) {
			return context.results.get(lastProcessedNodeId) as FinalOutput
		}

		throw new Error('Pipeline execution did not produce a result')
	}
}

/**
 * Builder class for creating pipeline nodes
 * Makes node creation more intuitive with a fluent API
 */
export class NodeBuilder<Input = any, Output = any> {
	private nodeId: string
	private processFn: (input: Input, context: ExecutionContext) => Promise<Output>
	private dependencies: string[] = []
	private conditionFn?: (context: ExecutionContext) => boolean

	/**
	 * Create a new node builder
	 * @param id - Unique identifier for the node
	 * @param processFn - Function that processes input data
	 */
	constructor(id: string, processFn: (input: Input, context: ExecutionContext) => Promise<Output>) {
		this.nodeId = id
		this.processFn = processFn
	}

	/**
	 * Specify nodes that this node depends on
	 * @param nodeIds - IDs of nodes this node depends on
	 * @returns The builder instance for chaining
	 */
	dependsOn(...nodeIds: string[]): NodeBuilder<Input, Output> {
		this.dependencies.push(...nodeIds)
		return this
	}

	/**
	 * Add a condition for executing this node
	 * @param conditionFn - Function that determines if node should execute
	 * @returns The builder instance for chaining
	 */
	withCondition(conditionFn: (context: ExecutionContext) => boolean): NodeBuilder<Input, Output> {
		this.conditionFn = conditionFn
		return this
	}

	/**
	 * Build the node
	 * @returns A configured pipeline node
	 */
	build(): PipelineNode<Input, Output> {
		return {
			id: this.nodeId,
			dependsOn: this.dependencies.length > 0 ? this.dependencies : undefined,
			condition: this.conditionFn,
			process: this.processFn,
		}
	}
}

/**
 * Create a node that merges results from multiple dependencies
 * @param id - Unique identifier for the node
 * @param dependencies - IDs of nodes whose results should be merged
 * @param mergeFn - Function that combines the inputs
 * @returns A configured merge node
 */
export function createMergeNode<Output>(
	id: string,
	dependencies: string[],
	mergeFn: (inputs: any[]) => Promise<Output>
): PipelineNode<any[], Output> {
	return new NodeBuilder<any[], Output>(id, async (inputs, _) => await mergeFn(inputs)).dependsOn(...dependencies).build()
}

/**
 * Create a node that branches based on a condition
 * @param id - Unique identifier for the node
 * @param dependency - ID of the node this branch depends on
 * @param condition - Function to determine which output to use
 * @param trueOutput - Value to return when condition is true
 * @param falseOutput - Value to return when condition is false
 * @returns A configured branch node
 */
export function createBranchNode<Input, Output>(
	id: string,
	dependency: string,
	condition: (input: Input) => boolean,
	trueOutput: Output,
	falseOutput: Output
): PipelineNode<Input, Output> {
	return new NodeBuilder<Input, Output>(id, async (input, _) => (condition(input) ? trueOutput : falseOutput))
		.dependsOn(dependency)
		.build()
}
