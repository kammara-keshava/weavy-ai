export type ExecutionStatus = 'success' | 'failed' | 'partial' | 'running';

export type ExecutionType = 'full' | 'partial' | 'single';

export type NodeExecutionResult = {
  nodeId: string;
  status: ExecutionStatus;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  duration?: number;
};

export type WorkflowExecutionResult = {
  runId: string;
  type: ExecutionType;
  status: ExecutionStatus;
  duration?: number;
  nodeResults: NodeExecutionResult[];
  nodeIds: string[];
};
