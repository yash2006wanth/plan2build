'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapInnerProps {
  activities: any[];
  siteReports: any[];
}

export default function LeafletMapInner({ activities, siteReports }: LeafletMapInnerProps) {
  // Center coordinates for Bengaluru Outer Ring Road Zone 4
  const centerLat = 12.9255;
  const centerLng = 77.6830;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={15}
      scrollWheelZoom={true}
      className="h-[600px] w-full rounded-xl z-10"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render Geotagged Site Reports */}
      {siteReports.map((report) => {
        if (!report.latitude || !report.longitude) return null;

        const matchedAct = report.matches?.find((m: any) => m.approved) || (report.matches && report.matches[0]);

        return (
          <Marker key={`report-${report.id}`} position={[report.latitude, report.longitude]}>
            <Popup className="custom-leaflet-popup">
              <div className="p-1 space-y-1 max-w-xs text-xs text-slate-900">
                <div className="font-bold text-sky-600">Site Field Update (SR-{report.id})</div>
                <p className="italic text-[11px]">"{report.report_text}"</p>
                <div className="font-semibold text-emerald-600 mt-1">
                  Qty: {report.quantity_completed} {report.unit}
                </div>
                {matchedAct && (
                  <div className="text-[10px] bg-slate-100 p-1.5 rounded border border-slate-300 mt-1">
                    Matched: <strong>{matchedAct.activity_code}</strong> – {matchedAct.activity_name} ({Math.round(matchedAct.final_score * 100)}%)
                  </div>
                )}
                <div className="text-[9px] text-slate-500 pt-1">
                  Time: {new Date(report.timestamp).toLocaleString('en-IN')}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
