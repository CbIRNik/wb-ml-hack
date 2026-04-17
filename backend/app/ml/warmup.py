from __future__ import annotations

import logging
from dataclasses import asdict, dataclass

from .models import (
    get_clip_prompt_judge,
    get_siglip_judge,
    get_v2_image_encoder,
    get_v2_multimodal_encoder,
)
from .runtime_assets import load_joblib, v2_paths, v41_paths


logger = logging.getLogger(__name__)


@dataclass
class WarmupStatus:
    ready: bool
    siglip_loaded: bool
    clip_loaded: bool
    v2_image_encoder_loaded: bool
    v2_multimodal_encoder_loaded: bool
    baseline_model_loaded: bool
    image_model_loaded: bool
    multimodal_model_loaded: bool
    stacker_model_loaded: bool
    card_rerankers_loaded: int


def _load_joblib_flag(path) -> bool:
    if path is None:
        return False
    return load_joblib(str(path)) is not None


def warmup_ml_runtime() -> WarmupStatus:
    siglip = get_siglip_judge()
    clip = get_clip_prompt_judge()
    v2_image_encoder = get_v2_image_encoder()
    v2_multimodal_encoder = get_v2_multimodal_encoder()

    v2 = v2_paths()
    v41 = v41_paths()
    card_rerankers = [path for path in v41["card_rerankers"] if load_joblib(str(path)) is not None]

    status = WarmupStatus(
        ready=siglip is not None and clip is not None,
        siglip_loaded=siglip is not None,
        clip_loaded=clip is not None,
        v2_image_encoder_loaded=v2_image_encoder is not None,
        v2_multimodal_encoder_loaded=v2_multimodal_encoder is not None,
        baseline_model_loaded=_load_joblib_flag(v2["baseline_model"]),
        image_model_loaded=_load_joblib_flag(v2["image_model"]),
        multimodal_model_loaded=_load_joblib_flag(v2["multimodal_model"]),
        stacker_model_loaded=_load_joblib_flag(v2["stacker_model"]),
        card_rerankers_loaded=len(card_rerankers),
    )

    logger.info("ML warmup status: %s", asdict(status))
    return status

