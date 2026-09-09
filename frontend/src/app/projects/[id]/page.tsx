'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  Building2,
  Calendar,
  MapPin,
  TrendingUp,
  Clock,
  Layers,
  ShieldAlert,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { getProjectDetails, getDashboardSummary, getProjectActivities } from '@/lib/api';

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const p = await getProjectDetails(Number(id));
        const s = await getDashboardSummary(Number(id));
        const a = await getProjectActivities(Number(id));
        setProject(p);
        setSummary(s);
        setActivities(a);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading || !project) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-semibold uppercase tracking-wider">
                Project Overview
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">{project.name}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">{project.description}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {project.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Location</span>
            <span className="font-semibold text-slate-200">{project.location}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Start Date</span>
            <span className="font-semibold text-slate-200">{project.start_date}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Planned Finish Target</span>
            <span className="font-semibold text-slate-200">{project.planned_end_date}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Overall Progress (Actual / Planned)</span>
            <span className="font-bold text-sky-400">{summary?.overall_actual_progress}% / {summary?.overall_planned_progress}%</span>
          </div>
        </div>
      </div>

      {/* Activities Summary */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Active Schedule Activities</h3>
          <Link href="/schedule" className="text-xs text-sky-400 hover:text-sky-300 font-medium">
            Manage WBS Schedule
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Planned %</th>
                <th className="p-3">Actual %</th>
                <th className="p-3">Variance</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {activities.map((a) => (
                <tr key={a.id} className="hover:bg-slate-900/40">
                  <td className="p-3 font-mono text-sky-400">{a.activity_id}</td>
                  <td className="p-3 font-semibold text-slate-100">{a.activity_name}</td>
                  <td className="p-3">{a.planned_percentage}%</td>
                  <td className="p-3 font-bold text-slate-200">{a.actual_percentage}%</td>
                  <td className={`p-3 font-bold ${a.variance_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {a.variance_percentage}%
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
