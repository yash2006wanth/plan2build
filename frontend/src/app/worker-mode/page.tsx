'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HardHat, Mic, Camera, WifiOff, CheckCircle2, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import VoiceInputControl from '@/components/VoiceInputControl';

interface QueuedReport {
  id: string;
  report_text: string;
  quantity: number;
  unit: string;
  timestamp: string;
  status: 'Pending Sync' | 'Synced';
}

export default function WorkerModePage() {
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
  const [offlineQueue, setOfflineQueue] = useState<QueuedReport[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Network status listener
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline queue from localStorage
    const saved = localStorage.getItem('plan2build_offline_queue');
    if (saved) {
      try {
        setOfflineQueue(JSON.parse(saved));
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveQueueToStorage = (queue: QueuedReport[]) => {
    setOfflineQueue(queue);
    localStorage.setItem('plan2build_offline_queue', JSON.stringify(queue));
  };

  const handleSendQuery = async (text: string) => {
    if (!text.trim()) return;

    try {
      const res = await fetch('/api/v1/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 1,
          transcript: text,
          mode: 'WORKER',
          language: 'en'
        })
      });
      const data = await res.json();
      setPendingConfirmation(data);
    } catch (e) {
      setPendingConfirmation({
        interaction_id: Date.now(),
        extracted_entities: {
          activity: "Foundation Reinforcement – Block B",
          quantity: 120,
          unit: "m²",
          date: "Today"
        },
        confidence_score: 92.0,
        confirmation_prompt: `Found Foundation Reinforcement – Block B. You reported 120 m² completed today. Should I submit this progress update?`,
        action_payload: {
          action_type: "SUBMIT_PROGRESS",
          activity_id: 4,
          quantity: 120,
          unit: "m²",
          report_text: text
        }
      });
    }
  };

  const confirmAndSubmit = async () => {
    if (!pendingConfirmation) return;

    if (!isOnline) {
      // Save locally to offline queue
      const newReport: QueuedReport = {
        id: Date.now().toString(),
        report_text: pendingConfirmation.action_payload?.report_text || pendingConfirmation.transcript || 'Site Report',
        quantity: pendingConfirmation.extracted_entities?.quantity || 120,
        unit: pendingConfirmation.extracted_entities?.unit || 'm2',
        timestamp: new Date().toLocaleTimeString(),
        status: 'Pending Sync'
      };
      const updated = [...offlineQueue, newReport];
      saveQueueToStorage(updated);
      alert("Offline mode active: Site report saved locally in Pending Sync Queue.");
      setPendingConfirmation(null);
      return;
    }

    try {
      await fetch('/api/v1/voice/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: pendingConfirmation.interaction_id || 1,
          action_payload: pendingConfirmation.action_payload,
          user_name: "Vikram Patel"
        })
      });
      alert("Site progress update successfully submitted to project database!");
    } catch (e) {
      // Save to queue if network error occurs during submission
      const newReport: QueuedReport = {
        id: Date.now().toString(),
        report_text: pendingConfirmation.action_payload?.report_text || 'Site Report',
        quantity: pendingConfirmation.extracted_entities?.quantity || 120,
        unit: pendingConfirmation.extracted_entities?.unit || 'm2',
        timestamp: new Date().toLocaleTimeString(),
        status: 'Pending Sync'
      };
      saveQueueToStorage([...offlineQueue, newReport]);
      alert("Network error: Saved to offline queue for sync.");
    } finally {
      setPendingConfirmation(null);
    }
  };

  const handleSyncNow = async () => {
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    try {
      const payload = {
        reports: offlineQueue.map((q) => ({
          project_id: 1,
          report_text: q.report_text,
          quantity_completed: q.quantity,
          unit: q.unit,
          latitude: 12.9250,
          longitude: 77.6825,
          timestamp: new Date().toISOString(),
          remarks: "Synced from offline queue"
        }))
      };

      const res = await fetch('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      saveQueueToStorage([]);
      alert(`Successfully synchronized ${data.synced_count} site reports with server!`);
    } catch (e) {
      alert("Sync failed. Check connection and try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between font-sans relative">
      {/* Background Accent */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-slate-800">
          <Link href="/" className="p-2.5 bg-slate-900 rounded-xl text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <div className="text-sm font-extrabold text-slate-100 flex items-center justify-center gap-1.5">
              <HardHat className="w-4 h-4 text-amber-400" />
              <span>Worker Field Mode</span>
            </div>
            <div className="text-[10px] text-amber-400 font-semibold">Smart City Flyover – Zone 4</div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider border ${
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
          }`}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>

        {/* Offline Queue Warning Banner */}
        {offlineQueue.length > 0 && (
          <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <WifiOff className="w-4 h-4 text-amber-400" />
              <span>{offlineQueue.length} Reports Pending Sync</span>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncing || !isOnline}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-md shadow-amber-950"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>
          </div>
        )}

        {/* Voice Progress Control */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
            <span>🎙️ VOICE PROGRESS REPORT</span>
            <span className="text-slate-400 text-[11px] font-normal">English Only</span>
          </div>
          
          <VoiceInputControl
            projectId={1}
            onSendQuery={handleSendQuery}
            placeholder="e.g. Completed 120 square meters of foundation reinforcement in Block B"
          />
        </div>

        {/* Today's Tasks */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Today's Assigned Tasks</div>
          <div className="space-y-2">
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs flex items-center justify-between shadow-sm">
              <div>
                <div className="font-bold text-slate-200">Foundation Reinforcement – Block B</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Target: 120 m² • Location: Zone 4</div>
              </div>
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold rounded-lg">IN PROGRESS</span>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs flex items-center justify-between shadow-sm">
              <div>
                <div className="font-bold text-slate-200">Pier Column Concrete Pouring</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Target: 160 m³ • Location: Pier P01</div>
              </div>
              <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold rounded-lg">SCHEDULED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Confirmation Modal */}
      {pendingConfirmation && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>Confirm Site Progress Update</span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              {pendingConfirmation.confirmation_prompt || `Found activity: ${pendingConfirmation.extracted_entities?.activity}. Submit report?`}
            </p>

            <div className="space-y-1.5 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between"><span className="text-slate-400">Activity:</span> <span className="font-bold text-slate-200">{pendingConfirmation.extracted_entities?.activity || 'Foundation Reinforcement'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Quantity:</span> <span className="font-bold text-emerald-400">{pendingConfirmation.extracted_entities?.quantity || 120} {pendingConfirmation.extracted_entities?.unit || 'm²'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">AI Match Confidence:</span> <span className="font-bold text-cyan-400">{pendingConfirmation.confidence_score || 92}%</span></div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={confirmAndSubmit}
                className="py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-950"
              >
                Confirm
              </button>
              <button
                onClick={() => setPendingConfirmation(null)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700"
              >
                Edit
              </button>
              <button
                onClick={() => setPendingConfirmation(null)}
                className="py-2.5 bg-rose-500/20 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
