from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import AnalyzeProductCardPayload, AnalyzeProductCardResult
from .service import analyze_product_card, warmup_runtime

INITIAL_WARMUP_STATUS = warmup_runtime()
if not INITIAL_WARMUP_STATUS.ready:
    raise RuntimeError("ML warmup failed during app initialization")


@asynccontextmanager
async def lifespan(_: FastAPI):
    status = warmup_runtime()
    if not status.ready:
        raise RuntimeError(f"ML warmup failed during app startup: {status}")
    yield


app = FastAPI(title="WB Hack ML Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/warmup")
def warmup() -> dict[str, object]:
    status = warmup_runtime()
    if not status.ready:
        raise HTTPException(status_code=503, detail=f"ML warmup failed: {status}")
    return {
        "status": "ok",
        "ready": status.ready,
        "details": status.__dict__,
    }


@app.post("/analyze", response_model=AnalyzeProductCardResult)
def analyze(payload: AnalyzeProductCardPayload) -> AnalyzeProductCardResult:
    return analyze_product_card(payload)
