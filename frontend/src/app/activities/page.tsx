'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Search, Clock, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { getProjectActivities } from '@/lib/api';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getProjectActivities(1);
        setActivities(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = activities.filter((a) =>
    a.activity_name.toLowerCase().includes(search.toLowerCase()) ||
    a.activity_id.toLowerCase().includes(search.toLowerCase()) ||
    a.wbs_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Schedule Activities Directory</h2>
          <p className="text-xs text-slate-400 mt-1">Detailed productivity tracking, WBS linkage, and delay forecasting</p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, Name or WBS..."
            className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      {/* Grid of Activities */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((act) => {
            let statusBadge = 'bg-slate-800 text-slate-400 border-slate-700';
            if (act.status === 'ON_TRACK') statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            if (act.status === 'COMPLETED') statusBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            if (act.status === 'AT_RISK') statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            if (act.status === 'DELAYED') statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

            return (
              <Link
                key={act.id}
                href={`/activities/${act.id}`}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-sky-400 text-xs font-bold">{act.activity_id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge}`}>
                      {act.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-1">
                    {act.activity_name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">WBS {act.wbs_code} • {act.location}</p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Planned vs Actual</span>
                      <span className="font-semibold text-slate-200">{act.actual_percentage}% / {act.planned_percentage}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-sky-500 h-full opacity-40" style={{ width: `${Math.min(100, act.planned_percentage)}%` }}></div>
                      <div className="-ml-full bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, act.actual_percentage)}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Target: {act.planned_quantity} {act.unit}</span>
                  <span className="text-sky-400 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Details <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
