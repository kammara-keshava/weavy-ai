import { WorkflowNode, WorkflowEdge } from '@/types/workflow';

/**
 * Product Marketing Kit Generator Sample Workflow
 * 
 * Branch A: Image Processing + Product Description
 * - Upload Image Node
 * - Crop Image Node
 * - Text Node #1 (System Prompt)
 * - Text Node #2 (Product Details)
 * - LLM Node #1 (Product Description)
 * 
 * Branch B: Video Frame Extraction
 * - Upload Video Node
 * - Extract Frame from Video Node
 * 
 * Convergence Point:
 * - Text Node #3 (System Prompt for Marketing)
 * - LLM Node #2 (Final Marketing Summary)
 */
export function createSampleWorkflow(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [
    // Branch A - Image Processing
    {
      id: 'upload-image-1',
      type: 'uploadImage',
      position: { x: 100, y: 100 },
      data: {
        type: 'uploadImage',
        label: 'Upload Image',
      },
    },
    {
      id: 'crop-image-1',
      type: 'cropImage',
      position: { x: 100, y: 300 },
      data: {
        type: 'cropImage',
        label: 'Crop Image',
        x_percent: 10,
        y_percent: 10,
        width_percent: 80,
        height_percent: 80,
      },
    },
    {
      id: 'text-system-1',
      type: 'text',
      position: { x: 100, y: 500 },
      data: {
        type: 'text',
        label: 'System Prompt',
        text: 'You are a professional marketing copywriter. Generate a compelling one-paragraph product description.',
      },
    },
    {
      id: 'text-product-1',
      type: 'text',
      position: { x: 100, y: 650 },
      data: {
        type: 'text',
        label: 'Product Details',
        text: 'Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.',
      },
    },
    {
      id: 'llm-product-1',
      type: 'llm',
      position: { x: 100, y: 800 },
      data: {
        type: 'llm',
        label: 'LLM Node #1',
        model: 'gemini-1.5-flash-latest',
      },
    },

    // Branch B - Video Frame Extraction
    {
      id: 'upload-video-1',
      type: 'uploadVideo',
      position: { x: 500, y: 100 },
      data: {
        type: 'uploadVideo',
        label: 'Upload Video',
      },
    },
    {
      id: 'extract-frame-1',
      type: 'extractFrame',
      position: { x: 500, y: 300 },
      data: {
        type: 'extractFrame',
        label: 'Extract Frame',
        timestamp: '50%',
      },
    },

    // Convergence Point
    {
      id: 'text-system-2',
      type: 'text',
      position: { x: 300, y: 1000 },
      data: {
        type: 'text',
        label: 'Marketing System Prompt',
        text: 'You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.',
      },
    },
    {
      id: 'llm-final-1',
      type: 'llm',
      position: { x: 300, y: 1150 },
      data: {
        type: 'llm',
        label: 'LLM Node #2',
        model: 'gemini-1.5-flash-latest',
      },
    },
  ];

  const edges: WorkflowEdge[] = [
    // Branch A connections
    {
      id: 'e1',
      source: 'upload-image-1',
      target: 'crop-image-1',
      sourceHandle: 'output',
      targetHandle: 'image_url',
    },
    {
      id: 'e2',
      source: 'crop-image-1',
      target: 'llm-product-1',
      sourceHandle: 'output',
      targetHandle: 'images',
    },
    {
      id: 'e3',
      source: 'text-system-1',
      target: 'llm-product-1',
      sourceHandle: 'output',
      targetHandle: 'systemPrompt',
    },
    {
      id: 'e4',
      source: 'text-product-1',
      target: 'llm-product-1',
      sourceHandle: 'output',
      targetHandle: 'userMessage',
    },

    // Branch B connections
    {
      id: 'e5',
      source: 'upload-video-1',
      target: 'extract-frame-1',
      sourceHandle: 'output',
      targetHandle: 'video_url',
    },

    // Convergence connections
    {
      id: 'e6',
      source: 'text-system-2',
      target: 'llm-final-1',
      sourceHandle: 'output',
      targetHandle: 'systemPrompt',
    },
    {
      id: 'e7',
      source: 'llm-product-1',
      target: 'llm-final-1',
      sourceHandle: 'output',
      targetHandle: 'userMessage',
    },
    {
      id: 'e8',
      source: 'crop-image-1',
      target: 'llm-final-1',
      sourceHandle: 'output',
      targetHandle: 'images',
    },
    {
      id: 'e9',
      source: 'extract-frame-1',
      target: 'llm-final-1',
      sourceHandle: 'output',
      targetHandle: 'images',
    },
  ];

  return { nodes, edges };
}
