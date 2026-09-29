'use client';
import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="fixed top-14 z-40 w-full bg-amber-50 border-b border-amber-200 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-2 text-sm text-amber-700">
        <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
        <span className="flex-1 text-xs">
          <strong>DEMONSTRATION MODE:</strong> This demonstration uses synthetic terrain, hydrology, infrastructure data and simplified mock hydraulic models. The outputs are for software demonstration and workflow validation only and must not be used for real-world emergency or engineering decisions.
        </span>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-amber-700 hover:text-amber-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
