import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK on server side with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Provide Maps API key to client if needed
app.get('/api/config', (_req, res) => {
  const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBer1CbISETi0GA7HyaYsf3V0GWnuWhLr8';
  res.json({ mapsApiKey: mapsKey });
});

// Multi-turn Chat endpoint with Search Grounding
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = 'gemini-3.5-flash', userLocation, mapContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Prepare system instructions for GeoChat
    let systemInstruction = `You are GeoChat, an advanced geospatial AI concierge and interactive map companion.
You provide rich, accurate, real-time location-specific answers to user queries, including finding top-rated restaurants, cozy cafes with Wi-Fi, scenic walking routes, historical landmarks, current operating hours, vibe checks, and neighborhood recommendations worldwide.

Format your responses engagingly with markdown:
- Use clear headers, bullet points, and highlight key details (ratings, atmosphere, neighborhood, price level, best dishes/views).
- Provide practical travel tips (e.g. best time to visit, transit access, reservations).
- If the user asks about multiple spots or a walking tour, organize them sequentially.

CRITICAL REQUIREMENT:
At the very end of your response, after your conversational text, you MUST append a valid JSON block enclosed in \`\`\`json ... \`\`\` containing the geospatial data for ALL specific places, locations, or waypoints mentioned in your answer.

The JSON block must follow this exact structure:
\`\`\`json
{
  "mapAction": {
    "center": { "lat": 37.7749, "lng": -122.4194 },
    "zoom": 14,
    "locationName": "San Francisco, CA"
  },
  "places": [
    {
      "id": "place_1",
      "name": "Exact Place Name",
      "address": "Street Address, City, State/Country",
      "lat": 37.7749,
      "lng": -122.4194,
      "category": "cafe", // "restaurant" | "cafe" | "park" | "museum" | "attraction" | "bar" | "shopping" | "lodging" | "viewpoint" | "transit" | "other"
      "rating": 4.7,
      "priceLevel": "$$", // "$", "$$", "$$$", "$$$$"
      "highlight": "Short 1-sentence highlight why this place stands out",
      "tags": ["outdoor seating", "specialty coffee", "wi-fi"]
    }
  ],
  "route": {
    "title": "Optional route name if walking/driving tour",
    "waypoints": [
      { "lat": 37.7749, "lng": -122.4194, "name": "Stop 1" },
      { "lat": 37.7790, "lng": -122.4150, "name": "Stop 2" }
    ]
  },
  "suggestedQuestions": [
    "What are the best coffee roasters nearby?",
    "Show me a scenic 2-hour walking route.",
    "Are there any historic spots within walking distance?"
  ]
}
\`\`\`

Always provide realistic, accurate latitude and longitude for the places mentioned so the interactive map can drop pins and fly to the exact spots.`;

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      systemInstruction += `\n\nUser's Current GPS Location: Latitude ${userLocation.lat}, Longitude ${userLocation.lng}. When the user asks for places "near me" or "nearby", prioritize recommendations relative to these coordinates.`;
    }

    if (mapContext && mapContext.center) {
      systemInstruction += `\n\nCurrently Viewed Map Center: Latitude ${mapContext.center.lat}, Longitude ${mapContext.center.lng} (Zoom: ${mapContext.zoom || 13}, Location: ${mapContext.locationName || 'Current Map View'}). If the user's question refers to "here" or "this area", reference this map viewport.`;
    }

    // Convert messages to GenAI content format
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Configure model call with Google Search Grounding for real-time information
    const response = await ai.models.generateContent({
      model: model || 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text || '';

    // Extract search grounding metadata if present
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const searchQueries = groundingMetadata?.webSearchQueries || [];
    const groundingChunks = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Google Search Result',
      url: chunk.web?.uri || '',
    })).filter((c: any) => c.url) || [];

    // Parse JSON block from the text
    let cleanReply = fullText;
    let mapData: any = null;

    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        mapData = JSON.parse(jsonMatch[1]);
        // Strip out the json codeblock from the displayed chat text so user sees clean conversational response
        cleanReply = fullText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
      } catch (err) {
        console.warn('Failed to parse mapData JSON block:', err);
      }
    }

    res.json({
      reply: cleanReply,
      mapData,
      grounding: {
        queries: searchQueries,
        sources: groundingChunks,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      error: error.message || 'Internal Server Error',
    });
  }
});

// Proxy for Geocoding to assist map queries safely
app.get('/api/geocode', async (req, res) => {
  try {
    const { address, latlng } = req.query;
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBer1CbISETi0GA7HyaYsf3V0GWnuWhLr8';
    
    let url = '';
    if (address) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(String(address))}&key=${mapsKey}`;
    } else if (latlng) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(String(latlng))}&key=${mapsKey}`;
    } else {
      return res.status(400).json({ error: 'Address or latlng required' });
    }

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Error in /api/geocode:', error);
    res.status(500).json({ error: error.message || 'Geocoding failed' });
  }
});

// Server setup with Vite middleware in dev or static serving in prod
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GeoChat Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
