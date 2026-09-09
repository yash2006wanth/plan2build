'use client';

import React, { useState } from 'react';
import { Camera, Calendar, CheckCircle2, ShieldCheck, Tag, Eye, Layers } from 'lucide-react';

export default function EvidencePage() {
  const [selectedActivity, setSelectedActivity] = useState('Foundation Reinforcement – Block B');
  const [humanVerified, setHumanVerified] = useState(true);

  const timelineItems = [
    {
      stage: "Before (Site Excavation Stage)",
      date: "August 05, 2026",
      photo_url: "/uploads/demo_site_photo.jpg",
      confidence_score: 94.0,
      confidence_level: "High",
      cv_label: "AI Visual Evidence",
      elements: ["1 Excavator CAT 320", "Open Pit Excavation Stratum", "Boundary Fencing"],
      report_text: "Excavation pit cleared to rock stratum depth."
    },
    {
      stage: "During (Rebar Cage Assembly Stage)",
      date: "August 22, 2026",
      photo_url: "/uploads/demo_site_photo.jpg",
      confidence_score: 88.5,
      confidence_level: "High",
      cv_label: "AI Visual Evidence",
      elements: ["14 Circular Pier Rebar Cages", "Formwork Scaffolding", "Rebar Benders"],
      report_text: "TMT Fe550D steel cage binding 60% complete."
    },
    {
      stage: "Latest (Concrete Pouring Stage)",
      date: "September 07, 2026",
      photo_url: "/uploads/demo_site_photo.jpg",
      confidence_score: 92.0,
      confidence_level: "High",
      cv_label: "AI Visual Evidence",
      elements: ["M35 Mass Concrete Pouring", "Concrete Boom Pump 36m", "6 Site Workers"],
      report_text: "Monolithic concrete pour in progress with total station verticality checks."
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Camera className="w-6 h-6 text-sky-400" />
            <span>Automated Photo Timeline & Computer Vision Evidence</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual Evidence Progression (Before, During, Latest) with OpenCV/YOLO Object Detection & Human Verification
          </p>
        </div>

        {/* Human Verification Toggle */}
        <button
          onClick={() => setHumanVerified(!humanVerified)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
            humanVerified
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{humanVerified ? 'Human Verification Passed' : 'Pending Review'}</span>
        </button>
      </div>

      {/* Activity Selector */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-sky-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active WBS Activity Timeline</div>
            <div className="text-sm font-bold text-slate-100">{selectedActivity}</div>
          </div>
        </div>
        <select
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
          className="glass-input px-3 py-1.5 rounded-lg text-xs font-semibold"
        >
          <option value="Foundation Reinforcement – Block B">Foundation Reinforcement – Block B</option>
          <option value="Pier Column Concrete Construction">Pier Column Concrete Construction</option>
          <option value="Pre-cast Girder Casting & Curing">Pre-cast Girder Casting & Curing</option>
        </select>
      </div>

      {/* Timeline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {timelineItems.map((item, idx) => (
          <div key={idx} className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between shadow-xl">
            {/* Photo Preview Container */}
            <div className="relative bg-slate-900 h-48 flex items-center justify-center border-b border-slate-800">
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-[10px] font-bold text-sky-400 border border-slate-800">
                {item.stage}
              </div>
              <div className="text-center p-4">
                <Camera className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-400 font-mono">Geotagged Site Photo</span>
              </div>
              <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded border border-emerald-500/30 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>{item.cv_label} ({item.confidence_score}%)</span>
              </div>
            </div>

            {/* Metadata & Detected Elements */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>{item.date}</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">{item.confidence_level} Confidence</span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                "{item.report_text}"
              </p>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CV Object Detections</div>
                <div className="flex flex-wrap gap-1.5">
                  {item.elements.map((el, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded font-medium border border-slate-700">
                      {el}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
