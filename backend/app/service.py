from __future__ import annotations

from .ml import analyze_product_card_ml
from .schemas import AnalyzeProductCardPayload, AnalyzeProductCardResult


def analyze_product_card(payload: AnalyzeProductCardPayload) -> AnalyzeProductCardResult:
    return analyze_product_card_ml(payload)
