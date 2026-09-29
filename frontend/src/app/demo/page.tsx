'use client';
import DemoRunButton from '@/components/demo/DemoRunButton';

export default function DemoPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Run Full Demonstration</h1>
        <p className="text-slate-500">Execute the complete end-to-end pipeline using synthetic data and mock hydraulic models.</p>
      </div>
      <DemoRunButton />
    </div>
  );
}
