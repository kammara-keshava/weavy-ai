import { Header } from '@/components/header';
import { WorkflowBuilder } from '@/components/workflow-builder';

export default function WorkflowPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-950">
      <Header />
      <div className="flex-1 overflow-hidden">
        <WorkflowBuilder />
      </div>
    </div>
  );
}
