'use client';

import { useState, useCallback } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';
import { useWorkflowStore } from '@/stores/workflow-store';
import { NodeData } from '@/types/workflow';
import { Upload } from 'lucide-react';

export function UploadImageNode({ id, data }: NodeProps<NodeData>) {
  const [uploading, setUploading] = useState(false);
  const { updateNodeData } = useWorkflowStore();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Invalid file type. Please upload jpg, jpeg, png, webp, or gif.');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        updateNodeData(id, {
          imageUrl: result.url,
          fileName: result.fileName,
        });
      } catch (error) {
        console.error('Upload error:', error);
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
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
          style={{ borderColor: 'var(--panel-border)', backgroundColor: 'var(--input-bg)' }}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2" style={{ color: 'var(--muted)' }} />
            <p className="mb-2 text-sm" style={{ color: 'var(--foreground)' }}>
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>JPG, PNG, WEBP, GIF</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>

        {uploading && (
          <div className="text-center text-sm" style={{ color: 'var(--muted)' }}>Uploading...</div>
        )}

        {data.imageUrl && !uploading && (
          <div className="mt-2">
            <img
              src={data.imageUrl}
              alt="Uploaded"
              className="w-full h-auto rounded border max-h-[200px] object-contain"
              style={{ borderColor: 'var(--panel-border)' }}
            />
            {data.fileName && (
              <p className="mt-1 text-xs truncate" style={{ color: 'var(--muted)' }}>{data.fileName}</p>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

