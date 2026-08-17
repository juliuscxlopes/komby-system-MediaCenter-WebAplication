// src/config/placeMarker.ts
//
// Ícone dos lugares salvos (Casa, Sítio, Padaria X) no mapa -- silhueta
// única preenchida, mesmo espírito minimalista dos pontinhos de POI, só que
// com forma de casa e destacada (é conteúdo do usuário, não dado do OSM).
// Âmbar combina com o ícone já usado em "Cadastrar novo lugar" no FAB.
export function buildPlaceMarkerSvg(): string {
  return `
    <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5 L22 11 L22 21.5 L2 21.5 L2 11 Z" fill="#d97706" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `;
}
