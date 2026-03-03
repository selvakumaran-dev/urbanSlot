import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    SlidersHorizontal, LayoutGrid, Map, Rows, AlertCircle,
    Zap, Shield, Clock, Search, X, ChevronRight,
    Car, Bike, Truck, Navigation,
} from 'lucide-react';
import api from '../services/api';
import SpotCard from '../components/SpotCard';
import SpotSkeletonLoader from '../components/SpotSkeletonLoader';
import MapView from '../components/MapView';

/* ── Constants ── */
const SPOT_TYPES = [
    { val: 'any', label: 'Any', emoji: '🅿️' },
    { val: 'covered', label: 'Covered', emoji: '🏗️' },
    { val: 'uncovered', label: 'Open', emoji: '☀️' },
    { val: 'garage', label: 'Garage', emoji: '🏢' },
    { val: 'basement', label: 'Basement', emoji: '🏚️' },
    { val: 'valet', label: 'Valet', emoji: '🎩' },
];
const VEHICLE_TYPES = [
    { val: 'car', label: 'Car', icon: Car },
    { val: 'bike', label: 'Bike', icon: Bike },
    { val: 'suv', label: 'SUV', icon: Car },
    { val: 'truck', label: 'Truck', icon: Truck },
];
const AMENITIES = ['cctv', 'lighting', 'security', 'ev_charging', 'wheelchair', 'gated'];
const AMENITY_LABEL = {
    cctv: '📷 CCTV', lighting: '💡 Lit', security: '🛡️ Security',
    ev_charging: '⚡ EV', wheelchair: '♿ Accessible', gated: '🔒 Gated',
};
const SORT_OPTIONS = [
    { val: 'distance', lbl: 'Nearest first' },
    { val: 'price_asc', lbl: 'Price ↑' },
    { val: 'price_desc', lbl: 'Price ↓' },
    { val: 'rating', lbl: 'Top Rated' },
];

const DEFAULT_FILTERS = {
    spotType: 'any', vehicleType: 'car',
    minPrice: '', maxPrice: '', radius: 5000,
    instantBook: false, amenities: [],
};

/* ── Filter Section ── */
const Section = ({ title, children }) => (
    <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{title}</div>
        {children}
    </div>
);

/* ── Filter Sidebar ── */
const FilterPanel = ({ filters, onChange, onReset, activeCount }) => {
    const toggleAmenity = (a) => {
        const next = filters.amenities.includes(a)
            ? filters.amenities.filter(x => x !== a)
            : [...filters.amenities, a];
        onChange('amenities', next);
    };

    return (
        <motion.aside
            key="filter"
            initial={{ x: -16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -16, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            style={{
                width: 252, flexShrink: 0,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '18px 16px',
                position: 'sticky',
                /* Navbar (64) + toolbar (60) + gap (8) = 132 */
                top: 132,
                maxHeight: 'calc(100vh - 148px)',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-sm)',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <SlidersHorizontal size={14} color="var(--blue-600)" />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Filters</span>
                    {activeCount > 0 && (
                        <span style={{ fontSize: 10.5, fontWeight: 800, background: 'var(--blue-600)', color: '#fff', borderRadius: 100, padding: '1px 6px' }}>
                            {activeCount}
                        </span>
                    )}
                </div>
                {activeCount > 0 && (
                    <button onClick={onReset} style={{ fontSize: 11.5, color: 'var(--blue-600)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                        Reset all
                    </button>
                )}
            </div>

            {/* Quick toggles */}
            <Section title="Quick Filters">
                <div
                    onClick={() => onChange('instantBook', !filters.instantBook)}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${filters.instantBook ? 'var(--emerald-500)' : 'var(--border)'}`,
                        background: filters.instantBook ? 'rgba(16,185,129,0.07)' : 'var(--bg-2)',
                        transition: 'all 0.15s',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Zap size={13} color={filters.instantBook ? 'var(--emerald-500)' : 'var(--text-3)'} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: filters.instantBook ? 'var(--emerald-500)' : 'var(--text-2)' }}>Instant Book</span>
                    </div>
                    <div style={{
                        width: 32, height: 18, borderRadius: 100, background: filters.instantBook ? 'var(--emerald-500)' : 'var(--bg-3)',
                        border: `1.5px solid ${filters.instantBook ? 'var(--emerald-500)' : 'var(--border)'}`,
                        position: 'relative', transition: 'all 0.18s', flexShrink: 0,
                    }}>
                        <div style={{
                            width: 12, height: 12, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 1,
                            left: filters.instantBook ? 16 : 2,
                            transition: 'left 0.18s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                    </div>
                </div>
            </Section>

            {/* Spot type */}
            <Section title="Spot Type">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {SPOT_TYPES.map(t => {
                        const active = filters.spotType === t.val;
                        return (
                            <button key={t.val} onClick={() => onChange('spotType', t.val)}
                                style={{
                                    padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                                    border: `1.5px solid ${active ? 'var(--blue-500)' : 'var(--border)'}`,
                                    background: active ? 'rgba(37,99,235,0.08)' : 'var(--bg-2)',
                                    color: active ? 'var(--blue-600)' : 'var(--text-3)',
                                    transition: 'all 0.12s',
                                }}
                            >
                                <span style={{ fontSize: 14 }}>{t.emoji}</span> {t.label}
                            </button>
                        );
                    })}
                </div>
            </Section>

            {/* Vehicle type */}
            <Section title="Vehicle Type">
                <div style={{ display: 'flex', gap: 6 }}>
                    {VEHICLE_TYPES.map(({ val, label, icon: Icon }) => {
                        const active = filters.vehicleType === val;
                        return (
                            <button key={val} onClick={() => onChange('vehicleType', val)}
                                style={{
                                    flex: 1, padding: '8px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                    border: `1.5px solid ${active ? 'var(--blue-500)' : 'var(--border)'}`,
                                    background: active ? 'rgba(37,99,235,0.08)' : 'var(--bg-2)',
                                    color: active ? 'var(--blue-600)' : 'var(--text-3)',
                                    textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.12s',
                                }}
                            >
                                <Icon size={14} />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </Section>

            {/* Price range */}
            <Section title="Price Range (₹/hr)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['minPrice', 'Min ₹', 'from'], ['maxPrice', 'Max ₹', 'to']].map(([key, ph]) => (
                        <div key={key} style={{ position: 'relative' }}>
                            <input
                                type="number" placeholder={ph} min="0"
                                value={filters[key]}
                                onChange={e => onChange(key, e.target.value)}
                                className="input"
                                style={{ fontSize: 13, paddingLeft: 10, width: '100%' }}
                            />
                        </div>
                    ))}
                </div>
            </Section>

            {/* Amenities */}
            <Section title="Amenities">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {AMENITIES.map(a => {
                        const active = filters.amenities.includes(a);
                        return (
                            <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 0' }}>
                                <div
                                    onClick={() => toggleAmenity(a)}
                                    style={{
                                        width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                                        border: `2px solid ${active ? 'var(--blue-600)' : 'var(--border-md)'}`,
                                        background: active ? 'var(--blue-600)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.12s', cursor: 'pointer',
                                    }}
                                >
                                    {active && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                                </div>
                                <span style={{ fontSize: 12.5, color: active ? 'var(--text)' : 'var(--text-3)', fontWeight: active ? 600 : 400 }}>
                                    {AMENITY_LABEL[a]}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </Section>

            {/* Search radius */}
            <Section title="Search Radius">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>within</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-600)' }}>
                        {(filters.radius / 1000).toFixed(1)} km
                    </span>
                </div>
                <input
                    type="range" min="500" max="50000" step="500"
                    value={filters.radius}
                    onChange={e => onChange('radius', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--blue-600)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5, color: 'var(--text-4)' }}>
                    <span>0.5km</span><span>50km</span>
                </div>
            </Section>
        </motion.aside>
    );
};

/* ── Main Page ── */
const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [spots, setSpots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState('list');
    const [showFilter, setFilter] = useState(true);
    const [sortBy, setSort] = useState('distance');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [localSearch, setLocal] = useState('');

    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null;
    const q = searchParams.get('q') || '';

    const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

    /* Count active non-default filters */
    const activeFilterCount = [
        filters.spotType !== 'any',
        filters.vehicleType !== 'car',
        filters.minPrice !== '',
        filters.maxPrice !== '',
        filters.radius !== 5000,
        filters.instantBook,
        filters.amenities.length > 0,
    ].filter(Boolean).length;

    const fetchSpots = useCallback(async () => {
        if (!lat || !lng) { setLoading(false); setError(null); return; }
        setLoading(true); setError(null);
        try {
            const { data } = await api.get('/spots/search', {
                params: {
                    lat, lng,
                    radius: filters.radius,
                    ...(filters.spotType !== 'any' && { spotType: filters.spotType }),
                    vehicleType: filters.vehicleType,
                    ...(filters.minPrice && { minPrice: filters.minPrice }),
                    ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
                },
            });
            let result = data.data || [];
            if (filters.instantBook) result = result.filter(s => s.isInstantBook);
            if (filters.amenities.length > 0)
                result = result.filter(s => filters.amenities.every(a => s.amenities?.includes(a)));
            setSpots(result);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load spots.');
            setSpots([]);
        } finally {
            setLoading(false);
        }
    }, [lat, lng, filters]);

    useEffect(() => { fetchSpots(); }, [fetchSpots]);

    /* Client-side sort */
    const sortedSpots = [...spots].sort((a, b) => {
        if (sortBy === 'price_asc') return a.pricing.hourlyRate - b.pricing.hourlyRate;
        if (sortBy === 'price_desc') return b.pricing.hourlyRate - a.pricing.hourlyRate;
        if (sortBy === 'rating') return (b.rating?.average || 0) - (a.rating?.average || 0);
        return (a.distanceMeters || 0) - (b.distanceMeters || 0);
    });

    /* Local client-side title search */
    const displayed = localSearch.trim()
        ? sortedSpots.filter(s =>
            s.title.toLowerCase().includes(localSearch.toLowerCase()) ||
            s.address?.city?.toLowerCase().includes(localSearch.toLowerCase())
        )
        : sortedSpots;

    const viewIcons = [
        { key: 'list', icon: <LayoutGrid size={14} />, label: 'Grid' },
        { key: 'split', icon: <Rows size={14} />, label: 'Split' },
        { key: 'map', icon: <Map size={14} />, label: 'Map' },
    ];

    const minP = spots.length ? Math.min(...spots.map(s => s.pricing.hourlyRate)) : null;
    const maxP = spots.length ? Math.max(...spots.map(s => s.pricing.hourlyRate)) : null;

    /* ── No location landing ── */
    if (!lat && !loading) return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
            <div style={{ textAlign: 'center', maxWidth: 460 }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: 'rgba(37,99,235,0.08)',
                    border: '1.5px solid rgba(37,99,235,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px', fontSize: 36,
                }}>📍</div>
                <h2 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.03em' }}>
                    Where do you want to park?
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 28 }}>
                    Search for a city, landmark or address from the home page to find available spots near you.
                </p>
                <Link to="/">
                    <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: 15, gap: 8 }}>
                        <Navigation size={16} /> Find Parking
                    </button>
                </Link>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

            {/* ── Sticky Toolbar ── */}
            <div style={{
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
                position: 'sticky', top: 64, zIndex: 50,
            }}>
                <div className="search-toolbar-inner">

                    {/* Left: filter toggle + result count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={() => setFilter(v => !v)}
                            className="btn btn-ghost"
                            style={{ padding: '7px 12px', fontSize: 13, gap: 6, position: 'relative' }}
                        >
                            <SlidersHorizontal size={14} />
                            {showFilter ? 'Hide Filters' : 'Filters'}
                            {activeFilterCount > 0 && (
                                <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: 'var(--blue-600)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

                        <span style={{ fontSize: 13.5, color: 'var(--text-3)' }}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--blue-600)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                                    Searching…
                                </span>
                            ) : error ? (
                                <span style={{ color: 'var(--rose-500)' }}>⚠️ {error}</span>
                            ) : (
                                <>
                                    <strong style={{ color: 'var(--text)', fontWeight: 800 }}>{displayed.length}</strong>
                                    {' '}spot{displayed.length !== 1 ? 's' : ''}
                                    {q && <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}> near "{q}"</span>}
                                    {minP !== null && (
                                        <span style={{ marginLeft: 8, color: 'var(--text-4)', fontSize: 12 }}>
                                            ₹{minP}–₹{maxP}/hr
                                        </span>
                                    )}
                                </>
                            )}
                        </span>
                    </div>

                    {/* Right: inline search + sort + view */}
                    <div className="search-toolbar-right">

                        {lat && spots.length > 0 && (
                            <div className="search-inline-input" style={{ position: 'relative' }}>
                                <Search size={13} color="var(--text-4)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    placeholder="Search results…"
                                    value={localSearch}
                                    onChange={e => setLocal(e.target.value)}
                                    className="input"
                                    style={{ paddingLeft: 30, paddingRight: 28, fontSize: 13, width: 180, height: 34 }}
                                />
                                {localSearch && (
                                    <button onClick={() => setLocal('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex' }}>
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        )}

                        <select
                            value={sortBy} onChange={e => setSort(e.target.value)}
                            className="input"
                            style={{ width: 'auto', fontSize: 13, padding: '7px 10px', height: 34 }}
                        >
                            {SORT_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.lbl}</option>)}
                        </select>

                        <div style={{ display: 'flex', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, gap: 2 }}>
                            {viewIcons.map(({ key, icon, label }) => (
                                <button key={key} onClick={() => setView(key)} aria-label={`${label} view`}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '6px 11px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                        background: view === key ? 'var(--blue-600)' : 'transparent',
                                        color: view === key ? '#fff' : 'var(--text-3)',
                                        transition: 'background 0.15s, color 0.15s',
                                    }}
                                >{icon}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>

                {/* Filter sidebar */}
                <AnimatePresence>
                    {showFilter && view !== 'map' && (
                        <FilterPanel
                            filters={filters}
                            onChange={setF}
                            onReset={() => setFilters(DEFAULT_FILTERS)}
                            activeCount={activeFilterCount}
                        />
                    )}
                </AnimatePresence>

                {/* Content area */}
                <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Error */}
                    {error && !loading && lat && (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <AlertCircle size={40} color="var(--rose-500)" style={{ margin: '0 auto 16px' }} />
                            <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Could not load spots</h3>
                            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>{error}</p>
                            <button onClick={fetchSpots} className="btn btn-outline" style={{ padding: '10px 24px' }}>Try Again</button>
                        </div>
                    )}

                    {/* Map view */}
                    {!error && view === 'map' && (
                        <div style={{ height: 'calc(100vh - 160px)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <MapView spots={displayed} center={lat && lng ? [lng, lat] : null} />
                        </div>
                    )}

                    {/* Split view */}
                    {!error && view === 'split' && (
                        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 160px)' }}>
                            <div style={{ flex: '0 0 320px', overflowY: 'auto', paddingRight: 4 }}>
                                {loading ? <SpotSkeletonLoader count={4} /> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {displayed.map((s, i) => <SpotCard key={s._id} spot={s} index={i} compact />)}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <MapView spots={displayed} center={lat && lng ? [lng, lat] : null} />
                            </div>
                        </div>
                    )}

                    {/* List / Grid view */}
                    {!error && view === 'list' && (
                        loading ? <SpotSkeletonLoader count={9} /> :
                            displayed.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '70px 20px' }}>
                                    <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
                                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                                        {localSearch ? `No results for "${localSearch}"` : 'No spots found'}
                                    </h3>
                                    <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>
                                        {localSearch ? 'Try a different search term.' : 'Try expanding your radius or removing filters.'}
                                    </p>
                                    {(activeFilterCount > 0 || localSearch) && (
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                                            {localSearch && <button onClick={() => setLocal('')} className="btn btn-ghost" style={{ fontSize: 13, padding: '8px 16px' }}>Clear search</button>}
                                            {activeFilterCount > 0 && <button onClick={() => setFilters(DEFAULT_FILTERS)} className="btn btn-outline" style={{ fontSize: 13, padding: '8px 16px' }}>Reset filters</button>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Result stats row */}
                                    {!loading && displayed.length > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {[
                                                    { icon: <Zap size={12} />, label: `${displayed.filter(s => s.isInstantBook).length} Instant Book`, color: 'var(--emerald-500)' },
                                                    { icon: <Shield size={12} />, label: `${displayed.filter(s => s.amenities?.includes('cctv')).length} CCTV`, color: 'var(--blue-600)' },
                                                    { icon: <Clock size={12} />, label: '24/7 available', color: 'var(--violet-500)' },
                                                ].map(({ icon, label, color }) => (
                                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color, fontWeight: 600, background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 100, padding: '3px 10px' }}>
                                                        {icon} {label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
                                        {displayed.map((s, i) => <SpotCard key={s._id} spot={s} index={i} />)}
                                    </div>
                                </>
                            )
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default SearchPage;
