'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Search,
  Filter,
  Plus,
  Building2,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { getProjects } from '@/lib/api';
import AddProjectModal from '@/components/AddProjectModal';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

  const fetchProjectsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects();
      setProjects(data || []);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError('Unable to load projects portfolio from server. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsData();
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-cyan-400" />
            <span>Infrastructure Projects Portfolio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Planning-to-Execution Control & Schedule Progress Health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddProjectOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-1.5 transition-all"
          >
            <Plus size={18} className="stroke-[3]" />
            <span>ADD PROJECT +</span>
          </button>

          <Link
            href="/schedule"
            className="px-3.5 py-2.5 glass-panel hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-800 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import Schedule WBS</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search project name, location, or description..."
            className="w-full glass-input pl-9 pr-4 py-2 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          {['ALL', 'ACTIVE', 'COMPLETED', 'ON_HOLD'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* UI State Logic: Loading, Error, Empty, Success */}
      {loading ? (
        <div className="glass-panel p-16 rounded-2xl border border-slate-800 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-300 font-semibold">Loading projects portfolio from server...</p>
        </div>
      ) : error ? (
        <div className="glass-panel p-12 rounded-2xl border border-rose-500/30 bg-rose-950/10 text-center space-y-4 shadow-xl">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Unable to load projects</h3>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchProjectsData}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/50 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No projects found matching your query.</p>
          <p className="text-xs text-slate-500">Try adjusting search filters or create a new infrastructure project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
                      ID #{p.id}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1.5 group-hover:text-cyan-300 transition-colors">
                      {p.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase shrink-0 ${
                      p.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : p.status === 'COMPLETED'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {p.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{p.location || 'Bengaluru'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{p.planned_end_date}</span>
                  </div>
                </div>
              </div>

              {/* Health & Links */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Health Status</div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ACTIVE SCHEDULE</span>
                  </div>
                </div>

                <Link
                  href={`/projects/${p.id}`}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-bold rounded-xl border border-slate-800 transition-all flex items-center gap-1.5"
                >
                  <span>Open Project</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSuccess={fetchProjectsData}
      />
    </div>
  );
}
