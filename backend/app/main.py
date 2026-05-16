from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, companies, services, metrics, whatsapp, appointments
from app.whatsapp.webhook import router as webhook_router

app = FastAPI(
    title="ZapSaaS API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    root_path="/api"
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # frontend dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(services.router)
app.include_router(services.hours_router)
app.include_router(services.blocked_router)
app.include_router(metrics.router)
app.include_router(whatsapp.router)
app.include_router(webhook_router)
app.include_router(appointments.router)


@app.get("/health")
async def health():
    return {"status": "ok"}