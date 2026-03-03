import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertTriangle, Clock, MapPin, Car, Zap } from 'lucide-react';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const FEATURES = [
    { icon: MapPin, text: 'Find parking in seconds' },
    { icon: Car, text: 'Book & pay instantly' },
    { icon: Zap, text: 'Real-time availability' },
];

const LoginPage = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [lockInfo, setLockInfo] = useState(null);
    const [countdown, setCountdown] = useState(0);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuthStore();

    useEffect(() => {
        if (!lockInfo) return;
        setCountdown(lockInfo.lockMinutes * 60);
        const iv = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) { clearInterval(iv); setLockInfo(null); return 0; }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, [lockInfo]);

    const onChange = k => e => {
        setForm(f => ({ ...f, [k]: e.target.value }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (!form.email) errs.email = 'Email is required';
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
        if (!form.password) errs.password = 'Password is required';
        setErrors(errs);
        return !Object.keys(errs).length;
    };

    const onSubmit = async e => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setLockInfo(null);
        const result = await login(form);
        setLoading(false);
        if (result.success) {
            const { user } = useAuthStore.getState();
            toast.success(`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}!`);
            navigate(searchParams.get('redirect') || (user?.role === 'host' ? '/host/dashboard' : '/profile'));
        } else {
            if (result.isLocked) {
                setLockInfo({ lockMinutes: result.lockMinutes || 15 });
            } else {
                toast.error(result.message || 'Login failed.');
                setErrors({ general: result.message });
            }
        }
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <>
            <style>{`
                .auth-page {
                    min-height: 100dvh;
                    display: flex;
                    overflow: hidden;
                    background: #fff;
                }

                /* ── LEFT / TOP — Blue brand panel ── */
                .auth-brand {
                    flex: 0 0 42%;
                    background: linear-gradient(160deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 48px;
                    position: relative;
                    overflow: hidden;
                }

                /* ── RIGHT / BOTTOM — White form panel ── */
                .auth-form-panel {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 48px;
                    overflow-y: auto;
                    background: #fff;
                    position: relative;
                }

                .auth-inner {
                    width: 100%;
                    max-width: 400px;
                }

                /* ══ MOBILE: stack brand on top, form below ══ */
                @media (max-width: 768px) {
                    .auth-page {
                        flex-direction: column;
                    }

                    .auth-brand {
                        flex: 0 0 auto;
                        padding: 36px 28px 72px 28px;  /* extra bottom padding for wave overlap */
                        min-height: 260px;
                        border-radius: 0;
                    }

                    /* Wave SVG clips into the form panel */
                    .auth-brand-wave {
                        position: absolute;
                        bottom: -1px;
                        left: 0;
                        width: 100%;
                        height: 64px;
                        pointer-events: none;
                    }

                    /* Desktop right-side wave — hide on mobile */
                    .auth-brand-wave-right {
                        display: none !important;
                    }

                    .auth-form-panel {
                        flex: 1;
                        padding: 32px 24px 40px 24px;
                        align-items: flex-start;
                        margin-top: -40px;           /* pull up behind the wave */
                        border-radius: 32px 32px 0 0;
                        position: relative;
                        z-index: 2;
                        background: #fff;
                        box-shadow: 0 -8px 40px rgba(15,23,42,0.12);
                    }

                    .auth-inner {
                        max-width: 100%;
                        padding-top: 8px;
                    }

                    /* Hide desktop feature list, show compact brand text only */
                    .auth-brand-features { display: none !important; }
                    .auth-brand-badge    { display: none !important; }
                    .auth-brand-desc     { font-size: 13px !important; margin-bottom: 0 !important; }
                    .auth-brand-title    { font-size: 22px !important; margin-top: 16px !important; margin-bottom: 6px !important; }
                }

                @media (min-width: 769px) {
                    /* Desktop: right-side wave visible, bottom wave hidden */
                    .auth-brand-wave { display: none !important; }
                }
            `}</style>

            <div className="auth-page">

                {/* ══ BRAND PANEL ══ */}
                <div className="auth-brand">
                    {/* Decorative blobs */}
                    <div style={{ position: 'absolute', top: -80, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

                    {/* Desktop right-side wave cutout */}
                    <svg className="auth-brand-wave-right"
                        style={{ position: 'absolute', top: 0, right: -1, height: '100%', width: 72, pointerEvents: 'none' }}
                        viewBox="0 0 72 800" preserveAspectRatio="none">
                        <path d="M72,0 C72,0 20,200 20,400 C20,600 72,800 72,800 L72,0 Z" fill="#ffffff" />
                    </svg>

                    {/* Mobile bottom wave */}
                    <svg className="auth-brand-wave" viewBox="0 0 375 64" preserveAspectRatio="none">
                        <path d="M0,0 C80,64 295,64 375,0 L375,64 L0,64 Z" fill="#ffffff" />
                    </svg>

                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 300 }}>
                        <Logo size={44} light />
                        <h2 className="auth-brand-title" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 28, marginBottom: 10, lineHeight: 1.25, letterSpacing: '-0.03em' }}>
                            Welcome back!
                        </h2>
                        <p className="auth-brand-desc" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14.5, lineHeight: 1.6, marginBottom: 36 }}>
                            Sign in to manage your bookings and find parking spots.
                        </p>

                        <div className="auth-brand-features" style={{ display: 'flex', flexDirection: 'column', gap: 13, textAlign: 'left' }}>
                            {FEATURES.map(({ icon: Icon, text }) => (
                                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={15} color="#fff" />
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5, fontWeight: 500 }}>{text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="auth-brand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 36, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                            <ShieldCheck size={13} /> 256-bit SSL · Rate-limited · Encrypted
                        </div>
                    </div>
                </div>

                {/* ══ FORM PANEL ══ */}
                <div className="auth-form-panel">
                    <motion.div
                        className="auth-inner"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.38, ease: 'easeOut' }}
                    >
                        <h1 className="font-display" style={{ fontSize: 'clamp(22px, 5vw, 26px)', fontWeight: 800, color: 'var(--text)', marginBottom: 5, letterSpacing: '-0.03em' }}>
                            Sign in
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24 }}>
                            Don't have an account?{' '}
                            <Link to="/register" style={{ color: 'var(--blue-600)', fontWeight: 700 }}>Create one free</Link>
                        </p>

                        {/* Lock warning */}
                        <AnimatePresence>
                            {lockInfo && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#dc2626', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                                        <AlertTriangle size={14} /> Account temporarily locked
                                    </div>
                                    <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>Too many failed attempts. Try again in:</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontWeight: 800, fontSize: 20 }}>
                                        <Clock size={16} /> {fmt(countdown)}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {errors.general && !lockInfo && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 13px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#dc2626' }}>
                                    <AlertTriangle size={13} /> {errors.general}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>

                            {/* Email */}
                            <div>
                                <label className="label">Email address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input
                                        id="login-email"
                                        type="email"
                                        className="input"
                                        placeholder="you@example.com"
                                        value={form.email}
                                        onChange={onChange('email')}
                                        autoComplete="email"
                                        disabled={!!lockInfo}
                                        style={{ paddingLeft: 40 }}
                                    />
                                </div>
                                {errors.email && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} />{errors.email}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label className="label" style={{ marginBottom: 0 }}>Password</label>
                                    <Link to="/forgot-password" style={{ fontSize: 12.5, color: 'var(--blue-600)', fontWeight: 600 }}>Forgot?</Link>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input
                                        id="login-password"
                                        type={show ? 'text' : 'password'}
                                        className="input"
                                        placeholder="Your password"
                                        value={form.password}
                                        onChange={onChange('password')}
                                        autoComplete="current-password"
                                        disabled={!!lockInfo}
                                        style={{ paddingLeft: 40, paddingRight: 48 }}
                                    />
                                    <button type="button" onClick={() => setShow(s => !s)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 46, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {errors.password && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} />{errors.password}</p>}
                            </div>

                            <button id="login-submit" type="submit" disabled={loading || !!lockInfo} className="btn btn-primary btn-primary-lg"
                                style={{ width: '100%', marginTop: 4, borderRadius: 12 }}>
                                {loading
                                    ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                    : <><span>Continue</span><ArrowRight size={16} /></>}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: 22, fontSize: 12, color: 'var(--text-4)' }}>
                            By signing in, you agree to our{' '}
                            <Link to="/terms" style={{ color: 'var(--blue-600)' }}>Terms</Link>{' '}and{' '}
                            <Link to="/privacy" style={{ color: 'var(--blue-600)' }}>Privacy Policy</Link>.
                        </p>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;
