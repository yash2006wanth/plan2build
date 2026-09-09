'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2, PieChart, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function CostPage() {
  const [evmData, setEvmData] = useState<any>(null);
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCostData = async () => {
    try {
      const resEvm = await fetch('http://localhost:8000/api/projects/1/evm');
      const dataEvm = await resEvm.json();
      setEvmData(dataEvm);

      const resBoq = await fetch('http://localhost:8000/api/projects/1/boq');
      const dataBoq = await resBoq.json();
      setBoqItems(dataBoq);
    } catch (e) {
      console.error(e);
      // Fallback demo data
      setEvmData({
        project_name: "Smart City Flyover – Package A",
        currency: "INR (₹ Cr)",
        bac: 74450000,
        pv: 48390000,
        ev: 45780000,
        ac: 44860000,
        cpi: 1.02,
        spi: 0.95,
        cost_variance: 920000,
        schedule_variance: -2610000,
        eac: 72990000,
        vac: 1460000,
        budget_utilization_pct: 60.2,
        status: "HEALTHY"
      });
      setBoqItems([
        { id: 1, item_code: "BOQ-01.01", description: "Site Prep & Utility Diversion", unit: "meters", planned_quantity: 500, actual_quantity: 500, unit_rate: 8000, budgeted_cost: 4000000, actual_cost: 3850000, progress_pct: 100 },
        { id: 2, item_code: "BOQ-01.02", description: "Foundation Excavation in Hard Rock", unit: "m3", planned_quantity: 1200, actual_quantity: 650, unit_rate: 1500, budgeted_cost: 1800000, actual_cost: 1200000, progress_pct: 54.2 },
        { id: 3, item_code: "BOQ-01.03", description: "M35 Mass Concrete Raft Foundation", unit: "m3", planned_quantity: 850, actual_quantity: 460, unit_rate: 6500, budgeted_cost: 5525000, actual_cost: 3050000, progress_pct: 54.1 },
        { id: 4, item_code: "BOQ-02.01", description: "Fe550D TMT Reinforcement Rebar Cage", unit: "tons", planned_quantity: 90, actual_quantity: 38, unit_rate: 72000, budgeted_cost: 6480000, actual_cost: 2750000, progress_pct: 42.2 },
        { id: 5, item_code: "BOQ-02.02", description: "M40 Self-Compacting Pier Column Concrete", unit: "m3", planned_quantity: 400, actual_quantity: 160, unit_rate: 7500, budgeted_cost: 3000000, actual_cost: 1220000, progress_pct: 40.0 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostData();
  }, []);

  const chartData = [
    { month: 'Aug 01', PV: 5, EV: 4.8, AC: 4.5 },
    { month: 'Aug 10', PV: 15, EV: 14.2, AC: 13.8 },
    { month: 'Aug 20', PV: 28, EV: 26.5, AC: 25.9 },
    { month: 'Aug 30', PV: 38, EV: 35.8, AC: 34.9 },
    { month: 'Sep 07', PV: 48.39, EV: 45.78, AC: 44.86 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Cost Intelligence & Earned Value Management (EVM)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Planned Value (PV), Earned Value (EV), Actual Cost (AC), CPI & SPI Financial Metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
            <CheckCircle2 className="w-4 h-4" />
            CPI {evmData?.cpi || 1.02} • Cost Efficient
          </span>
        </div>
      </div>

      {/* EVM KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget at Completion (BAC)</div>
          <div className="text-2xl font-black text-slate-100 mt-1 font-mono">
            ₹{(evmData?.bac / 10000000 || 7.45).toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Total BOQ Approved Budget</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Planned Value (PV)</div>
          <div className="text-2xl font-black text-sky-400 mt-1 font-mono">
            ₹{(evmData?.pv / 10000000 || 4.84).toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-sky-500/80 mt-1">Scheduled Budgeted Cost</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Earned Value (EV)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            ₹{(evmData?.ev / 10000000 || 4.58).toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-1">Physical Work Delivered</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actual Cost (AC)</div>
          <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
            ₹{(evmData?.ac / 10000000 || 4.49).toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-amber-500/80 mt-1">Total Actual Funds Spent</div>
        </div>
      </div>

      {/* Secondary EVM Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cost Performance (CPI)</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">{evmData?.cpi || 1.02}</div>
            <div className="text-[10px] text-slate-400">EV / AC (Under Budget)</div>
          </div>
          <ArrowUpRight className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Schedule Performance (SPI)</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5 font-mono">{evmData?.spi || 0.95}</div>
            <div className="text-[10px] text-slate-400">EV / PV (Behind Schedule)</div>
          </div>
          <ArrowDownRight className="w-6 h-6 text-amber-400" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimate at Completion (EAC)</div>
            <div className="text-xl font-bold text-slate-100 mt-0.5 font-mono">₹{(evmData?.eac / 10000000 || 7.30).toFixed(2)} Cr</div>
            <div className="text-[10px] text-slate-400">Projected Final Cost</div>
          </div>
          <TrendingUp className="w-6 h-6 text-sky-400" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Variance at Completion (VAC)</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">+₹{(evmData?.vac / 10000000 || 0.15).toFixed(2)} Cr</div>
            <div className="text-[10px] text-slate-400">Budget Surplus Savings</div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      {/* EVM Cumulative Trend Chart */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-sky-400" />
          <span>S-Curve EVM Financial Trend (Planned vs Earned vs Actual Cost in ₹ Cr)</span>
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="PV" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.1} name="Planned Value (PV)" />
              <Area type="monotone" dataKey="EV" stroke="#34d399" fill="#34d399" fillOpacity={0.2} name="Earned Value (EV)" />
              <Area type="monotone" dataKey="AC" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} name="Actual Cost (AC)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOQ Items Breakdown Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Bill of Quantities (BOQ) Cost Tracking</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">{boqItems.length} BOQ Items Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">BOQ Code</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3">Unit Rate</th>
                <th className="py-3 px-3">Planned Qty</th>
                <th className="py-3 px-3">Actual Qty</th>
                <th className="py-3 px-3">Budgeted Cost</th>
                <th className="py-3 px-3">Actual Spent</th>
                <th className="py-3 px-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {boqItems.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-sky-400">{b.item_code}</td>
                  <td className="py-3 px-3 font-medium text-slate-200">{b.description}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">₹{b.unit_rate?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{b.planned_quantity} {b.unit}</td>
                  <td className="py-3 px-3 font-mono text-slate-200 font-bold">{b.actual_quantity} {b.unit}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">₹{(b.budgeted_cost / 100000).toFixed(2)} L</td>
                  <td className="py-3 px-3 font-mono text-emerald-400 font-bold">₹{(b.actual_cost / 100000).toFixed(2)} L</td>
                  <td className="py-3 px-3 w-32">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(100, b.progress_pct || 0)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-300 font-bold">{b.progress_pct}%</span>
                    </div>
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
