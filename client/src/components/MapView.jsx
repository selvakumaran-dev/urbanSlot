import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix Leaflet's default icon path issue with Vite bundler ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Build a custom price-badge DivIcon for each spot ──
const makePriceIcon = (price, isSelected, isDynamic) => {
    const bg = isSelected
        ? 'linear-gradient(135deg,#2563eb,#7c3aed)'
        : isDynamic
            ? 'linear-gradient(135deg,#d97706,#b45309)'
            : 'linear-gradient(135deg,#1e293b,#0f172a)';

    const border = isSelected ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.18)';
    const shadow = isSelected
        ? '0 4px 18px rgba(37,99,235,0.65)'
        : '0 2px 10px rgba(0,0,0,0.55)';
    const scale = isSelected ? 'scale(1.12)' : 'scale(1)';

    return L.divIcon({
        className: '',   // prevent Leaflet adding its own default class styles
        iconAnchor: [28, 42],
        popupAnchor: [0, -46],
        html: `
      <div style="
        position: relative;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        transform: ${scale};
        transition: transform 0.18s;
      ">
        <div style="
          background: ${bg};
          border: ${border};
          box-shadow: ${shadow};
          border-radius: 10px;
          padding: 5px 10px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
          cursor: pointer;
        ">₹${price}/hr</div>
        <div style="
          width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid ${isSelected ? '#2563eb' : '#1e293b'};
          margin-top: -1px;
        "></div>
      </div>`,
    });
};

// ── Sub-component: recenter map when center prop changes ──
const Recenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView([center[1], center[0]], map.getZoom(), { animate: true });
    }, [center, map]);
    return null;
};

// ── Popup card shown when a marker is clicked ──
const SpotPopupCard = ({ spot, onClose }) => {
    const navigate = useNavigate();
    const price = spot.effectivePricing?.rate ?? spot.pricing?.hourlyRate ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.18 }}
            style={{
                width: 248,
                background: 'var(--bg-2)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                fontFamily: "'Inter', sans-serif",
            }}
        >
            {/* Image or placeholder */}
            <div style={{ height: 108, background: 'var(--bg-3)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {spot.images?.[0] ? (
                    <img src={spot.images[0]} alt={spot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(100,116,139,0.45)" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <path d="M8 12h4M8 9h8M8 15h6" />
                    </svg>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                        width: 24, height: 24, cursor: 'pointer', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <X size={12} />
                </button>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 14px 14px' }}>
                <h3 style={{
                    fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 5, fontFamily: "'Plus Jakarta Sans', sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                    {spot.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                    <MapPin size={11} color="var(--text-3)" />
                    <span style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {spot.address?.displayAddress || spot.address?.city || '—'}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                            ₹{price}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>/hr</span>
                    </div>
                    <button
                        onClick={() => navigate(`/spots/${spot._id}`)}
                        className="btn btn-primary"
                        style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8 }}
                    >
                        View Spot
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// ── Main MapView component ──
const MapView = ({ spots = [], center = null }) => {
    const [selected, setSelected] = useState(null);
    const markerRefs = useRef({});
    const defaultCenter = center
        ? [center[1], center[0]]         // [lat, lng] — Leaflet convention
        : [20.5937, 78.9629];             // India geographic center

    // Close popup when clicking outside
    const handleMapClick = () => setSelected(null);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* ── Leaflet CSS overrides to match dark theme ── */}
            <style>{`
        .leaflet-container { background: var(--bg-3) !important; font-family: 'Inter', sans-serif; }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip { display: none !important; }
        .leaflet-control-zoom a {
          background: #fff !important;
          color: var(--text) !important;
          border-color: var(--border-md) !important;
          box-shadow: var(--shadow-sm) !important;
        }
        .leaflet-control-zoom a:hover { background: var(--bg-3) !important; }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.85) !important;
          color: var(--text-3) !important;
          font-size: 10px !important;
          backdrop-filter: blur(6px);
        }
        .leaflet-control-attribution a { color: var(--blue-600) !important; }
        .leaflet-bar { border: 1px solid var(--border-md) !important; border-radius: 10px !important; overflow: hidden; box-shadow: var(--shadow-sm) !important; }
        .leaflet-bar a { border-bottom-color: var(--border) !important; }
      `}</style>

            <MapContainer
                center={defaultCenter}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                attributionControl={true}
                whenReady={(map) => map.target.on('click', handleMapClick)}
            >
                {/* CartoDB Positron — silver/light mono-toned, matches white UI, no API key */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, &copy; <a href="https://carto.com/">CARTO</a>'
                    maxZoom={19}
                />

                {/* Recenter when center prop changes */}
                <Recenter center={center} />

                {/* Spot markers */}
                {spots.map((spot) => {
                    const coords = spot.location?.coordinates;
                    if (!Array.isArray(coords) || coords.length < 2) return null;

                    const [lng, lat] = coords;
                    const isSelected = selected?._id === spot._id;
                    const price = spot.effectivePricing?.rate ?? spot.pricing?.hourlyRate ?? 0;
                    const isDynamic = !!spot.effectivePricing?.isDynamic;

                    return (
                        <Marker
                            key={spot._id}
                            position={[lat, lng]}
                            icon={makePriceIcon(price, isSelected, isDynamic)}
                            ref={(r) => { if (r) markerRefs.current[spot._id] = r; }}
                            eventHandlers={{
                                click: (e) => {
                                    e.originalEvent.stopPropagation();
                                    setSelected(isSelected ? null : spot);
                                },
                            }}
                        />
                    );
                })}
            </MapContainer>

            {/* ── Custom popup rendered in a React portal above the map ── */}
            <AnimatePresence>
                {selected && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 64,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 1000,
                            pointerEvents: 'auto',
                        }}
                    >
                        <SpotPopupCard
                            spot={selected}
                            onClose={() => setSelected(null)}
                        />
                    </div>
                )}
            </AnimatePresence>

            {/* ── Spot count overlay ── */}
            <div style={{
                position: 'absolute', bottom: 16, left: 16,
                zIndex: 999, pointerEvents: 'none',
                background: 'rgba(6,10,22,0.8)',
                backdropFilter: 'blur(6px)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text-2)',
                fontFamily: "'Inter', sans-serif",
            }}>
                {spots.length} spot{spots.length !== 1 ? 's' : ''} in area
            </div>
        </div>
    );
};

export default MapView;
