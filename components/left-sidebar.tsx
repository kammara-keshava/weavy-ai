'use client';

import { useState } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { NODE_DEFINITIONS } from '@/lib/node-definitions';
import { ChevronLeft, ChevronRight, Type, Image, Video, Brain, Crop, Film, Search } from 'lucide-react';

const iconMap: Record<string, any> = {
  Type,
  Image,
  Video,
  Brain,
  Crop,
  Film,
};

export function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addNode } = useWorkflowStore();

  const handleAddNode = (nodeType: string) => {
    const definition = NODE_DEFINITIONS[nodeType];
    if (!definition) return;

    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        type: definition.type,
        label: definition.label,
      },
    };

    addNode(newNode);
  };

  const filteredNodes = Object.entries(NODE_DEFINITIONS).filter(([key, def]) =>
    def.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (collapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-4" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--panel-border)' }}>
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: 'var(--foreground)' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r flex flex-col h-full" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--panel-border)' }}>
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--panel-border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>Node Types</h2>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--foreground)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--muted)' }}>Quick Access</h3>
        <div className="space-y-2">
          {filteredNodes.map(([key, definition]) => {
            const Icon = iconMap[definition.icon] || Type;
            return (
              <button
                key={key}
                onClick={() => handleAddNode(key)}
                className="w-full flex items-center gap-3 px-4 py-3 border rounded-lg hover:border-purple-500 hover:shadow-sm transition-all text-left group"
                style={{ backgroundColor: 'var(--node-bg)', borderColor: 'var(--panel-border)' }}
              >
                <div
                  className="w-8 h-8 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${definition.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: definition.color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{definition.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
