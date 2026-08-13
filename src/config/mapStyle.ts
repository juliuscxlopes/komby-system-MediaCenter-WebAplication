// src/config/mapStyle.ts
//
// Estilo minimalista pro mapa offline (tiles vetoriais do DataCenter,
// esquema OpenMapTiles gerado pelo Planetiler) -- mesma paleta slate do
// resto do app, só o essencial pra leitura em movimento: fundo, água,
// verde, prédios, vias principais e nome dos lugares. Sem poluição visual.
import type { StyleSpecification } from 'maplibre-gl';

const API_URL = import.meta.env.VITE_API_URL || '';

export function buildMapStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      kombi: {
        type: 'vector',
        url: `${API_URL}/tiles/tile.json`,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#f9f9f7' }, // page plane
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'kombi',
        'source-layer': 'landcover',
        paint: { 'fill-color': '#eef1ec', 'fill-opacity': 0.6 },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'kombi',
        'source-layer': 'park',
        paint: { 'fill-color': '#e5efe3' },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'kombi',
        'source-layer': 'water',
        paint: { 'fill-color': '#cbd9e8' },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'kombi',
        'source-layer': 'building',
        minzoom: 14,
        paint: { 'fill-color': '#e2e2df', 'fill-outline-color': '#d5d5d1' },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'minor', 'service', 'track'],
        minzoom: 12,
        paint: { 'line-color': '#e1e0d9', 'line-width': 1 },
      },
      {
        id: 'road-secondary',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'secondary', 'tertiary'],
        paint: { 'line-color': '#c3c2b7', 'line-width': 1.5 },
      },
      {
        id: 'road-primary',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'primary', 'trunk'],
        paint: { 'line-color': '#94938c', 'line-width': 2 },
      },
      {
        id: 'road-motorway',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'motorway'],
        paint: { 'line-color': '#0f172a', 'line-width': 2.5 }, // slate-900, mesma cor do RPM no gráfico
      },
      {
        id: 'boundary',
        type: 'line',
        source: 'kombi',
        'source-layer': 'boundary',
        filter: ['<=', 'admin_level', 4],
        paint: { 'line-color': '#c3c2b7', 'line-width': 1, 'line-dasharray': [3, 2] },
      },
      {
        id: 'place-city',
        type: 'symbol',
        source: 'kombi',
        'source-layer': 'place',
        filter: ['in', 'class', 'city', 'town'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
        },
        paint: { 'text-color': '#52514e', 'text-halo-color': '#f9f9f7', 'text-halo-width': 1.5 },
      },
    ],
  };
}
