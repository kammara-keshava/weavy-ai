'use client';

import { useState, useCallback, useEffect } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';
import { useWorkflowStore } from '@/stores/workflow-store';
import { NodeData } from '@/types/workflow';
import { Play, Loader2 } from 'lucide-react';

export function CropImageNode({ id, data }: NodeProps<NodeData>) {
  const [running, setRunning] = useState(false);
  const [xPercent, setXPercent] = useState(data.x_percent || 0);
  const [yPercent, setYPercent] = useState(data.y_percent || 0);
  const [widthPercent, setWidthPercent] = useState(data.width_percent || 100);
  const [heightPercent, setHeightPercent] = useState(data.height_percent || 100);
  const [output, setOutput] = useState(data.output || '');
  const { updateNodeData, nodes, edges } = useWorkflowStore();

  // Get connected inputs (read-only, don't update store)
  const connectedInputs = (() => {
    const inputs: Record<string, any> = {};

    const imageEdge = edges.find((e) => e.target === id && e.targetHandle === 'image_url');
    if (imageEdge) {
      const sourceNode = nodes.find((n) => n.id === imageEdge.source);
      if (sourceNode) {
        inputs.image_url = sourceNode.data.imageUrl || sourceNode.data.output;
      }
    }

    ['x_percent', 'y_percent', 'width_percent', 'height_percent'].forEach((handle) => {
      const edge = edges.find((e) => e.target === id && e.targetHandle === handle);
      if (edge) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          const value = parseFloat(sourceNode.data.text || sourceNode.data.output || '0');
          inputs[handle] = value;
        }
      }
    });

    return inputs;
  })();

  const hasImageConnection = edges.some(
    (e) => e.target === id && e.targetHandle === 'image_url'
  );
  const hasXConnection = edges.some((e) => e.target === id && e.targetHandle === 'x_percent');
  const hasYConnection = edges.some((e) => e.target === id && e.targetHandle === 'y_percent');
  const hasWidthConnection = edges.some(
    (e) => e.target === id && e.targetHandle === 'width_percent'
  );
  const hasHeightConnection = edges.some(
    (e) => e.target === id && e.targetHandle === 'height_percent'
  );

  const effectiveImageUrl = connectedInputs.image_url ?? data.image_url;

  const handleRun = useCallback(async () => {
    if (!effectiveImageUrl) {
      alert('Connect an Upload Image node or enter an image URL.');
      return;
    }

    setRunning(true);
    updateNodeData(id, { running: true });
    try {
      const response = await fetch('/api/workflow/execute-crop-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: id,
          image_url: effectiveImageUrl,
          x_percent: xPercent,
          y_percent: yPercent,
          width_percent: widthPercent,
          height_percent: heightPercent,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Crop image execution failed');
      }
      setOutput(result.output);
      updateNodeData(id, { output: result.output, running: false });
    } catch (error) {
      console.error('Crop image error:', error);
      alert(error instanceof Error ? error.message : 'Failed to crop image. Please try again.');
      updateNodeData(id, { running: false });
    } finally {
      setRunning(false);
    }
  }, [id, effectiveImageUrl, xPercent, yPercent, widthPercent, heightPercent, updateNodeData]);

  return (
    <BaseNode data={data}>
      <div className="space-y-3">
        {hasImageConnection ? (
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Image: Connected</div>
        ) : (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Image URL
            </label>
            <input
              type="text"
              value={data.image_url || ''}
              onChange={(e) => updateNodeData(id, { image_url: e.target.value })}
              placeholder="Enter image URL..."
              className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              X % {hasXConnection && '(Connected)'}
            </label>
            <input
              type="number"
              value={xPercent}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setXPercent(val);
                updateNodeData(id, { x_percent: val });
              }}
              disabled={hasXConnection}
              min="0"
              max="100"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Y % {hasYConnection && '(Connected)'}
            </label>
            <input
              type="number"
              value={yPercent}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setYPercent(val);
                updateNodeData(id, { y_percent: val });
              }}
              disabled={hasYConnection}
              min="0"
              max="100"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Width % {hasWidthConnection && '(Connected)'}
            </label>
            <input
              type="number"
              value={widthPercent}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 100;
                setWidthPercent(val);
                updateNodeData(id, { width_percent: val });
              }}
              disabled={hasWidthConnection}
              min="0"
              max="100"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Height % {hasHeightConnection && '(Connected)'}
            </label>
            <input
              type="number"
              value={heightPercent}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 100;
                setHeightPercent(val);
                updateNodeData(id, { height_percent: val });
              }}
              disabled={hasHeightConnection}
              min="0"
              max="100"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
            />
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running || (!data.image_url && !hasImageConnection)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Crop Image
            </>
          )}
        </button>

        {output && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic output data URL */}
            <img
              src={output}
              alt="Cropped"
              className="w-full h-auto rounded border max-h-[200px] object-contain"
              style={{ borderColor: 'var(--panel-border)' }}
            />
          </div>
        )}
      </div>
    </BaseNode>
  );
}
