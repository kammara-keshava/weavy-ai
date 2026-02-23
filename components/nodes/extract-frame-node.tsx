'use client';

import { useState, useCallback, useEffect } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';
import { useWorkflowStore } from '@/stores/workflow-store';
import { NodeData } from '@/types/workflow';
import { Play, Loader2 } from 'lucide-react';

export function ExtractFrameNode({ id, data }: NodeProps<NodeData>) {
  const [running, setRunning] = useState(false);
  const [timestamp, setTimestamp] = useState(data.timestamp || 0);
  const [output, setOutput] = useState(data.output || '');
  const { updateNodeData, nodes, edges } = useWorkflowStore();

  // Get connected inputs (read-only, don't update store)
  const connectedInputs = (() => {
    const inputs: Record<string, any> = {};

    const videoEdge = edges.find((e) => e.target === id && e.targetHandle === 'video_url');
    if (videoEdge) {
      const sourceNode = nodes.find((n) => n.id === videoEdge.source);
      if (sourceNode) {
        inputs.video_url = sourceNode.data.videoUrl || sourceNode.data.output;
      }
    }

    const timestampEdge = edges.find((e) => e.target === id && e.targetHandle === 'timestamp');
    if (timestampEdge) {
      const sourceNode = nodes.find((n) => n.id === timestampEdge.source);
      if (sourceNode) {
        const value = sourceNode.data.text || sourceNode.data.output || '0';
        let parsedValue = 0;
        if (typeof value === 'string' && value.includes('%')) {
          parsedValue = parseFloat(value.replace('%', ''));
        } else {
          parsedValue = parseFloat(value) || 0;
        }
        inputs.timestamp = parsedValue;
      }
    }

    return inputs;
  })();

  const hasVideoConnection = edges.some(
    (e) => e.target === id && e.targetHandle === 'video_url'
  );
  const hasTimestampConnection = edges.some(
    (e) => e.target === id && e.targetHandle === 'timestamp'
  );

  // Input priority: connected Upload Video first, then manual Video URL
  const connectedVideoFile = hasVideoConnection ? connectedInputs.video_url : undefined;
  const manualVideoUrl = data.video_url || '';
  const effectiveVideoUrl = connectedVideoFile || manualVideoUrl || '';

  const handleRun = useCallback(async () => {
    if (!effectiveVideoUrl) {
      if (hasVideoConnection) {
        alert('Upload a video in the connected Upload Video node first.');
      } else {
        alert('Connect an Upload Video node or enter a video URL.');
      }
      return;
    }

    setRunning(true);
    updateNodeData(id, { running: true });
    try {
      const response = await fetch('/api/video/extract-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: effectiveVideoUrl,
          timestamp,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Extract frame failed');
      }
      const frameUrl = result.frameUrl ?? result.output;
      const outputVal = result.output ?? frameUrl;
      setOutput(outputVal);
      updateNodeData(id, { output: outputVal, frameUrl: frameUrl ?? outputVal, running: false });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Extract frame error:', error);
      }
      alert(error instanceof Error ? error.message : 'Failed to extract frame. Please try again.');
      updateNodeData(id, { running: false });
    } finally {
      setRunning(false);
    }
  }, [id, effectiveVideoUrl, timestamp, updateNodeData, hasVideoConnection]);

  return (
    <BaseNode data={data}>
      <div className="space-y-3">
        {hasVideoConnection ? (
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Video: Connected</div>
        ) : (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Video URL
            </label>
            <input
              type="text"
              value={data.video_url || ''}
              onChange={(e) => updateNodeData(id, { video_url: e.target.value })}
              placeholder="Enter video URL..."
              className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Timestamp {hasTimestampConnection && '(Connected)'}
          </label>
          <input
            type="text"
            value={timestamp}
            onChange={(e) => {
              const val = e.target.value;
              setTimestamp(val as any);
              updateNodeData(id, { timestamp: val });
            }}
            disabled={hasTimestampConnection}
            placeholder="Seconds or percentage (e.g., 5 or 50%)"
            className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{
              border: '1px solid var(--panel-border)',
              backgroundColor: hasTimestampConnection ? 'var(--input-bg)' : 'var(--input-bg)',
              color: 'var(--foreground)',
              ...(hasTimestampConnection ? { opacity: 0.8, cursor: 'not-allowed' } : {}),
            }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Enter seconds (e.g., 5) or percentage (e.g., 50%)
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={running || !effectiveVideoUrl}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Extract Frame
            </>
          )}
        </button>

        {(data.frameUrl || output) && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic frame preview */}
            <img
              src={data.frameUrl || output}
              alt="Extracted frame"
              className="w-full h-auto rounded border max-h-[200px] object-contain"
              style={{ borderColor: 'var(--panel-border)' }}
            />
          </div>
        )}
      </div>
    </BaseNode>
  );
}
