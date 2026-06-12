// Adinkra symbol data — pure module so react-refresh/only-export-components
// is satisfied in AdinkraMark.jsx (which may only export the component).
// Render functions return JSX, so this file is .jsx.

export const ADINKRA_SYMBOLS = {
  adinkrahene: {
    name: 'Adinkrahene',
    meaning: 'greatness, leadership, and charisma — the chief of the Adinkra symbols',
    render: (stroke) => (
      <>
        <circle cx="50" cy="50" r="46" fill="none" stroke={stroke} strokeWidth="6" />
        <circle cx="50" cy="50" r="31" fill="none" stroke={stroke} strokeWidth="6" />
        <circle cx="50" cy="50" r="16" fill="none" stroke={stroke} strokeWidth="6" />
        <circle cx="50" cy="50" r="5" fill={stroke} />
      </>
    ),
  },
  gyenyame: {
    name: 'Gye Nyame',
    meaning: 'except for God — the supremacy and omnipotence of God',
    render: (stroke) => (
      <>
        {/* central sweeping column with terminal curls */}
        <path
          d="M38 12 C58 12 64 24 56 34 C50 41 42 44 42 52 C42 60 50 63 56 70 C64 80 58 88 38 88"
          fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round"
        />
        {/* knobbed protrusions, four per side */}
        <circle cx="68" cy="22" r="6" fill={stroke} />
        <circle cx="74" cy="40" r="6" fill={stroke} />
        <circle cx="74" cy="60" r="6" fill={stroke} />
        <circle cx="68" cy="78" r="6" fill={stroke} />
        <circle cx="22" cy="26" r="6" fill={stroke} />
        <circle cx="17" cy="44" r="6" fill={stroke} />
        <circle cx="17" cy="62" r="6" fill={stroke} />
        <circle cx="22" cy="80" r="6" fill={stroke} />
      </>
    ),
  },
  sankofa: {
    name: 'Sankofa',
    meaning: 'go back and retrieve it — learning from the past, remembrance',
    render: (stroke) => (
      <>
        {/* stylized heart form with inward-turning crowns */}
        <path
          d="M50 90 C26 70 12 52 14 36 C16 24 26 18 36 22 C44 25 48 33 50 40 C52 33 56 25 64 22 C74 18 84 24 86 36 C88 52 74 70 50 90 Z"
          fill="none" stroke={stroke} strokeWidth="7" strokeLinejoin="round"
        />
        <path d="M36 22 C32 14 38 8 45 11" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <path d="M64 22 C68 14 62 8 55 11" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
      </>
    ),
  },
}
