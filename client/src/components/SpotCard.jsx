import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Zap, ShieldCheck, Heart, Navigation, Clock } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const TYPE_CFG = {
    covered: { label: 'Covered', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    uncovered: { label: 'Open Lot', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    basement: { label: 'Basement', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
    garage: { label: 'Garage', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    valet: { label: 'Valet', color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
};

const AMENITY_ICONS = {
    cctv: '📷', lighting: '💡', security: '🛡️',
    ev_charging: '⚡', gated: '🔒', wheelchair: '♿',
};

const fmtDist = (m) => {
    if (!m && m !== 0) return null;
    return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
};

const SpotCard = ({ spot, index = 0, compact = false }) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const {
        _id, title, address, pricing, images, rating, spotType,
        amenities = [], effectivePricing, isInstantBook,
        host, distanceMeters, availableHours,
    } = spot;

    const rate = effectivePricing?.rate ?? pricing?.hourlyRate ?? 0;
    const isDynamic = !!effectivePricing?.isDynamic;
    const typeInfo = TYPE_CFG[spotType] || TYPE_CFG.uncovered;
    const img = images?.[0] || null;
    const stars = rating?.average || 0;
    const reviews = rating?.count || 0;
    const dist = fmtDist(distanceMeters);

    /* Saved state — optimistic */
    const isSavedInit = user?.savedSpots?.includes(_id) || false;
    const [saved, setSaved] = useState(isSavedInit);
    const [savingSpot, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.stopPropagation();
        if (!user) { toast('Sign in to save spots', { icon: '🔒' }); return; }
        setSaving(true);
        const next = !saved;
        setSaved(next); // optimistic
        try {
            await api.post(`/spots/${_id}/save`);
            toast.success(next ? 'Spot saved!' : 'Removed from saved');
        } catch {
            setSaved(!next); // revert
            toast.error('Could not update saved spots');
        } finally {
            setSaving(false);
        }
    };

    /* Compact (split view) card */
    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.26 }}
                onClick={() => navigate(`/spots/${_id}`)}
                style={{
                    display: 'flex', gap: 12, padding: '12px 14px',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 14, cursor: 'pointer',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.25)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
                {/* Thumbnail */}
                <div style={{ width: 72, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-3)' }}>
                    {img ? <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🅿️</div>
                    )}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 4 }}>{address?.city}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="font-display" style={{ fontSize: 14, fontWeight: 800, color: isDynamic ? '#d97706' : 'var(--blue-600)' }}>₹{rate}/hr</span>
                        {dist && <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{dist}</span>}
                    </div>
                </div>
            </motion.div>
        );
    }

    /* Full card */
    return (
        <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
            onClick={() => navigate(`/spots/${_id}`)}
            style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'box-shadow 0.25s, border-color 0.2s, transform 0.25s',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(37,99,235,0.22)';
                e.currentTarget.style.boxShadow = '0 8px 40px rgba(15,23,42,0.11)';
                e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
            role="button" tabIndex={0} aria-label={`View ${title}`}
            onKeyDown={e => e.key === 'Enter' && navigate(`/spots/${_id}`)}
        >
            {/* ── Image ── */}
            <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg-3)', overflow: 'hidden' }}>
                {img ? (
                    <img src={img} alt={title} loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                        onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-4)' }}>
                        <span style={{ fontSize: 36 }}>🅿️</span>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>No photo yet</span>
                    </div>
                )}

                {/* Scrim */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)', pointerEvents: 'none' }} />

                {/* Top‑left: type badge */}
                <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: typeInfo.bg, border: `1px solid ${typeInfo.color}30`,
                    borderRadius: 100, padding: '3px 10px',
                    fontSize: 11, fontWeight: 700, color: typeInfo.color,
                    backdropFilter: 'blur(6px)',
                }}>
                    {typeInfo.label}
                </div>

                {/* Top‑right: save heart */}
                <button
                    onClick={handleSave}
                    disabled={savingSpot}
                    aria-label={saved ? 'Unsave spot' : 'Save spot'}
                    style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(6px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Heart size={14} fill={saved ? '#f43f5e' : 'none'} color={saved ? '#f43f5e' : '#64748b'} />
                </button>

                {/* Bottom‑left: distance */}
                {dist && (
                    <div style={{
                        position: 'absolute', bottom: 10, left: 12,
                        background: 'rgba(0,0,0,0.52)', borderRadius: 8, padding: '3px 8px',
                        fontSize: 11, fontWeight: 700, color: '#fff',
                        display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(4px)',
                    }}>
                        <Navigation size={10} /> {dist}
                    </div>
                )}

                {/* Bottom‑right: price */}
                <div style={{ position: 'absolute', bottom: 10, right: 12 }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.96)', borderRadius: 10, padding: '5px 10px',
                        backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(15,23,42,0.15)',
                        display: 'flex', alignItems: 'baseline', gap: 3,
                    }}>
                        {isDynamic && <Zap size={10} color="#d97706" />}
                        <span className="font-display" style={{ fontSize: 16, fontWeight: 800, color: isDynamic ? '#d97706' : 'var(--blue-600)' }}>
                            ₹{rate}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>/hr</span>
                    </div>
                </div>

                {/* Instant book badge */}
                {isInstantBook && (
                    <div style={{
                        position: 'absolute', bottom: 46, right: 12,
                        background: 'rgba(16,185,129,0.92)', borderRadius: 100, padding: '2px 8px',
                        fontSize: 10.5, fontWeight: 700, color: '#fff',
                        display: 'flex', alignItems: 'center', gap: 3, backdropFilter: 'blur(4px)',
                    }}>
                        <Zap size={9} fill="#fff" /> Instant
                    </div>
                )}
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '14px 16px 16px' }}>

                {/* Title + verified */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                    <h3 className="font-display" style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {title}
                    </h3>
                    <ShieldCheck size={15} color="var(--blue-600)" title="Verified listing" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>

                {/* Address */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                    <MapPin size={11} color="var(--text-4)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {address?.displayAddress || address?.city || '—'}
                    </span>
                </div>

                {/* Hours */}
                {availableHours && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                        <Clock size={11} color="var(--text-4)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, color: 'var(--text-4)' }}>
                            {availableHours.start} – {availableHours.end}
                        </span>
                    </div>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />

                {/* Bottom row: rating + amenities */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Rating */}
                    {stars > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Star size={12} fill="#fbbf24" color="#fbbf24" />
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)' }}>{stars.toFixed(1)}</span>
                            <span style={{ fontSize: 11.5, color: 'var(--text-4)' }}>({reviews})</span>
                        </div>
                    ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--text-4)', fontStyle: 'italic' }}>New listing</span>
                    )}

                    {/* Amenity icons */}
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap', overflow: 'hidden', maxWidth: 120 }}>
                        {amenities.slice(0, 4).map(a => (
                            <span key={a} title={a} style={{ fontSize: 13, lineHeight: 1 }}>{AMENITY_ICONS[a] || '•'}</span>
                        ))}
                        {amenities.length > 4 && (
                            <span style={{ fontSize: 10.5, color: 'var(--text-4)', alignSelf: 'center' }}>+{amenities.length - 4}</span>
                        )}
                    </div>
                </div>

                {/* Host info (subtle) */}
                {host?.name && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--slate-800)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
                        }}>
                            {host.name[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Hosted by <strong style={{ color: 'var(--text)' }}>{host.name.split(' ')[0]}</strong></span>
                    </div>
                )}
            </div>
        </motion.article>
    );
};

export default SpotCard;
