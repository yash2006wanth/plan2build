'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { getProjectActivities, getSiteReports } from '@/lib/api';
import LiveLocationBadge from '@/components/LiveLocationBadge';

// Dynamic import of Leaflet map components to bypass Next.js SSR window errors
const MapComponent = dynamic(() => import('@/components/map/LeafletMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full flex items-center justify-center bg-slate-900 rounded-2xl">
      <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
    </div>
  ),
});

export default function InteractiveMapPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [siteReports, setSiteReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const acts = await getProjectActivities(1);
        const reps = await getSiteReports(1);
        setActivities(acts);
        setSiteReports(reps);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider">
              Geospatial Intelligence Map
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Interactive Infrastructure Site Map</h2>
          <p className="text-xs text-slate-400 mt-1">
            Geotagged site engineer reports, pier zones, and live user GPS location.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <LiveLocationBadge />

          <div className="flex items-center gap-3 text-xs border-l border-slate-800 pl-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> On Track
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> At Risk
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Delayed
            </span>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-2 overflow-hidden">
        {loading ? (
          <div className="h-[600px] flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <MapComponent activities={activities} siteReports={siteReports} />
        )}
      </div>
    </div>
  );
}
