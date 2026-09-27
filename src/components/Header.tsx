import React from 'react';
import {
  Compass,
  MapPin,
  Map as MapIcon,
  MessageSquare,
  Columns,
  Navigation,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onSelectCity: (city: { name: string; lat: number; lng: number; zoom: number }) => void;
  activeCity: string;
  placesCount: number;
  viewMode: 'split' | 'map' | 'chat';
  setViewMode: (mode: 'split' | 'map' | 'chat') => void;
  onLocateMe: () => void;
}

export const POPULAR_CITIES = [
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, zoom: 13 },
  { name: 'New York', lat: 40.7128, lng: -74.006, zoom: 13 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, zoom: 13 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, zoom: 13 },
  { name: 'London', lat: 51.5074, lng: -0.1278, zoom: 13 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, zoom: 13 },
];

export const Header: React.FC<HeaderProps> = ({
  onSelectCity,
  activeCity,
  placesCount,
  viewMode,
  setViewMode,
  onLocateMe,
}) => {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-4 z-20 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20">
            <Compass className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base tracking-tight text-white leading-none">
                GeoChat
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                Maps AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block leading-none mt-0.5">
              Interactive Google Maps Assistant
            </p>
          </div>
        </div>

        {/* Places pinned badge */}
        {placesCount > 0 && (
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>{placesCount} places on map</span>
          </div>
        )}
      </div>

      {/* City Switcher Pills */}
      <div className="hidden lg:flex items-center gap-1 bg-slate-850 p-1 rounded-xl border border-slate-800">
        <span className="text-xs text-slate-400 px-2 font-medium flex items-center gap-1">
          <Compass className="w-3 h-3 text-slate-400" />
          <span>City:</span>
        </span>
        {POPULAR_CITIES.map((city) => {
          const isActive = activeCity.toLowerCase().includes(city.name.toLowerCase());
          return (
            <button
              key={city.name}
              onClick={() => onSelectCity(city)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      {/* Right Controls: Geolocation + View Mode Toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={onLocateMe}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors"
          title="Detect my current location"
        >
          <Navigation className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Near Me</span>
        </button>

        {/* View Switcher (Desktop and Mobile) */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          <button
            onClick={() => setViewMode('chat')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'chat'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Chat Only"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors hidden md:block ${
              viewMode === 'split'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Split Screen"
          >
            <Columns className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Map Only"
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
