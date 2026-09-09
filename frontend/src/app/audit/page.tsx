'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/audit-logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error(e);
      // Fallback audit logs
      setLogs([
        {
          id: 1,
          event_type: "ACTIVITY_MATCH",
          user_name: "Vikram Patel",
          description: "AI Matched Site Report #104 to 'Foundation Reinforcement – Block B' with 92% confidence.",
          confidence_score: 92.0,
          confidence_level: "High",
          timestamp: "2026-09-07T10:15:00"
        },
        {
          id: 2,
          event_type: "VOICE_ACTION",
          user_name: "Rajesh Sharma",
          description: "Voice action executed: Generated Daily Progress Report (DPR) after modal confirmation.",
          confidence_score: 95.0,
          confidence_level: "High",
          timestamp: "2026-09-07T09:30:00"
        },
        {
          id: 3,
          event_type: "PROGRESS_UPDATE",
          user_name: "Rajesh Sharma",
          description: "Manual override: Updated Foundation Excavation progress percentage from 50% to 54.2%.",
          confidence_score: 100.0,
          confidence_level: "High",
          timestamp: "2026-09-06T16:45:00"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-sky-400" />
          <span>Auditability & AI Decision Traceability Engine</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable Trace Log for Activity Matching, Progress Updates, Voice Actions & Confidence Scores
        </p>
      </div>

      {/* Audit Logs Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">System Audit Trail</span>
          <span className="text-xs text-slate-400 font-mono">{logs.length} Trace Events Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Event Type</th>
                <th className="py-3 px-3">User / Actor</th>
                <th className="py-3 px-3">Trace Description</th>
                <th className="py-3 px-3">Confidence Rating</th>
                <th className="py-3 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-sky-400">{l.event_type}</td>
                  <td className="py-3 px-3 font-medium text-slate-200">{l.user_name}</td>
                  <td className="py-3 px-3 text-slate-300 font-sans leading-relaxed">{l.description}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${l.confidence_level === 'High' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {l.confidence_level} ({l.confidence_score}%)
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">{new Date(l.timestamp).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
