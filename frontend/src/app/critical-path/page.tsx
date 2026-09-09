'use client';

import React, { useState, useEffect } from 'react';
import { GitCommit, AlertTriangle, ArrowRight, Clock, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';

export default function CriticalPathPage() {
  const [cpData, setCpData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [delayInputDays, setDelayInputDays] = useState(4);
  const [impactResult, setImpactResult] = useState<any>(null);

  const fetchCpData = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/projects/1/critical-path');
      const data = await res.json();
      setCpData(data);
      if (data.nodes && data.nodes.length > 0) {
        setSelectedActivity(data.nodes[1] || data.nodes[0]);
      }
    } catch (e) {
      console.error(e);
      // Fallback demo data
      setCpData({
        project_duration_days: 122,
        critical_activities_count: 4,
        near_critical_activities_count: 2,
        critical_chain_names: [
          "Foundation Excavation – Pier P01 to P04",
          "Raft Foundation Concrete Pouring – Zone A",
          "Column Rebar & Reinforcement",
          "Pier Column Concrete Construction"
        ],
        nodes: [
          { id: 1, activity_id: "WBS-01.01", activity_name: "Site Preparation & Utility Shifting", duration_days: 10, early_start: "2026-08-01", early_finish: "2026-08-10", total_float: 0, is_critical: true, status: "COMPLETED" },
          { id: 2, activity_id: "WBS-01.02", activity_name: "Foundation Excavation – Pier P01 to P04", duration_days: 16, early_start: "2026-08-05", early_finish: "2026-08-20", total_float: 0, is_critical: true, status: "DELAYED" },
          { id: 3, activity_id: "WBS-01.03", activity_name: "Raft Foundation Concrete Pouring – Zone A", duration_days: 14, early_start: "2026-08-15", early_finish: "2026-08-28", total_float: 0, is_critical: true, status: "AT_RISK" },
          { id: 4, activity_id: "WBS-02.01", activity_name: "Column Rebar & Reinforcement", duration_days: 18, early_start: "2026-08-22", early_finish: "2026-09-08", total_float: 0, is_critical: true, status: "IN_PROGRESS" },
          { id: 5, activity_id: "WBS-02.02", activity_name: "Pier Column Concrete Construction", duration_days: 19, early_start: "2026-08-28", early_finish: "2026-09-15", total_float: 1, is_critical: true, status: "IN_PROGRESS" },
          { id: 7, activity_id: "WBS-03.01", activity_name: "Pre-cast Girder Casting & Curing", duration_days: 47, early_start: "2026-08-10", early_finish: "2026-09-25", total_float: 8, is_critical: false, status: "IN_PROGRESS" }
        ]
      });
      setSelectedActivity({ id: 2, activity_id: "WBS-01.02", activity_name: "Foundation Excavation – Pier P01 to P04", total_float: 0, is_critical: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCpData();
  }, []);

  const runDownstreamImpact = async () => {
    if (!selectedActivity) return;
    try {
      const res = await fetch(`http://localhost:8000/api/activities/${selectedActivity.id}/downstream-impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: selectedActivity.id, delay_days: delayInputDays })
      });
      const data = await res.json();
      setImpactResult(data);
    } catch (e) {
      setImpactResult({
        activity_name: selectedActivity.activity_name,
        delay_days: delayInputDays,
        total_float: selectedActivity.total_float || 0,
        is_critical: selectedActivity.is_critical || false,
        threatens_completion: selectedActivity.is_critical || (delayInputDays > (selectedActivity.total_float || 0)),
        project_delay_impact_days: Math.max(0, delayInputDays - (selectedActivity.total_float || 0)),
        assessment: selectedActivity.is_critical 
          ? `Activity is on Critical Path with 0 float. Delaying by ${delayInputDays} days directly threatens final completion date by ${delayInputDays} days.`
          : `Activity has float of ${selectedActivity.total_float} days. A ${delayInputDays}-day delay is absorbed by slack without delaying final completion.`
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <GitCommit className="w-6 h-6 text-rose-400" />
            <span>Critical Path Intelligence & Network Analysis</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Float Chain Identification, Total Slack/Float Tracking, and Downstream Propagation Simulator
          </p>
        </div>
        <span className="px-3 py-1 bg-rose-500/15 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/30 flex items-center gap-1.5 shadow-md">
          <ShieldAlert className="w-4 h-4" />
          {cpData?.critical_activities_count || 4} Critical Path Activities
        </span>
      </div>

      {/* Critical Chain Flow Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-3">
        <h2 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Zero-Float Dependency Chain (Critical Path)</span>
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {cpData?.critical_chain_names?.map((name: string, idx: number) => (
            <React.Fragment key={idx}>
              <div className="px-3.5 py-2 bg-slate-900 border border-rose-500/30 rounded-xl text-xs font-semibold text-slate-200 shrink-0 flex items-center gap-2 shadow-md">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span>{name}</span>
              </div>
              {idx < cpData.critical_chain_names.length - 1 && (
                <ArrowRight className="w-4 h-4 text-rose-400 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Downstream Impact Calculator Tool */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span>Interactive Downstream Delay Impact Calculator</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Select Activity</label>
            <select
              value={selectedActivity?.id || ''}
              onChange={(e) => {
                const act = cpData?.nodes?.find((n: any) => n.id === parseInt(e.target.value));
                setSelectedActivity(act);
              }}
              className="w-full glass-input px-3 py-2 rounded-lg text-xs"
            >
              {cpData?.nodes?.map((n: any) => (
                <option key={n.id} value={n.id}>
                  {n.activity_id} – {n.activity_name} ({n.is_critical ? 'Critical' : `Float: ${n.total_float}d`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Simulated Delay (Days)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={delayInputDays}
              onChange={(e) => setDelayInputDays(parseInt(e.target.value) || 1)}
              className="w-full glass-input px-3 py-2 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runDownstreamImpact}
              className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-lg shadow-sky-500/20"
            >
              Calculate Downstream Impact
            </button>
          </div>
        </div>

        {/* Impact Assessment Result Display */}
        {impactResult && (
          <div className={`p-4 rounded-xl border ${impactResult.threatens_completion ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {impactResult.threatens_completion ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                <span className="font-bold text-xs text-slate-100 uppercase">
                  {impactResult.threatens_completion ? 'CRITICAL DELAY THREAT DETECTED' : 'SLACK / FLOAT ABSORBS DELAY'}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-200">
                Net Project Impact: +{impactResult.project_delay_impact_days} Days
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed font-medium">
              {impactResult.assessment}
            </p>
          </div>
        )}
      </div>

      {/* Activity Float & Slack Schedule Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-200">Full Schedule Activity Float Analysis</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">WBS Code</th>
                <th className="py-3 px-3">Activity Name</th>
                <th className="py-3 px-3">Early Start</th>
                <th className="py-3 px-3">Early Finish</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Total Float (Slack)</th>
                <th className="py-3 px-3">Network Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {cpData?.nodes?.map((n: any) => (
                <tr key={n.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-sky-400">{n.activity_id}</td>
                  <td className="py-3 px-3 font-medium text-slate-200">{n.activity_name}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{n.early_start}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{n.early_finish}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{n.duration_days} days</td>
                  <td className="py-3 px-3 font-mono font-bold">
                    <span className={n.total_float <= 1 ? 'text-rose-400' : 'text-emerald-400'}>
                      {n.total_float} days
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {n.is_critical ? (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded">
                        CRITICAL PATH
                      </span>
                    ) : n.total_float <= 4 ? (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded">
                        NEAR CRITICAL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-semibold rounded">
                        NORMAL FLOAT
                      </span>
                    )}
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
