'use client';

import { Trash2 } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflow-store';

interface NodeMenuProps {
  nodeId: string;
  onClose: () => void;
}

export function NodeMenu({ nodeId, onClose }: NodeMenuProps) {
  const { deleteNode } = useWorkflowStore();

  const handleDelete = () => {
    deleteNode(nodeId);
    onClose();
  };

  return (
    <div className="absolute right-0 top-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );
}
