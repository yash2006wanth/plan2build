'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, BellRing, CheckCircle2, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { getProjectAlerts, markAlertAsRead } from '@/lib/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'RED' | 'YELLOW' | 'BLUE'>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await getProjectAlerts(1);
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkRead = async (alertId: number) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filter === 'ALL' ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <span>Project Risk & Exception Alerts Feed</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated notifications for schedule variance overruns, productivity deficits, and missing updates.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
          {(['ALL', 'RED', 'YELLOW', 'BLUE'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === sev
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Stream */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-300 text-sm font-semibold">No alerts found for selected severity.</p>
            </div>
          ) : (
            filtered.map((alert) => {
              let bg = 'bg-slate-900/60 border-slate-800';
              let badge = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
              if (alert.severity === 'RED') {
                bg = 'bg-rose-950/20 border-rose-900/40';
                badge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
              } else if (alert.severity === 'YELLOW') {
                bg = 'bg-amber-950/20 border-amber-900/40';
                badge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
              }

              return (
                <div
                  key={alert.id}
                  className={`glass-panel p-5 rounded-2xl border ${bg} transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    alert.is_read ? 'opacity-60' : ''
                  }`}
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${badge}`}>
                        {alert.severity} • {alert.alert_type}
                      </span>
                      {alert.activity_name && (
                        <span className="text-xs text-slate-400 font-mono font-medium">• {alert.activity_name}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-100">{alert.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                    {alert.recommended_action && (
                      <div className="text-xs text-sky-400 font-medium pt-1">
                        Recommended Action: <span className="text-slate-300">{alert.recommended_action}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {!alert.is_read ? (
                      <button
                        onClick={() => handleMarkRead(alert.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
                      >
                        Mark as Read
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Read</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
