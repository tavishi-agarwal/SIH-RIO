'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Waves, BarChart2, Map, Database, Download, Radio, Info, Settings, Play, Mountain } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: Map },
  { href: '/flood-3d', label: '3D Flood', icon: Mountain },
  { href: '/demo', label: 'Demo', icon: Play },
  { href: '/simulations', label: 'Simulations', icon: BarChart2 },
  { href: '/data', label: 'Data', icon: Database },
  { href: '/exports', label: 'Exports', icon: Download },
  { href: '/monitoring', label: 'Monitoring', icon: Radio },
  { href: '/about', label: 'About', icon: Info },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-orange-200 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-orange-500 shrink-0">
          <Waves className="h-6 w-6" />
          <span className="hidden sm:block tracking-tight">RIO</span>
        </Link>
        {/* Nav links */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-orange-100 text-orange-600 font-medium'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-orange-50'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="hidden md:block">{item.label}</span>
            </Link>
          ))}
        </div>
        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/settings" className="p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-orange-50">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
