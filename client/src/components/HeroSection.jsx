import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Locate, ChevronRight, Car, Bike, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

// ── Nominatim (OSM) geocoder — no API key ──
const geocode = async (q) => {
    const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&limit=5&format=json`,
        { headers: { 'Accept-Language': 'en' } }
    );
    const data = await r.json();
    return data.map(d => ({
        id: d.place_id,
        label: d.display_name.split(',').slice(0, 3).join(', '),
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
    }));
};

const VEHICLE_OPTS = [
    { value: 'car', label: 'Car', icon: Car },
    { value: 'bike', label: 'Bike', icon: Bike },
    { value: 'suv', label: 'SUV', icon: Car },
    { value: 'truck', label: 'Truck', icon: Truck },
];


const HeroSection = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [coords, setCoords] = useState(null);
    const [vehicle, setVehicle] = useState('car');
    const [focused, setFocused] = useState(false);
    const [geocoding, setGeo] = useState(false);
    const [locating, setLocating] = useState(false);
    const debounceRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    // Live geocoding as user types
    const onType = (e) => {
        const v = e.target.value;
        setQuery(v);
        setCoords(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (v.length < 3) { setResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setGeo(true);
            try { setResults(await geocode(v)); }
            finally { setGeo(false); }
        }, 380);
    };

    const pick = (r) => {
        setQuery(r.label);
        setCoords({ lat: r.lat, lng: r.lng });
        setResults([]);
        setFocused(false);
    };

    const geoLocate = () => {
        setLocating(true);
        navigator.geolocation?.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setQuery('Current Location');
                setLocating(false);
            },
            () => { setLocating(false); },
            { timeout: 8000 }
        );
    };

    const handleSearch = () => {
        if (!isAuthenticated) {
            toast('Create a free account to find parking 🚗', {
                icon: '🔒',
                style: { borderLeft: '3px solid #2563eb' },
            });
            navigate(`/register?redirect=/search${query ? `&q=${encodeURIComponent(query)}` : ''}`);
            return;
        }
        if (!coords && !query.trim()) { inputRef.current?.focus(); return; }
        const params = new URLSearchParams({ q: query });
        if (coords) { params.set('lat', coords.lat); params.set('lng', coords.lng); }
        params.set('vehicleType', vehicle);
        navigate(`/search?${params}`);
    };

    return (
        <section className="hero-gradient" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 60px' }}>

            {/* Ambient glow orbs */}
            <div aria-hidden style={{ position: 'absolute', top: '12%', left: '15%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', top: '20%', right: '10%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: 760, width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>

                {/* Eyebrow chip */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--blue-50)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 100, padding: '5px 14px', fontSize: 12.5, fontWeight: 700, color: 'var(--blue-600)', marginBottom: 22, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue-600)', animation: 'pulse 2s infinite' }} />
                    Real-time parking near you
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        fontSize: 'clamp(38px, 6.5vw, 66px)',
                        fontWeight: 800,
                        lineHeight: 1.08,
                        letterSpacing: '-0.045em',
                        marginBottom: 0,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        color: 'var(--text)',
                    }}
                >
                    Park smarter,<br />
                    <span className="text-gradient">anywhere in India</span>
                </motion.h1>

                {/* Subheading */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                    style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-3)', margin: '16px auto 40px', lineHeight: 1.6, maxWidth: 460 }}
                >
                    Verified spots. Instant booking. Right where you need to be.
                </motion.p>


                {/* ── Search Bar ── */}
                <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.18, type: 'spring', stiffness: 200 }}
                    style={{ position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto 48px' }}
                >
                    <div className={`hero-search-container ${focused ? 'glass-blue' : 'search-pill'}`} style={{ borderRadius: 100, display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden', transition: 'box-shadow 0.2s, border-color 0.2s', ...(focused ? { borderColor: 'rgba(37,99,235,0.35)', boxShadow: '0 0 0 3px rgba(37,99,235,0.1), 0 8px 32px rgba(37,99,235,0.12)' } : {}) }}>

                        {/* Location input */}
                        <div className="search-loc-col" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderRight: '1px solid var(--border)', height: 56, width: '100%' }}>
                            <MapPin size={18} color="var(--blue-600)" style={{ flexShrink: 0 }} />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={onType}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setTimeout(() => setFocused(false), 150)}
                                placeholder="Where do you want to park?"
                                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14.5, color: 'var(--text)', fontFamily: "'Inter', sans-serif", width: '100%', minWidth: 0 }}
                            />
                            {/* Locate me */}
                            <button
                                onClick={geoLocate}
                                title="Use my location"
                                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: locating ? 'var(--blue-600)' : 'var(--text-4)', transition: 'color 0.15s' }}
                            >
                                <Locate size={16} style={locating ? { animation: 'spin 1s linear infinite' } : {}} />
                            </button>
                        </div>

                        {/* Vehicle type */}
                        <div className="search-vehicle-col" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 56, flexShrink: 0, overflowX: 'auto' }}>
                            {VEHICLE_OPTS.map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setVehicle(value)}
                                    title={label}
                                    style={{
                                        background: vehicle === value ? 'var(--blue-600)' : 'var(--bg-3)',
                                        border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        color: vehicle === value ? '#fff' : 'var(--text-3)',
                                        transition: 'background 0.15s, color 0.15s',
                                    }}
                                >
                                    <Icon size={14} />
                                </button>
                            ))}
                        </div>

                        {/* Search button */}
                        <button
                            onClick={handleSearch}
                            className="btn btn-primary search-btn-col"
                            style={{ margin: 6, borderRadius: 100, padding: '0 22px', height: 44, fontSize: 14, fontWeight: 700, flexShrink: 0, gap: 7 }}
                        >
                            <Search size={15} /> <span className="hide-mobile-text">Search</span>
                        </button>
                    </div>

                    {/* Suggestions dropdown */}
                    <AnimatePresence>
                        {focused && (results.length > 0 || geocoding) && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-xl)', zIndex: 40 }}
                            >
                                {geocoding && (
                                    <div style={{ padding: '12px 18px', fontSize: 13, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--blue-600)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                                        Searching…
                                    </div>
                                )}
                                {results.map((r) => (
                                    <button
                                        key={r.id}
                                        onMouseDown={() => pick(r)}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                        <MapPin size={14} color="var(--blue-600)" style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.label}</span>
                                        <ChevronRight size={13} color="var(--text-4)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </section>
    );
};

export default HeroSection;
