export type PlaceCategory = 
  | 'restaurant' 
  | 'cafe' 
  | 'park' 
  | 'museum' 
  | 'attraction' 
  | 'bar' 
  | 'shopping' 
  | 'lodging' 
  | 'viewpoint' 
  | 'transit' 
  | 'other';

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  rating?: number;
  priceLevel?: string;
  highlight: string;
  tags?: string[];
  photoUrl?: string;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name: string;
}

export interface RouteData {
  title: string;
  waypoints: RouteWaypoint[];
}

export interface MapAction {
  center: { lat: number; lng: number };
  zoom: number;
  locationName?: string;
}

export interface MapData {
  mapAction?: MapAction;
  places?: Place[];
  route?: RouteData;
  suggestedQuestions?: string[];
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface GroundingInfo {
  queries: string[];
  sources: GroundingSource[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  mapData?: MapData;
  grounding?: GroundingInfo;
  isError?: boolean;
}

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}
