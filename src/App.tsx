/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header, POPULAR_CITIES } from './components/Header';
import { ChatPanel, PERSONAS } from './components/ChatPanel';
import { InteractiveMap } from './components/InteractiveMap';
import { QuotaBanner } from './components/QuotaBanner';
import { ChatMessage, Place, MapAction, RouteData } from './types';

const INITIAL_CITY = POPULAR_CITIES[0]; // San Francisco

export default function App() {
  const [apiKey, setApiKey] = useState<string>(
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBer1CbISETi0GA7HyaYsf3V0GWnuWhLr8'
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);

  const [mapAction, setMapAction] = useState<MapAction | null>({
    center: { lat: INITIAL_CITY.lat, lng: INITIAL_CITY.lng },
    zoom: INITIAL_CITY.zoom,
    locationName: INITIAL_CITY.name,
  });

  const [activeCity, setActiveCity] = useState<string>(INITIAL_CITY.name);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [persona, setPersona] = useState<string>('concierge');
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'chat'>('split');

  // Fetch verified maps key from backend config if available
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.mapsApiKey) {
          setApiKey(data.mapsApiKey);
        }
      })
      .catch((err) => console.warn('Could not fetch server config:', err));
  }, []);

  // Request browser geolocation once or on demand
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setMapAction({
          center: coords,
          zoom: 15,
          locationName: 'Your Location',
        });
        setActiveCity('Current Location');

        // Suggest a prompt to search around user
        handleSendMessage('What are the top recommended local spots, cafes, and sights near my current location?');
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Handle City Change
  const handleSelectCity = useCallback((city: typeof POPULAR_CITIES[0]) => {
    setActiveCity(city.name);
    setMapAction({
      center: { lat: city.lat, lng: city.lng },
      zoom: city.zoom,
      locationName: city.name,
    });
    setSelectedPlace(null);
  }, []);

  // Handle sending a chat message to the Gemini API backend
  const handleSendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride || userInput).trim();
      if (!text || isLoading) return;

      const newUserMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, newUserMsg];
      setMessages(updatedHistory);
      setUserInput('');
      setIsLoading(true);

      try {
        const currentCenter = mapAction?.center || { lat: INITIAL_CITY.lat, lng: INITIAL_CITY.lng };
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
            model: selectedModel,
            userLocation,
            mapContext: {
              center: currentCenter,
              zoom: mapAction?.zoom || 13,
              locationName: activeCity,
              persona: PERSONAS.find((p) => p.id === persona)?.desc,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with status ${response.status}`);
        }

        const data = await response.json();

        const newModelMsg: ChatMessage = {
          id: `model_${Date.now()}`,
          role: 'model',
          content: data.reply || 'Here is what I found for you.',
          timestamp: Date.now(),
          mapData: data.mapData,
          grounding: data.grounding,
        };

        setMessages((prev) => [...prev, newModelMsg]);

        // Process map actions from AI
        if (data.mapData) {
          if (data.mapData.mapAction) {
            setMapAction(data.mapData.mapAction);
            if (data.mapData.mapAction.locationName) {
              setActiveCity(data.mapData.mapAction.locationName);
            }
          }

          if (data.mapData.places && data.mapData.places.length > 0) {
            setPlaces((prev) => {
              // Combine places, avoid duplicates by name/id
              const existingIds = new Set(prev.map((p) => p.id));
              const newPlaces = data.mapData.places.filter((p: Place) => !existingIds.has(p.id));
              return [...newPlaces, ...prev].slice(0, 30); // keep recent 30
            });
            // Auto select the first place if appropriate
            setSelectedPlace(data.mapData.places[0]);
          }

          if (data.mapData.route) {
            setRoute(data.mapData.route);
          }
        }
      } catch (error: any) {
        console.error('Chat error:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'model',
            content: `I ran into an issue retrieving the live location data: **${error.message || 'Network error'}**. Please try again.`,
            timestamp: Date.now(),
            isError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [userInput, isLoading, messages, selectedModel, userLocation, mapAction, activeCity, persona]
  );

  // Ask AI about a specific place
  const handleAskAboutPlace = useCallback(
    (placeName: string) => {
      const prompt = `Tell me more about ${placeName}: what is the atmosphere like, what are the must-try items or views, best times to visit, and any local insider tips?`;
      handleSendMessage(prompt);
      // Ensure chat is visible
      if (viewMode === 'map') {
        setViewMode('split');
      }
    },
    [handleSendMessage, viewMode]
  );

  // Clear chat history
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setPlaces([]);
    setSelectedPlace(null);
    setRoute(null);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Demo Key Quota Defense Banner */}
      <QuotaBanner />

      {/* Main Header */}
      <Header
        onSelectCity={handleSelectCity}
        activeCity={activeCity}
        placesCount={places.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onLocateMe={handleLocateMe}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat Panel */}
        <div
          className={`h-full transition-all duration-300 z-10 ${
            viewMode === 'chat'
              ? 'w-full'
              : viewMode === 'map'
              ? 'hidden md:hidden'
              : 'w-full md:w-[480px] lg:w-[520px] shrink-0'
          }`}
        >
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            userInput={userInput}
            setUserInput={setUserInput}
            onSendMessage={handleSendMessage}
            onSelectPlace={(place) => {
              setSelectedPlace(place);
              if (viewMode === 'chat') {
                setViewMode('split');
              }
            }}
            selectedPlaceId={selectedPlace?.id}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            persona={persona}
            setPersona={setPersona}
            onClearChat={handleClearChat}
          />
        </div>

        {/* Interactive Google Map */}
        <div
          className={`h-full flex-1 transition-all duration-300 relative ${
            viewMode === 'chat' ? 'hidden md:hidden' : 'block'
          }`}
        >
          <InteractiveMap
            apiKey={apiKey}
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            mapAction={mapAction}
            route={route}
            userLocation={userLocation}
            onAskAboutPlace={handleAskAboutPlace}
          />
        </div>
      </div>
    </div>
  );
}
