'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  HardHat,
  MapPin,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Users,
  Wrench,
  Package,
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';
import { submitSiteReport, approveActivityMatch } from '@/lib/api';

export default function SiteReportSubmissionPage() {
  const router = useRouter();
  const [reportText, setReportText] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('m3');
  const [remarks, setRemarks] = useState('');
  const [labourCount, setLabourCount] = useState('12');
  const [equipment, setEquipment] = useState('Concrete Boom Pump, 4 Transit Mixers');
  const [materials, setMaterials] = useState('M40 Concrete 120m3');
  const [locationStr, setLocationStr] = useState('');
  const [latitude, setLatitude] = useState<number | null>(12.9260);
  const [longitude, setLongitude] = useState<number | null>(77.6835);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // AI Match Result Modal State
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [approving, setApproving] = useState(false);

  // Auto Geolocation Capture
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setLocationStr(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Geotagged)`);
        },
        (err) => {
          setLocationStr('Bengaluru Outer Ring Road, Zone 4');
        }
      );
    }
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...selectedFiles]);

      const previews = selectedFiles.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...previews]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText || !quantity) {
      alert('Please fill in work description and quantity completed.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('project_id', '1');
      formData.append('report_text', reportText);
      formData.append('quantity_completed', quantity);
      formData.append('unit', unit);
      if (latitude) formData.append('latitude', latitude.toString());
      if (longitude) formData.append('longitude', longitude.toString());
      if (remarks) formData.append('remarks', remarks);
      if (labourCount) formData.append('labour_count', labourCount);
      if (equipment) formData.append('equipment_details', equipment);
      if (materials) formData.append('material_consumption', materials);

      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      const res = await submitSiteReport(formData);
      setSubmittedReport(res);
      setShowAiModal(true);
    } catch (err: any) {
      console.error(err);
      alert('Failed to submit report. Please check backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveMatch = async (activityId: number) => {
    if (!submittedReport) return;
    try {
      setApproving(true);
      await approveActivityMatch(submittedReport.id, activityId);
      setShowAiModal(false);
      router.push('/site-reports');
    } catch (err) {
      console.error(err);
      alert('Failed to approve match.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Site Engineer Field Update Interface</h2>
            <p className="text-xs text-slate-400">Capture daily field work, quantities, photos & geotags for AI activity matching</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        {/* Work Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Daily Work Description <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="e.g. Completed Pier Column P03 M40 concrete pouring using boom pump. Verticality verified with laser transit."
            className="w-full glass-input rounded-xl p-3 text-xs placeholder:text-slate-400"
            required
          />
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Quantity Completed <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 120"
              className="w-full glass-input rounded-xl px-3 py-2.5 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Unit of Measurement
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2.5 text-xs font-semibold"
            >
              <option value="m3">m3 (Cubic Meters)</option>
              <option value="m2">m2 (Square Meters)</option>
              <option value="meters">meters (Linear Meters)</option>
              <option value="tons">tons (Rebar / Steel)</option>
              <option value="girders">girders (Pre-cast units)</option>
              <option value="poles">poles (Smart Lighting)</option>
            </select>
          </div>
        </div>

        {/* Site Details (Labour, Equipment, Materials) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" /> Labour Count
            </label>
            <input
              type="number"
              value={labourCount}
              onChange={(e) => setLabourCount(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" /> Equipment Details
            </label>
            <input
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" /> Material Used
            </label>
            <input
              type="text"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* GPS Geolocation & Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" /> GPS Location Geotag
            </label>
            <input
              type="text"
              value={locationStr}
              readOnly
              className="w-full glass-input bg-slate-900/60 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Field Remarks / Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Weather clear, temp 28°C"
              className="w-full glass-input rounded-xl px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Evidence Photo Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Attach Evidence Photos (OpenCV Analysis Ready)
          </label>
          <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-900/40">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
              id="photo-upload-input"
            />
            <label htmlFor="photo-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
              <Camera className="w-6 h-6 text-sky-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">Click or Drag & Drop Site Photos</span>
              <span className="text-[10px] text-slate-400">JPG, PNG up to 10MB</span>
            </label>
          </div>

          {/* Photo Previews */}
          {photoPreviews.length > 0 && (
            <div className="flex items-center gap-3 mt-3 overflow-x-auto pb-1">
              {photoPreviews.map((src, i) => (
                <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-slate-700 shrink-0 relative">
                  <img src={src} alt="Evidence" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Running AI Activity Matcher...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-sky-200" />
                <span>Submit Field Update & Link Schedule</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* AI ACTIVITY MATCHING RESULT MODAL */}
      {showAiModal && submittedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-sky-500/40 p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Title */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/40">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">AI Activity Matcher Results</h3>
                  <p className="text-xs text-slate-400">Multi-Signal Hybrid Matching Engine breakdown</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submitted Summary */}
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Submitted Field Report:</div>
              <p className="font-medium text-slate-200">"{submittedReport.report_text}"</p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                <span>Qty: <strong className="text-slate-200">{submittedReport.quantity_completed} {submittedReport.unit}</strong></span>
                <span>Location: <strong className="text-slate-200">Bengaluru Zone 4</strong></span>
              </div>
            </div>

            {/* Top Candidate Activities */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Top Candidate Schedule Activities
              </div>

              {submittedReport.matches && submittedReport.matches.length > 0 ? (
                submittedReport.matches.slice(0, 3).map((match: any, index: number) => {
                  let confBadge = 'bg-slate-800 text-slate-400 border-slate-700';
                  if (match.confidence === 'Auto-Approved') confBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                  if (match.confidence === 'Needs Confirmation') confBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/40';

                  return (
                    <div
                      key={match.id}
                      className={`p-4 rounded-xl border transition-all ${
                        index === 0
                          ? 'bg-sky-950/20 border-sky-500/40 shadow-lg shadow-sky-500/10'
                          : 'bg-slate-900/50 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sky-400 font-bold text-xs">{match.activity_code}</span>
                            <span className="font-bold text-slate-100 text-xs">{match.activity_name}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Reasons: <span className="text-slate-300">{match.matching_reason}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-sky-400">
                            {Math.round(match.final_score * 100)}% Match
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block mt-0.5 ${confBadge}`}>
                            {match.confidence}
                          </span>
                        </div>
                      </div>

                      {/* Sub-score breakdown */}
                      <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-center">
                        <div className="bg-slate-950/60 p-1.5 rounded">
                          <div className="text-slate-400">Semantic (35%)</div>
                          <div className="font-bold text-sky-300">{Math.round(match.semantic_score * 100)}%</div>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded">
                          <div className="text-slate-400">Location (25%)</div>
                          <div className="font-bold text-emerald-300">{Math.round(match.location_score * 100)}%</div>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded">
                          <div className="text-slate-400">Date (20%)</div>
                          <div className="font-bold text-amber-300">{Math.round(match.date_score * 100)}%</div>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded">
                          <div className="text-slate-400">Keyword (10%)</div>
                          <div className="font-bold text-slate-300">{Math.round(match.keyword_score * 100)}%</div>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded">
                          <div className="text-slate-400">WBS (10%)</div>
                          <div className="font-bold text-slate-300">{Math.round(match.wbs_score * 100)}%</div>
                        </div>
                      </div>

                      {/* Approve Button */}
                      <div className="mt-3 text-right">
                        <button
                          onClick={() => handleApproveMatch(match.activity_id)}
                          disabled={approving}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5 inline-flex"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Update Progress</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400">No matching activities found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
