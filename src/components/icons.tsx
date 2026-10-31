type P = { className?: string; size?: number };

export function ArrowRight({ className, size = 16 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function ChevronDown({ className, size = 12 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

export function MenuIcon({ className, size = 22 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  );
}

export function CloseIcon({ className, size = 22 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PhoneIcon({ className, size = 18 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

export function MailIcon({ className, size = 18 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function PinIcon({ className, size = 18 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

/** Brand motif: the profile's curved band, drawn as concentric arcs. */
export function ArcMotif({ className, accent = "#e8622a" }: { className?: string; accent?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1000 1000" fill="none" className={className}>
      <circle cx="500" cy="500" r="490" stroke="#fff" strokeOpacity="0.06" />
      <circle cx="500" cy="500" r="430" stroke="#fff" strokeOpacity="0.07" />
      <circle cx="500" cy="500" r="370" stroke={accent} strokeWidth="64" strokeDasharray="760 1565" transform="rotate(92 500 500)" />
      <circle cx="500" cy="500" r="300" stroke="#fff" strokeOpacity="0.08" />
      <circle cx="500" cy="500" r="300" stroke={accent} strokeWidth="2" strokeDasharray="380 1505" transform="rotate(150 500 500)" />
      <circle cx="500" cy="500" r="240" stroke="#fff" strokeOpacity="0.06" />
      <circle cx="500" cy="500" r="180" stroke="#fff" strokeOpacity="0.05" />
    </svg>
  );
}

export function SecurityLayers({ className }: { className?: string }) {
  const rings = [
    { r: 300, fill: "#151c21", label: "Perimeter & physical" },
    { r: 250, fill: "#1b242a", label: "Network & system" },
    { r: 200, fill: "#212c33", label: "Email" },
    { r: 150, fill: "#28353d", label: "Endpoint" },
    { r: 100, fill: "#304049", label: "Identity & MFA" },
  ];
  return (
    <svg
      role="img"
      aria-label="Six layers of security around your data: perimeter, network, email, endpoint, identity and data"
      viewBox="0 0 640 640"
      className={className}
    >
      {rings.map((ring, i) => (
        <circle key={ring.r} cx="320" cy="320" r={ring.r} fill={ring.fill} stroke={i === 0 ? "#e8622a" : undefined} strokeWidth={i === 0 ? 2 : undefined} />
      ))}
      <circle cx="320" cy="320" r="50" fill="#e8622a" />
      <g fontFamily="Inter Variable, Inter, sans-serif" fontSize="15" fontWeight="500" fill="#dde3e6" textAnchor="middle">
        {rings.map((ring) => (
          <text key={ring.label} x="320" y={320 - ring.r + 30}>
            {ring.label}
          </text>
        ))}
        <text x="320" y="325" fill="#111417" fontWeight="700">
          Your data
        </text>
      </g>
    </svg>
  );
}
