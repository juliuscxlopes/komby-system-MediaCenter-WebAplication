// src/services/geocodeService.ts
//
// Busca de endereço/lugar por texto -- índice leve em Postgres (ver
// GeocodeService.js no DataCenter), não Nominatim.
const API_URL = import.meta.env.VITE_API_URL || '';

export interface GeocodeResult {
  id: number;
  label: string;
  lat: number;
  lon: number;
  score: number;
}

export const geocodeService = {
  async search(query: string): Promise<GeocodeResult[]> {
    if (!query || query.trim().length < 2) return [];

    const response = await fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });

    if (!response.ok) return [];
    return response.json();
  },
};
