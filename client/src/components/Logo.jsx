/**
 * UrbanSlot — Premium SVG Logo Component
 *
 * Mark:  A map-pin shape whose body contains a bold "P" (for Parking)
 *        and whose tail doubles as the baseline of a subtle "U" arch —
 *        combining "Urban" + "Slot/Parking" into one cohesive mark.
 *
 * Usage: <Logo />                  → full lockup (mark + wordmark)
 *        <Logo markOnly />         → icon square only
 *        <Logo size={40} />        → custom icon size (wordmark scales proportionally)
 *        <Logo light />            → for use on dark backgrounds (text stays white)
 */

const Logo = ({
    size = 36,
    markOnly = false,
    light = false,
    className = '',
    style = {},
}) => {
    const textColor = light ? '#ffffff' : '#0f172a';
    const accentColor = '#2563eb';

    const Mark = () => (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="us-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="us-sheen" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* ── Rounded-square base ── */}
            <rect width="40" height="40" rx="11" fill="url(#us-grad)" />

            {/* ── Subtle top sheen ── */}
            <rect width="40" height="40" rx="11" fill="url(#us-sheen)" />

            {/* ── Map-pin silhouette (white) ── */}
            {/*  Outer pin shape: teardrop / rounded top, pointed bottom  */}
            <path
                d="M20 7C15.582 7 12 10.582 12 15c0 6.628 8 18 8 18s8-11.372 8-18c0-4.418-3.582-8-8-8z"
                fill="white"
                fillOpacity="0.95"
            />

            {/* ── "P" letterform cut inside the pin (using blue = same as background) ── */}
            {/* Left stem of P */}
            <rect x="16.5" y="10.5" width="2.2" height="9" rx="1.1" fill="url(#us-grad)" />
            {/* P bowl — top half circle */}
            <path
                d="M18.7 10.5h1.5a3 3 0 0 1 0 4.5h-1.5V10.5z"
                fill="url(#us-grad)"
                rx="1"
            />

            {/* ── Tiny slot indicator dots (3 dots = parking slots) ── */}
            <circle cx="15.5" cy="31" r="1" fill="white" fillOpacity="0.6" />
            <circle cx="20" cy="31" r="1" fill="white" fillOpacity="0.6" />
            <circle cx="24.5" cy="31" r="1" fill="white" fillOpacity="0.6" />
        </svg>
    );

    if (markOnly) return <Mark />;

    return (
        <div
            className={className}
            style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.25), flexShrink: 0, ...style }}
            aria-label="UrbanSlot"
        >
            <Mark />
            <span
                style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: Math.round(size * 0.48),
                    fontWeight: 800,
                    letterSpacing: '-0.035em',
                    lineHeight: 1,
                    userSelect: 'none',
                }}
            >
                <span style={{ color: textColor }}>Urban</span>
                <span style={{ color: accentColor }}>Slot</span>
            </span>
        </div>
    );
};

export default Logo;
