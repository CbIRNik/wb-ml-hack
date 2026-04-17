from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib


def _env_or_default(name: str, default: str) -> Path:
    value = os.getenv(name, default)
    return Path(value).expanduser().resolve()


@lru_cache(maxsize=1)
def artifact_root() -> Path:
    return _env_or_default("WB_ARTIFACT_ROOT", "/Users/uchebnick/projects/wbhack2026")


def path_or_none(rel: str) -> Path | None:
    path = artifact_root() / rel
    return path if path.exists() else None


def v2_paths() -> dict[str, Path | None]:
    return {
        "baseline_model": path_or_none("kaggle_output_v2_latest/artifacts/baseline_model.joblib"),
        "image_model": path_or_none("kaggle_output_v2_latest/artifacts/image_model_full.joblib"),
        "multimodal_model": path_or_none("kaggle_output_v2_latest/artifacts/multimodal_model_full.joblib"),
        "stacker_model": path_or_none("kaggle_output_v2_latest/artifacts/stacker_model.joblib"),
    }


def v41_paths() -> dict[str, list[Path]]:
    base = artifact_root() / "v4.1" / "artifacts"
    if not base.exists():
        return {"card_rerankers": []}
    return {
        "card_rerankers": sorted(base.glob("card_reranker_seed_*.joblib")),
    }


def dataset_paths() -> dict[str, Path | None]:
    return {
        "train_csv": path_or_none("dataset/6d6705da-e874-4f4b-b30a-e88d9ce6dc9c/train.csv"),
    }


@lru_cache(maxsize=8)
def load_joblib(path_str: str) -> Any | None:
    path = Path(path_str)
    if not path.exists():
        return None
    return joblib.load(path)
