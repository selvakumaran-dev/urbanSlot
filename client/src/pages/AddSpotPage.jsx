import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, IndianRupee, ArrowLeft, LayoutGrid, LocateFixed, Loader, Camera, Navigation, Pencil, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AddSpotPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        lat: '',
        lng: '',
        hourlyRate: '',
        dailyRate: '',
        spotType: 'covered',
        vehicleTypes: ['car'],
        amenities: [],
        image: null,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleVehicleTypeToggle = (type) => {
        setForm(f => {
            const types = f.vehicleTypes.includes(type)
                ? f.vehicleTypes.filter(t => t !== type)
                : [...f.vehicleTypes, type];
            if (types.length === 0) return f;
            return { ...f, vehicleTypes: types };
        });
    };

    const handleAmenityToggle = (amenity) => {
        setForm(f => ({
            ...f,
            amenities: f.amenities.includes(amenity)
                ? f.amenities.filter(a => a !== amenity)
                : [...f.amenities, amenity]
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setForm(f => ({ ...f, image: reader.result }));
        reader.readAsDataURL(file);
    };

    // ── Auto-geocode from address (server proxy) ──
    const [geocoding, setGeocoding] = useState(false);
    const [locatingGPS, setLocatingGPS] = useState(false);
    const [manualEdit, setManualEdit] = useState(false);

    const handleGeocode = async () => {
        const q = [form.street, form.city, form.state, form.postalCode, 'India']
            .filter(Boolean).join(', ');
        if (!q.trim()) {
            toast.error('Please enter an address first');
            return;
        }
        setGeocoding(true);
        try {
            const { data } = await api.get(`/geo/search?q=${encodeURIComponent(q)}`);
            if (data.success) {
                setForm(f => ({ ...f, lat: data.lat.toFixed(7), lng: data.lng.toFixed(7) }));
                setManualEdit(false);
                toast.success(`📍 Coordinates set from address: ${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`);
            } else {
                toast.error(data.message || 'Could not find coordinates. Try a more specific address.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not detect coordinates. Please enter them manually.');
        } finally {
            setGeocoding(false);
        }
    };

    // ── Live GPS auto-detect + reverse geocode to fill address fields ──
    const handleGPSLocate = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser.');
            return;
        }
        setLocatingGPS(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude.toFixed(7);
                const lng = pos.coords.longitude.toFixed(7);
                setForm(f => ({ ...f, lat, lng }));
                setManualEdit(false);
                toast.success(`📡 Live location detected: ${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`);

                // Reverse geocode to fill address fields
                try {
                    const r = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                        { headers: { 'Accept-Language': 'en' } }
                    );
                    const d = await r.json();
                    const a = d.address || {};
                    setForm(f => ({
                        ...f,
                        street: [a.road, a.house_number].filter(Boolean).join(' ') || f.street,
                        city: a.city || a.town || a.village || a.county || f.city,
                        state: a.state || f.state,
                        postalCode: a.postcode || f.postalCode,
                    }));
                    toast('📬 Address fields auto-filled from GPS location', { icon: '✏️', duration: 4000 });
                } catch {
                    // reverse geocode failed silently — lat/lng already set
                }
                setLocatingGPS(false);
            },
            (err) => {
                setLocatingGPS(false);
                const msgs = {
                    1: 'Location permission denied. Please allow access and try again.',
                    2: 'Location unavailable. Check your GPS signal.',
                    3: 'Location request timed out. Try again.',
                };
                toast.error(msgs[err.code] || 'Could not get your location.');
            },
            { timeout: 12000, enableHighAccuracy: true }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const lat = parseFloat(form.lat);
        const lng = parseFloat(form.lng);

        if (!form.lat || !form.lng || isNaN(lat) || isNaN(lng)) {
            toast.error('Coordinates are required. Use the "Detect Coordinates" button or enter them manually.');
            return;
        }

        setLoading(true);

        const payload = {
            title: form.title,
            description: form.description,
            address: {
                street: form.street,
                city: form.city,
                state: form.state,
                postalCode: form.postalCode,
                country: 'India',
            },
            location: {
                coordinates: [lng, lat], // [longitude, latitude]
            },
            pricing: {
                hourlyRate: parseFloat(form.hourlyRate),
                dailyRate: parseFloat(form.dailyRate) || undefined,
            },
            spotType: form.spotType,
            vehicleTypes: form.vehicleTypes,
            amenities: form.amenities,
            images: form.image ? [form.image] : [],
        };

        try {
            await api.post('/spots', payload);
            toast.success('Spot added successfully!');
            navigate('/host/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add spot. Check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-2)', paddingTop: 64, paddingBottom: 80 }}>
            {/* Header */}
            <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '32px 20px' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Add New Spot</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>List your parking spot and start earning instantly.</p>
                </div>
            </div>

            {/* Form Content */}
            <div style={{ maxWidth: 800, margin: '32px auto 0', padding: '0 20px' }}>
                <motion.form
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}
                >
                    {/* Basic Info */}
                    <div style={{ padding: 32, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-600)' }}>
                                <LayoutGrid size={18} />
                            </div>
                            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Basic Details</h2>
                        </div>
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label className="label">Spot Title *</label>
                                <input type="text" name="title" className="input" value={form.title} onChange={handleChange} required minLength={5} maxLength={100} />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea name="description" className="input" value={form.description} onChange={handleChange} rows={3} style={{ resize: 'vertical' }} maxLength={1000} />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div style={{ padding: 32, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--emerald-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-600)' }}>
                                <MapPin size={18} />
                            </div>
                            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Location Address</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label">Street Address *</label>
                                <input type="text" name="street" className="input" value={form.street} onChange={handleChange} required />
                            </div>
                            <div>
                                <label className="label">City *</label>
                                <input type="text" name="city" className="input" value={form.city} onChange={handleChange} required />
                            </div>
                            <div>
                                <label className="label">State *</label>
                                <input type="text" name="state" className="input" value={form.state} onChange={handleChange} required />
                            </div>
                            <div>
                                <label className="label">Postal Code *</label>
                                <input type="text" name="postalCode" className="input" value={form.postalCode} onChange={handleChange} required />
                            </div>
                        </div>

                        <div style={{ marginTop: 24, background: 'var(--bg-2)', borderRadius: 14, border: `1.5px solid ${form.lat && form.lng ? '#34d399' : 'var(--border)'}`, overflow: 'hidden', transition: 'border-color 0.3s' }}>

                            {/* Header row */}
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                                <div>
                                    <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-2)' }}>📍 Map Coordinates <span style={{ color: '#ef4444' }}>*</span></p>
                                    <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>Used to pin your spot on the map for nearby drivers</p>
                                </div>
                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {/* PRIMARY: live GPS */}
                                    <button
                                        type="button" id="btn-gps-locate" onClick={handleGPSLocate} disabled={locatingGPS || geocoding}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                                            borderRadius: 9, border: 'none', cursor: (locatingGPS || geocoding) ? 'not-allowed' : 'pointer',
                                            background: 'var(--blue-600)', color: '#fff', fontSize: 12.5, fontWeight: 700,
                                            opacity: locatingGPS ? 0.75 : 1, flexShrink: 0, transition: 'opacity 0.15s',
                                            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                                        }}
                                    >
                                        {locatingGPS
                                            ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                                            : <Navigation size={13} />}
                                        {locatingGPS ? 'Locating…' : 'Use My Live Location'}
                                    </button>
                                    {/* SECONDARY: from address */}
                                    <button
                                        type="button" id="btn-addr-geocode" onClick={handleGeocode} disabled={geocoding || locatingGPS}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                                            borderRadius: 9, border: '1.5px solid var(--border-blue)', cursor: (geocoding || locatingGPS) ? 'not-allowed' : 'pointer',
                                            background: 'var(--bg)', color: 'var(--blue-600)', fontSize: 12.5, fontWeight: 700,
                                            opacity: geocoding ? 0.75 : 1, flexShrink: 0, transition: 'opacity 0.15s',
                                        }}
                                    >
                                        {geocoding
                                            ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                                            : <LocateFixed size={13} />}
                                        {geocoding ? 'Detecting…' : 'From Address'}
                                    </button>
                                </div>
                            </div>

                            {/* Live map preview — shows only when coords are set */}
                            {form.lat && form.lng && !manualEdit && (
                                <div style={{ position: 'relative', height: 200, background: '#e5e7eb' }}>
                                    <iframe
                                        title="spot-location-preview"
                                        width="100%" height="200"
                                        style={{ border: 'none', display: 'block' }}
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(form.lng) - 0.003},${parseFloat(form.lat) - 0.003},${parseFloat(form.lng) + 0.003},${parseFloat(form.lat) + 0.003}&layer=mapnik&marker=${form.lat},${form.lng}`}
                                        loading="lazy"
                                    />
                                    {/* Overlay badge */}
                                    <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(255,255,255,0.94)', borderRadius: 8, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }}>
                                        <CheckCircle2 size={12} color="#16a34a" /> Spot pinned on map
                                    </div>
                                    {/* Edit button */}
                                    <button type="button" onClick={() => setManualEdit(true)}
                                        style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.94)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.1)' }}>
                                        <Pencil size={11} /> Edit manually
                                    </button>
                                </div>
                            )}

                            {/* Manual inputs — show if no coords yet OR user clicked Edit */}
                            {(!form.lat || !form.lng || manualEdit) && (
                                <div style={{ padding: 16 }}>
                                    {manualEdit && (
                                        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, fontSize: 12.5, color: '#92400e', fontWeight: 500 }}>
                                            ✏️ You are editing coordinates manually. For best accuracy use the GPS button above.
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <label className="label">Latitude *</label>
                                            <input type="number" step="any" name="lat" className="input" value={form.lat} onChange={handleChange}
                                                placeholder="e.g. 11.1530559" required />
                                        </div>
                                        <div>
                                            <label className="label">Longitude *</label>
                                            <input type="number" step="any" name="lng" className="input" value={form.lng} onChange={handleChange}
                                                placeholder="e.g. 79.2585797" required />
                                        </div>
                                    </div>
                                    {form.lat && form.lng && manualEdit && (
                                        <button type="button" onClick={() => setManualEdit(false)}
                                            style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: '#16a34a', cursor: 'pointer' }}>
                                            <CheckCircle2 size={13} /> Done — Show map preview
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Status footer */}
                            {form.lat && form.lng && (
                                <div style={{ padding: '8px 18px 10px', fontSize: 12, color: '#16a34a', fontWeight: 600, borderTop: '1px solid var(--border)', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle2 size={13} />
                                    {parseFloat(form.lat).toFixed(6)}, {parseFloat(form.lng).toFixed(6)} — coordinates confirmed
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pricing & Types */}
                    <div style={{ padding: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--amber-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-600)' }}>
                                <IndianRupee size={18} />
                            </div>
                            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Pricing & Spot Details</h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                            <div>
                                <label className="label">Hourly Rate (₹) *</label>
                                <div style={{ position: 'relative' }}>
                                    <IndianRupee size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                                    <input type="number" name="hourlyRate" className="input" style={{ paddingLeft: 38 }} value={form.hourlyRate} onChange={handleChange} required min={1} />
                                </div>
                            </div>
                            <div>
                                <label className="label">Daily Rate (₹)</label>
                                <div style={{ position: 'relative' }}>
                                    <IndianRupee size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                                    <input type="number" name="dailyRate" className="input" style={{ paddingLeft: 38 }} value={form.dailyRate} onChange={handleChange} min={0} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div>
                                <label className="label">Spot Type *</label>
                                <select name="spotType" className="input" value={form.spotType} onChange={handleChange} required style={{ cursor: 'pointer' }}>
                                    <option value="uncovered">Uncovered</option>
                                    <option value="covered">Covered</option>
                                    <option value="garage">Garage</option>
                                    <option value="basement">Basement</option>
                                    <option value="valet">Valet</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Allowed Vehicles *</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {['bike', 'car', 'suv', 'truck'].map(type => {
                                        const active = form.vehicleTypes.includes(type);
                                        return (
                                            <button
                                                key={type} type="button"
                                                onClick={() => handleVehicleTypeToggle(type)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                                                    background: active ? 'var(--blue-600)' : 'var(--bg-3)',
                                                    color: active ? '#fff' : 'var(--text-3)',
                                                    border: active ? '1px solid var(--blue-600)' : '1px solid transparent',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}
                                            >
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <label className="label">Amenities</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                                {[
                                    { label: 'CCTV', value: 'cctv' },
                                    { label: 'Lighting', value: 'lighting' },
                                    { label: 'Security', value: 'security' },
                                    { label: 'EV Charging', value: 'ev_charging' },
                                    { label: 'Accessible', value: 'wheelchair' },
                                    { label: 'Gated', value: 'gated' },
                                ].map(({ label, value }) => {
                                    const active = form.amenities.includes(value);
                                    return (
                                        <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px', borderRadius: 10, border: `1px solid ${active ? 'var(--blue-500)' : 'var(--border)'}`, background: active ? 'var(--blue-50)' : 'transparent', transition: 'all 0.15s' }}>
                                            <input type="checkbox" checked={active} onChange={() => handleAmenityToggle(value)} style={{ accentColor: 'var(--blue-600)', width: 16, height: 16, cursor: 'pointer' }} />
                                            <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? 'var(--blue-700)' : 'var(--text-3)' }}>{label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Photos */}
                    <div style={{ padding: 32, borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-600)' }}>
                                <Camera size={18} />
                            </div>
                            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Spot Photo</h2>
                        </div>
                        <div style={{
                            border: '2px dashed var(--border-md)', borderRadius: 12, padding: 32,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--bg-2)', position: 'relative', overflow: 'hidden'
                        }}>
                            {form.image ? (
                                <>
                                    <img src={form.image} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
                                    <button type="button" onClick={() => setForm(f => ({ ...f, image: null }))} className="btn btn-outline" style={{ marginTop: 16, fontSize: 13, padding: '6px 16px' }}>
                                        Remove Photo
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Camera size={32} color="var(--text-4)" style={{ marginBottom: 12 }} />
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Upload an image</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Click to browse or drag and drop</p>
                                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{ padding: '24px 32px', background: 'var(--bg-2)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                        <button type="button" onClick={() => navigate(-1)} className="btn btn-outline" style={{ padding: '10px 24px', fontSize: 14, background: 'var(--bg)' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 28px', fontSize: 14, background: 'var(--blue-600)', border: 'none' }}>
                            {loading ? 'Adding Spot...' : 'Publish Spot'}
                        </button>
                    </div>
                </motion.form>
            </div>
        </div>
    );
};

export default AddSpotPage;
