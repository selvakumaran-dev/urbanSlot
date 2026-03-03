import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
    User, Bookmark, CalendarClock, Settings, ChevronRight,
    MapPin, Wallet, ShieldCheck, Mail, Phone, Car, Plus,
    CalendarCheck, Clock, CheckCircle2, XCircle, Navigation, FileText, X,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import SpotCard from '../components/SpotCard';
import { initSocket } from '../services/socket';

/* ── Status config ── */
const STAT_CFG = {
    active: { color: 'var(--emerald-500)', bg: 'rgba(16,185,129,0.1)', icon: Clock, label: 'Active Now' },
    confirmed: { color: 'var(--blue-500)', bg: 'rgba(59,130,246,0.1)', icon: CalendarCheck, label: 'Upcoming' },
    completed: { color: 'var(--violet-500)', bg: 'rgba(139,92,246,0.1)', icon: CheckCircle2, label: 'Completed' },
    pending: { color: 'var(--amber-500)', bg: 'rgba(245,158,11,0.1)', icon: Clock, label: 'Pending' },
    cancelled: { color: 'var(--rose-500)', bg: 'rgba(244,63,94,0.1)', icon: XCircle, label: 'Cancelled' },
    reviewed: { color: 'var(--violet-500)', bg: 'rgba(139,92,246,0.1)', icon: CheckCircle2, label: 'Reviewed' },
};
const ProfilePage = () => {
    const { user, fetchMe } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setTab] = useState('bookings');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state (Settings tab)
    const [form, setForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        plate: user?.vehicleInfo?.plate || '',
        model: user?.vehicleInfo?.model || '',
    });
    const [saving, setSaving] = useState(false);

    // Initial fetch
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                await fetchMe();
                const { data } = await api.get('/bookings/my');
                setBookings(data.data || []);
            } catch (err) {
                toast.error('Could not load profile data');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [fetchMe]);

    // Real-time socket: when host confirms, flip booking status instantly
    const [receiptOpenId, setReceiptOpenId] = useState(null);

    useEffect(() => {
        if (!user?._id) return;
        const socket = initSocket(user._id);
        const onConfirmed = ({ bookingId, spotTitle }) => {
            setBookings(prev =>
                prev.map(b => b._id === bookingId ? { ...b, status: 'confirmed', payment: { ...b.payment, status: 'paid' } } : b)
            );
            // Refresh user so navbar badge clears the new notification
            fetchMe();
            toast.success(`✅ Your booking for "${spotTitle}" is confirmed!`, { duration: 6000 });
        };
        const onCancelled = () => {
            // Refresh bookings list if the host cancelled
            api.get('/bookings/my').then(({ data }) => setBookings(data.data || []));
            fetchMe();
        };
        socket.on('booking_confirmed', onConfirmed);
        socket.on('booking_cancelled', onCancelled);
        return () => {
            socket.off('booking_confirmed', onConfirmed);
            socket.off('booking_cancelled', onCancelled);
        };
    }, [user?._id, fetchMe]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/auth/me', {
                name: form.name,
                phone: form.phone,
                vehicleInfo: { plate: form.plate, model: form.model }
            });
            await fetchMe();
            toast.success('Profile updated');
        } catch {
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // Derived booking stats
    // pending = awaiting host confirm, so it IS an upcoming booking for the driver
    const upcoming = bookings.filter(b => b.status === 'confirmed' || b.status === 'active' || b.status === 'pending');
    const past = bookings.filter(b => b.status === 'completed' || b.status === 'reviewed');
    const totalSpent = past.reduce((acc, b) => acc + (b.pricing?.total || 0), 0);
    const saved = user?.savedSpots || [];

    if (!user) return <Navigate to="/login" replace />;

    const DRIVER_TABS = [
        { id: 'bookings', label: 'Bookings', icon: CalendarClock },
        { id: 'saved', label: 'Saved', icon: Bookmark },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-2)', paddingTop: 64 }}>

            {/* ── Hero Profile Header ── */}
            <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <div className="profile-header-inner">
                    {/* Avatar */}
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'var(--blue-600)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 800, color: '#fff',
                        boxShadow: '0 8px 24px rgba(37,99,235,0.25)', border: '4px solid var(--bg)'
                    }}>
                        {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <h1 className="font-display" style={{ fontSize: 'clamp(18px,4vw,24px)', fontWeight: 800, color: 'var(--text)' }}>
                                {user.name}
                            </h1>
                            <span className="badge badge-blue">{user.role}</span>
                            {user.isVerified && <ShieldCheck size={16} color="var(--blue-500)" />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-3)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={13} /> {user.email}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={13} /> {user.phone || 'No phone'}</span>
                        </div>
                    </div>
                    {/* Mini Stats */}
                    <div className="profile-mini-stats">
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 4 }}>Upcoming</div>
                            <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{upcoming.length}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 4 }}>Saved</div>
                            <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{saved.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content Layout ── */}
            <div className="dash-layout" style={{ maxWidth: 1000 }}>

                {/* Desktop Sidebar */}
                <div className="dash-sidebar">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 96 }}>
                        {DRIVER_TABS.map((t) => {
                            const active = activeTab === t.id;
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.id} onClick={() => setTab(t.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                        borderRadius: 12, cursor: 'pointer', border: 'none',
                                        background: active ? 'var(--blue-600)' : 'transparent',
                                        color: active ? '#fff' : 'var(--text-2)',
                                        fontWeight: active ? 600 : 500, fontSize: 14.5,
                                        transition: 'all 0.15s', textAlign: 'left',
                                    }}
                                >
                                    <Icon size={18} opacity={active ? 1 : 0.6} /> {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="dash-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >

                            {/* ── TAB: Bookings ── */}
                            {activeTab === 'bookings' && (
                                loading ? <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-4)' }}>Loading trips…</div> :
                                    bookings.length === 0 ? (
                                        <div style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--bg)', border: '1px dashed var(--border-md)', borderRadius: 16 }}>
                                            <CalendarClock size={40} color="var(--text-4)" style={{ margin: '0 auto 16px' }} />
                                            <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No bookings yet</h3>
                                            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>Find your first perfect parking spot today.</p>
                                            <Link to="/search">
                                                <button className="btn btn-primary" style={{ padding: '10px 24px' }}>Explore Spots</button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {bookings.map(b => {
                                                const st = STAT_CFG[b.status] || STAT_CFG.pending;
                                                const StatusIcon = st.icon;
                                                const dStart = new Date(b.startTime);
                                                const dEnd = new Date(b.endTime);

                                                return (
                                                    <div key={b._id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex' }}>
                                                        {/* Side color ribbon */}
                                                        <div style={{ width: 4, background: st.color, flexShrink: 0 }} />

                                                        <div style={{ flex: 1, padding: 20 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                                <div>
                                                                    <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                                                                        {b.spot?.title || 'Unknown Spot'}
                                                                    </h3>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                                                                        <MapPin size={13} /> {b.spot?.address?.city || 'No address'}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: st.bg, color: st.color, borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>
                                                                    <StatusIcon size={12} /> {st.label}
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', background: 'var(--bg-3)', padding: 12, borderRadius: 10, gap: 24, marginBottom: 14 }}>
                                                                <div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>From</div>
                                                                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)' }}>{dStart.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>To</div>
                                                                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)' }}>{dEnd.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
                                                                </div>
                                                                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Paid</div>
                                                                    <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: 'var(--blue-600)' }}>₹{b.pricing?.total}</div>
                                                                </div>
                                                            </div>

                                                            <div className="booking-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                                                {/* View Receipt */}
                                                                <button
                                                                    className="btn btn-outline"
                                                                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}
                                                                    onClick={() => setReceiptOpenId(receiptOpenId === b._id ? null : b._id)}
                                                                >
                                                                    <FileText size={13} />
                                                                    {receiptOpenId === b._id ? 'Hide Receipt' : 'View Receipt'}
                                                                </button>
                                                                {/* Get Directions — only for confirmed/active */}
                                                                {(b.status === 'confirmed' || b.status === 'active') && b.spot?.location?.coordinates && (
                                                                    <a
                                                                        href={`https://www.google.com/maps/dir/?api=1&destination=${b.spot.location.coordinates[1]},${b.spot.location.coordinates[0]}`}
                                                                        target="_blank" rel="noopener noreferrer"
                                                                        style={{ textDecoration: 'none' }}
                                                                    >
                                                                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                            <Navigation size={13} /> Get Directions
                                                                        </button>
                                                                    </a>
                                                                )}
                                                            </div>

                                                            {/* Inline receipt drawer */}
                                                            <AnimatePresence>
                                                                {receiptOpenId === b._id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        style={{ overflow: 'hidden', marginTop: 14 }}
                                                                    >
                                                                        <div style={{ background: 'var(--bg-3)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', fontSize: 13 }}>
                                                                            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                <span>🧾 Booking Receipt</span>
                                                                                <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'monospace' }}>#{b._id.slice(-8).toUpperCase()}</span>
                                                                            </div>
                                                                            {[
                                                                                ['Spot', b.spot?.title || 'N/A'],
                                                                                ['Location', b.spot?.address ? `${b.spot.address.city}, ${b.spot.address.state}` : 'N/A'],
                                                                                ['Vehicle', `${b.vehicleInfo?.model || '—'} · ${b.vehicleInfo?.plate || '—'}`],
                                                                                ['Check-in', new Date(b.startTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })],
                                                                                ['Check-out', new Date(b.endTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })],
                                                                                ['Subtotal', `₹${b.pricing?.subtotal ?? '—'}`],
                                                                                ['Service Fee', `₹${b.pricing?.serviceFee ?? 0}`],
                                                                                ['Payment', b.payment?.method === 'p2p_direct' ? 'Direct P2P' : b.payment?.method || '—'],
                                                                            ].map(([label, val]) => (
                                                                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>
                                                                                    <span style={{ color: 'var(--text-4)', fontWeight: 600 }}>{label}</span>
                                                                                    <span style={{ fontWeight: 600 }}>{val}</span>
                                                                                </div>
                                                                            ))}
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 800, fontSize: 15, color: 'var(--blue-600)' }}>
                                                                                <span>Total Paid</span>
                                                                                <span>₹{b.pricing?.total ?? '—'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                            )}

                            {/* ── TAB: Saved Spots ── */}
                            {activeTab === 'saved' && (
                                saved.length === 0 ? (
                                    <div style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--bg)', border: '1px dashed var(--border-md)', borderRadius: 16 }}>
                                        <Bookmark size={40} color="var(--text-4)" style={{ margin: '0 auto 16px' }} />
                                        <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No saved spots</h3>
                                        <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>Tap the heart on any spot to save it for later.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                        {saved.map((s, i) => <SpotCard key={s._id} spot={s} index={i} />)}
                                    </div>
                                )
                            )}

                            {/* ── TAB: Settings ── */}
                            {activeTab === 'settings' && (
                                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 30 }}>
                                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Account Settings</h3>

                                    <form onSubmit={handleUpdate} className="settings-form" style={{ gap: 20, maxWidth: 460 }}>
                                        <div>
                                            <label className="label">Full Name</label>
                                            <input type="text" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                        </div>
                                        <div>
                                            <label className="label">Email Address</label>
                                            <input type="email" className="input" value={user.email} disabled style={{ background: 'var(--bg-3)', color: 'var(--text-4)', cursor: 'not-allowed' }} />
                                            <span style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4, display: 'block' }}>Email cannot be changed</span>
                                        </div>
                                        <div>
                                            <label className="label">Phone Number</label>
                                            <input type="tel" className="input" placeholder="+91 90000 00000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                        </div>

                                        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

                                        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Vehicle Detail (Mandatory)</h4>
                                        <div className="vehicle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                <label className="label">License Plate *</label>
                                                <input type="text" className="input" placeholder="e.g. TN 01 AA 1111" value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} required />
                                            </div>
                                            <div>
                                                <label className="label">Car Model *</label>
                                                <input type="text" className="input" placeholder="e.g. Honda City" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} required />
                                            </div>
                                        </div>

                                        <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 10, padding: '10px 24px' }}>
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </form>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Mobile Bottom Tab Navigation ── */}
            <nav className="dash-bottom-nav">
                {DRIVER_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = activeTab === t.id;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)} className={active ? 'active' : ''}>
                            <Icon size={20} />
                            {t.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default ProfilePage;
