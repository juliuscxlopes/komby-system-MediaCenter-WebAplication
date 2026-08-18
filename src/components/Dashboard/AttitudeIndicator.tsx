// src/components/Dashboard/AttitudeIndicator.tsx
//
// Horizonte artificial estilo instrumento de aviação (PFD) -- rotaciona
// com o roll, desloca verticalmente com o pitch, símbolo fixo no centro
// representa a Kombi (referência). Monocromático de propósito (paleta
// slate do resto do app, não céu/terra literal) -- puramente visual, não
// interage.
interface Props {
  pitch: number; // graus, + = subida
  roll: number; // graus, + = inclinado pra um lado
  size?: number;
}

export function AttitudeIndicator({ pitch, roll, size = 128 }: Props) {
  const clampedPitch = Math.max(-30, Math.min(30, pitch));
  const translateY = clampedPitch * 2.2; // px por grau -- horizonte desce quando sobe (mais "céu" visível)

  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <clipPath id="attitude-circle">
          <circle cx="100" cy="100" r="92" />
        </clipPath>
      </defs>

      <circle cx="100" cy="100" r="96" fill="#f1f5f9" />

      <g clipPath="url(#attitude-circle)">
        <g transform={`rotate(${-roll} 100 100) translate(0 ${translateY})`}>
          <rect x="-100" y="-400" width="400" height="500" fill="#e2e8f0" />
          <rect x="-100" y="100" width="400" height="500" fill="#94a3b8" />
          <rect x="-100" y="98" width="400" height="4" fill="#f8fafc" />
        </g>
      </g>

      <circle cx="100" cy="100" r="92" fill="none" stroke="#cbd5e1" strokeWidth="6" />

      {/* Símbolo fixo -- referência da Kombi, não se move */}
      <line x1="52" y1="100" x2="85" y2="100" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
      <line x1="115" y1="100" x2="148" y2="100" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="3.5" fill="#1e293b" />
    </svg>
  );
}
