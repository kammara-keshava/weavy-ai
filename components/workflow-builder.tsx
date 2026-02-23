'use client';

import { useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '@/stores/workflow-store';
import { createSampleWorkflow } from '@/lib/sample-workflow';
import { LeftSidebar } from './left-sidebar';
import { RightSidebar } from './right-sidebar';
import { WorkflowControls } from './workflow-controls';
import { ThemeToggle } from './theme-toggle';
import { TextNode } from './nodes/text-node';
import { UploadImageNode } from './nodes/upload-image-node';
import { UploadVideoNode } from './nodes/upload-video-node';
import { LLMNode } from './nodes/llm-node';
import { CropImageNode } from './nodes/crop-image-node';
import { ExtractFrameNode } from './nodes/extract-frame-node';

export function WorkflowBuilder() {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      text: TextNode,
      uploadImage: UploadImageNode,
      uploadVideo: UploadVideoNode,
      llm: LLMNode,
      cropImage: CropImageNode,
      extractFrame: ExtractFrameNode,
    }),
    []
  );
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    setSelectedNodes,
  } = useWorkflowStore();

  const handleSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: any[] }) => {
      setSelectedNodes(selected.map((n) => n.id));
    },
    [setSelectedNodes]
  );

  // Load sample workflow on mount if no nodes exist
  useEffect(() => {
    if (nodes.length === 0) {
      const sample = createSampleWorkflow();
      setNodes(sample.nodes);
      setEdges(sample.edges as any);
    }
  }, [nodes.length, setNodes, setEdges]);

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <LeftSidebar />
      <div className="flex-1 relative flex flex-col" style={{ backgroundColor: 'var(--canvas-bg)' }}>
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        <div className="flex-1 overflow-hidden relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={handleSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            className="w-full h-full"
            style={{ backgroundColor: 'var(--canvas-bg)' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  text: '#6366f1',
                  uploadImage: '#10b981',
                  uploadVideo: '#f59e0b',
                  llm: '#8b5cf6',
                  cropImage: '#ec4899',
                  extractFrame: '#06b6d4',
                };
                return colors[node.data?.type] || '#94a3b8';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>
        <div className="flex-shrink-0">
          <WorkflowControls />
        </div>
      </div>
      <RightSidebar />
    </div>
  );
}
