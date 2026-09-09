'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, RefreshCw } from 'lucide-react';

export type LocationStatus = 'Location Active' | 'Updating' | 'Permission Required' | 'Permission Denied' | 'Location Unavailable';

interface LocationState {
  status: LocationStatus;
  latitude: number | null;
  longitude: number | null;
  lastUpdated: string | null;
  error: string | null;
}

export default function LiveLocationBadge() {
  const [location, setLocation] = useState<LocationState>({
    status: 'Permission Required',
    latitude: null,
    longitude: null,
    lastUpdated: null,
    error: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocation({
        status: 'Location Unavailable',
        latitude: null,
        longitude: null,
        lastUpdated: null,
        error: 'Browser does not support Geolocation.',
      });
      return;
    }

    setLocation((prev) => ({ ...prev, status: 'Updating' }));

    const handleSuccess = (position: GeolocationPosition) => {
      const lat = parseFloat(position.coords.latitude.toFixed(5));
      const lng = parseFloat(position.coords.longitude.toFixed(5));
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setLocation({
        status: 'Location Active',
        latitude: lat,
        longitude: lng,
        lastUpdated: timeStr,
        error: null,
      });

      // Save to localStorage for map / report usage
      localStorage.setItem('user_live_location', JSON.stringify({ latitude: lat, longitude: lng, lastUpdated: timeStr }));
    };

    const handleError = (err: GeolocationPositionError) => {
      let statusStr: LocationStatus = 'Location Unavailable';
      let errText = 'Unable to retrieve location.';

      if (err.code === err.PERMISSION_DENIED) {
        statusStr = 'Permission Denied';
        errText = 'Location permission denied. Please allow location access in browser.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        statusStr = 'Location Unavailable';
        errText = 'GPS signal unavailable.';
      } else if (err.code === err.TIMEOUT) {
        statusStr = 'Location Unavailable';
        errText = 'Location request timed out.';
      }

      setLocation({
        status: statusStr,
        latitude: 12.9250, // Default project coordinate fallback
        longitude: 77.6825,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: errText,
      });
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const requestPermission = () => {
    if ('geolocation' in navigator) {
      setLocation((prev) => ({ ...prev, status: 'Updating' }));
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(5));
          const lng = parseFloat(position.coords.longitude.toFixed(5));
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLocation({
            status: 'Location Active',
            latitude: lat,
            longitude: lng,
            lastUpdated: timeStr,
            error: null,
          });
        },
        (err) => {
          setLocation({
            status: err.code === err.PERMISSION_DENIED ? 'Permission Denied' : 'Location Unavailable',
            latitude: 12.9250,
            longitude: 77.6825,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            error: err.message,
          });
        }
      );
    }
  };

  const getStatusColor = () => {
    switch (location.status) {
      case 'Location Active':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
      case 'Updating':
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 animate-pulse';
      case 'Permission Required':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      case 'Permission Denied':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${getStatusColor()}`}>
      <Navigation className={`w-3.5 h-3.5 ${location.status === 'Location Active' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
      
      <div className="flex items-center gap-1.5">
        <span className="font-bold">{location.status}</span>
        
        {location.latitude && location.longitude ? (
          <span className="font-mono text-[11px] opacity-90">
            ({location.latitude}, {location.longitude})
          </span>
        ) : null}

        {location.lastUpdated && (
          <span className="text-[10px] text-slate-400 font-normal border-l border-slate-700 pl-1.5">
            {location.lastUpdated}
          </span>
        )}
      </div>

      {location.status === 'Permission Denied' || location.status === 'Permission Required' ? (
        <button
          type="button"
          onClick={requestPermission}
          className="ml-1 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold transition-all"
        >
          Enable GPS
        </button>
      ) : null}
    </div>
  );
}
