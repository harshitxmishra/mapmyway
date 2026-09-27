import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  MapControl,
  ControlPosition,
} from '@vis.gl/react-google-maps';
import { Place, PlaceCategory, RouteData, MapAction } from '../types';

declare const google: any;
import {
  Coffee,
  Utensils,
  Trees,
  Landmark,
  Compass,
  Beer,
  ShoppingBag,
  Hotel,
  Eye,
  Bus,
  MapPin,
  Navigation,
  Layers,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Route as RouteIcon,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface InteractiveMapProps {
  apiKey: string;
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  mapAction: MapAction | null;
  route: RouteData | null;
  userLocation: { lat: number; lng: number } | null;
  onAskAboutPlace: (placeName: string) => void;
  onMapClick?: () => void;
}

// Category color & icon helper
export const getCategoryMeta = (category: PlaceCategory) => {
  switch (category) {
    case 'cafe':
      return { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-400', icon: Coffee, label: 'Cafe' };
    case 'restaurant':
      return { bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-rose-400', icon: Utensils, label: 'Restaurant' };
    case 'park':
      return { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-400', icon: Trees, label: 'Park & Nature' };
    case 'museum':
      return { bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-indigo-400', icon: Landmark, label: 'Museum' };
    case 'attraction':
      return { bg: 'bg-violet-500', border: 'border-violet-400', text: 'text-violet-400', icon: Compass, label: 'Attraction' };
    case 'bar':
      return { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-400', icon: Beer, label: 'Nightlife & Bar' };
    case 'shopping':
      return { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-pink-400', icon: ShoppingBag, label: 'Shopping' };
    case 'lodging':
      return { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-cyan-400', icon: Hotel, label: 'Hotel & Stay' };
    case 'viewpoint':
      return { bg: 'bg-teal-500', border: 'border-teal-400', text: 'text-teal-400', icon: Eye, label: 'Scenic View' };
    case 'transit':
      return { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-400', icon: Bus, label: 'Transit' };
    default:
      return { bg: 'bg-sky-500', border: 'border-sky-400', text: 'text-sky-400', icon: MapPin, label: 'Location' };
  }
};

// Smooth Camera Controller
const MapCameraController: React.FC<{
  mapAction: MapAction | null;
  selectedPlace: Place | null;
  places: Place[];
}> = ({ mapAction, selectedPlace, places }) => {
  const map = useMap();

  // Focus on selected place
  useEffect(() => {
    if (!map || !selectedPlace) return;
    map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
    // Smooth zoom if too far
    if (map.getZoom()! < 15) {
      map.setZoom(16);
    }
  }, [map, selectedPlace]);

  // Handle map action trigger from AI response
  useEffect(() => {
    if (!map || !mapAction) return;

    if (places && places.length > 1 && window.google?.maps) {
      // Fit all markers in viewport
      const bounds = new window.google.maps.LatLngBounds();
      places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else if (mapAction.center) {
      map.panTo(mapAction.center);
      if (mapAction.zoom) {
        map.setZoom(mapAction.zoom);
      }
    }
  }, [map, mapAction, places]);

  return null;
};

// Route Polyline Renderer
const RoutePolyline: React.FC<{ route: RouteData | null }> = ({ route }) => {
  const map = useMap();
  const [polyline, setPolyline] = useState<any | null>(null);

  useEffect(() => {
    if (!map || !window.google?.maps) return;

    if (polyline) {
      polyline.setMap(null);
    }

    if (!route || !route.waypoints || route.waypoints.length < 2) {
      setPolyline(null);
      return;
    }

    const path = route.waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng }));
    const newPolyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#0ea5e9',
      strokeOpacity: 0.85,
      strokeWeight: 5,
      map,
    });

    setPolyline(newPolyline);

    // Fit route in view
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });

    return () => {
      newPolyline.setMap(null);
    };
  }, [map, route]);

  return null;
};

// Map Layer & View Controls
const CustomMapControls: React.FC<{
  onLocateMe: () => void;
  mapType: string;
  setMapType: (t: string) => void;
  showTraffic: boolean;
  setShowTraffic: (s: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (e: boolean) => void;
}> = ({
  onLocateMe,
  mapType,
  setMapType,
  showTraffic,
  setShowTraffic,
  isExpanded,
  setIsExpanded,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapType);
  }, [map, mapType]);

  useEffect(() => {
    if (!map || !window.google?.maps) return;
    let trafficLayer: any | null = null;
    if (showTraffic) {
      trafficLayer = new window.google.maps.TrafficLayer();
      trafficLayer.setMap(map);
    }
    return () => {
      if (trafficLayer) trafficLayer.setMap(null);
    };
  }, [map, showTraffic]);

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-xl flex flex-col gap-1 text-xs">
        <button
          onClick={onLocateMe}
          title="Center on my location"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center group"
        >
          <Navigation className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
          title={mapType === 'roadmap' ? 'Switch to Satellite' : 'Switch to Map'}
          className={`p-2 rounded-lg transition-all flex items-center justify-center ${
            mapType === 'hybrid' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowTraffic(!showTraffic)}
          title={showTraffic ? 'Hide Traffic' : 'Show Live Traffic'}
          className={`p-2 rounded-lg transition-all flex items-center justify-center ${
            showTraffic ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <RouteIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Restore View' : 'Maximize Map'}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center md:flex hidden"
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  apiKey,
  places,
  selectedPlace,
  onSelectPlace,
  mapAction,
  route,
  userLocation,
  onAskAboutPlace,
  onMapClick,
}) => {
  const [mapType, setMapType] = useState('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Default to San Francisco if no custom center
  const defaultCenter = useMemo(() => ({ lat: 37.7749, lng: -122.4194 }), []);

  const handleLocateMe = useCallback(() => {
    if (userLocation && window.google?.maps) {
      // MapCameraController will be triggered or map pan directly
      onSelectPlace(null);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          // handled in parent or trigger
        },
        (err) => {
          console.warn('Geolocation error:', err);
        }
      );
    }
  }, [userLocation, onSelectPlace]);

  return (
    <div className={`relative w-full h-full transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-40' : ''}`}>
      <APIProvider apiKey={apiKey} libraries={['places', 'geometry', 'marker']}>
        <div className="w-full h-full min-h-[350px] bg-slate-950">
          <Map
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultCenter={defaultCenter}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
            onClick={() => {
              onSelectPlace(null);
              onMapClick?.();
            }}
          >
            {/* Camera handler & Polyline */}
            <MapCameraController
              mapAction={mapAction}
              selectedPlace={selectedPlace}
              places={places}
            />
            <RoutePolyline route={route} />

            {/* Custom UI Controls */}
            <MapControl position={ControlPosition.RIGHT_TOP}>
              <CustomMapControls
                onLocateMe={handleLocateMe}
                mapType={mapType}
                setMapType={setMapType}
                showTraffic={showTraffic}
                setShowTraffic={setShowTraffic}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
              />
            </MapControl>

            {/* User GPS Radar Marker */}
            {userLocation && (
              <AdvancedMarker position={userLocation} title="Your Location">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping" />
                  <div className="relative w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/50" />
                </div>
              </AdvancedMarker>
            )}

            {/* Route Waypoint Markers */}
            {route?.waypoints?.map((wp, idx) => (
              <AdvancedMarker
                key={`wp-${idx}`}
                position={{ lat: wp.lat, lng: wp.lng }}
                title={`Stop ${idx + 1}: ${wp.name}`}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs border-2 border-white shadow-md">
                  {idx + 1}
                </div>
              </AdvancedMarker>
            ))}

            {/* Places Advanced Markers */}
            {places.map((place) => {
              const isSelected = selectedPlace?.id === place.id;
              const meta = getCategoryMeta(place.category);
              const Icon = meta.icon;

              return (
                <AdvancedMarker
                  key={place.id}
                  position={{ lat: place.lat, lng: place.lng }}
                  title={place.name}
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    onSelectPlace(place);
                  }}
                >
                  <div
                    className={`relative cursor-pointer transition-all duration-200 transform ${
                      isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-10'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center p-2 rounded-2xl shadow-xl border-2 transition-colors ${
                        meta.bg
                      } ${isSelected ? 'border-white ring-4 ring-white/30' : meta.border}`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    {/* Pin tail */}
                    <div
                      className={`w-2 h-2 rotate-45 mx-auto -mt-1 ${meta.bg} ${
                        isSelected ? 'border-r-2 border-b-2 border-white' : ''
                      }`}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Rich Place InfoWindow */}
            {selectedPlace && (
              <InfoWindow
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                onCloseClick={() => onSelectPlace(null)}
                headerDisabled={true}
              >
                <div className="p-3 max-w-[280px] bg-slate-900 text-slate-100 rounded-xl border border-slate-700/80 shadow-2xl -m-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-teal-500/20">
                        {getCategoryMeta(selectedPlace.category).label}
                      </span>
                      <h4 className="font-bold text-base text-white mt-1 leading-snug">
                        {selectedPlace.name}
                      </h4>
                    </div>
                    {selectedPlace.rating && (
                      <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30 text-xs font-semibold shrink-0">
                        <span>★</span>
                        <span>{selectedPlace.rating}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-2.5">
                    {selectedPlace.highlight}
                  </p>

                  <div className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{selectedPlace.address}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => onAskAboutPlace(selectedPlace.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ask AI</span>
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${selectedPlace.name} ${selectedPlace.address}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>
      </APIProvider>
    </div>
  );
};
