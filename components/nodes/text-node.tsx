'use client';

import { useCallback } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';
import { useWorkflowStore } from '@/stores/workflow-store';
import { NodeData } from '@/types/workflow';

export function TextNode({ id, data }: NodeProps<NodeData>) {
  const { updateNodeData } = useWorkflowStore();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value });
    },
    [id, updateNodeData]
  );

  return (
    <BaseNode data={data}>
      <textarea
        value={data.text || ''}
        onChange={handleChange}
        placeholder="Enter text..."
        className="w-full min-h-[80px] px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
      />
      {data.text && (
        <div className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
          Output: {data.text.substring(0, 50)}
          {data.text.length > 50 && '...'}
        </div>
      )}
    </BaseNode>
  );
}
