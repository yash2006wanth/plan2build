'use client';

import React, { useState, useEffect } from 'react';
import { Users, Truck, Package, AlertTriangle, CheckCircle2, TrendingDown, Clock, Activity } from 'lucide-react';

export default function ResourcesPage() {
  const [labour, setLabour] = useState<any>(null);
  const [equipment, setEquipment] = useState<any>(null);
  const [materials, setMaterials] = useState<any>(null);

  const fetchResourceData = async () => {
    try {
      const r1 = await fetch('http://localhost:8000/api/projects/1/labour');
      const data1 = await r1.json();
      setLabour(data1);

      const r2 = await fetch('http://localhost:8000/api/projects/1/equipment');
      const data2 = await r2.json();
      setEquipment(data2);

      const r3 = await fetch('http://localhost:8000/api/projects/1/materials');
      const data3 = await r3.json();
      setMaterials(data3);
    } catch (e) {
      console.error(e);
      // Client-side fallback
      setLabour({
        total_workers: 45,
        total_labour_hours: 360,
        avg_actual_productivity: 0.38,
        planned_productivity: 0.50,
        productivity_variance_pct: -24.0,
        trades: [
          { trade: "Rebar & Reinforcement Crew", workers: 18, actual_prod: 0.42, planned_prod: 0.50, unit: "tons/hr" },
          { trade: "Concrete Pouring Team", workers: 15, actual_prod: 0.35, planned_prod: 0.45, unit: "m3/hr" },
          { trade: "Excavation Machine Operators", workers: 12, actual_prod: 0.55, planned_prod: 0.55, unit: "m3/hr" }
        ]
      });
      setEquipment({
        overall_utilization_pct: 68.5,
        total_fleet_count: 6,
        operational_count: 5,
        maintenance_count: 1,
        equipment_list: [
          { id: 1, equipment_name: "CAT 320 Excavator #01", category: "Earthmoving", available_hours: 10, operating_hours: 7.5, idle_hours: 2.5, utilization_pct: 75.0, status: "OPERATIONAL" },
          { id: 2, equipment_name: "CAT 320 Excavator #02", category: "Earthmoving", available_hours: 10, operating_hours: 6.5, idle_hours: 3.5, utilization_pct: 65.0, status: "OPERATIONAL" },
          { id: 3, equipment_name: "Hydraulic Tower Crane TC-01", category: "Lifting", available_hours: 10, operating_hours: 8.0, idle_hours: 2.0, utilization_pct: 80.0, status: "OPERATIONAL" },
          { id: 4, equipment_name: "Transit Concrete Mixer TM-04", category: "Concreting", available_hours: 10, operating_hours: 5.5, idle_hours: 4.5, utilization_pct: 55.0, status: "OPERATIONAL" },
          { id: 5, equipment_name: "Piling Rig PR-03", category: "Foundation", available_hours: 10, operating_hours: 0.0, idle_hours: 10.0, utilization_pct: 0.0, status: "MAINTENANCE" }
        ]
      });
      setMaterials({
        overconsumption_alerts: 1,
        materials_list: [
          { id: 1, material_name: "Ready-Mix Concrete M35/M40", unit: "m3", planned_quantity: 1250, consumed_quantity: 1380, variance_pct: 10.4, risk_level: "OVERCONSUMPTION_RISK", notes: "Concrete volume 10.4% above planned estimate due to site over-excavation." },
          { id: 2, material_name: "TMT High-Yield Rebar Steel Fe550D", unit: "tons", planned_quantity: 90, consumed_quantity: 88.5, variance_pct: -1.7, risk_level: "NORMAL", notes: "Consumption matching design rebar schedule." }
        ]
      });
    }
  };

  useEffect(() => {
    fetchResourceData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-6 h-6 text-sky-400" />
          <span>Resource & Execution Productivity Intelligence</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Labour Productivity Variance, Heavy Machinery Fleet Utilization, and Material Consumption Risk
        </p>
      </div>

      {/* Section 1: Labour Productivity */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <span>Labour Productivity & Work Force Utilization</span>
          </h2>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-xl border font-mono ${labour?.productivity_variance_pct < -10 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
            {labour?.productivity_variance_pct}% Productivity Variance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Active Workforce</div>
            <div className="text-2xl font-black text-slate-100 mt-1">{labour?.total_workers || 45} Workers</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{labour?.total_labour_hours || 360} Man-Hours Spent Today</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Actual Productivity</div>
            <div className="text-2xl font-black text-amber-400 mt-1 font-mono">{labour?.avg_actual_productivity || 0.38}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Units / Man-Hour</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Baseline</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{labour?.planned_productivity || 0.50}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Units / Man-Hour Target</div>
          </div>
        </div>

        {/* Trade breakdown */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-300">Trade Crew Productivity Breakdown</div>
          <div className="space-y-2">
            {labour?.trades?.map((t: any, i: number) => (
              <div key={i} className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-200">{t.trade}</div>
                  <div className="text-[10px] text-slate-400">{t.workers} Active Workers</div>
                </div>
                <div className="flex items-center gap-6 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Actual</span>
                    <span className="font-bold text-amber-400">{t.actual_prod} {t.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Target</span>
                    <span className="font-bold text-slate-400">{t.planned_prod} {t.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Equipment Utilization */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>Heavy Equipment Utilization Fleet</span>
          </h2>
          <span className="text-xs font-mono font-bold text-emerald-400">
            Overall Utilization: {equipment?.overall_utilization_pct}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Equipment Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Avail Hours</th>
                <th className="py-3 px-3">Operating Hours</th>
                <th className="py-3 px-3">Idle Hours</th>
                <th className="py-3 px-3">Utilization %</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {equipment?.equipment_list?.map((eq: any) => (
                <tr key={eq.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-200">{eq.equipment_name}</td>
                  <td className="py-3 px-3 text-slate-400">{eq.category}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{eq.available_hours}h</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">{eq.operating_hours}h</td>
                  <td className="py-3 px-3 font-mono text-amber-400">{eq.idle_hours}h</td>
                  <td className="py-3 px-3 font-mono font-bold">{eq.utilization_pct}%</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${eq.status === 'OPERATIONAL' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {eq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Material Intelligence */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4 shadow-lg">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-400" />
          <span>Material Consumption & Overconsumption Alerts</span>
        </h2>

        <div className="space-y-3">
          {materials?.materials_list?.map((m: any) => (
            <div key={m.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-xs">{m.material_name}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${m.risk_level === 'OVERCONSUMPTION_RISK' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                  {m.risk_level} (+{m.variance_pct}%)
                </span>
              </div>
              <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
                <span>Planned: {m.planned_quantity} {m.unit}</span>
                <span className="font-bold text-slate-200">Consumed: {m.consumed_quantity} {m.unit}</span>
              </div>
              {m.notes && <p className="text-[11px] text-amber-400/90 leading-tight font-medium">{m.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
