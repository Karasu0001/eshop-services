// Icono original (no es el logo real de Maruchan, esa es una marca registrada):
// un tazon de ramen estilo kawaii, con los colores de MaruchanMarket.
export default function RamenLogo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -4 64 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* palillos */}
      <line x1="24" y1="14" x2="10" y2="0" stroke="#FDFBF3" strokeWidth="4" strokeLinecap="round" />
      <line x1="30" y1="12" x2="19" y2="0" stroke="#FDFBF3" strokeWidth="4" strokeLinecap="round" />

      {/* fideos asomando */}
      <path
        d="M14 22 Q16 6 26 12 Q32 2 40 12 Q50 6 52 22 Z"
        fill="#F6E3A8"
        stroke="#07271D"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M20 16 Q24 10 28 16" stroke="#07271D" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M34 14 Q38 8 42 14" stroke="#07271D" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* tazon */}
      <path
        d="M8 26 C8 46 20 54 32 54 C44 54 56 46 56 26 Z"
        fill="#FDFBF3"
        stroke="#07271D"
        strokeWidth="3"
      />
      {/* borde del tazon */}
      <rect x="6" y="21" width="52" height="8" rx="4" fill="#8FE053" stroke="#07271D" strokeWidth="3" />

      {/* carita */}
      <circle cx="24" cy="37" r="3.4" fill="#07271D" />
      <circle cx="40" cy="37" r="3.4" fill="#07271D" />
      <circle cx="25.2" cy="35.8" r="1" fill="#fff" />
      <circle cx="41.2" cy="35.8" r="1" fill="#fff" />
      <path d="M26 42.5 Q32 47.5 38 42.5" stroke="#07271D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
