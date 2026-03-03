import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Phone, Eye, EyeOff, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const ROLES = [
    { value: 'driver', label: '🚗 Driver', desc: 'Find parking spots' },
    { value: 'host', label: '🏠 Host', desc: 'List my parking space' },
];

const analysePassword = (pw) => {
    const checks = {
        length: pw.length >= 8,
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        digit: /[0-9]/.test(pw),
        special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
    };
    const score = Object.values(checks).filter(Boolean).length;
    const levels = [
        { label: 'Too weak', color: '#ef4444' },
        { label: 'Weak', color: '#f97316' },
        { label: 'Fair', color: '#eab308' },
        { label: 'Good', color: '#22c55e' },
        { label: 'Strong 💪', color: '#10b981' },
    ];
    return { checks, score, ...levels[Math.max(0, score - 1)] };
};

const CheckItem = ({ ok, text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: ok ? '#16a34a' : 'var(--text-4)', transition: 'color 0.2s' }}>
        {ok ? <CheckCircle2 size={11} color="#16a34a" /> : <XCircle size={11} color="var(--text-4)" />}
        {text}
    </div>
);

const RegisterPage = () => {
    const [form, setForm] = useState({
        firstName: '', lastName: '', password: '', confirmPassword: '', phone: '', role: 'driver',
    });
    const [show, setShow] = useState({ password: false, confirm: false });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { register } = useAuthStore();

    const pwStrength = useMemo(() => analysePassword(form.password), [form.password]);

    const onChange = (k) => (e) => {
        setForm((f) => ({ ...f, [k]: e.target.value }));
        if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (!form.firstName.trim()) errs.firstName = 'First name is required';
        if (!form.lastName.trim()) errs.lastName = 'Last name is required';
        if (!form.password) errs.password = 'Password is required';
        else if (pwStrength.score < 4) errs.password = 'Password is not strong enough';
        if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        if (form.phone && !/^\+?[\d\s\-()]{7,15}$/.test(form.phone)) errs.phone = 'Invalid phone number format';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        const result = await register({
            firstName: form.firstName,
            lastName: form.lastName,
            password: form.password,
            phone: form.phone,
            role: form.role,
        });
        setLoading(false);
        if (result.success) {
            const { user } = useAuthStore.getState();
            toast.success(`Welcome to UrbanSlot, ${user?.name?.split(' ')[0] ?? 'there'}! 🎉`);
            toast.success(
                <div style={{ padding: '4px' }}>
                    <div style={{ fontWeight: 800, marginBottom: 4, color: '#000' }}>IMPORTANT — Save Your Login Email</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>Use this email to sign in next time:</div>
                    <div style={{ fontSize: 15, fontWeight: 700, background: '#eff6ff', padding: '6px 12px', borderRadius: 8, marginTop: 6, color: '#2563eb', userSelect: 'all', border: '1px solid rgba(37,99,235,0.2)' }}>
                        {user.email}
                    </div>
                </div>,
                { duration: 15000, style: { border: '2px solid #2563eb', maxWidth: 400 } }
            );
            navigate(searchParams.get('redirect') || (user?.role === 'host' ? '/host/dashboard' : '/profile'));
        } else {
            toast.error(result.message || 'Registration failed.');
            setErrors({ general: result.message });
        }
    };

    return (
        <>
            <style>{`
                .reg-page {
                    min-height: 100dvh;
                    display: flex;
                    overflow: hidden;
                    background: #fff;
                }

                /* LEFT / TOP — Blue brand panel */
                .reg-brand {
                    flex: 0 0 38%;
                    background: linear-gradient(160deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 44px;
                    position: relative;
                    overflow: hidden;
                }

                /* RIGHT / BOTTOM — White form panel */
                .reg-form-panel {
                    flex: 1;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding: 52px 48px;
                    overflow-y: auto;
                    background: #fff;
                }

                .reg-inner {
                    width: 100%;
                    max-width: 400px;
                    padding-top: 8px;
                }

                /* MOBILE: brand on top, form below with wave */
                @media (max-width: 768px) {
                    .reg-page { flex-direction: column; }

                    .reg-brand {
                        flex: 0 0 auto;
                        padding: 32px 24px 72px 24px;
                        min-height: 240px;
                        justify-content: flex-end;
                    }

                    .reg-brand-wave-bottom {
                        position: absolute;
                        bottom: -1px;
                        left: 0;
                        width: 100%;
                        height: 64px;
                        pointer-events: none;
                    }

                    .reg-brand-wave-right { display: none !important; }

                    .reg-form-panel {
                        flex: 1;
                        padding: 28px 20px 40px 20px;
                        align-items: flex-start;
                        margin-top: -40px;
                        border-radius: 32px 32px 0 0;
                        position: relative;
                        z-index: 2;
                        background: #fff;
                        box-shadow: 0 -8px 40px rgba(15,23,42,0.12);
                    }

                    .reg-inner {
                        max-width: 100%;
                        padding-top: 4px;
                    }

                    .reg-brand-steps  { display: none !important; }
                    .reg-brand-badge  { display: none !important; }
                    .reg-brand-desc   { font-size: 13px !important; margin-bottom: 0 !important; }
                    .reg-brand-title  { font-size: 21px !important; margin-top: 14px !important; margin-bottom: 5px !important; }
                }

                @media (min-width: 769px) {
                    .reg-brand-wave-bottom { display: none !important; }
                }
            `}</style>

            <div className="reg-page">

                {/* ══ BRAND PANEL ══ */}
                <div className="reg-brand">
                    <div style={{ position: 'absolute', top: -80, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

                    {/* Desktop right-side wave */}
                    <svg className="reg-brand-wave-right"
                        style={{ position: 'absolute', top: 0, right: -1, height: '100%', width: 72, pointerEvents: 'none' }}
                        viewBox="0 0 72 800" preserveAspectRatio="none">
                        <path d="M72,0 C72,0 20,200 20,400 C20,600 72,800 72,800 L72,0 Z" fill="#ffffff" />
                    </svg>

                    {/* Mobile bottom wave */}
                    <svg className="reg-brand-wave-bottom" viewBox="0 0 375 64" preserveAspectRatio="none">
                        <path d="M0,0 C80,64 295,64 375,0 L375,64 L0,64 Z" fill="#ffffff" />
                    </svg>

                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 280 }}>
                        <Logo size={44} light />
                        <h2 className="reg-brand-title" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 25, fontWeight: 800, color: '#fff', marginTop: 26, marginBottom: 10, lineHeight: 1.25, letterSpacing: '-0.03em' }}>
                            Join UrbanSlot
                        </h2>
                        <p className="reg-brand-desc" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                            Create a free account. We'll generate your login email automatically!
                        </p>

                        <div className="reg-brand-steps" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '14px 16px', textAlign: 'left', marginBottom: 18 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>How it works</div>
                            {[
                                { step: '1', text: 'Enter your name & pick a role' },
                                { step: '2', text: 'We generate a unique login email' },
                                { step: '3', text: 'Save the email shown after signup' },
                            ].map(({ step, text }) => (
                                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{step}</div>
                                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.4 }}>{text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="reg-brand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                            <ShieldCheck size={13} /> Encrypted · No spam · GDPR compliant
                        </div>
                    </div>
                </div>

                {/* ══ FORM PANEL ══ */}
                <div className="reg-form-panel">
                    <motion.div
                        className="reg-inner"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.38, ease: 'easeOut' }}
                    >
                        <h1 className="font-display" style={{ fontSize: 'clamp(21px, 5vw, 26px)', fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.03em' }}>
                            Create account
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 18 }}>
                            Already have one?{' '}
                            <Link to="/login" style={{ color: 'var(--blue-600)', fontWeight: 700 }}>Sign in</Link>
                        </p>

                        <AnimatePresence>
                            {errors.general && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 13px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#dc2626' }}>
                                    <AlertTriangle size={13} /> {errors.general}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Role picker */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                            {ROLES.map(({ value, label, desc }) => (
                                <button key={value} id={`role-${value}`} type="button"
                                    onClick={() => setForm((f) => ({ ...f, role: value }))}
                                    style={{
                                        background: form.role === value ? 'var(--blue-50)' : 'var(--bg-3)',
                                        border: `1.5px solid ${form.role === value ? 'var(--blue-500)' : 'var(--border)'}`,
                                        borderRadius: 12, padding: '11px 10px', cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.15s', minHeight: 64,
                                        boxShadow: form.role === value ? 'var(--shadow-blue)' : 'none',
                                    }}>
                                    <div style={{ fontSize: 17, marginBottom: 3 }}>{label}</div>
                                    <div style={{ fontSize: 11, color: form.role === value ? 'var(--blue-600)' : 'var(--text-3)', fontWeight: 500, lineHeight: 1.3 }}>{desc}</div>
                                </button>
                            ))}
                        </div>

                        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>

                            {/* Name row */}
                            <div className="form-grid-2">
                                <div>
                                    <label className="label">First Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={14} color="var(--text-4)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                        <input id="reg-first" type="text" className="input" placeholder="First name" value={form.firstName} onChange={onChange('firstName')} autoComplete="given-name" required style={{ paddingLeft: 34 }} />
                                    </div>
                                    {errors.firstName && <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} />{errors.firstName}</p>}
                                </div>
                                <div>
                                    <label className="label">Last Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={14} color="var(--text-4)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                        <input id="reg-last" type="text" className="input" placeholder="Last name" value={form.lastName} onChange={onChange('lastName')} autoComplete="family-name" required style={{ paddingLeft: 34 }} />
                                    </div>
                                    {errors.lastName && <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} />{errors.lastName}</p>}
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="label">Phone <span style={{ color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={14} color="var(--text-4)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input id="reg-phone" type="tel" className="input" placeholder="Optional mobile number" value={form.phone} onChange={onChange('phone')} autoComplete="tel" style={{ paddingLeft: 34 }} />
                                </div>
                                {errors.phone && <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} />{errors.phone}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={14} color="var(--text-4)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input
                                        id="reg-password"
                                        type={show.password ? 'text' : 'password'}
                                        className="input"
                                        placeholder="Create a strong password"
                                        value={form.password}
                                        onChange={onChange('password')}
                                        autoComplete="new-password"
                                        required
                                        style={{ paddingLeft: 34, paddingRight: 48 }}
                                    />
                                    <button type="button" onClick={() => setShow((s) => ({ ...s, password: !s.password }))}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {show.password ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {errors.password && <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} />{errors.password}</p>}

                                {/* Strength meter */}
                                <AnimatePresence>
                                    {form.password && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 8, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= pwStrength.score ? pwStrength.color : 'var(--border)', transition: 'background 0.3s' }} />
                                                ))}
                                            </div>
                                            <div style={{ fontSize: 11, color: pwStrength.color, fontWeight: 700, marginBottom: 6 }}>{pwStrength.label}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                                                <CheckItem ok={pwStrength.checks.length} text="8+ characters" />
                                                <CheckItem ok={pwStrength.checks.upper} text="Uppercase" />
                                                <CheckItem ok={pwStrength.checks.lower} text="Lowercase" />
                                                <CheckItem ok={pwStrength.checks.digit} text="Number" />
                                                <CheckItem ok={pwStrength.checks.special} text="Special char" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="label">Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={14} color="var(--text-4)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input
                                        id="reg-confirm"
                                        type={show.confirm ? 'text' : 'password'}
                                        className="input"
                                        placeholder="Repeat your password"
                                        value={form.confirmPassword}
                                        onChange={onChange('confirmPassword')}
                                        autoComplete="new-password"
                                        required
                                        style={{ paddingLeft: 34, paddingRight: 80 }}
                                    />
                                    {form.confirmPassword && (
                                        <span style={{ position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                                            {form.password === form.confirmPassword
                                                ? <CheckCircle2 size={15} color="#16a34a" />
                                                : <XCircle size={15} color="#dc2626" />}
                                        </span>
                                    )}
                                    <button type="button" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} />{errors.confirmPassword}</p>}
                            </div>

                            <button id="register-submit" type="submit" disabled={loading} className="btn btn-primary btn-primary-lg"
                                style={{ width: '100%', marginTop: 6, borderRadius: 12 }}>
                                {loading ? (
                                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                ) : (
                                    <><span>Create Account</span><ArrowRight size={16} /></>
                                )}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--text-4)' }}>
                            By continuing, you agree to our{' '}
                            <Link to="/terms" style={{ color: 'var(--blue-600)' }}>Terms</Link>{' '}and{' '}
                            <Link to="/privacy" style={{ color: 'var(--blue-600)' }}>Privacy Policy</Link>.
                        </p>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default RegisterPage;
