# UrbanSlot — Premium P2P Urban Parking Marketplace

> Park Smarter. Earn More.

A full-stack MERN application built to Tier-1 startup standards.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- npm 9+

### 1. Clone & Install

```bash
# Install all dependencies
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment

```bash
cp server/.env.example server/.env
# Edit server/.env — set your MONGO_URI and JWT_SECRET
```

### 3. Run Development Servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# API on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# UI on http://localhost:5173
```

---

## 📁 Gold Standard Folder Structure

```
UrbanSlot/
├── client/                          # React + Vite Frontend
│   └── src/
│       ├── components/              # Reusable UI Components
│       │   ├── HeroSection.jsx      # 🌟 Glassmorphic Hero
│       │   ├── Navbar.jsx           # Sticky glass navbar
│       │   ├── SpotCard.jsx         # Parking spot card
│       │   ├── SpotSkeletonLoader.jsx # Skeleton loaders
│       │   └── MapView.jsx          # react-map-gl + pulse markers
│       ├── pages/                   # Route-level pages
│       │   ├── HomePage.jsx         # Landing page
│       │   ├── SearchPage.jsx       # Search + Map view
│       │   ├── LoginPage.jsx        # Auth
│       │   ├── RegisterPage.jsx     # Auth (with role selector)
│       │   └── HostDashboard.jsx    # Analytics dashboard
│       ├── services/                # API & Socket
│       │   ├── api.js               # Axios instance + interceptors
│       │   └── socket.js            # Socket.io client
│       └── store/                   # Zustand state
│           └── authStore.js         # Auth state + persistence
│
└── server/                          # Node + Express Backend
    └── src/
        ├── config/                  # DB connection
        ├── controllers/             # Business logic
        │   ├── auth.controller.js
        │   ├── spot.controller.js   # $near geo-search
        │   └── booking.controller.js # State machine + session
        ├── middlewares/             # Express middleware
        ├── models/                  # Mongoose schemas
        │   ├── User.model.js
        │   ├── ParkingSpot.model.js # GeoJSON + dynamic pricing
        │   └── Booking.model.js     # State machine lifecycle
        ├── routes/                  # Express routers
        ├── services/                # Business services
        │   └── socket.service.js    # Socket.io + reminder scheduler
        └── validators/              # Zod schemas
```

---

## 🏗️ Advanced Technical Architecture

### 🗺️ Real-time Geo-Spatial Engine
MongoDB `$near` with `2dsphere` index for sub-millisecond spot discovery within any radius.

### 💰 Smart Dynamic Pricing Algorithm
```
Peak Hours (8-10AM, 5-8PM) → 1.5× multiplier applied automatically
Event mode → 2.0× configurable multiplier per spot
```

### 🔄 Booking State Machine
```
Pending → Confirmed → Active → Completed → Reviewed
                   ↘ Cancelled
```

### 🔒 Optimistic Locking
MongoDB session + `VersionError` detection prevents double-booking races.

### 📡 Real-time Notifications
Socket.io rooms per user. "Booking starts in 15 min" scheduler runs every 5 minutes.

---

## ⚡ Performance Checklist (90+ Lighthouse)

1. **Lazy route loading** — All pages use `React.lazy()` + `Suspense`
2. **Image optimization** — `loading="lazy"` on all `<img>` tags, WebP format
3. **Bundle splitting** — Vite auto-splits vendor chunks, MapLibre loads on demand
4. **Network** — Axios request deduplication, Zustand persist avoids refetches
5. **CSS performance** — Tailwind purges unused classes in production build

---

## 🔑 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register user |
| POST | `/api/auth/login` | ❌ | Login & get JWT |
| GET | `/api/auth/me` | ✅ | Get profile |
| GET | `/api/spots/search?lat=&lng=&radius=` | ❌ | Geo-search |
| POST | `/api/spots` | ✅ Host | Create spot |
| POST | `/api/bookings` | ✅ | Book a spot |
| PUT | `/api/bookings/:id/status` | ✅ | State transition |
| GET | `/api/bookings/host/dashboard` | ✅ Host | Analytics |

---

*Made with ❤️ — UrbanSlot 2024*
