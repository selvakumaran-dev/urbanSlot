import express from 'express';

const router = express.Router();

// GET /api/geo/search?q=Ariyalur, Tamil Nadu, India
// Proxies the request to Nominatim from the server side (avoids browser CORS + User-Agent restriction)
router.get('/search', async (req, res) => {
    // We will attempt multiple queries in order from most specific to least specific
    const queries = [];

    // Fallback to unstructured query 'q' if provided directly instead of structured
    if (req.query.q) {
        queries.push(req.query.q);

        // Also add a fallback that strips the first comma part (usually street/postal)
        const parts = req.query.q.split(',').map(s => s.trim());
        if (parts.length > 3) {
            // Drop the first part (street)
            queries.push(parts.slice(1).join(', '));
            // Drop the first two parts (street and maybe a zone)
            queries.push(parts.slice(-3).join(', ')); // usually city, state, country
        } else if (parts.length === 3) {
            queries.push(parts.slice(1).join(', '));
        }
    }

    if (queries.length === 0) {
        return res.status(400).json({ success: false, message: 'Query parameter "q" is required.' });
    }

    try {
        let data = null;
        let successfulQuery = '';

        for (const q of queries) {
            if (!q || !q.trim()) continue;

            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'UrbanSlot-ParkingApp/1.0 (contact@urbanslot.in)',
                    'Accept-Language': 'en',
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const result = await response.json();
                if (result && result.length > 0) {
                    data = result[0];
                    successfulQuery = q;
                    break; // found coordinates!
                }
            }
        }

        if (!data) {
            return res.status(404).json({ success: false, message: 'No coordinates found for this address. Try a more specific address or enter manually.' });
        }

        return res.json({
            success: true,
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lon),
            displayName: data.display_name,
            queryUsed: successfulQuery
        });
    } catch (err) {
        console.error('[Geocoding Error]', err.message);
        return res.status(500).json({ success: false, message: 'Geocoding request failed. Check server internet connectivity.' });
    }
});

export default router;
