import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
    TrendingUp, IndianRupee, Car, Percent, Activity,
    AlertCircle, ArrowUpRight, LayoutDashboard, Plus, MapPin, Settings, Wallet,
    ToggleLeft, ToggleRight, Trash2, AlertTriangle, CheckCircle2, Loader,
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { initSocket, getSocket } from '../services/socket';

/* ── Animated stat card ── */
const StatCard = ({ icon: Icon, iconColor, label, value, sub, subPositive, delay }) => (
    <motion.div
        className="card"
        style={{ padding: 20 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.38 }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{label}</div>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${iconColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
                <Icon size={17} />
            </div>
        </div>
        <div className="font-display" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{value}</div>
        {sub && (
            <div style={{ fontSize: 12, color: subPositive ? 'var(--emerald-400)' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {subPositive && <ArrowUpRight size={12} />}
                {sub}
            </div>
        )}
    </motion.div>
);

/* ── Custom tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
            <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                ₹{payload[0]?.value?.toFixed(0)}
            </div>
        </div>
    );
};

const STATUS_COLOR = {
    confirmed: 'var(--blue-400)',
    active: 'var(--emerald-400)',
    completed: 'var(--text-3)',
    pending: 'var(--amber-400)',
    cancelled: 'var(--rose-500)',
    reviewed: 'var(--violet-500)',
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    return 'Good evening';
};

const HostDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const { user, fetchMe } = useAuthStore();
    const pm = user?.payoutMethods || {};

    // Inline spot actions
    const [spotActionLoading, setSpotActionLoading] = useState({}); // { [spotId]: 'toggle' | 'delete' }
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmingBookingId, setConfirmingBookingId] = useState(null);

    const handleConfirmBooking = async (bookingId) => {
        setConfirmingBookingId(bookingId);
        try {
            await api.put(`/bookings/${bookingId}/confirm`);
            toast.success('✅ Booking confirmed! Driver has been notified.');
            // Refresh dashboard data so table updates
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to confirm booking');
        } finally {
            setConfirmingBookingId(null);
        }
    };

    const handleToggleActive = async (spot) => {
        setSpotActionLoading(s => ({ ...s, [spot._id]: 'toggle' }));
        try {
            await api.put(`/spots/${spot._id}`, { isActive: !spot.isActive });
            setData(d => ({
                ...d,
                spots: d.spots.map(s => s._id === spot._id ? { ...s, isActive: !s.isActive } : s),
            }));
            toast.success(spot.isActive ? 'Spot deactivated — hidden from drivers' : 'Spot activated — now visible to drivers');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update spot');
        } finally {
            setSpotActionLoading(s => ({ ...s, [spot._id]: null }));
        }
    };

    const handleDeleteSpot = async (spotId) => {
        setSpotActionLoading(s => ({ ...s, [spotId]: 'delete' }));
        try {
            await api.delete(`/spots/${spotId}`);
            setData(d => ({ ...d, spots: d.spots.filter(s => s._id !== spotId) }));
            toast.success('Spot deleted successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete spot');
        } finally {
            setSpotActionLoading(s => ({ ...s, [spotId]: null }));
            setConfirmDeleteId(null);
        }
    };

    // Settings form
    const [form, setForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
    });
    const [saving, setSaving] = useState(false);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/auth/me', {
                name: form.name,
                phone: form.phone,
            });
            await fetchMe();
            toast.success('Host settings updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    // Payout settings form
    const [payoutForm, setPayoutForm] = useState({
        bankName: pm.bankName || '',
        accountNumber: pm.accountNumber || '',
        upiId: pm.upiId || ''
    });
    const [editingPayout, setEditingPayout] = useState(false);
    const [savingPayout, setSavingPayout] = useState(false);

    const handleUpdatePayout = async (e) => {
        e.preventDefault();
        setSavingPayout(true);
        try {
            await api.put('/auth/me', {
                payoutMethods: payoutForm,
            });
            await fetchMe();
            toast.success('Payout methods updated successfully');
            setEditingPayout(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update payout settings');
        } finally {
            setSavingPayout(false);
        }
    };

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: r } = await api.get('/bookings/host/dashboard');

            // Generate last 7 days baseline
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            // Map frontend baseline with real backend timeline data
            const baselineChart = last7Days.map(date => {
                const existingDay = r.data.earningsChart?.find(item => item._id === date);
                return existingDay || { _id: date, earnings: 0, bookings: 0 };
            });

            setData({ ...r.data, earningsChart: baselineChart });
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const socket = initSocket(user?._id || '');
        const handleNewBooking = (b) => {
            load(); // Automatically refresh data without throwing a noisy popup overlay
        };
        socket.on('new_booking', handleNewBooking);
        return () => { socket.off('new_booking', handleNewBooking); };
    }, [user]);

    if (loading) return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2.5px solid var(--blue-600)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Loading your dashboard…</p>
            </div>
            <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <AlertCircle size={40} color="var(--rose-500)" style={{ margin: '0 auto 16px' }} />
                <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Dashboard unavailable</h2>
                <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24, lineHeight: 1.6 }}>{error}</p>
                <button onClick={load} className="btn btn-primary" style={{ padding: '10px 24px' }}>Retry</button>
            </div>
        </div>
    );

    if (!data) return null;

    const HOST_TABS = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'spots', label: 'Locations', icon: MapPin },
        { id: 'payouts', label: 'Payouts', icon: Wallet },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-2)', paddingTop: 64 }}>

            {/* ── Hero Header ── */}
            <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <div className="dash-hero-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'var(--blue-600)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 800, color: '#fff',
                        boxShadow: '0 8px 24px rgba(37,99,235,0.25)', border: '4px solid var(--bg)'
                    }}>
                        {user?.name?.[0]?.toUpperCase() || 'H'}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <h1 className="font-display" style={{ fontSize: 'clamp(18px,4vw,24px)', fontWeight: 800, color: 'var(--text)' }}>
                                {user?.name}
                            </h1>
                            <span className="badge badge-green" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--emerald-600)' }}>Host</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            {data.spots?.length || 0} location{data.spots?.length !== 1 ? 's' : ''} on UrbanSlot
                        </div>
                    </div>
                    <Link to="/spots/new" className="dash-hero-btn" style={{ display: 'flex' }}>
                        <button className="btn btn-primary" style={{ padding: '11px 22px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 20px rgba(37,99,235,0.3)' }}>
                            <Plus size={17} /> Add Spot
                        </button>
                    </Link>
                </div>
            </div>

            {/* ── Main Content Layout ── */}
            <div className="dash-layout">

                {/* Desktop Sidebar */}
                <div className="dash-sidebar">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 96 }}>
                        {HOST_TABS.map((t) => {
                            const active = activeTab === t.id;
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.id} onClick={() => setActiveTab(t.id)}
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

                {/* Content Area */}
                <div className="dash-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >

                            {/* ── TAB: Overview ── */}
                            {activeTab === 'overview' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', padding: '5px 12px', borderRadius: 100 }}>
                                                    <Activity size={14} color="var(--emerald-600)" />
                                                    <span style={{ fontSize: 12, color: 'var(--emerald-600)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Dashboard</span>
                                                </div>
                                            </div>
                                            <h2 className="font-display dash-greeting" style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                                {getGreeting()}, <span style={{ color: 'var(--blue-600)' }}>{user?.name?.split(' ')[0]}</span>
                                            </h2>
                                            <p style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 8 }}>Here is what is happening with your listed parking spots right now.</p>
                                        </div>
                                    </div>

                                    {/* Stat Cards */}
                                    <div className="stat-grid-4">
                                        <StatCard icon={IndianRupee} iconColor="var(--blue-500)" label="Earnings This Month" value={`₹${data.monthly.earnings.toLocaleString('en-IN')}`} sub={data.monthly.earnings > 0 ? 'Generating Revenue' : 'Awaiting Bookings'} subPositive={data.monthly.earnings > 0} delay={0.05} />
                                        <StatCard icon={Car} iconColor="var(--cyan-500)" label="Bookings This Month" value={data.monthly.bookings} sub={`Across ${data.spots.length} listed spots`} delay={0.1} />
                                        <StatCard icon={Percent} iconColor="var(--amber-500)" label="Occupancy Rate" value={`${data.occupancyRate}%`} sub={data.occupancyRate > 0 ? (data.occupancyRate > 65 ? '🔥 High Demand' : '📈 Growing') : 'No capacity used'} delay={0.15} />
                                        <StatCard icon={TrendingUp} iconColor="var(--violet-500)" label="All-Time Earnings" value={`₹${data.allTime.earnings.toLocaleString('en-IN')}`} sub={`${data.allTime.bookings} lifetime trips`} delay={0.2} />
                                    </div>



                                    {/* ── Recent Bookings ── */}
                                    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                                        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Recent Bookings</span>
                                            <Link to="/host/bookings" style={{ fontSize: 13, color: 'var(--blue-400)', fontWeight: 600 }}>View all →</Link>
                                        </div>
                                        <div className="table-scroll">
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table">
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                        {['Driver', 'Spot', 'Amount', 'Status', 'Date'].map(h => (
                                                            <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.recentBookings.map((b, i) => (
                                                        <tr key={b._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <td style={{ padding: '13px 20px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `hsl(${210 + i * 25}, 70%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                                        {b.driver?.name?.[0] || 'U'}
                                                                    </div>
                                                                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{b.driver?.name || 'Unknown Driver'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-2)', maxWidth: 160 }}>
                                                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.spot?.title || 'Unknown Spot'}</span>
                                                            </td>
                                                            <td style={{ padding: '13px 20px' }}>
                                                                <span className="font-display" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>₹{b.pricing.total}</span>
                                                            </td>
                                                            <td style={{ padding: '13px 20px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                    <span className="badge" style={{ background: `18`, color: STATUS_COLOR[b.status], border: `1px solid 35` }}>
                                                                        {b.status}
                                                                    </span>
                                                                    {b.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => handleConfirmBooking(b._id)}
                                                                            disabled={confirmingBookingId === b._id}
                                                                            style={{
                                                                                display: 'flex', alignItems: 'center', gap: 5,
                                                                                padding: '4px 11px', borderRadius: 7, border: 'none',
                                                                                background: '#16a34a', color: '#fff',
                                                                                fontSize: 11.5, fontWeight: 700,
                                                                                cursor: confirmingBookingId === b._id ? 'not-allowed' : 'pointer',
                                                                                opacity: confirmingBookingId === b._id ? 0.7 : 1,
                                                                                transition: 'opacity 0.15s',
                                                                            }}
                                                                        >
                                                                            {confirmingBookingId === b._id
                                                                                ? <Loader size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
                                                                                : <CheckCircle2 size={11} />}
                                                                            {confirmingBookingId === b._id ? 'Confirming...' : 'Confirm'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '13px 20px', fontSize: 12.5, color: 'var(--text-3)' }}>
                                                                {new Date(b.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* ── TAB: My Locations ── */}
                            {activeTab === 'spots' && (
                                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 30 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                        <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>My Locations</h3>
                                        <Link to="/spots/new">
                                            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, background: 'var(--blue-600)', border: 'none' }}>
                                                <Plus size={15} /> Add New Spot
                                            </button>
                                        </Link>
                                    </div>
                                    {data.spots.length === 0 ? (
                                        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-2)', borderRadius: 12 }}>
                                            <MapPin size={40} color="var(--text-4)" style={{ margin: '0 auto 16px' }} />
                                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>No spots listed</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, marginBottom: 16 }}>Start earning by adding your first spot.</div>
                                            <Link to="/spots/new">
                                                <button className="btn btn-primary" style={{ padding: '8px 18px' }}>Add Spot</button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: 14 }}>
                                            {data.spots.map((spot) => {
                                                const actionLoading = spotActionLoading[spot._id];
                                                const isConfirmingDelete = confirmDeleteId === spot._id;
                                                return (
                                                    <div key={spot._id} style={{
                                                        border: `1px solid ${spot.isActive ? 'var(--border)' : 'rgba(244,63,94,0.25)'}`,
                                                        borderRadius: 14,
                                                        background: spot.isActive ? 'var(--bg)' : 'rgba(244,63,94,0.03)',
                                                        overflow: 'hidden',
                                                        transition: 'border-color 0.2s',
                                                    }}>
                                                        {/* Main row */}
                                                        <div className="spot-row-inner" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                                            {/* Left: icon + info */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                                <div style={{
                                                                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                                                                    background: spot.isActive ? 'var(--blue-50)' : 'rgba(244,63,94,0.08)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: spot.isActive ? 'var(--blue-600)' : 'var(--rose-400)',
                                                                }}>
                                                                    <MapPin size={20} />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{spot.title}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                                                        <span style={{
                                                                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                                                            padding: '2px 8px', borderRadius: 100,
                                                                            background: spot.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                                                                            color: spot.isActive ? 'var(--emerald-600)' : 'var(--rose-500)',
                                                                        }}>
                                                                            {spot.isActive ? '● Active' : '● Inactive'}
                                                                        </span>
                                                                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>₹{spot.pricing?.hourlyRate}/hr</span>
                                                                        <span style={{ fontSize: 12, color: 'var(--text-4)', textTransform: 'capitalize' }}>{spot.spotType}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Right: action buttons */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                {/* Toggle Active / Inactive */}
                                                                <button
                                                                    onClick={() => handleToggleActive(spot)}
                                                                    disabled={!!actionLoading}
                                                                    title={spot.isActive ? 'Deactivate listing' : 'Activate listing'}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: 6,
                                                                        padding: '6px 14px', borderRadius: 8, border: 'none',
                                                                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                                                                        fontWeight: 600, fontSize: 12.5,
                                                                        opacity: actionLoading === 'toggle' ? 0.6 : 1,
                                                                        background: spot.isActive ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.12)',
                                                                        color: spot.isActive ? 'var(--rose-500)' : 'var(--emerald-600)',
                                                                        transition: 'all 0.15s',
                                                                    }}
                                                                >
                                                                    {actionLoading === 'toggle'
                                                                        ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                                                        : spot.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />
                                                                    }
                                                                    {spot.isActive ? 'Deactivate' : 'Activate'}
                                                                </button>

                                                                {/* Manage */}
                                                                <Link to={`/host/spots/${spot._id}`}>
                                                                    <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12.5 }}>Manage</button>
                                                                </Link>

                                                                {/* Delete */}
                                                                {!isConfirmingDelete ? (
                                                                    <button
                                                                        onClick={() => setConfirmDeleteId(spot._id)}
                                                                        disabled={!!actionLoading}
                                                                        title="Delete this spot"
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                                                                            background: 'var(--bg-2)', color: 'var(--rose-400)',
                                                                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                                                                            transition: 'all 0.15s',
                                                                        }}
                                                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; e.currentTarget.style.borderColor = 'var(--rose-400)'; }}
                                                                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        {/* Confirm delete banner */}
                                                        {isConfirmingDelete && (
                                                            <div style={{
                                                                padding: '12px 20px', background: 'rgba(244,63,94,0.08)',
                                                                borderTop: '1px solid rgba(244,63,94,0.2)',
                                                                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                                                            }}>
                                                                <AlertTriangle size={15} color="var(--rose-500)" />
                                                                <span style={{ fontSize: 13, color: 'var(--rose-500)', fontWeight: 600, flex: 1 }}>
                                                                    Permanently delete "{spot.title}"? This cannot be undone.
                                                                </span>
                                                                <button
                                                                    onClick={() => handleDeleteSpot(spot._id)}
                                                                    disabled={actionLoading === 'delete'}
                                                                    style={{ padding: '5px 14px', borderRadius: 7, background: 'var(--rose-500)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', opacity: actionLoading === 'delete' ? 0.6 : 1 }}
                                                                >
                                                                    {actionLoading === 'delete' ? 'Deleting…' : 'Yes, Delete'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(null)}
                                                                    style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-3)', color: 'var(--text-3)', border: 'none', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── TAB: Payouts ── */}
                            {activeTab === 'payouts' && (
                                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 30 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                        <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Payout Methods</h3>
                                        {!editingPayout && (
                                            <button onClick={() => setEditingPayout(true)} className="btn btn-outline" style={{ fontSize: 12, padding: '6px 14px' }}>Edit Details</button>
                                        )}
                                    </div>

                                    {/* Available Balance Card */}
                                    <div className="payout-balance-card" style={{ background: 'var(--blue-600)', borderRadius: 12, padding: 24, color: '#fff', marginBottom: 24, boxShadow: '0 8px 24px rgba(37,99,235,0.2)' }}>
                                        <div>
                                            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Available for Payout</div>
                                            <div className="font-display" style={{ fontSize: 32, fontWeight: 800 }}>₹{data.monthly.earnings.toLocaleString('en-IN')}</div>
                                        </div>
                                        <button className="btn" style={{ background: '#fff', color: 'var(--blue-600)', border: 'none', padding: '10px 20px', fontWeight: 700 }} disabled={data.monthly.earnings <= 0}>Withdraw Now</button>
                                    </div>

                                    {editingPayout ? (
                                        <form onSubmit={handleUpdatePayout} style={{ display: 'grid', gap: 20, background: 'var(--bg-2)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Bank Account Details</div>
                                            <div className="payout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                                                <div>
                                                    <label className="label">Bank Name</label>
                                                    <input type="text" className="input" value={payoutForm.bankName} onChange={e => setPayoutForm({ ...payoutForm, bankName: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label">Account Number</label>
                                                    <input type="password" className="input" value={payoutForm.accountNumber} onChange={e => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })} />
                                                </div>
                                            </div>

                                            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>UPI Details</div>
                                            <div>
                                                <label className="label">UPI ID</label>
                                                <input type="text" className="input" value={payoutForm.upiId} onChange={e => setPayoutForm({ ...payoutForm, upiId: e.target.value })} />
                                            </div>

                                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                                <button type="submit" disabled={savingPayout} className="btn btn-primary" style={{ padding: '8px 24px', flex: 1 }}>{savingPayout ? 'Saving...' : 'Save Payout Details'}</button>
                                                <button type="button" onClick={() => setEditingPayout(false)} className="btn btn-ghost" style={{ padding: '8px 20px', flex: 1, border: '1px solid var(--border)' }}>Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div style={{ display: 'grid', gap: 16 }}>
                                            {/* Bank Account */}
                                            {pm.bankName ? (
                                                <div style={{ padding: 20, border: '2px solid var(--blue-100)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 16, background: 'var(--blue-50)' }}>
                                                    <div style={{ width: 48, height: 48, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-600)', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue-900)' }}>{pm.bankName} Account</div>
                                                                <div style={{ fontSize: 13, color: 'var(--blue-700)', marginTop: 4 }}>•••• •••• {pm.accountNumber ? pm.accountNumber.slice(-4) : 'XXXX'}</div>
                                                            </div>
                                                            <span className="badge badge-blue">Active Default</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ padding: 20, border: '1px dashed var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'background 0.15s' }} onClick={() => setEditingPayout(true)} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)' }}>
                                                        <Wallet size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>No Bank Linked</div>
                                                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Click to link bank account</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* UPI */}
                                            {pm.upiId ? (
                                                <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                                    <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--emerald-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-600)', flexShrink: 0 }}>
                                                        <Wallet size={24} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>UPI Transfer</div>
                                                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{pm.upiId}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ padding: 20, border: '1px dashed var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'background 0.15s' }} onClick={() => setEditingPayout(true)} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)' }}>
                                                        <Wallet size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>No UPI Linked</div>
                                                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Click to add UPI ID</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── TAB: Settings ── */}
                            {activeTab === 'settings' && (
                                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 30 }}>
                                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Host Settings</h3>

                                    <form onSubmit={handleUpdateProfile} className="settings-form" style={{ gap: 20, maxWidth: 460 }}>
                                        <div>
                                            <label className="label">Full Name</label>
                                            <input type="text" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                        </div>
                                        <div>
                                            <label className="label">Registered Email</label>
                                            <input type="email" className="input" value={user.email} disabled style={{ background: 'var(--bg-3)', color: 'var(--text-4)', cursor: 'not-allowed' }} />
                                            <span style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 6, display: 'block' }}>Email cannot be changed natively.</span>
                                        </div>
                                        <div>
                                            <label className="label">Host Contact Number</label>
                                            <input type="tel" className="input" placeholder="+91 90000 00000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                            <span style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 6, display: 'block', lineHeight: 1.4 }}>
                                                This number is used to contact you regarding your listings or payouts.
                                            </span>
                                        </div>

                                        <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 10, padding: '10px 24px' }}>
                                            {saving ? 'Saving...' : 'Save Settings'}
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
                {HOST_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = activeTab === t.id;
                    return (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} className={active ? 'active' : ''}>
                            <Icon size={20} />
                            {t.label}
                        </button>
                    );
                })}
            </nav>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default HostDashboard;
