# MendiCot Version 2 Frontend Deployment Guide

This guide details the production deployment setup for the MendiCot Version 2 React/Vite frontend on **Vercel**.

---

## 1. Hosting Platform & Environment Setup

- **Platform:** Vercel (or any static SPA host)
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm ci`
- **Node.js Version:** `20.x` (enforced via `package.json` `"engines": { "node": ">=20 <21" }`)
- **Production Branch:** `main`

---

## 2. Environment Variables

Configure the following environment variable in the Vercel Dashboard under **Settings > Environment Variables**:

| Variable Name | Environment | Value | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | Production & Preview | `https://<your-render-backend-domain>.onrender.com` | Base HTTPS URL of the deployed FastAPI backend. |

> [!IMPORTANT]
> **Security Notice:** All `VITE_*` environment variables are **public** and bundled into the client-side JavaScript output during `npm run build`. Never place secret keys, database credentials, or server API tokens in `VITE_*` variables.

---

## 3. Protocol & WebSocket Derivation

- **HTTP to HTTPS:** The production backend must run over `HTTPS`.
- **WS to WSS:** The frontend automatically converts `https://` to `wss://` at runtime via `toWsUrl()`.
- **Mixed Content Safety:** Using `HTTPS` and `WSS` prevents modern browsers from blocking WebSocket connections due to mixed-content security rules.
- **Local Fallback:** In local development (when `VITE_API_BASE_URL` is omitted), `BASE_URL` falls back to `http://127.0.0.1:8000` and WebSocket falls back to `ws://127.0.0.1:8000`.

---

## 4. Backend CORS Coordination

The FastAPI backend's `CORSMiddleware` MUST include your exact Vercel production domain in `ALLOWED_ORIGINS`:

```python
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://<your-app-name>.vercel.app",  # Production Vercel URL
    "https://<your-app-name>-*.vercel.app" # Optional: Vercel preview deployment pattern
]
```

---

## 5. Single-Page Application (SPA) Routing Note

The MendiCot frontend uses **state-based screen navigation** (`useState<GameScreen>`) at the root URL `/`. Because the app does not create browser pathname routes (e.g. `/game` or `/room/123`), all page reloads serve `/index.html` directly without requiring custom Vercel SPA rewrite rules.

---

## 6. Cold-Start Behavior & Free Tier Guidance

When using free-tier backend hosting (e.g. Render), the backend service may sleep after 15 minutes of inactivity:
- Initial REST requests (creating/joining a room) may take **30–50 seconds** while the Render instance spins up.
- During this phase, the user will see a loading/connecting screen.
- Session restoration (`validateRoomSession`) includes a **10-second timeout**. If the backend takes longer to wake, the UI renders a `SessionValidationUnavailablePage` with a **"Retry Connection"** button, allowing the user to reconnect cleanly once the backend wakes.
