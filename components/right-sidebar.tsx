'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface WorkflowRun {
  id: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'partial' | 'running';
  duration?: number;
  type: 'full' | 'partial' | 'single';
  nodeIds: string[];
}

interface NodeExecution {
  nodeId: string;
  nodeType: string;
  status: 'success' | 'failed' | 'running';
  duration?: number;
  outputs?: Record<string, any>;
  error?: string;
}

export function RightSidebar() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<Record<string, NodeExecution[]>>({});

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const response = await fetch('/api/workflow/history');
        if (response.ok) {
          const data = await response.json();
          setRuns(
            data.map((run: any) => ({
              id: run.id,
              timestamp: new Date(run.createdAt),
              status: run.status,
              duration: run.duration,
              type: run.type,
              nodeIds: run.nodeIds,
            }))
          );
          const executions: Record<string, NodeExecution[]> = {};
          data.forEach((run: any) => {
            executions[run.id] = (run.nodes ?? []).map((n: any) => ({
              nodeId: n.nodeId,
              nodeType: n.nodeType,
              status: n.status,
              duration: n.duration,
              outputs: n.outputs,
              error: n.error,
            }));
          });
          setNodeExecutions(executions);
        } else {
          setRuns([]);
        }
      } catch {
        setRuns([]);
        setNodeExecutions({});
      }
    };

    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="w-80 border-l flex flex-col h-full" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--panel-border)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>Workflow History</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {runs.length === 0 ? (
          <div className="p-4 text-center text-sm" style={{ color: 'var(--muted)' }}>
            No workflow runs yet. Execute a workflow to see history.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--panel-border)' }}>
            {runs.map((run) => (
              <div
                key={run.id}
                onClick={() => setSelectedRun(run.id)}
                className="p-4 cursor-pointer transition-colors"
                style={{
                  backgroundColor: selectedRun === run.id ? 'var(--input-bg)' : 'transparent',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(run.status)}
                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                      Run #{run.id.slice(-6)}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(run.status)}`}>
                    {run.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--muted)' }}>
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(run.timestamp)}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {run.type === 'full' && 'Full Workflow'}
                  {run.type === 'partial' && `${run.nodeIds.length} nodes selected`}
                  {run.type === 'single' && 'Single Node'}
                  {run.duration && ` • ${formatDuration(run.duration)}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRun && nodeExecutions[selectedRun] && (
        <div className="border-t p-4 max-h-96 overflow-y-auto" style={{ borderColor: 'var(--panel-border)', backgroundColor: 'var(--node-bg)' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>
            Node Execution Details
          </h3>
          <div className="space-y-3">
            {nodeExecutions[selectedRun].map((exec, idx) => (
              <div key={idx} className="border rounded-lg p-3" style={{ borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(exec.status)}
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {exec.nodeType} ({exec.nodeId})
                    </span>
                  </div>
                  {exec.duration && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {formatDuration(exec.duration)}
                    </span>
                  )}
                </div>
                {exec.outputs && (
                  <div className="mt-2 text-xs" style={{ color: 'var(--foreground)' }}>
                    <div className="font-medium mb-1">Output:</div>
                    <pre className="p-2 rounded text-xs overflow-x-auto" style={{ backgroundColor: 'var(--input-bg)' }}>
                      {JSON.stringify(exec.outputs, null, 2)}
                    </pre>
                  </div>
                )}
                {exec.error && (
                  <div className="mt-2 text-xs text-red-600">
                    <div className="font-medium mb-1">Error:</div>
                    <div className="bg-red-50 p-2 rounded dark:bg-red-900/20">{exec.error}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
