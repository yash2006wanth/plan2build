'use client';

import React, { useState } from 'react';
import { Plus, X, Upload, CheckCircle2, FileText, FolderPlus, Building2 } from 'lucide-react';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddProjectModal({ isOpen, onClose, onSuccess }: AddProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    project_id: '',
    client_org: '',
    location: '',
    start_date: new Date().toISOString().split('T')[0],
    planned_end_date: new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0],
    description: '',
  });

  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Create Project
      const res = await fetch('/api/v1/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: `${formData.description} (Client: ${formData.client_org}, ID: ${formData.project_id})`,
          location: formData.location,
          start_date: formData.start_date,
          planned_end_date: formData.planned_end_date,
          status: 'ACTIVE',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create project record.');
      }

      const createdProject = await res.json();

      // 2. Upload Schedule if file selected
      if (scheduleFile && createdProject.id) {
        const fileData = new FormData();
        fileData.append('file', scheduleFile);

        await fetch(`/api/v1/schedules/upload?project_id=${createdProject.id}`, {
          method: 'POST',
          body: fileData,
        });
      }

      setSuccessMsg(`Project '${formData.name}' created successfully!`);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1200);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl">
              <FolderPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100">ADD NEW PROJECT</h2>
              <p className="text-[11px] text-slate-400">Initialize Infrastructure Project & Upload Schedule WBS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-700 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Project Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Smart City Flyover Package B"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Project ID / Code</label>
              <input
                type="text"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                placeholder="e.g. PRJ-2026-08"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Client / Organization</label>
              <input
                type="text"
                value={formData.client_org}
                onChange={(e) => setFormData({ ...formData, client_org: e.target.value })}
                placeholder="e.g. Smart City Infrastructure Ltd"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Project Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Zone 4, Outer Ring Road"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Planned End Date *</label>
              <input
                type="date"
                required
                value={formData.planned_end_date}
                onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Project Scope / Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Elevated corridor, pier foundations, prestressed girders..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Schedule File Upload */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-300 flex items-center justify-between">
              <span>Import Project Schedule (Excel / CSV)</span>
              <span className="text-[10px] text-cyan-400 font-normal">Connects to Schedule Parser</span>
            </label>
            
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-3 text-center bg-slate-950/60 transition-all">
              <input
                type="file"
                id="modal_schedule_file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setScheduleFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="modal_schedule_file" className="cursor-pointer flex flex-col items-center gap-1">
                <Upload size={20} className="text-cyan-400" />
                <span className="text-slate-300 font-semibold">
                  {scheduleFile ? scheduleFile.name : 'Click to select schedule (.xlsx or .csv)'}
                </span>
                <span className="text-[10px] text-slate-500">Auto-parses WBS, dates, quantities & dependencies</span>
              </label>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-950/50"
            >
              {loading ? 'Creating Project & Parsing WBS...' : 'Save & Initialize Project'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
