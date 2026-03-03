import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Menu, X, ChevronDown, LayoutDashboard,
    LogOut, User as UserIcon, Plus,
    CheckCheck, CalendarCheck, XCircle, Star, CreditCard, Info,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import Logo from './Logo';
import { initSocket } from '../services/socket';

/* ── Notification type icon map ── */
const N_ICON = {
    BOOKING_CONFIRMED: { icon: CalendarCheck, color: 'var(--emerald-500)' },
    BOOKING_CANCELLED: { icon: XCircle, color: 'var(--rose-500)' },
    REMINDER: { icon: Bell, color: 'var(--amber-500)' },
    REVIEW: { icon: Star, color: 'var(--violet-500)' },
    PAYMENT: { icon: CreditCard, color: 'var(--blue-600)' },
    SYSTEM: { icon: Info, color: 'var(--text-3)' },
};

/* ── Notification Dropdown Panel ── */
const NotifPanel = ({ onClose }) => {
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { fetchMe } = useAuthStore();

    const load = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/notifications');
            setNotifs(data.notifications || []);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const markRead = async (id) => {
        await api.put(`/auth/notifications/${id}/read`);
        setNotifs(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
        fetchMe(); // refresh unread count in navbar
    };

    const markAll = async () => {
        await api.put('/auth/notifications/read-all');
        setNotifs(n => n.map(x => ({ ...x, isRead: true })));
        fetchMe();
        toast.success('All notifications marked as read');
    };

    const unreadCount = notifs.filter(n => !n.isRead).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                width: 360, maxHeight: 480,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden',
                zIndex: 300,
                display: 'flex', flexDirection: 'column',
            }}
            role="dialog"
            aria-label="Notifications"
        >
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Notifications</span>
                    {unreadCount > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--blue-600)', color: '#fff', borderRadius: 100, padding: '1px 7px' }}>
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAll}
                        style={{ fontSize: 12, color: 'var(--blue-600)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <CheckCheck size={13} /> Mark all read
                    </button>
                )}
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {loading ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                        Loading…
                    </div>
                ) : notifs.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                        <Bell size={32} color="var(--text-4)" style={{ margin: '0 auto 12px' }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>All caught up!</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>No notifications yet.</div>
                    </div>
                ) : (
                    notifs.map((n) => {
                        const cfg = N_ICON[n.type] || N_ICON.SYSTEM;
                        const Icon = cfg.icon;
                        return (
                            <div
                                key={n._id}
                                onClick={() => !n.isRead && markRead(n._id)}
                                style={{
                                    display: 'flex', gap: 12, padding: '13px 16px',
                                    borderBottom: '1px solid var(--border)',
                                    background: n.isRead ? 'transparent' : 'rgba(37,99,235,0.04)',
                                    cursor: n.isRead ? 'default' : 'pointer',
                                    transition: 'background 0.14s',
                                }}
                                onMouseEnter={e => { if (!n.isRead) e.currentTarget.style.background = 'var(--bg-2)'; }}
                                onMouseLeave={e => { if (!n.isRead) e.currentTarget.style.background = 'rgba(37,99,235,0.04)'; }}
                            >
                                {/* Icon badge */}
                                <div style={{
                                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                    background: `${cfg.color}15`,
                                    border: `1px solid ${cfg.color}25`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginTop: 1,
                                }}>
                                    <Icon size={15} color={cfg.color} />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: 'var(--text)', marginBottom: 2, lineHeight: 1.4 }}>
                                        {n.title}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 4 }}>
                                        {n.message}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                                        {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                {/* Unread dot */}
                                {!n.isRead && (
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-600)', flexShrink: 0, marginTop: 4 }} />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
};

/* ── Main Navbar ── */
const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenu] = useState(false);
    const [userMenu, setUserMenu] = useState(false);
    const [notifOpen, setNotif] = useState(false);
    const { user, logout, fetchMe } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const userMenuRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const fn = (e) => {
            if (!userMenuRef.current?.contains(e.target)) setUserMenu(false);
            if (!notifRef.current?.contains(e.target)) setNotif(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    useEffect(() => { setMenu(false); setUserMenu(false); setNotif(false); }, [location.pathname]);

    useEffect(() => {
        if (!user) return;
        const socket = initSocket(user._id);
        // Refresh user (and thus notification badge) on ALL booking-related socket events
        const refresh = () => fetchMe();
        socket.on('new_booking', refresh);
        socket.on('booking_confirmed', refresh);
        socket.on('booking_cancelled', refresh);
        return () => {
            socket.off('new_booking', refresh);
            socket.off('booking_confirmed', refresh);
            socket.off('booking_cancelled', refresh);
        };
    }, [user, fetchMe]);

    const handleLogout = () => {
        logout();
        toast.success('Signed out successfully');
        navigate('/');
    };

    const unread = user?.notifications?.filter(n => !n.isRead).length || 0;

    return (
        <>
            <header
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                    height: 64,
                    transition: 'background 0.25s, box-shadow 0.25s',
                    ...(scrolled
                        ? { background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 1px 0 rgba(15,23,42,0.07), 0 4px 20px rgba(15,23,42,0.06)' }
                        : { background: 'transparent' }
                    ),
                }}
                role="banner"
            >
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

                    {/* ── Logo ── */}
                    <Link to="/" aria-label="UrbanSlot Home">
                        <Logo size={34} />
                    </Link>

                    {/* ── Right Side ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                        {user ? (
                            <>
                                {/* ── Notifications bell + dropdown ── */}
                                <div ref={notifRef} style={{ position: 'relative' }} className="hide-mobile">
                                    <button
                                        onClick={() => { setNotif(v => !v); setUserMenu(false); }}
                                        aria-label="Notifications"
                                        aria-expanded={notifOpen}
                                        style={{
                                            position: 'relative', background: notifOpen ? 'var(--bg-3)' : 'none',
                                            border: 'none', cursor: 'pointer',
                                            width: 38, height: 38, borderRadius: 9,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: notifOpen ? 'var(--blue-600)' : 'var(--text-3)',
                                            transition: 'background 0.15s, color 0.15s',
                                        }}
                                        onMouseEnter={e => { if (!notifOpen) e.currentTarget.style.background = 'var(--bg-3)'; }}
                                        onMouseLeave={e => { if (!notifOpen) e.currentTarget.style.background = 'none'; }}
                                    >
                                        <Bell size={18} />
                                        {unread > 0 && (
                                            <span style={{
                                                position: 'absolute', top: 5, right: 5,
                                                width: 16, height: 16, borderRadius: '50%',
                                                background: 'var(--rose-500)',
                                                fontSize: 9, fontWeight: 800, color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '2px solid #fff',
                                            }}>
                                                {unread > 9 ? '9+' : unread}
                                            </span>
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {notifOpen && <NotifPanel onClose={() => setNotif(false)} />}
                                    </AnimatePresence>
                                </div>

                                {/* User pill + dropdown */}
                                <div ref={userMenuRef} style={{ position: 'relative' }} className="hide-mobile">
                                    <button
                                        onClick={() => { setUserMenu(v => !v); setNotif(false); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px', border: '1.5px solid var(--border-md)', borderRadius: 100, background: 'var(--bg)', cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: userMenu ? 'var(--shadow-md)' : 'var(--shadow-xs)' }}
                                        aria-expanded={userMenu}
                                        aria-haspopup="true"
                                    >
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                            {user.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user.name?.split(' ')[0]}
                                        </span>
                                        <ChevronDown size={13} color="var(--text-3)" style={{ transform: userMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </button>

                                    <AnimatePresence>
                                        {userMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                                transition={{ duration: 0.15 }}
                                                style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 210, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xl)', overflow: 'hidden', zIndex: 200 }}
                                                role="menu"
                                            >
                                                {/* User info */}
                                                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{user.email}</div>
                                                    <span className="badge badge-blue" style={{ marginTop: 8, fontSize: 10.5 }}>{user.role}</span>
                                                </div>

                                                {/* Menu items */}
                                                {[
                                                    ...(user?.role === 'host'
                                                        ? [{ icon: LayoutDashboard, label: 'Dashboard', to: '/host/dashboard' }]
                                                        : [{ icon: UserIcon, label: 'Profile', to: '/profile' }])
                                                ].map(({ icon: Icon, label, to }) => (
                                                    <Link key={label} to={to} role="menuitem">
                                                        <div
                                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', cursor: 'pointer', fontSize: 13.5, color: 'var(--text-2)', transition: 'background 0.12s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <Icon size={15} color="var(--text-3)" /> {label}
                                                        </div>
                                                    </Link>
                                                ))}

                                                <div style={{ borderTop: '1px solid var(--border)' }}>
                                                    <button
                                                        onClick={handleLogout}
                                                        role="menuitem"
                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: 'var(--rose-500)', transition: 'background 0.12s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.05)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                    >
                                                        <LogOut size={15} /> Sign Out
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="hide-mobile">
                                    <button className="btn btn-ghost" style={{ fontSize: 14, padding: '8px 16px' }}>Sign In</button>
                                </Link>
                                <Link to="/register" className="hide-mobile">
                                    <button className="btn btn-primary" style={{ fontSize: 14, padding: '8px 18px' }}>Get Started</button>
                                </Link>
                            </>
                        )}

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMenu(v => !v)}
                            aria-label="Open menu"
                            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 6 }}
                            className="mobile-menu-btn"
                        >
                            {menuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Mobile Drawer ── */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'tween', duration: 0.22 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--bg)', paddingTop: 80, paddingLeft: 24, paddingRight: 24 }}
                    >
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                                user
                                    ? (user?.role === 'host'
                                        ? [{ to: '/host/dashboard', label: '📊 Dashboard' }]
                                        : [{ to: '/profile', label: '👤 My Profile' }, { to: '/search', label: '🔍 Find Parking' }])
                                    : [{ to: '/login', label: 'Sign In' }, { to: '/register', label: 'Create Account' }, { to: '/search', label: '🔍 Find Parking' }]
                            ].flat().map(({ to, label }) => (
                                <Link key={to} to={to}>
                                    <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                                        {label}
                                    </div>
                                </Link>
                            ))}
                            {user && (
                                <button onClick={handleLogout} style={{ marginTop: 24, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--rose-500)', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <LogOut size={17} /> Sign Out
                                </button>
                            )}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
