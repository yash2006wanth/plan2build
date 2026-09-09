'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';
import { getProjectActivities, previewScheduleUpload, confirmScheduleUpload } from '@/lib/api';

export default function ScheduleManagementPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await getProjectActivities(1);
      setActivities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      try {
        setUploading(true);
        const res = await previewScheduleUpload(file);
        setPreviewData(res);
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to preview file');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    try {
      setConfirming(true);
      const res = await confirmScheduleUpload(1, selectedFile);
      setUploadSuccessMsg(res.message);
      setPreviewData(null);
      setSelectedFile(null);
      await fetchActivities();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to import schedule');
    } finally {
      setConfirming(false);
    }
  };

  const downloadSampleFile = (type: 'csv' | 'xlsx') => {
    window.open(`/api/schedules/sample-schedule?file_type=${type}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-semibold uppercase tracking-wider">
              Project Schedule & WBS
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Schedule Importer & Hierarchy Manager</h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload CSV/XLSX schedules, validate column mappings, and view baseline work breakdown structures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadSampleFile('xlsx')}
            className="px-3.5 py-2 glass-panel hover:bg-slate-800 text-sky-400 border border-sky-500/30 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Sample XLSX</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {uploadSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{uploadSuccessMsg}</span>
          </div>
          <button onClick={() => setUploadSuccessMsg(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Drag & Drop Wizard */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Upload className="w-4 h-4 text-sky-400" />
          <span>Upload Schedule File (CSV or XLSX)</span>
        </h3>

        <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-8 text-center bg-slate-900/40 transition-all">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
            id="schedule-file-input"
          />
          <label htmlFor="schedule-file-input" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
              <FileSpreadsheet className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <span className="text-sm text-slate-200 font-bold block">
                {selectedFile ? selectedFile.name : 'Click or Drag & Drop Schedule File'}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Supports column variations for Activity ID, Name, WBS, Dates, Quantity, Unit & Dependencies
              </span>
            </div>
          </label>
        </div>

        {uploading && (
          <div className="flex items-center justify-center gap-2 text-xs text-sky-400 font-medium py-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Validating schedule rows and column mappings...</span>
          </div>
        )}
      </div>

      {/* Upload Preview & Validation Card */}
      {previewData && (
        <div className="glass-panel p-6 rounded-2xl border border-sky-500/40 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Schedule Validation Preview</h3>
              <p className="text-xs text-slate-400">File: {previewData.filename}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Valid: {previewData.valid_count} rows
              </span>
              {previewData.invalid_count > 0 && (
                <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                  Invalid: {previewData.invalid_count} rows
                </span>
              )}
            </div>
          </div>

          {/* Invalid Rows Warning */}
          {previewData.invalid_rows && previewData.invalid_rows.length > 0 && (
            <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-2">
              <div className="text-xs font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Rows with Validation Errors (Will be Skipped):</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 list-disc pl-5">
                {previewData.invalid_rows.map((row: any, idx: number) => (
                  <li key={idx}>
                    Row {row.row_number} ({row.activity_name || 'Unnamed'}): {row.errors.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Valid Rows Preview Table */}
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-2">Row</th>
                  <th className="p-2">Activity ID</th>
                  <th className="p-2">Activity Name</th>
                  <th className="p-2">WBS</th>
                  <th className="p-2">Start Date</th>
                  <th className="p-2">End Date</th>
                  <th className="p-2">Planned Qty</th>
                  <th className="p-2">Unit</th>
                  <th className="p-2">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {previewData.valid_rows.map((row: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2 font-mono text-slate-500">{row.row_number}</td>
                    <td className="p-2 font-mono text-sky-400 font-semibold">{row.activity_id}</td>
                    <td className="p-2 font-medium text-slate-200">{row.activity_name}</td>
                    <td className="p-2 font-mono text-slate-400">{row.wbs_code}</td>
                    <td className="p-2">{row.start_date}</td>
                    <td className="p-2">{row.end_date}</td>
                    <td className="p-2 font-semibold text-slate-100">{row.planned_quantity}</td>
                    <td className="p-2">{row.unit}</td>
                    <td className="p-2 text-slate-400">{row.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setPreviewData(null)}
              className="px-4 py-2 glass-panel hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={confirming || previewData.valid_count === 0}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              {confirming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing into Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Import {previewData.valid_count} Activities</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active WBS Schedule List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Baseline Work Breakdown Structure (WBS)</h3>
            <p className="text-xs text-slate-400">Total {activities.length} schedule activities registered</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">WBS Code</th>
                <th className="px-6 py-3">Activity ID</th>
                <th className="px-6 py-3">Activity Name</th>
                <th className="px-6 py-3">Schedule Window</th>
                <th className="px-6 py-3">Target Quantity</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-900/40 transition-all">
                  <td className="px-6 py-3.5 font-mono text-sky-400 font-bold">{act.wbs_code}</td>
                  <td className="px-6 py-3.5 font-mono text-slate-400">{act.activity_id}</td>
                  <td className="px-6 py-3.5 font-semibold text-slate-100">{act.activity_name}</td>
                  <td className="px-6 py-3.5 text-slate-400">
                    {new Date(act.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to{' '}
                    {new Date(act.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-slate-200">
                    {act.planned_quantity} {act.unit}
                  </td>
                  <td className="px-6 py-3.5 text-slate-400">{act.location}</td>
                  <td className="px-6 py-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {act.status.replace('_', ' ')}
                    </span>
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
