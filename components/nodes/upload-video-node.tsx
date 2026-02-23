'use client';

import { useState, useCallback } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';
import { useWorkflowStore } from '@/stores/workflow-store';
import { NodeData } from '@/types/workflow';
import { Upload } from 'lucide-react';

export function UploadVideoNode({ id, data }: NodeProps<NodeData>) {
  const [uploading, setUploading] = useState(false);
  const { updateNodeData, edges, nodes } = useWorkflowStore();

  const connectedTo = edges
    .filter((e) => e.source === id)
    .map((e) => nodes.find((n) => n.id === e.target)?.data?.label || e.target)
    .filter(Boolean);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
      if (!validTypes.includes(file.type)) {
        alert('Invalid file type. Please upload mp4, mov, webm, or m4v.');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Upload failed');
        }
        const url = result.url ?? `/uploads/${result.fileName ?? file.name}`;
        updateNodeData(id, {
          videoUrl: url,
          output: url, // Also set output for downstream nodes
          fileName: result.fileName || file.name,
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Upload error:', error);
        }
        alert(error instanceof Error ? error.message : 'Upload failed. Try again.');
      } finally {
        setUploading(false);
      }
    },
    [id, updateNodeData]
  );

  return (
    <BaseNode data={data}>
      <div className="space-y-3 nodrag nopan">
        <label
          className="flex flex-col items-center justify-center w-full h-32 rounded-lg cursor-pointer transition-colors border-2 border-dashed"
          style={{ borderColor: 'var(--panel-border)', backgroundColor: 'var(--input-bg)' }}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2" style={{ color: 'var(--muted)' }} />
            <p className="mb-2 text-sm" style={{ color: 'var(--foreground)' }}>
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>MP4, MOV, WEBM, M4V</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>

        {uploading && (
          <div className="text-center text-sm" style={{ color: 'var(--muted)' }}>Uploading...</div>
        )}

        {data.videoUrl && !uploading && (
          <div className="mt-2 space-y-2">
            <div className="rounded border overflow-hidden min-h-[120px]" style={{ borderColor: 'var(--panel-border)' }}>
              <video
                src={data.videoUrl}
                controls
                className="w-full h-auto max-h-[200px]"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            {data.fileName && (
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{data.fileName}</p>
            )}
            <div className="text-xs border-t pt-2" style={{ color: 'var(--muted)', borderColor: 'var(--panel-border)' }}>
              <strong>Output:</strong> This video is sent to nodes connected from the handle below.
              {connectedTo.length > 0 ? (
                <span className="block mt-1">Connected to: {connectedTo.join(', ')}</span>
              ) : (
                <span className="block mt-1">Drag from the bottom handle to &quot;Extract Frame from Video&quot; or other nodes.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
