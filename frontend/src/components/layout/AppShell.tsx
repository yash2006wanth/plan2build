'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const isLoginPage = pathname === '/login';
  const isWorkerMode = pathname === '/worker-mode';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && !isLoginPage) {
      router.push('/login');
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, isLoginPage, router]);

  // If on login page, render page directly without header/sidebar shell
  if (isLoginPage) {
    return <div className="min-h-screen bg-[#0b0f19] text-slate-100">{children}</div>;
  }

  // While checking auth on protected pages
  if (isAuthenticated === false && !isLoginPage) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold">Redirecting to Login...</p>
        </div>
      </div>
    );
  }

  if (isWorkerMode) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto bg-slate-950/60">
          {children}
        </main>
      </div>
    </div>
  );
}
