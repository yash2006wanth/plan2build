'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HardHat, ChevronDown, Building2, Mic, Bot, WifiOff, LogOut, UserCheck, Plus } from 'lucide-react';
import DemoTriggerButton from '@/components/demo/DemoTriggerButton';
import LiveLocationBadge from '@/components/LiveLocationBadge';
import AddProjectModal from '@/components/AddProjectModal';

interface HeaderProps {
  onRefreshNeeded?: () => void;
}

export default function Header({ onRefreshNeeded }: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

  useEffect(() => {
    // Load logged-in user profile from localStorage
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        setCurrentUser({ name: 'Rajesh Sharma', email: 'manager@buildsync.demo', role: 'PROJECT_MANAGER' });
      }
    } catch (e) {
      setCurrentUser({ name: 'Rajesh Sharma', email: 'manager@buildsync.demo', role: 'PROJECT_MANAGER' });
    }

    // Check localStorage offline queue count
    const checkQueue = () => {
      try {
        const queue = JSON.parse(localStorage.getItem('plan2build_offline_queue') || '[]');
        setPendingSyncCount(queue.length);
      } catch (e) {
        setPendingSyncCount(0);
      }
    };
    checkQueue();
    const interval = setInterval(checkQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <header className="h-16 glass-panel border-b border-slate-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
        {/* Left Side: ADD PROJECT + Button & Active Project */}
        <div className="flex items-center gap-3">
          {/* Prominent ADD PROJECT + Button */}
          <button
            onClick={() => setIsAddProjectOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md shadow-cyan-950/50"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>ADD PROJECT +</span>
          </button>

          {/* Active Project Dropdown */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="p-1.5 bg-slate-800 rounded-lg text-cyan-400 border border-slate-700">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Active Project</div>
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-200">
                <span>Smart City Flyover – Package A</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Live Location Badge */}
          <div className="hidden lg:block">
            <LiveLocationBadge />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Offline Queue Badge */}
          {pendingSyncCount > 0 && (
            <Link
              href="/worker-mode"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 text-amber-300 text-xs font-medium rounded-lg border border-amber-500/30 animate-pulse"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>{pendingSyncCount} Pending Sync</span>
            </Link>
          )}

          {/* Ask Copilot Quick Mic Button */}
          <Link
            href="/copilot"
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 text-xs font-semibold rounded-lg border border-cyan-500/30 transition-all"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Ask Copilot</span>
            <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          </Link>

          <DemoTriggerButton onUpdateSuccess={onRefreshNeeded} />

          <Link
            href="/site-reports/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-all"
          >
            <HardHat className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">New Report</span>
          </Link>

          {/* User Account & Logout Menu */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 pl-3 border-l border-slate-800 hover:opacity-80 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
                {currentUser ? getInitials(currentUser.name) : 'PM'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <span>{currentUser?.name || 'Project Manager'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[10px] text-cyan-400 font-medium">{currentUser?.role || 'PROJECT_MANAGER'}</div>
              </div>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-52 glass-panel bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-1.5 space-y-1">
                <div className="px-3 py-1.5 border-b border-slate-800">
                  <div className="text-xs font-bold text-slate-200">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser?.email}</div>
                </div>
                <Link
                  href="/login"
                  onClick={() => setShowRoleMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-all"
                >
                  <UserCheck size={14} className="text-cyan-400" />
                  <span>Switch Account</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSuccess={onRefreshNeeded}
      />
    </>
  );
}
