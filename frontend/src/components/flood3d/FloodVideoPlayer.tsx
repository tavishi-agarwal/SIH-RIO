'use client';
/**
 * FloodVideoPlayer — full-screen simulation view backed by the real HEC-RAS
 * run recordings from recordings/. Presented as a simulation (no video-player
 * chrome): floating panels and timeline identical in style to the 3D view.
 * Files are auto-discovered by the backend; each becomes a "Simulation N" view.
 */
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Mountain, Waves, AlertTriangle } from 'lucide-react';
import { getFloodVideos, floodVideoUrl } from '@/lib/api';

interface VideoInfo { name: string; size_mb: number; url: string }

const SPEEDS = [0.5, 1, 2, 4];

function fmt(sec: number): string {
  if (!isFinite(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FloodVideoPlayer({ onBack }: { onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dir, setDir] = useState<string | null>(null);

  useEffect(() => {
    getFloodVideos()
      .then(r => {
        setVideos(r.data.videos || []);
        setDir(r.data.recordings_dir);
        if (!(r.data.videos || []).length) setError('No simulation files found in recordings/.');
      })
      .catch(e => setError(String(e?.message || e)));
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed, active]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [playing, active]);

  const switchSim = (i: number) => {
    setActive(i);
    setTime(0);
    setDuration(0);
    setPlaying(true);
  };

  const scrub = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
    setTime(val);
  };

  const current = videos[active];

  return (
    <div className="absolute inset-0 bg-black">
      {/* Full-screen simulation canvas */}
      {current && !error && (
        <video
          key={current.name}
          ref={videoRef}
          src={floodVideoUrl(current.name)}
          className="absolute inset-0 w-full h-full object-contain"
          muted
          autoPlay
          onTimeUpdate={e => setTime((e.target as HTMLVideoElement).currentTime)}
          onLoadedMetadata={e => {
            const v = e.target as HTMLVideoElement;
            setDuration(v.duration);
            v.playbackRate = speed;
            if (playing) v.play().catch(() => setPlaying(false));
          }}
          onEnded={() => setPlaying(false)}
          onClick={() => setPlaying(p => !p)}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="text-center space-y-2 max-w-md px-4">
            <AlertTriangle className="h-8 w-8 text-amber-700 mx-auto" />
            <p className="text-slate-600 text-sm">{error}</p>
            {dir && <p className="text-slate-500 text-xs break-all">{dir}</p>}
          </div>
        </div>
      )}

      {/* Floating top-left panel — same style as the 3D view */}
      <div className="absolute top-4 left-4 z-20 bg-orange-50/90 border border-orange-200 rounded-lg px-4 py-3 space-y-2 max-w-sm">
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-orange-400" />
          <span className="text-slate-800 font-semibold text-sm">Flood simulation</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] text-slate-500 hover:text-slate-800 bg-orange-100 border border-orange-200 transition-colors"
          >
            <Mountain className="h-3 w-3" /> 3D view
          </button>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] bg-orange-600/30 text-orange-600 border border-orange-600/50">
            <Waves className="h-3 w-3" /> Simulation
          </span>
        </div>
      </div>

      {/* Floating top-right: simulation selector */}
      {videos.length > 0 && (
        <div className="absolute top-4 right-4 z-20 bg-orange-50/90 border border-orange-200 rounded-lg p-2 flex gap-1">
          {videos.map((v, i) => (
            <button
              key={v.name}
              onClick={() => switchSim(i)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                i === active
                  ? 'bg-orange-600/30 text-orange-600 border border-orange-600/50'
                  : 'text-slate-500 hover:text-slate-800 bg-orange-100 border border-orange-200'
              }`}
            >
              Simulation {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Floating bottom control bar — identical layout to the 3D timeline */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-orange-50/95 border border-orange-200 rounded-lg px-4 py-3 w-[min(720px,90%)] space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying(p => !p)}
            disabled={!current}
            className="p-2 rounded-md bg-orange-600 hover:bg-orange-500 text-slate-800 disabled:opacity-40"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </button>
          <input
            type="range" min={0} max={duration || 0} step={0.01} value={time}
            onChange={e => scrub(parseFloat(e.target.value))}
            disabled={!current}
            className="flex-1 accent-orange-500"
          />
          <span className="text-[11px] text-slate-500 tabular-nums w-24 text-right">
            {fmt(time)} / {fmt(duration)}
          </span>
          <select
            value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}
            className="bg-orange-100 border border-orange-200 rounded px-2 py-1 text-xs text-slate-700"
          >
            {SPEEDS.map(s => <option key={s} value={s}>{s}×</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
