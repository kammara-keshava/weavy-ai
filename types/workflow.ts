import { Node, Edge } from 'reactflow';

export type NodeType =
  | 'text'
  | 'uploadImage'
  | 'uploadVideo'
  | 'llm'
  | 'cropImage'
  | 'extractFrame';

export type NodeData = {
  type: NodeType;
  label: string;
  [key: string]: any;
};

export type WorkflowNode = Node<NodeData>;
export type WorkflowEdge = Edge;

export type WorkflowData = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type ConnectionType = 'text' | 'image' | 'video' | 'number';

export type HandleType = {
  id: string;
  type: ConnectionType;
  label: string;
  required?: boolean;
};

export type NodeDefinition = {
  type: NodeType;
  label: string;
  inputs: HandleType[];
  outputs: HandleType[];
  color: string;
  icon: string;
};
