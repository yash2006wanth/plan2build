'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Printer, Calendar, CheckCircle2, AlertTriangle, Users, Truck, Package } from 'lucide-react';

export default function DPRPage() {
  const [dpr, setDpr] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDpr = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/dpr/1');
      const data = await res.json();
      setDpr(data);
    } catch (e) {
      console.error(e);
      // Fallback DPR demo data
      setDpr({
        report_id: "DPR-1-20260907",
        project_name: "Smart City Flyover – Package A",
        date: "September 07, 2026",
        location: "Bengaluru Outer Ring Road, Zone 4",
        weather: "Clear / Sunny (31°C)",
        progress_metrics: {
          overall_actual_pct: 61.5,
          overall_planned_pct: 65.0,
          schedule_variance_pct: -3.5,
          cpi: 1.02,
          spi: 0.95,
          earned_value_cr: 15.38,
          actual_cost_cr: 15.08,
          estimated_completion: 25.0
        },
        critical_path_status: {
          critical_activities_count: 4,
          critical_chain: ["Foundation Excavation", "Raft Foundation Concrete", "Column Rebar Assembly"]
        },
        site_reports: [
          { text: "M35 mass concrete pour completed for Pier P01 raft footing foundation.", quantity: 460, unit: "m3", submitted_at: "16:30", remarks: "Temperature monitored continuous pour." },
          { text: "Column rebar cage assembly completed for Pier P01 and P02.", quantity: 38, unit: "tons", submitted_at: "14:15", remarks: "Rebar delivery delayed 3 days." }
        ],
        delayed_activities: [
          { activity_code: "WBS-01.02", activity_name: "Foundation Excavation – Pier P01 to P04", wbs_code: "1.2", status: "DELAYED", location: "Zone A – Pier P01-P04" },
          { activity_code: "WBS-02.01", activity_name: "Column Rebar & Reinforcement", wbs_code: "2.1", status: "AT_RISK", location: "Piers P01-P06" }
        ],
        labour_summary: { total_manpower: 45, total_hours: 360, productivity_variance: "-24% below target" },
        equipment_summary: { fleet_count: 6, utilization_pct: 68.5, operational_count: 5 },
        material_summary: { concrete_consumed_m3: 1380, rebar_consumed_tons: 88.5, overconsumption_risk: "Concrete volume 10.4% above planned estimate" },
        recommended_actions: [
          "1. Deploy +8 additional rebar masons to Pier P01-P04 to clear 4-day critical path delay.",
          "2. Inspect concrete overconsumption in Zone A foundation pour with site engineer.",
          "3. Fast-track utility shifting clearance for Telecom cables at Pier 08."
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDpr();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-400" />
            <span>Automated Daily Progress Report (DPR)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated Site Execution Data, Progress Variances, Resources & Recommended Actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="glass-panel bg-slate-900/90 border border-slate-800/80 rounded-2xl p-8 space-y-6 shadow-2xl print:bg-white print:text-black print:p-0">
        {/* Report Banner */}
        <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">{dpr?.report_id || 'DPR-01'}</div>
            <h2 className="text-2xl font-black text-slate-100 mt-1">{dpr?.project_name}</h2>
            <p className="text-xs text-slate-400 mt-1">{dpr?.location} • Weather: {dpr?.weather}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-400">Date of Report</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5 flex items-center gap-1.5 justify-end">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>{dpr?.date}</span>
            </div>
          </div>
        </div>

        {/* Executive Progress Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Actual Physical Progress</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{dpr?.progress_metrics?.overall_actual_pct}%</div>
            <div className="text-[10px] text-slate-500">Planned: {dpr?.progress_metrics?.overall_planned_pct}%</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Schedule Performance</div>
            <div className="text-xl font-black text-amber-400 mt-1">SPI {dpr?.progress_metrics?.spi}</div>
            <div className="text-[10px] text-slate-500">Variance: {dpr?.progress_metrics?.schedule_variance_pct}%</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Cost Performance</div>
            <div className="text-xl font-black text-emerald-400 mt-1">CPI {dpr?.progress_metrics?.cpi}</div>
            <div className="text-[10px] text-slate-500">Cost Efficient</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Earned Value (EV)</div>
            <div className="text-xl font-black text-sky-400 mt-1">₹{dpr?.progress_metrics?.earned_value_cr} Cr</div>
            <div className="text-[10px] text-slate-500">Actual Spent: ₹{dpr?.progress_metrics?.actual_cost_cr} Cr</div>
          </div>
        </div>

        {/* Today's Completed Site Reports */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Today's Verified Site Executions</span>
          </h3>
          <div className="space-y-2">
            {dpr?.site_reports?.map((sr: any, idx: number) => (
              <div key={idx} className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">{sr.text}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Submitted at {sr.submitted_at} • Remarks: {sr.remarks}</div>
                </div>
                <span className="font-mono font-bold text-emerald-400">{sr.quantity} {sr.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Delayed Activities & Critical Path */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Delayed Activities & Critical Path Bottlenecks</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dpr?.delayed_activities?.map((da: any, idx: number) => (
              <div key={idx} className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs space-y-1">
                <div className="font-bold text-rose-300">{da.activity_name} ({da.activity_code})</div>
                <div className="text-[10px] text-slate-400">Location: {da.location} • Status: {da.status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Summaries */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Manpower</span>
            </div>
            <div className="text-sm font-bold text-slate-200">{dpr?.labour_summary?.total_manpower} Workers</div>
            <div className="text-[10px] text-amber-400">{dpr?.labour_summary?.productivity_variance}</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Equipment Fleet</span>
            </div>
            <div className="text-sm font-bold text-slate-200">{dpr?.equipment_summary?.fleet_count} Machinery Units</div>
            <div className="text-[10px] text-emerald-400">{dpr?.equipment_summary?.utilization_pct}% Utilization</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Materials</span>
            </div>
            <div className="text-sm font-bold text-slate-200">{dpr?.material_summary?.concrete_consumed_m3} m³ RMC</div>
            <div className="text-[10px] text-amber-400">{dpr?.material_summary?.overconsumption_risk}</div>
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-2">
          <div className="text-xs font-bold text-sky-300 uppercase">Recommended PM Action Directives</div>
          <ul className="space-y-1.5 text-xs text-slate-200 font-medium">
            {dpr?.recommended_actions?.map((act: string, idx: number) => (
              <li key={idx}>{act}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
