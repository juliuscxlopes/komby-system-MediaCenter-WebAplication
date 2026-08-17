// src/config/vehicleMarker.ts
//
// Avatar do veículo no mapa ao vivo -- ícone + cor escolhidos em
// Configurações > Avatar (AvatarSection.tsx), persistidos em
// veiculos.marker_icon/marker_color (ver migration 10_VehicleMarker no
// DataCenter). Uma função só gerando o SVG cru (string, não JSX) porque os
// dois consumidores precisam do mesmo desenho: o marcador do MapLibre
// (elemento DOM puro, via innerHTML -- não dá pra montar árvore React ali)
// e o preview da tela de configurações (dangerouslySetInnerHTML). Uma fonte
// só, pra não ter duas versões do ícone divergindo com o tempo.
export type VehicleMarkerIcon = 'arrow' | 'van' | 'car';

export const VEHICLE_MARKER_ICONS: { value: VehicleMarkerIcon; label: string }[] = [
  { value: 'arrow', label: 'Seta' },
  { value: 'van', label: 'Van' },
  { value: 'car', label: 'Carro' },
];

// Paleta curta e de propósito -- cor livre também dá (input color na seção
// de Avatar), essas são só atalhos que combinam com a paleta slate do resto
// do app.
export const VEHICLE_MARKER_COLORS = [
  '#0f172a', // slate-900 (padrão)
  '#1d4ed8', // blue-700
  '#b45309', // amber-700
  '#b91c1c', // red-700
  '#15803d', // green-700
  '#7e22ce', // purple-700
];

const WHEEL = (cx: number, cy: number) =>
  `<circle cx="${cx}" cy="${cy}" r="1.5" fill="#1e293b" stroke="white" stroke-width="0.6"/>`;

const ICON_MARKUP: Record<VehicleMarkerIcon, string> = {
  arrow: '<path d="M12 5 L16.5 16 L12 13 L7.5 16 Z" fill="white" />',
  van: `<rect x="5" y="6.5" width="14" height="8" rx="1.8" fill="white"/>${WHEEL(9, 16.5)}${WHEEL(15, 16.5)}`,
  car: `<rect x="6" y="8.5" width="12" height="6" rx="3" fill="white"/>${WHEEL(9, 15)}${WHEEL(15, 15)}`,
};

export function buildVehicleMarkerSvg(icon: string | undefined, color: string | undefined, size = 30): string {
  const key: VehicleMarkerIcon = icon && icon in ICON_MARKUP ? (icon as VehicleMarkerIcon) : 'arrow';
  const fill = color || '#0f172a';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${fill}" stroke="white" stroke-width="2.5"/>${ICON_MARKUP[key]}</svg>`;
}

// Disparado depois de salvar o avatar em Configurações -- o MapComponent
// (se estiver montado, o modal de settings fica por cima dele na mesma
// árvore) escuta e reconstrói o marcador sem precisar recarregar a página.
export const VEHICLE_MARKER_UPDATED_EVENT = 'vehicle-marker-updated';
