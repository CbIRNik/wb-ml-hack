from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import AnalyzeProductCardPayload, AnalyzeProductCardResult
from .service import analyze_product_card


app = FastAPI(title="WB Hack ML Backend", version="1.0.0")

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


@app.post("/api/analyze", response_model=AnalyzeProductCardResult)
def analyze(payload: AnalyzeProductCardPayload) -> AnalyzeProductCardResult:
    return analyze_product_card(payload)
