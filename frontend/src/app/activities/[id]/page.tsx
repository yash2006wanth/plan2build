'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  RefreshCw,
  GitCommit,
  Sparkles
} from 'lucide-react';
import { getActivityDetails } from '@/lib/api';

export default function ActivityDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getActivityDetails(Number(id));
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  const { activity, forecast, predecessors, successors, site_reports } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <Link href="/activities" className="inline-flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Activities Directory
      </Link>

      {/* Header Info */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                {activity.activity_id}
              </span>
              <span className="text-xs text-slate-400 font-mono">WBS {activity.wbs_code}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">{activity.activity_name}</h1>
            <p className="text-xs text-slate-400 mt-1">{activity.description}</p>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {activity.status.replace('_', ' ')}
            </span>
            <div className="text-xs text-slate-400 mt-1 font-medium">{activity.location}</div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Planned Quantity</div>
            <div className="text-lg font-bold text-slate-100 mt-1">{activity.planned_quantity} {activity.unit}</div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Actual Completed</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">{activity.actual_quantity} {activity.unit}</div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Planned vs Actual %</div>
            <div className="text-lg font-bold text-sky-400 mt-1">{activity.actual_percentage}% / {activity.planned_percentage}%</div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Variance</div>
            <div className={`text-lg font-bold mt-1 ${activity.variance_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {activity.variance_percentage > 0 ? `+${activity.variance_percentage}%` : `${activity.variance_percentage}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Productivity Forecast Card */}
      {forecast && (
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Productivity Forecast & Delay Analysis</span>
          </h3>

          <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
            {forecast.explanation}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Required Daily Productivity</span>
              <span className="font-bold text-slate-200 text-sm">{forecast.planned_daily_rate} {activity.unit}/day</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Actual Daily Productivity</span>
              <span className="font-bold text-emerald-400 text-sm">{forecast.actual_daily_rate} {activity.unit}/day</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Projected Completion Target</span>
              <span className="font-bold text-sky-400 text-sm">
                {new Date(forecast.projected_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dependencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-sky-400" /> Predecessors
          </h3>
          {predecessors.length === 0 ? (
            <p className="text-xs text-slate-500">No predecessor dependencies (Start task).</p>
          ) : (
            predecessors.map((p: any) => (
              <div key={p.id} className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs flex justify-between">
                <span className="font-mono text-sky-400 font-bold">{p.code}</span>
                <span className="text-slate-200 font-medium">{p.name}</span>
              </div>
            ))
          )}
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-emerald-400" /> Successors
          </h3>
          {successors.length === 0 ? (
            <p className="text-xs text-slate-500">No successor dependencies.</p>
          ) : (
            successors.map((s: any) => (
              <div key={s.id} className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs flex justify-between">
                <span className="font-mono text-emerald-400 font-bold">{s.code}</span>
                <span className="text-slate-200 font-medium">{s.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Linked Site Reports Stream */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100">Linked Site Progress Reports</h3>
        {site_reports.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No progress reports linked yet.</p>
        ) : (
          site_reports.map((r: any) => (
            <div key={r.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>{new Date(r.timestamp).toLocaleString('en-IN')}</span>
                <span className="font-bold text-sky-400">{r.quantity_completed} {r.unit}</span>
              </div>
              <p className="text-slate-200 font-medium">"{r.report_text}"</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
