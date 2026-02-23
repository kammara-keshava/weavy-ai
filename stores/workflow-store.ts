import { create } from 'zustand';
import { Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { WorkflowNode, WorkflowEdge, NodeData } from '@/types/workflow';

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodes: string[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: WorkflowNode) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  getNode: (nodeId: string) => WorkflowNode | undefined;
  getConnectedNodes: (nodeId: string) => WorkflowNode[];
  validateConnection: (connection: Connection) => boolean;
  wouldCreateCycle: (source: string, target: string) => boolean;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodes: [],

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    if (get().validateConnection(connection)) {
      set({
        edges: addEdge(connection, get().edges),
      });
    }
  },

  addNode: (node: WorkflowNode) => {
    set({
      nodes: [...get().nodes, node],
    });
  },

  deleteNode: (nodeId: string) => {
    const state = get();
    set({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    });
  },

  updateNodeData: (nodeId: string, data: Partial<NodeData>) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },

  setSelectedNodes: (nodeIds: string[]) => {
    set({ selectedNodes: nodeIds });
  },

  clearSelection: () => {
    set({ selectedNodes: [] });
  },

  getNode: (nodeId: string) => {
    return get().nodes.find((n) => n.id === nodeId);
  },

  getConnectedNodes: (nodeId: string) => {
    const state = get();
    const connectedEdges = state.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId
    );
    const connectedNodeIds = new Set<string>();
    connectedEdges.forEach((e) => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });
    return state.nodes.filter((n) => connectedNodeIds.has(n.id) && n.id !== nodeId);
  },

  wouldCreateCycle: (source: string, target: string): boolean => {
    // Simple cycle detection: if target is an ancestor of source, it would create a cycle
    const visited = new Set<string>();
    const queue = [target];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      if (current === source) return true;

      const outgoingEdges = get().edges.filter((e) => e.source === current);
      outgoingEdges.forEach((e) => {
        if (!visited.has(e.target)) {
          queue.push(e.target);
        }
      });
    }

    return false;
  },

  validateConnection: (connection: Connection) => {
    const { source, target } = connection;
    if (!source || !target) return false;

    const sourceNode = get().getNode(source);
    const targetNode = get().getNode(target);

    if (!sourceNode || !targetNode) return false;

    // Prevent self-connections
    if (source === target) return false;

    // Check for cycles (DAG validation)
    if (get().wouldCreateCycle(source, target)) return false;

    // Type validation would go here
    // For now, allow all connections
    return true;
  },

  setNodes: (newNodes: WorkflowNode[]) => {
    set({ nodes: newNodes });
  },

  setEdges: (newEdges: WorkflowEdge[]) => {
    set({ edges: newEdges });
  },
}));
