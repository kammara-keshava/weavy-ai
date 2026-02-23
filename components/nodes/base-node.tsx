'use client';

import { Handle, Position } from 'reactflow';
import { NODE_DEFINITIONS } from '@/lib/node-definitions';
import { NodeData } from '@/types/workflow';

interface BaseNodeProps {
  data: NodeData;
  children: React.ReactNode;
}

export function BaseNode({ data, children }: BaseNodeProps) {
  const definition = NODE_DEFINITIONS[data.type];
  if (!definition) return null;

  const isRunning = data.running === true;

  return (
    <div
      className={`border-2 rounded-lg shadow-sm min-w-[200px] ${
        isRunning ? 'node-running' : ''
      }`}
      style={{ borderColor: definition.color, backgroundColor: 'var(--node-bg)' }}
    >
      <div
        className="px-4 py-2 border-b flex items-center gap-2"
        style={{ borderColor: `${definition.color}20`, backgroundColor: `${definition.color}10` }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{data.label || definition.label}</span>
      </div>

      <div className="p-4 nodrag nopan">
        {children}
      </div>

      {/* Input handles */}
      {definition.inputs.map((input, index) => {
        const total = definition.inputs.length;
        const left = total === 1 ? '50%' : `${((index + 1) * 100) / (total + 1)}%`;
        return (
          <Handle
            key={input.id}
            type="target"
            position={Position.Top}
            id={input.id}
            style={{
              backgroundColor: definition.color,
              borderColor: 'white',
              borderWidth: 2,
              left: left,
              transform: 'translateX(-50%)',
            }}
          />
        );
      })}

      {/* Output handles */}
      {definition.outputs.map((output, index) => {
        const total = definition.outputs.length;
        const left = total === 1 ? '50%' : `${((index + 1) * 100) / (total + 1)}%`;
        return (
          <Handle
            key={output.id}
            type="source"
            position={Position.Bottom}
            id={output.id}
            style={{
              backgroundColor: definition.color,
              borderColor: 'white',
              borderWidth: 2,
              left: left,
              transform: 'translateX(-50%)',
            }}
          />
        );
      })}
    </div>
  );
}
