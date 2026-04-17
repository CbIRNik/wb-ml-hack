from __future__ import annotations

from .ml import WarmupStatus, analyze_product_card_ml, warmup_ml_runtime
from .schemas import AnalyzeProductCardPayload, AnalyzeProductCardResult


def analyze_product_card(payload: AnalyzeProductCardPayload) -> AnalyzeProductCardResult:
    return analyze_product_card_ml(payload)


def warmup_runtime() -> WarmupStatus:
    return warmup_ml_runtime()
