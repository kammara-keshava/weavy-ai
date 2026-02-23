'use client';

import { useState, useCallback, useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';
import { useWorkflowStore } from '@/stores/workflow-store';
import { NodeData } from '@/types/workflow';
import { Play, Loader2 } from 'lucide-react';

// Free tier compatible Gemini models
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

export function LLMNode({ id, data }: NodeProps<NodeData>) {
  const [running, setRunning] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt || '');
  const [userMessage, setUserMessage] = useState(data.userMessage || '');
  const [selectedModel, setSelectedModel] = useState(
    data.model && GEMINI_MODELS.includes(data.model) ? data.model : GEMINI_MODELS[0]
  );
  const [output, setOutput] = useState(data.output || '');
  const { updateNodeData, nodes, edges } = useWorkflowStore();

  // Get connected inputs (read-only, don't update store)
  const connectedInputs = (() => {
    const inputs: Record<string, any> = {};
    edges.forEach((edge) => {
      if (edge.target === id) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          if (edge.targetHandle === 'systemPrompt') {
            inputs.systemPrompt = sourceNode.data.text || sourceNode.data.output;
          } else if (edge.targetHandle === 'userMessage') {
            inputs.userMessage = sourceNode.data.text || sourceNode.data.output;
          } else if (edge.targetHandle === 'images') {
            if (!inputs.images) inputs.images = [];
            inputs.images.push(sourceNode.data.imageUrl || sourceNode.data.output);
          }
        }
      }
    });
    return inputs;
  })();

  const effectiveSystemPrompt =
    connectedInputs.systemPrompt ?? systemPrompt ?? data.systemPrompt ?? '';
  const effectiveUserMessage =
    connectedInputs.userMessage ?? userMessage ?? data.userMessage ?? '';
  const effectiveImages = useMemo(() => {
    const fromConnections = (connectedInputs.images ?? []).filter(Boolean);
    return fromConnections.length ? fromConnections : (data.images ?? []);
  }, [data.images, connectedInputs.images]);

  const handleRun = useCallback(async () => {
    if (!effectiveUserMessage) {
      alert('User message is required (enter text or connect a Text node)');
      return;
    }

    setRunning(true);
    updateNodeData(id, { running: true });
    try {
      const response = await fetch('/api/workflow/execute-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: id,
          model: selectedModel,
          systemPrompt: effectiveSystemPrompt || undefined,
          userMessage: effectiveUserMessage,
          images: effectiveImages,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'LLM execution failed');
      }
      setOutput(result.output);
      updateNodeData(id, { output: result.output, running: false });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('LLM execution error:', error);
      }
      alert(error instanceof Error ? error.message : 'Failed to execute LLM. Please try again.');
      updateNodeData(id, { running: false });
    } finally {
      setRunning(false);
    }
  }, [
    id,
    selectedModel,
    effectiveSystemPrompt,
    effectiveUserMessage,
    effectiveImages,
    updateNodeData,
  ]);

  const hasSystemPromptConnection = edges.some(
    (e) => e.target === id && e.targetHandle === 'systemPrompt'
  );
  const hasUserMessageConnection = edges.some(
    (e) => e.target === id && e.targetHandle === 'userMessage'
  );
  const hasImagesConnection = edges.some(
    (e) => e.target === id && e.targetHandle === 'images'
  );

  return (
    <BaseNode data={data}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              updateNodeData(id, { model: e.target.value });
            }}
            className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
          >
            {GEMINI_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            System Prompt {hasSystemPromptConnection && '(Connected)'}
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => {
              setSystemPrompt(e.target.value);
              updateNodeData(id, { systemPrompt: e.target.value });
            }}
            disabled={hasSystemPromptConnection}
            placeholder="Optional system prompt..."
            className="w-full min-h-[60px] px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            User Message {hasUserMessageConnection && '(Connected)'}
          </label>
          <textarea
            value={userMessage}
            onChange={(e) => {
              setUserMessage(e.target.value);
              updateNodeData(id, { userMessage: e.target.value });
            }}
            disabled={hasUserMessageConnection}
            placeholder="Enter user message..."
            className="w-full min-h-[80px] px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            style={{ border: '1px solid var(--panel-border)', backgroundColor: 'var(--input-bg)', color: 'var(--foreground)' }}
          />
        </div>

        {hasImagesConnection && (
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            Images: Connected ({effectiveImages.length})
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={running || !effectiveUserMessage}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run LLM
            </>
          )}
        </button>

        {output && (
          <div className="mt-3 p-3 rounded border" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--foreground)' }}>Output:</div>
            <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>{output}</div>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
