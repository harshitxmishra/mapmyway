import React, { useRef, useEffect } from 'react';
import { ChatMessage, Place, GroundingInfo } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getCategoryMeta } from './InteractiveMap';
import {
  Send,
  Sparkles,
  MapPin,
  Compass,
  Search,
  ExternalLink,
  Bot,
  User,
  RotateCcw,
  Zap,
  Globe,
  Sliders,
  ChevronRight,
  Coffee,
  Utensils,
  Camera,
  Navigation,
} from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  userInput: string;
  setUserInput: (input: string) => void;
  onSendMessage: (text?: string) => void;
  onSelectPlace: (place: Place) => void;
  selectedPlaceId?: string | null;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  persona: string;
  setPersona: (p: string) => void;
  onClearChat: () => void;
}

export const PERSONAS = [
  { id: 'concierge', name: 'Local Concierge & Foodie', desc: 'Best food, ambiance & hidden neighborhood gems' },
  { id: 'guide', name: 'Historian & Culture Guide', desc: 'Architecture, stories & landmark heritage' },
  { id: 'explorer', name: 'Walking Tour Architect', desc: 'Scenic routes, pacing & stroll itineraries' },
  { id: 'remote_worker', name: 'Digital Nomad Scout', desc: 'Quiet work cafes, Wi-Fi & cozy spots' },
];

const QUICK_PROMPTS = [
  { label: 'Best Cafes with Wi-Fi', icon: Coffee, prompt: 'Find the top 4 specialty coffee shops with good Wi-Fi and relaxed work atmosphere near here.' },
  { label: 'Top Dining Spots', icon: Utensils, prompt: 'What are the most acclaimed local dinner spots with authentic cuisine in this area?' },
  { label: 'Scenic Walking Tour', icon: Navigation, prompt: 'Create a scenic 2-hour walking tour with 4 interesting landmark stops.' },
  { label: 'Hidden Gems', icon: Camera, prompt: 'What are unique hidden gems and secret viewpoints most tourists miss here?' },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  userInput,
  setUserInput,
  onSendMessage,
  onSelectPlace,
  selectedPlaceId,
  selectedModel,
  setSelectedModel,
  persona,
  setPersona,
  onClearChat,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-100">
      {/* Chat Sub-Header / Controls */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white leading-none">GeoChat Assistant</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-teal-400/90 mt-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span>Google Search Grounded</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Persona selector */}
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-teal-500 hover:bg-slate-750 cursor-pointer"
            title="Choose AI Role Persona"
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-teal-500 hover:bg-slate-750 cursor-pointer font-mono"
            title="Gemini Model Engine"
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (Grounded)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
            <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
          </select>

          <button
            onClick={onClearChat}
            title="Clear Chat History"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-3 shadow-lg shadow-teal-500/5">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Ask any location-specific question
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
              GeoChat combines real-time Google Search data with interactive Google Maps.
              Ask for top cafes, local viewpoints, neighborhood vibes, or tailored walking tours.
            </p>

            {/* Quick Starter Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_PROMPTS.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(qp.prompt)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/50 text-left transition-all group"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-700/60 text-teal-400 group-hover:scale-105 transition-transform shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        {qp.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                    isUser
                      ? 'bg-teal-600 text-white rounded-tr-xs'
                      : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div>
                      {/* Markdown rendered text */}
                      <MarkdownRenderer content={msg.content} />

                      {/* Google Search Grounding Sources badge */}
                      {msg.grounding && msg.grounding.sources && msg.grounding.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-medium">
                            <Globe className="w-3.5 h-3.5 text-teal-400" />
                            <span>Verified with Google Search Grounding:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.grounding.sources.slice(0, 3).map((src, i) => (
                              <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] bg-slate-900/80 hover:bg-slate-900 border border-slate-700 rounded-md px-2 py-0.5 text-slate-300 hover:text-teal-300 transition-colors"
                              >
                                <span className="max-w-[180px] truncate">{src.title}</span>
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Referenced Places interactive cards */}
                      {msg.mapData?.places && msg.mapData.places.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80">
                          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-2">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-teal-400" />
                              <span>Places pinned on map ({msg.mapData.places.length})</span>
                            </div>
                            <span className="text-[11px] text-slate-400">Click to view on map</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.mapData.places.map((place) => {
                              const meta = getCategoryMeta(place.category);
                              const Icon = meta.icon;
                              const isSelected = selectedPlaceId === place.id;

                              return (
                                <button
                                  key={place.id}
                                  onClick={() => onSelectPlace(place)}
                                  className={`flex items-start gap-2.5 p-2 rounded-xl text-left transition-all border ${
                                    isSelected
                                      ? 'bg-teal-950/60 border-teal-500 ring-1 ring-teal-500/50'
                                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700/60 hover:border-slate-600'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg ${meta.bg} text-white shrink-0 mt-0.5`}>
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <h5 className="font-semibold text-xs text-white truncate">
                                        {place.name}
                                      </h5>
                                      {place.rating && (
                                        <span className="text-[10px] text-amber-400 font-bold shrink-0">
                                          ★ {place.rating}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {place.highlight || place.address}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Suggested Follow-up Questions */}
                      {msg.mapData?.suggestedQuestions && msg.mapData.suggestedQuestions.length > 0 && (
                        <div className="mt-3 pt-2 flex flex-wrap gap-1.5">
                          {msg.mapData.suggestedQuestions.map((q, qi) => (
                            <button
                              key={qi}
                              onClick={() => onSendMessage(q)}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-700/80 border border-slate-700 text-teal-300 hover:text-teal-200 transition-colors flex items-center gap-1"
                            >
                              <span>{q}</span>
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-teal-700 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-300 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-slate-400">Grounding location data with Google Maps & Search...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendMessage();
          }}
          className="relative flex items-end gap-2 bg-slate-800/90 border border-slate-700 focus-within:border-teal-500 rounded-xl p-1.5 transition-colors shadow-inner"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about places, vibes, routes, or local tips..."
            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none max-h-28"
          />

          <button
            type="submit"
            disabled={!userInput.trim() || isLoading}
            className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-white transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-md"
            title="Send Message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-slate-500 font-mono">
          <span>Shift+Enter for newline</span>
          <span>Powered by Gemini & Google Maps Platform</span>
        </div>
      </div>
    </div>
  );
};
