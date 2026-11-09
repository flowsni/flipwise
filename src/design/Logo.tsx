import { useId } from 'react'

/** The Flipwise mark: two tilted cards (coral in front, plum behind) and a sun-yellow spark. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A44AA" />
          <stop offset="1" stopColor="#5B2A86" />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8577" />
          <stop offset="1" stopColor="#F25845" />
        </linearGradient>
      </defs>
      <rect
        x="9"
        y="13"
        width="29"
        height="39"
        rx="6"
        fill={`url(#${id}b)`}
        transform="rotate(-13 23.5 32.5)"
      />
      <g transform="rotate(9 34.5 35.5)">
        <rect x="20" y="16" width="29" height="39" rx="6" fill={`url(#${id}f)`} />
        <rect
          x="20.75"
          y="16.75"
          width="27.5"
          height="37.5"
          rx="5.25"
          stroke="#fff"
          strokeOpacity=".35"
          strokeWidth="1.5"
        />
        <rect x="26" y="31" width="17" height="3.5" rx="1.75" fill="#fff" fillOpacity=".9" />
        <rect x="28.5" y="38" width="12" height="3" rx="1.5" fill="#fff" fillOpacity=".55" />
      </g>
      <path
        d="M51 3.5c.9 4.9 3.1 7.1 8 8-4.9.9-7.1 3.1-8 8-.9-4.9-3.1-7.1-8-8 4.9-.9 7.1-3.1 8-8Z"
        fill="#FFC94D"
        stroke="var(--fw-bg)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={34} />
      <span className="text-[1.35rem] font-[750] tracking-[-0.02em]">Flipwise</span>
    </span>
  )
}
