import { WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { WorkflowExecutionResult, NodeExecutionResult, ExecutionType } from '@/types/execution';

export class WorkflowExecutor {
  private nodes: WorkflowNode[];
  private edges: WorkflowEdge[];

  constructor(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  /**
   * Trigger a Trigger.dev task via HTTP API
   */
  private async triggerTask(
    taskId: string,
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    const apiKey = process.env.TRIGGER_API_KEY;
    if (!apiKey) {
      throw new Error('TRIGGER_API_KEY environment variable is not set');
    }

    try {
      const response = await fetch('https://api.trigger.dev/api/v1/tasks/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          id: taskId,
          payload: payload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Trigger.dev task failed: ${error.message || response.statusText}`
        );
      }

      const result = await response.json();
      return result.output || result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Trigger.dev API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all nodes that a given node depends on (upstream dependencies)
   */
  private getDependencies(nodeId: string): string[] {
    const dependencies = new Set<string>();
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const incomingEdges = this.edges.filter((e) => e.target === id);
      incomingEdges.forEach((edge) => {
        dependencies.add(edge.source);
        traverse(edge.source);
      });
    };

    traverse(nodeId);
    return Array.from(dependencies);
  }

  /**
   * Get topological order of nodes (for DAG validation and execution)
   */
  private getTopologicalOrder(nodeIds: string[]): string[] {
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    // Initialize in-degree
    nodeIds.forEach((id) => {
      inDegree.set(id, 0);
      graph.set(id, []);
    });

    // Build graph and calculate in-degrees
    this.edges.forEach((edge) => {
      if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
        const current = graph.get(edge.source) || [];
        current.push(edge.target);
        graph.set(edge.source, current);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    });

    // Kahn's algorithm
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    const result: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      const neighbors = graph.get(nodeId) || [];
      neighbors.forEach((neighbor) => {
        const degree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, degree);
        if (degree === 0) {
          queue.push(neighbor);
        }
      });
    }

    // Check for cycles
    if (result.length !== nodeIds.length) {
      throw new Error('Workflow contains cycles');
    }

    return result;
  }

  /**
   * Execute workflow with parallel execution support
   */
  async execute(
    nodeIds: string[],
    type: ExecutionType
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const nodeResults: NodeExecutionResult[] = [];
    const executionOrder = this.getTopologicalOrder(nodeIds);

    // Execute nodes in topological order, but parallelize independent nodes
    const executed = new Set<string>();
    const nodeOutputs = new Map<string, any>();

    for (const nodeId of executionOrder) {
      const node = this.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // Wait for all dependencies to complete
      const dependencies = this.getDependencies(nodeId).filter((dep) =>
        nodeIds.includes(dep)
      );
      await Promise.all(
        dependencies.map((dep) => {
          return new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              if (executed.has(dep)) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          });
        })
      );

      // Execute node
      try {
        const result = await this.executeNode(node, nodeOutputs);
        nodeResults.push(result);
        executed.add(nodeId);
        nodeOutputs.set(nodeId, result.outputs);
      } catch (error: any) {
        nodeResults.push({
          nodeId,
          status: 'failed',
          inputs: this.getNodeInputs(node),
          error: error.message || 'Unknown error',
        });
        executed.add(nodeId);
      }
    }

    const duration = Date.now() - startTime;
    const status = this.determineStatus(nodeResults);

    return {
      runId: `run-${Date.now()}`,
      type,
      status,
      duration,
      nodeResults,
      nodeIds,
    };
  }

  /**
   * Execute a single node using Trigger.dev for heavy tasks
   */
  private async executeNode(
    node: WorkflowNode,
    nodeOutputs: Map<string, any>
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const inputs = this.getNodeInputs(node, nodeOutputs);

    let outputs: Record<string, any> = {};
    let error: string | undefined;

    try {
      switch (node.data.type) {
        case 'text':
          outputs = { output: node.data.text || '' };
          break;

        case 'uploadImage':
          outputs = { output: node.data.imageUrl || '' };
          break;

        case 'uploadVideo':
          outputs = { output: node.data.videoUrl || '' };
          break;

        case 'llm':
          const llmResult = await this.triggerTask('execute-llm', {
            nodeId: node.id,
            model: 'gemini-1.5-flash-latest',
            systemPrompt: inputs.systemPrompt,
            userMessage: inputs.userMessage,
            images: inputs.images || [],
          });

          if (!llmResult || typeof llmResult !== 'object' || !('output' in llmResult)) {
            throw new Error('LLM task returned invalid result');
          }
          outputs = { output: llmResult.output };
          break;

        case 'cropImage':
          const cropResult = await this.triggerTask('execute-crop-image', {
            nodeId: node.id,
            image_url: inputs.image_url,
            x_percent: inputs.x_percent || 0,
            y_percent: inputs.y_percent || 0,
            width_percent: inputs.width_percent || 100,
            height_percent: inputs.height_percent || 100,
          });

          if (!cropResult || typeof cropResult !== 'object' || !('output' in cropResult)) {
            throw new Error('Crop image task returned invalid result');
          }
          outputs = { output: cropResult.output };
          break;

        case 'extractFrame':
          const frameResult = await this.triggerTask('execute-extract-frame', {
            nodeId: node.id,
            video_url: inputs.video_url,
            timestamp: inputs.timestamp || 0,
          });

          if (!frameResult || typeof frameResult !== 'object' || !('output' in frameResult)) {
            throw new Error('Extract frame task returned invalid result');
          }
          outputs = { output: frameResult.output };
          break;
      }
    } catch (e: any) {
      error = e.message || 'Unknown error during node execution';
    }

    const duration = Date.now() - startTime;

    return {
      nodeId: node.id,
      status: error ? 'failed' : 'success',
      inputs,
      outputs: Object.keys(outputs).length > 0 ? outputs : undefined,
      error,
      duration,
    };
  }

  /**
   * Get inputs for a node from connected nodes or node data
   */
  private getNodeInputs(
    node: WorkflowNode,
    nodeOutputs?: Map<string, any>
  ): Record<string, any> {
    const inputs: Record<string, any> = {};

    // Get inputs from connected edges
    this.edges.forEach((edge) => {
      if (edge.target === node.id) {
        const sourceNode = this.nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          const output =
            nodeOutputs?.get(edge.source) ||
            sourceNode.data.output ||
            sourceNode.data.text ||
            sourceNode.data.imageUrl ||
            sourceNode.data.videoUrl;
          const handle = edge.targetHandle || 'input';
          if (handle === 'images') {
            if (!inputs.images) inputs.images = [];
            if (output) inputs.images.push(output);
          } else {
            inputs[handle] = output;
          }
        }
      }
    });

    // Merge with node's own data
    Object.assign(inputs, node.data);

    return inputs;
  }

  /**
   * Determine overall workflow status
   */
  private determineStatus(
    nodeResults: NodeExecutionResult[]
  ): 'success' | 'failed' | 'partial' {
    const failed = nodeResults.filter((r) => r.status === 'failed').length;
    const success = nodeResults.filter((r) => r.status === 'success').length;

    if (failed === 0) return 'success';
    if (success === 0) return 'failed';
    return 'partial';
  }
}

