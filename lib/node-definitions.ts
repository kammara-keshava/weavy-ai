import { NodeDefinition } from '@/types/workflow';

export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  text: {
    type: 'text',
    label: 'Text',
    inputs: [],
    outputs: [
      { id: 'output', type: 'text', label: 'Text', required: true },
    ],
    color: '#6366f1',
    icon: 'Type',
  },
  uploadImage: {
    type: 'uploadImage',
    label: 'Upload Image',
    inputs: [],
    outputs: [
      { id: 'output', type: 'image', label: 'Image URL', required: true },
    ],
    color: '#10b981',
    icon: 'Image',
  },
  uploadVideo: {
    type: 'uploadVideo',
    label: 'Upload Video',
    inputs: [],
    outputs: [
      { id: 'output', type: 'video', label: 'Video URL', required: true },
    ],
    color: '#f59e0b',
    icon: 'Video',
  },
  llm: {
    type: 'llm',
    label: 'Run Any LLM',
    inputs: [
      { id: 'systemPrompt', type: 'text', label: 'System Prompt', required: false },
      { id: 'userMessage', type: 'text', label: 'User Message', required: true },
      { id: 'images', type: 'image', label: 'Images', required: false },
    ],
    outputs: [
      { id: 'output', type: 'text', label: 'Output', required: true },
    ],
    color: '#8b5cf6',
    icon: 'Brain',
  },
  cropImage: {
    type: 'cropImage',
    label: 'Crop Image',
    inputs: [
      { id: 'image_url', type: 'image', label: 'Image URL', required: true },
      { id: 'x_percent', type: 'number', label: 'X %', required: false },
      { id: 'y_percent', type: 'number', label: 'Y %', required: false },
      { id: 'width_percent', type: 'number', label: 'Width %', required: false },
      { id: 'height_percent', type: 'number', label: 'Height %', required: false },
    ],
    outputs: [
      { id: 'output', type: 'image', label: 'Cropped Image', required: true },
    ],
    color: '#ec4899',
    icon: 'Crop',
  },
  extractFrame: {
    type: 'extractFrame',
    label: 'Extract Frame from Video',
    inputs: [
      { id: 'video_url', type: 'video', label: 'Video URL', required: true },
      { id: 'timestamp', type: 'number', label: 'Timestamp', required: false },
    ],
    outputs: [
      { id: 'output', type: 'image', label: 'Frame Image', required: true },
    ],
    color: '#06b6d4',
    icon: 'Film',
  },
};
