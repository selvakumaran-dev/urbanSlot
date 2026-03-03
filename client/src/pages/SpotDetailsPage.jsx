import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, ShieldCheck, Clock, Zap, FileText, Share, Navigation, X, ExternalLink, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const TIME_SLOTS = [];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        const period = h < 12 ? 'AM' : 'PM';
        let displayH = h % 12;
        if (displayH === 0) displayH = 12;
        TIME_SLOTS.push({ value: `${hh}:${mm}`, label: `${displayH}:${mm} ${period}` });
    }
}

const SpotDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();

    const [spot, setSpot] = useState(null);
    const [loading, setLoading] = useState(true);

    // Booking Form State
    const [inDate, setInDate] = useState('');
    const [inTime, setInTime] = useState('09:00');
    const [outDate, setOutDate] = useState('');
    const [outTime, setOutTime] = useState('11:00');

    const startTime = inDate && inTime ? `${inDate}T${inTime}` : '';
    const endTime = outDate && outTime ? `${outDate}T${outTime}` : '';

    const [vehicleInfo, setVehicleInfo] = useState({
        plate: user?.vehicleInfo?.plate || '',
        model: user?.vehicleInfo?.model || ''
    });

    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [paymentVerified, setPaymentVerified] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);

    // ── Availability check state ──
    const [availability, setAvailability] = useState(null); // null | { available, conflict, bookedSlots }
    const [availChecking, setAvailChecking] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        const fetchSpot = async () => {
            try {
                const { data } = await api.get(`/spots/${id}`);
                setSpot(data.data);
                // Load existing booked slots immediately
                const avail = await api.get(`/spots/${id}/availability`);
                setAvailability(avail.data);
            } catch (error) {
                toast.error('Failed to load spot details');
                navigate('/search');
            } finally {
                setLoading(false);
            }
        };
        fetchSpot();
    }, [id, navigate]);

    // ── Debounced availability check when user changes time ──
    const checkSlotAvailability = useCallback(() => {
        if (!startTime || !endTime || new Date(startTime) >= new Date(endTime)) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setAvailChecking(true);
            try {
                const { data } = await api.get(
                    `/spots/${id}/availability?start=${encodeURIComponent(new Date(startTime).toISOString())}&end=${encodeURIComponent(new Date(endTime).toISOString())}`
                );
                setAvailability(data);
            } catch {
                // Silently fail — don't block the UI
            } finally {
                setAvailChecking(false);
            }
        }, 600);
    }, [id, startTime, endTime]);

    useEffect(() => {
        if (startTime && endTime) checkSlotAvailability();
        return () => clearTimeout(debounceRef.current);
    }, [startTime, endTime, checkSlotAvailability]);


    if (loading) return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading spot details...</div>;
    if (!spot) return null;

    const pm = spot.host?.payoutMethods || {};
    const hasUpi = !!pm.upiId;
    const hasBank = !!pm.bankName && !!pm.accountNumber;

    // Derived: is the currently selected slot known to be taken?
    // NOTE: use !!conflict NOT conflict !== undefined — conflict is null (not undefined) when available
    const slotTaken = !!(availability && startTime && endTime
        && !availability.available
        && availability.conflict);

    const handleOpenCheckout = (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error('Please log in to book this spot');
            navigate(`/login?redirect=/spots/${id}`);
            return;
        }
        if (!startTime || !endTime) {
            toast.error('Please select start and end times');
            return;
        }
        if (!vehicleInfo.plate || !vehicleInfo.model) {
            toast.error('Vehicle make and license plate are required');
            return;
        }
        if (new Date(startTime) >= new Date(endTime)) {
            toast.error('End time must be after start time');
            return;
        }
        // ── Block if the time slot is already booked ──
        if (slotTaken) {
            toast.error('⛔ This time slot is already booked. Please choose a different time.');
            return;
        }
        if (!hasUpi && !hasBank) {
            toast.error('This host has not set up direct payments yet.');
            return;
        }

        setCheckoutModalOpen(true);
    };

    let totalToPay = 0;
    if (startTime && endTime) {
        const h = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
        if (h > 0) totalToPay = (h * spot.pricing.hourlyRate).toFixed(2);
    }

    const handleConfirmBooking = async () => {
        if (!paymentVerified) return;
        setBookingLoading(true);
        try {
            await api.post('/bookings', {
                spotId: id,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                vehicleInfo,
                paymentMethod: 'p2p_direct'
            });
            toast.success('Booking requested successfully!');
            setCheckoutModalOpen(false);
            navigate('/profile');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to complete booking');
        } finally {
            setBookingLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingTop: 72 }}>
            <div className="container" style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>

                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--blue-600)', fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}>← Back to search</button>

                {/* Header Title Section */}
                <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{spot.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--text-3)', fontSize: 14.5, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--text)' }}>
                        <Star size={16} fill="var(--amber-500)" color="var(--amber-500)" />
                        {spot.rating?.average || 'New'} <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>({spot.rating?.count || 0} reviews)</span>
                    </div>
                    <span>•</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--blue-600)', fontWeight: 500 }}>
                        <MapPin size={16} />
                        {spot.address.city}, {spot.address.state}
                    </div>
                </div>

                {/* Hero Image */}
                <div style={{ width: '100%', height: 420, borderRadius: 20, background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 40 }}>
                    {spot.images?.[0] ? (
                        <img src={spot.images[0]} alt={spot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🅿️</div>
                    )}
                </div>

                {/* Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)', gap: 40, alignItems: 'start' }}>

                    {/* Left Column (Details) */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Hosted by {spot.host?.name?.split(' ')[0] || 'Unknown'}</h2>
                                <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
                                    {spot.spotType} • {spot.vehicleTypes?.join(', ')}
                                </div>
                            </div>
                            {spot.host?.avatar ? (
                                <img src={spot.host.avatar} alt="Host Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--blue-100)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
                                    {spot.host?.name?.[0] || 'H'}
                                </div>
                            )}
                        </div>

                        {spot.description && (
                            <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>About this space</h3>
                                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)' }}>{spot.description}</p>
                            </div>
                        )}

                        {spot.amenities?.length > 0 && (
                            <div style={{ padding: '32px 0' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Features & Amenities</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {spot.amenities.map(a => (
                                        <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: 'var(--text-2)' }}>
                                            <ShieldCheck size={20} color="var(--blue-500)" />
                                            {a}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column (Booking Widget) */}
                    <div style={{ position: 'sticky', top: 100, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 }}>
                            <span className="font-display" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>₹{spot.pricing.hourlyRate}</span>
                            <span style={{ fontSize: 15, color: 'var(--text-3)' }}>/ hour</span>
                        </div>

                        <form onSubmit={handleOpenCheckout} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                                <div style={{ background: 'var(--bg)', padding: '10px 14px' }}>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 4 }}>Park In</label>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <input type="date" required value={inDate} onChange={e => setInDate(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', cursor: 'pointer' }} />
                                        <select required value={inTime} onChange={e => setInTime(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'right', fontWeight: 600 }}>
                                            {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg)', padding: '10px 14px' }}>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 4 }}>Park Out</label>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <input type="date" required value={outDate} onChange={e => setOutDate(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', cursor: 'pointer' }} />
                                        <select required value={outTime} onChange={e => setOutTime(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'right', fontWeight: 600 }}>
                                            {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 4 }}>Vehicle Plate</label>
                                <input type="text" placeholder="e.g. MH 04 AB 1234" required value={vehicleInfo.plate} onChange={e => setVehicleInfo({ ...vehicleInfo, plate: e.target.value })} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)' }} />
                            </div>

                            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 4 }}>Vehicle Model</label>
                                <input type="text" placeholder="e.g. Honda City" required value={vehicleInfo.model} onChange={e => setVehicleInfo({ ...vehicleInfo, model: e.target.value })} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)' }} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'var(--text)', padding: '12px 4px 4px 4px' }}>
                                <span>Total Price</span>
                                <span>₹{totalToPay > 0 ? totalToPay : '0.00'}</span>
                            </div>

                            {/* ── Availability Status Banner ── */}
                            <AnimatePresence>
                                {availChecking && (
                                    <motion.div
                                        key="checking"
                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 10, background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)', fontSize: 13, color: 'var(--blue-600)', fontWeight: 500 }}
                                    >
                                        <Loader size={14} style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                                        Checking availability…
                                    </motion.div>
                                )}
                                {!availChecking && slotTaken && (
                                    <motion.div
                                        key="taken"
                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                        style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: '#e11d48', fontWeight: 700, fontSize: 13 }}>
                                            <AlertTriangle size={15} /> This slot is already booked
                                        </div>
                                        {availability?.conflict && (
                                            <div style={{ fontSize: 11.5, color: '#be123c', lineHeight: 1.5 }}>
                                                Conflicting booking: &nbsp;
                                                <strong>{new Date(availability.conflict.start).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</strong>
                                                &nbsp;→&nbsp;
                                                <strong>{new Date(availability.conflict.end).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</strong>
                                            </div>
                                        )}
                                        <div style={{ fontSize: 11.5, color: '#be123c', marginTop: 4 }}>Please choose a different time window.</div>
                                    </motion.div>
                                )}
                                {!availChecking && startTime && endTime && availability?.available && (
                                    <motion.div
                                        key="available"
                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: '#059669', fontWeight: 600 }}
                                    >
                                        <CheckCircle size={15} style={{ flexShrink: 0 }} /> Slot available — go ahead and reserve!
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                className="btn btn-primary btn-primary-lg"
                                disabled={slotTaken || availChecking}
                                style={{ width: '100%', opacity: (slotTaken || availChecking) ? 0.5 : 1, cursor: (slotTaken || availChecking) ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}
                            >
                                {slotTaken ? '⛔ Slot Taken — Choose Another Time' : 'Reserve Space'}
                            </button>

                            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-4)', marginTop: 4 }}>
                                Pay securely in the next step
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* DIRECT P2P PAYMENT MODAL */}
            <AnimatePresence>
                {checkoutModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCheckoutModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} style={{ position: 'relative', width: '100%', maxWidth: 460, background: 'var(--bg)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Direct P2P Payment</h3>
                                <button onClick={() => setCheckoutModalOpen(false)} style={{ background: 'var(--bg-3)', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', cursor: 'pointer' }}>
                                    <X size={16} />
                                </button>
                            </div>

                            <div style={{ padding: '32px' }}>
                                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                    <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 4 }}>Pay directly to {spot.host.name}</div>
                                    <div className="font-display" style={{ fontSize: 36, fontWeight: 800, color: 'var(--blue-600)' }}>₹{totalToPay}</div>
                                </div>

                                {hasUpi && (
                                    <div style={{ background: 'var(--emerald-50)', border: '2px solid var(--emerald-200)', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 24 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--emerald-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>UPI ID (Preferred)</div>
                                        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', userSelect: 'all' }}>{pm.upiId}</div>
                                    </div>
                                )}

                                {!hasUpi && hasBank && (
                                    <div style={{ background: 'var(--blue-50)', border: '2px solid var(--blue-200)', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 24 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Bank Account</div>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{pm.bankName}</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', userSelect: 'all' }}>{pm.accountNumber}</div>
                                    </div>
                                )}

                                <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <input type="checkbox" id="payment_verify" checked={paymentVerified} onChange={(e) => setPaymentVerified(e.target.checked)} style={{ marginTop: 4, width: 18, height: 18, accentColor: 'var(--blue-600)', cursor: 'pointer' }} />
                                    <label htmlFor="payment_verify" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)', cursor: 'pointer', flex: 1 }}>
                                        I confirm that I have sent the payment directly to the host using my own payment app.
                                    </label>
                                </div>

                                <button onClick={handleConfirmBooking} disabled={!paymentVerified || bookingLoading} className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16, borderRadius: 12, opacity: (!paymentVerified || bookingLoading) ? 0.5 : 1 }}>
                                    {bookingLoading ? 'Requesting Booking...' : 'Confirm Paid Booking'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SpotDetailsPage;
