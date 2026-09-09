'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  MapPin,
  BellRing,
  Cpu,
  Sliders,
  Users,
  Bot,
  FileText,
  Camera,
  ShieldCheck,
  Smartphone,
  Workflow
} from 'lucide-react';

const mainNavigation = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'What-If Simulator', href: '/scenarios', icon: Sliders },
  { name: 'AI Copilot', href: '/copilot', icon: Bot, badge: 'AI' },
  { name: 'Resource Tracking', href: '/resources', icon: Users },
  { name: 'Daily DPR Reports', href: '/dpr', icon: FileText },
  { name: 'Evidence Timeline', href: '/evidence', icon: Camera },
  { name: 'Audit Logs', href: '/audit', icon: ShieldCheck },
  { name: 'Execution Intelligence', href: '/execution', icon: Workflow, badge: 'NEW' },
  { name: 'Risk Alerts', href: '/alerts', icon: BellRing },
];

const scheduleNavigation = [
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Schedule WBS', href: '/schedule', icon: CalendarDays },
  { name: 'Activities List', href: '/activities', icon: FileSpreadsheet },
  { name: 'Site Reports Log', href: '/site-reports', icon: ClipboardList },
  { name: 'Interactive Map', href: '/map', icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-panel flex flex-col h-screen border-r border-slate-800 shrink-0 sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 text-sm tracking-wide">PLAN2BUILD</h1>
            <p className="text-[10px] text-cyan-400 font-medium">Project Controls AI</p>
          </div>
        </div>
      </div>

      {/* Mode Switch Button */}
      <div className="p-3">
        <Link
          href="/worker-mode"
          className="flex items-center justify-between px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/25 transition-all text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>Worker / Site Mode</span>
          </div>
          <span className="px-1.5 py-0.5 bg-amber-500/20 rounded text-[9px] font-bold">MOBILE</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Intelligence Platform
          </div>
          <div className="space-y-1">
            {mainNavigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[9px] font-extrabold rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Schedule & Execution
          </div>
          <div className="space-y-1">
            {scheduleNavigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="font-semibold text-slate-300 text-[11px]">SIH26122 Engine Online</span>
        </div>
        <p className="text-[10px] text-slate-500">Real-Time Planning-to-Execution Bridge</p>
      </div>
    </aside>
  );
}
