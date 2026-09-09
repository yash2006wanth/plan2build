'use client';

import React, { useState } from 'react';
import { Play, Sparkles, Loader2 } from 'lucide-react';
import { triggerDemoUpdate } from '@/lib/api';

interface DemoTriggerButtonProps {
  onUpdateSuccess?: () => void;
}

export default function DemoTriggerButton({ onUpdateSuccess }: DemoTriggerButtonProps) {
  const [loading, setLoading] = useState(false);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const handleRunDemo = async () => {
    try {
      setLoading(true);
      const data = await triggerDemoUpdate(1);
      setLastNotification(
        `Field Update Injected! Matched '${data.matched_activity.name}' (${data.ai_match_confidence} - Score: ${intPct(data.ai_match_score)}%). Overall Actual Progress updated to ${data.updated_overall_actual_progress}%.`
      );
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setLastNotification('Demo update failed. Ensure backend is running.');
    } finally {
      setLoading(false);
      setTimeout(() => setLastNotification(null), 8000);
    }
  };

  const intPct = (val: number) => Math.round((val || 0) * 100);

  return (
    <div className="relative inline-block">
      <button
        onClick={handleRunDemo}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-emerald-200 animate-bounce" />
        )}
        <span>{loading ? 'Simulating Field Update...' : 'Run Demo Update'}</span>
      </button>

      {lastNotification && (
        <div className="absolute right-0 top-12 z-50 w-96 p-3 bg-slate-900/95 border border-emerald-500/40 rounded-xl shadow-2xl backdrop-blur-md text-xs text-slate-200 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-emerald-400 mb-0.5">Live Demo Event Triggered</div>
            <p className="text-[11px] leading-relaxed text-slate-300">{lastNotification}</p>
          </div>
        </div>
      )}
    </div>
  );
}
