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
      // [AJUSTE] Larguras eram fixas (1/1.5/2/2.5px) -- num monitor comum isso
      // é sub-pixel em boa parte dos zooms e some contra o fundo quase branco.
      // Troquei por interpolate por zoom (cresce ao aproximar, como qualquer
      // mapa de verdade) e escureci um pouco as vias menores pra ter contraste
      // mínimo contra #f9f9f7 sem sair da paleta slate/monocromática.
      {
        id: 'road-minor',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'minor', 'service', 'track'],
        minzoom: 12,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#c9c7ba',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 15, 1.4, 18, 3.2],
        },
      },
      {
        id: 'road-secondary',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'secondary', 'tertiary'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#a9a89c',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 2, 18, 4],
        },
      },
      // Vias primárias e a motorway ganham uma "casing" por baixo (linha um
      // pouco mais larga na mesma família de cinza) -- é o que faz elas
      // parecerem via de verdade em vez de traço, sem introduzir cor nova.
      {
        id: 'road-primary-casing',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'primary', 'trunk'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#78776e',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.6, 12, 2.8, 16, 4.6, 18, 6.5],
        },
      },
      {
        id: 'road-primary',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'primary', 'trunk'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f3f2ee',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 1.6, 16, 3, 18, 4.5],
        },
      },
      {
        id: 'road-motorway-casing',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'motorway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#0f172a', // slate-900, mesma cor do RPM no gráfico
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.2, 10, 2.6, 14, 4.4, 18, 7],
        },
      },
      {
        id: 'road-motorway',
        type: 'line',
        source: 'kombi',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'motorway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f3f2ee',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 1.4, 14, 2.6, 18, 4.5],
        },
      },
      {
        id: 'boundary',
        type: 'line',
        source: 'kombi',
        'source-layer': 'boundary',
        filter: ['<=', 'admin_level', 4],
        paint: { 'line-color': '#c3c2b7', 'line-width': 1, 'line-dasharray': [3, 2] },
      },
      // [AJUSTE] Faltava de vez -- só desenhava a linha da via, nunca o nome
      // dela. source-layer separado (transportation_name, não transportation)
      // porque é assim que o schema OpenMapTiles guarda o texto -- symbol-placement
      // 'line' faz o texto seguir a curva da rua em vez de um ponto fixo.
      {
        id: 'road-name',
        type: 'symbol',
        source: 'kombi',
        'source-layer': 'transportation_name',
        minzoom: 14,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-letter-spacing': 0.02,
        },
        paint: { 'text-color': '#6b6a61', 'text-halo-color': '#f9f9f7', 'text-halo-width': 1.4 },
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
      // Categorias curadas (4) em vez de toda a camada poi do OpenMapTiles --
      // com tudo ligado o mapa vira sopa de pontinhos. class/subclass são
      // checados juntos porque nem toda categoria vira "class" própria no
      // schema (oficina, por exemplo, normalmente só aparece em subclass).
      {
        id: 'poi-dot',
        type: 'circle',
        source: 'kombi',
        'source-layer': 'poi',
        minzoom: 13,
        filter: [
          'any',
          ['==', ['get', 'class'], 'fuel'],
          ['==', ['get', 'subclass'], 'fuel'],
          ['==', ['get', 'class'], 'supermarket'],
          ['==', ['get', 'subclass'], 'supermarket'],
          ['==', ['get', 'class'], 'hospital'],
          ['==', ['get', 'class'], 'pharmacy'],
          ['==', ['get', 'subclass'], 'hospital'],
          ['==', ['get', 'subclass'], 'pharmacy'],
          ['==', ['get', 'subclass'], 'car_repair'],
        ],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 6],
          'circle-color': [
            'case',
            ['any', ['==', ['get', 'class'], 'fuel'], ['==', ['get', 'subclass'], 'fuel']],
            '#f59e0b',
            ['any', ['==', ['get', 'class'], 'supermarket'], ['==', ['get', 'subclass'], 'supermarket']],
            '#16a34a',
            [
              'any',
              ['==', ['get', 'class'], 'hospital'],
              ['==', ['get', 'class'], 'pharmacy'],
              ['==', ['get', 'subclass'], 'hospital'],
              ['==', ['get', 'subclass'], 'pharmacy'],
            ],
            '#9333ea',
            '#64748b', // oficina (car_repair) e fallback
          ],
          'circle-stroke-width': 1.2,
          'circle-stroke-color': '#f9f9f7',
        },
      },
      {
        id: 'poi-label',
        type: 'symbol',
        source: 'kombi',
        'source-layer': 'poi',
        minzoom: 15,
        filter: [
          'any',
          ['==', ['get', 'class'], 'fuel'],
          ['==', ['get', 'subclass'], 'fuel'],
          ['==', ['get', 'class'], 'supermarket'],
          ['==', ['get', 'subclass'], 'supermarket'],
          ['==', ['get', 'class'], 'hospital'],
          ['==', ['get', 'class'], 'pharmacy'],
          ['==', ['get', 'subclass'], 'hospital'],
          ['==', ['get', 'subclass'], 'pharmacy'],
          ['==', ['get', 'subclass'], 'car_repair'],
        ],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: { 'text-color': '#78716c', 'text-halo-color': '#f9f9f7', 'text-halo-width': 1.2 },
      },
    ],
  };
}
