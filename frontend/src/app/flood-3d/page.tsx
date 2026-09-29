'use client';
import dynamic from 'next/dynamic';

const FloodTerrainViewer = dynamic(
  () => import('@/components/flood3d/FloodTerrainViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-orange-400 animate-pulse text-sm">Loading 3D viewer…</div>
      </div>
    ),
  },
);

export default function Flood3DPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      <FloodTerrainViewer />
    </div>
  );
}
