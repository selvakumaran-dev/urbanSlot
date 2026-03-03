import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import HeroSection from '../components/HeroSection';
import Logo from '../components/Logo';

const STEPS = [
    {
        n: '01',
        title: 'Search nearby',
        desc: 'Enter your destination or tap "Near Me" — verified spots appear on the map instantly.',
    },
    {
        n: '02',
        title: 'Book & pay',
        desc: 'Pick your slot, set arrival and exit time, and pay securely via UPI, card, or wallet.',
    },
    {
        n: '03',
        title: 'Drive & park',
        desc: 'Follow directions to the exact address and scan your digital pass for instant entry.',
    },
];

const HomePage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    // Auth gate — redirect unauthenticated users to register first
    const goSearch = () => {
        if (!isAuthenticated) {
            toast('Create a free account to start finding parking 🚗', {
                icon: '🔒',
                style: { borderLeft: '3px solid #2563eb' },
            });
            navigate('/register?redirect=/search');
            return;
        }
        navigate('/search');
    };

    return (
        <main>
            {/* ── Hero ── */}
            <HeroSection />

            {/* ── How it works ── */}
            <section style={{ padding: '80px 20px', background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ maxWidth: 680, margin: '0 auto' }}>

                    {/* Section header */}
                    <motion.div
                        style={{ textAlign: 'center', marginBottom: 52 }}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2
                            className="font-display"
                            style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 10 }}
                        >
                            Park in{' '}
                            <span style={{ color: 'var(--blue-600)' }}>3 simple steps</span>
                        </h2>
                        <p style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.65 }}>
                            From search to parked — the whole process takes less than a minute.
                        </p>
                    </motion.div>

                    {/* Steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        {STEPS.map(({ n, title, desc }, i) => (
                            <motion.div
                                key={n}
                                style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}
                                initial={{ opacity: 0, x: -14 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: 11,
                                    background: 'var(--blue-600)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontSize: 13, fontWeight: 800, color: '#fff',
                                    flexShrink: 0, marginTop: 2,
                                    boxShadow: '0 2px 10px rgba(37,99,235,0.28)',
                                }}>
                                    {n}
                                </div>
                                <div>
                                    <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 5, letterSpacing: '-0.02em' }}>
                                        {title}
                                    </div>
                                    <div style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.65 }}>
                                        {desc}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* CTA */}
                    <motion.div
                        style={{ marginTop: 48, textAlign: 'center' }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <button className="btn btn-primary btn-primary-lg" onClick={goSearch}>
                            Find Parking Now <ArrowRight size={16} />
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px', background: 'var(--bg)' }} role="contentinfo">
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                    <Logo size={28} />
                    <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>© {new Date().getFullYear()} UrbanSlot. All rights reserved.</span>
                    <div style={{ display: 'flex', gap: 18 }}>
                        {['Privacy', 'Terms', 'Contact'].map(l => (
                            <Link
                                key={l}
                                to={`/${l.toLowerCase()}`}
                                style={{ fontSize: 13, color: 'var(--text-3)', transition: 'color 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                            >{l}</Link>
                        ))}
                    </div>
                </div>
            </footer>
        </main>
    );
};

export default HomePage;
