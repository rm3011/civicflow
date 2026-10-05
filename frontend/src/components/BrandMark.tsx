export default function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="var(--color-brand-900)" />
      <path
        d="M12 22C12 17 15 13 20 13C25 13 28 17 28 22V27H24V22C24 19.8 22.2 18 20 18C17.8 18 16 19.8 16 22V27H12V22Z"
        fill="var(--color-gold-500)"
      />
      <circle cx="20" cy="28" r="2.5" fill="var(--color-gold-500)" />
    </svg>
  )
}