'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  HardHat,
  Sparkles,
  CheckCircle2,
  MapPin,
  Clock,
  User,
  Image as ImageIcon,
  Wrench,
  Package,
  Users,
  RefreshCw,
  Plus
} from 'lucide-react';
import { getSiteReports, approveActivityMatch } from '@/lib/api';

export default function SiteReportsLogPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await getSiteReports(1);
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleApprove = async (reportId: number, activityId: number) => {
    try {
      setApprovingId(reportId);
      await approveActivityMatch(reportId, activityId);
      await fetchReports();
    } catch (err) {
      console.error(err);
      alert('Failed to approve match');
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold uppercase tracking-wider">
              Field Data Capture Log
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Site Engineer Reports Stream</h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit real-time field submissions, OpenCV evidence photos, geotags, and AI activity-schedule matches.
          </p>
        </div>

        <Link
          href="/site-reports/new"
          className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Field Submission</span>
        </Link>
      </div>

      {/* Site Reports List */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 text-sm font-semibold">No field updates submitted yet.</p>
          </div>
        ) : (
          reports.map((report) => {
            const topMatch = report.matches && report.matches.length > 0 ? report.matches[0] : null;
            const approvedMatch = report.matches?.find((m: any) => m.approved) || topMatch;

            return (
              <div key={report.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg text-sky-400 font-mono text-xs font-bold">
                      SR-{report.id}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <span>{report.submitter_name}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(report.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Badge */}
                  <div className="px-3 py-1 rounded-xl bg-sky-500/10 text-sky-300 border border-sky-500/30 text-xs font-bold">
                    Completed: {report.quantity_completed} {report.unit}
                  </div>
                </div>

                {/* Report Text & Details */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-100 font-medium leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
                    "{report.report_text}"
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    {report.latitude && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
                      </span>
                    )}
                    {report.labour_count > 0 && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        <span>{report.labour_count} Labourers</span>
                      </span>
                    )}
                    {report.equipment_details && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        <span>{report.equipment_details}</span>
                      </span>
                    )}
                    {report.material_consumption && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Package className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{report.material_consumption}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Evidence Photos */}
                {report.photos && report.photos.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Photo Evidence (OpenCV Validated)
                    </div>
                    <div className="flex items-center gap-3 overflow-x-auto pb-1">
                      {report.photos.map((photo: any) => (
                        <div key={photo.id} className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group shrink-0">
                          <img src={photo.file_path} alt="Evidence" className="w-32 h-24 object-cover" />
                          {photo.cv_metadata && (
                            <div className="absolute inset-0 bg-slate-950/80 p-2 opacity-0 group-hover:opacity-100 transition-all text-[9px] text-slate-200 flex flex-col justify-between">
                              <div>
                                <span className="font-bold text-emerald-400 block">AI Evidence Validated</span>
                                <span>Quality: Brightness {photo.cv_metadata.quality?.brightness || 128}</span>
                              </div>
                              <div className="text-sky-300 font-mono">Conf: {Math.round((photo.cv_metadata.ai_confidence_score || 0.9) * 100)}%</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Activity Match Linkage Box */}
                {approvedMatch && (
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Linked Schedule Activity</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            {approvedMatch.confidence}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-100 mt-0.5">
                          <span className="font-mono text-sky-400">{approvedMatch.activity_code}</span> – {approvedMatch.activity_name}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{approvedMatch.matching_reason}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-sky-400">
                        {Math.round(approvedMatch.final_score * 100)}% Score
                      </div>
                      {!approvedMatch.approved && (
                        <button
                          onClick={() => handleApprove(report.id, approvedMatch.activity_id)}
                          disabled={approvingId === report.id}
                          className="mt-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-semibold rounded-lg shadow"
                        >
                          Confirm Link
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
