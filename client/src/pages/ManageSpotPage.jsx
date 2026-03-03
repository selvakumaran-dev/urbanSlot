import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, MapPin, IndianRupee, Save, Trash2,
    ToggleLeft, ToggleRight, AlertTriangle, CheckCircle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AMENITY_OPTIONS = [
    { label: 'CCTV', value: 'cctv' },
    { label: 'Lighting', value: 'lighting' },
    { label: 'Security', value: 'security' },
    { label: 'EV Charging', value: 'ev_charging' },
    { label: 'Accessible', value: 'wheelchair' },
    { label: 'Gated', value: 'gated' },
];

const ManageSpotPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [spot, setSpot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const [form, setForm] = useState({
        title: '',
        description: '',
        hourlyRate: '',
        dailyRate: '',
        spotType: 'covered',
        vehicleTypes: ['car'],
        amenities: [],
        isInstantBook: false,
        isActive: true,
    });

    useEffect(() => {
        const fetchSpot = async () => {
            try {
                const { data } = await api.get(`/spots/${id}`);
                const s = data.data;
                setSpot(s);
                setForm({
                    title: s.title || '',
                    description: s.description || '',
                    hourlyRate: s.pricing?.hourlyRate || '',
                    dailyRate: s.pricing?.dailyRate || '',
                    spotType: s.spotType || 'covered',
                    vehicleTypes: s.vehicleTypes || ['car'],
                    amenities: s.amenities || [],
                    isInstantBook: s.isInstantBook || false,
                    isActive: s.isActive !== false,
                });
            } catch (err) {
                console.error("Fetch Spot Error:", err);
                toast.error(`Failed to load spot details: ${err.message}`);
                navigate('/host/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchSpot();
    }, [id, navigate]);

    const handleVehicleToggle = (type) => {
        setForm(f => {
            const types = f.vehicleTypes.includes(type)
                ? f.vehicleTypes.filter(t => t !== type)
                : [...f.vehicleTypes, type];
            return types.length === 0 ? f : { ...f, vehicleTypes: types };
        });
    };

    const handleAmenityToggle = (value) => {
        setForm(f => ({
            ...f,
            amenities: f.amenities.includes(value)
                ? f.amenities.filter(a => a !== value)
                : [...f.amenities, value],
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/spots/${id}`, {
                title: form.title,
                description: form.description,
                pricing: {
                    hourlyRate: parseFloat(form.hourlyRate),
                    dailyRate: parseFloat(form.dailyRate) || 0,
                },
                spotType: form.spotType,
                vehicleTypes: form.vehicleTypes,
                amenities: form.amenities,
                isInstantBook: form.isInstantBook,
                isActive: form.isActive,
            });
            toast.success('Spot updated successfully!');
            navigate('/host/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update spot');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/spots/${id}`);
            toast.success('Spot deleted successfully');
            navigate('/host/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete spot');
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2.5px solid var(--blue-600)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Loading spot…</p>
            </div>
            <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-2)', paddingTop: 64, paddingBottom: 80 }}>
            {/* Header */}
            <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '28px 20px' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <button
                        onClick={() => navigate('/host/dashboard')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 14 }}
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>Manage Spot</h1>
                            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{spot?.title}</p>
                        </div>
                        {/* Active / Inactive toggle */}
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                                background: form.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                                color: form.isActive ? 'var(--emerald-600)' : 'var(--rose-500)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {form.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                            {form.isActive ? 'Listing Active' : 'Listing Inactive'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div style={{ maxWidth: 800, margin: '32px auto 0', padding: '0 20px' }}>
                <motion.form
                    onSubmit={handleSave}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
                >
                    {/* Basic Info */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                        <h2 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Basic Details</h2>
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label className="label">Spot Title *</label>
                                <input type="text" className="input" value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    required minLength={5} maxLength={100} />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea className="input" value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={3} style={{ resize: 'vertical' }} maxLength={1000} />
                            </div>
                        </div>
                    </div>

                    {/* Location Info (read-only) */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <MapPin size={16} color="var(--blue-600)" />
                            <h2 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Location</h2>
                            <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 4 }}>(cannot be changed after listing)</span>
                        </div>
                        <div style={{ padding: 14, background: 'var(--bg-2)', borderRadius: 10, fontSize: 14, color: 'var(--text-2)' }}>
                            📍 {spot?.address?.displayAddress || `${spot?.address?.street}, ${spot?.address?.city}, ${spot?.address?.state}`}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-4)' }}>
                            Coordinates: [{spot?.location?.coordinates?.[1]?.toFixed(6)}, {spot?.location?.coordinates?.[0]?.toFixed(6)}]
                        </div>
                    </div>

                    {/* Pricing */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <IndianRupee size={16} color="var(--amber-600)" />
                            <h2 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Pricing</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label className="label">Hourly Rate (₹) *</label>
                                <div style={{ position: 'relative' }}>
                                    <IndianRupee size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                                    <input type="number" className="input" style={{ paddingLeft: 34 }}
                                        value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                                        required min={1} />
                                </div>
                            </div>
                            <div>
                                <label className="label">Daily Rate (₹)</label>
                                <div style={{ position: 'relative' }}>
                                    <IndianRupee size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                                    <input type="number" className="input" style={{ paddingLeft: 34 }}
                                        value={form.dailyRate} onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))}
                                        min={0} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Spot Type, Vehicles, Amenities */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                        <h2 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Spot Details</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                            <div>
                                <label className="label">Spot Type</label>
                                <select className="input" value={form.spotType}
                                    onChange={e => setForm(f => ({ ...f, spotType: e.target.value }))}
                                    style={{ cursor: 'pointer' }}>
                                    {['uncovered', 'covered', 'garage', 'basement', 'valet'].map(t => (
                                        <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Instant Book</label>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, isInstantBook: !f.isInstantBook }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                        padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)',
                                        background: form.isInstantBook ? 'rgba(37,99,235,0.08)' : 'var(--bg-2)',
                                        color: form.isInstantBook ? 'var(--blue-600)' : 'var(--text-3)',
                                        fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                                    }}>
                                    {form.isInstantBook ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                    {form.isInstantBook ? 'Instant Book On' : 'Instant Book Off'}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label className="label">Allowed Vehicles</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {['bike', 'car', 'suv', 'truck'].map(type => {
                                    const active = form.vehicleTypes.includes(type);
                                    return (
                                        <button key={type} type="button" onClick={() => handleVehicleToggle(type)}
                                            style={{
                                                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.15s',
                                                background: active ? 'var(--blue-600)' : 'var(--bg-3)',
                                                color: active ? '#fff' : 'var(--text-3)',
                                                border: active ? '1px solid var(--blue-600)' : '1px solid transparent',
                                            }}>
                                            {type}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="label">Amenities</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                                {AMENITY_OPTIONS.map(({ label, value }) => {
                                    const active = form.amenities.includes(value);
                                    return (
                                        <label key={value} style={{
                                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                            padding: '10px 14px', borderRadius: 10,
                                            border: `1px solid ${active ? 'var(--blue-500)' : 'var(--border)'}`,
                                            background: active ? 'var(--blue-50)' : 'transparent',
                                            transition: 'all 0.15s',
                                        }}>
                                            <input type="checkbox" checked={active} onChange={() => handleAmenityToggle(value)}
                                                style={{ accentColor: 'var(--blue-600)', width: 16, height: 16, cursor: 'pointer' }} />
                                            <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? 'var(--blue-700)' : 'var(--text-3)' }}>{label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        {/* Delete */}
                        {!confirmDelete ? (
                            <button type="button" onClick={() => setConfirmDelete(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: '1px solid var(--rose-500)', background: 'rgba(244,63,94,0.06)', color: 'var(--rose-500)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                <Trash2 size={15} /> Delete Spot
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(244,63,94,0.08)', borderRadius: 10, border: '1px solid var(--rose-400)' }}>
                                <AlertTriangle size={16} color="var(--rose-500)" />
                                <span style={{ fontSize: 13, color: 'var(--rose-500)', fontWeight: 600 }}>Are you sure?</span>
                                <button type="button" onClick={handleDelete} disabled={deleting}
                                    style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--rose-500)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(false)}
                                    style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-3)', color: 'var(--text-3)', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Save */}
                        <button type="submit" disabled={saving} className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 28px', fontSize: 14, background: 'var(--blue-600)', border: 'none' }}>
                            {saving ? 'Saving…' : <><Save size={16} /> Save Changes</>}
                        </button>
                    </div>
                </motion.form>
            </div>
        </div>
    );
};

export default ManageSpotPage;
