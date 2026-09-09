'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Bot,
  Users,
  Mic,
  Sliders,
  Activity,
  Award,
  Plus,
  FileText,
  Camera,
  FolderPlus
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import AddProjectModal from '@/components/AddProjectModal';

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const resSum = await fetch('/api/v1/progress/summary/1');
      if (resSum.ok) {
        const dataSum = await resSum.json();
        setData(dataSum);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      // Fallback data if needed
      setData((prev: any) => prev || {
        actual_progress_percentage: 58.4,
        planned_progress_percentage: 65.0,
        variance: -6.6,
        schedule_status: "AT_RISK",
        total_activities: 13,
        completed_activities: 3,
        in_progress_activities: 6,
        delayed_activities: 2,
        s_curve_data: [
          { date: 'Aug 01', planned: 0, actual: 0 },
          { date: 'Aug 10', planned: 15, actual: 15 },
          { date: 'Aug 20', planned: 35, actual: 32 },
          { date: 'Aug 30', planned: 50, actual: 44 },
          { date: 'Sep 07', planned: 65, actual: 58.4 }
        ]
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const sCurveChartData = data?.s_curve_data || [
    { date: 'Aug 01', planned: 0, actual: 0 },
    { date: 'Aug 10', planned: 15, actual: 15 },
    { date: 'Aug 20', planned: 35, actual: 32 },
    { date: 'Aug 30', planned: 50, actual: 44 },
    { date: 'Sep 07', planned: 65, actual: 58.4 }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Hero Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3 text-cyan-400" />
              <span>SIH PROBLEM SIH26122</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">• Infrastructure Project Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Smart City Flyover – Package A</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time planning-to-execution bridge connecting active WBS activities with real-time schedule tracking, delay alerts, and Construction Copilot.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsAddProjectOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-cyan-950/50 flex items-center gap-1.5"
          >
            <Plus size={18} className="stroke-[3]" />
            <span>ADD PROJECT +</span>
          </button>

          <Link
            href="/copilot"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Ask Copilot</span>
            <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          </Link>
        </div>
      </div>

      {/* Primary Executive KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Physical Progress Card */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Progress</div>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-1">
            {data?.actual_progress_percentage || 58.4}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span>Planned: {data?.planned_progress_percentage || 65.0}%</span>
            <span className="font-bold text-amber-400 font-mono">({data?.variance || -6.6}%)</span>
          </div>
        </div>

        {/* Schedule Performance Card */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schedule Status</div>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 mt-1 uppercase">
            {data?.schedule_status || 'AT RISK'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-semibold flex items-center gap-1">
            <span>{data?.delayed_activities || 2} Delayed Tasks</span>
          </div>
        </div>

        {/* Active WBS Activities Card */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WBS Activities</div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {data?.completed_activities || 3} / {data?.total_activities || 13}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Completed / Total</div>
        </div>

        {/* Resource Manpower Card */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Manpower</div>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-1">
            54 Workers
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">3 Site Shifts Active</div>
        </div>
      </div>

      {/* S-Curve Progress Trend Chart */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>Planned vs Actual Physical Progress (S-Curve Trend)</span>
          </h2>
          <span className="text-xs font-mono font-bold text-cyan-400">13 Schedule WBS Activities</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sCurveChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="planned" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} name="Planned Progress %" />
              <Area type="monotone" dataKey="actual" stroke="#10b981" fill="#10b981" fillOpacity={0.25} name="Actual Progress %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Navigation Shortcut Cards (No Cost & No Critical Path) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/scenarios"
          className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-amber-500/40 transition-all flex items-center justify-between group shadow-lg"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>What-If Scenario Simulator</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Simulate manpower shifts, overtime & material acceleration</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
        </Link>

        <Link
          href="/dpr"
          className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all flex items-center justify-between group shadow-lg"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Daily Progress Reports (DPR)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Export PDF / Excel site progress summary reports</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
        </Link>

        <Link
          href="/evidence"
          className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition-all flex items-center justify-between group shadow-lg"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Photo Evidence Timeline</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Compare site photos, timestamp & GPS evidence</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
}
