from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np
import pandas as pd

from .features import decode_image, extract_image_features
from .runtime_assets import load_joblib, v2_paths


logger = logging.getLogger(__name__)

SIM_COLS = [
    "sim_image_title",
    "sim_image_description_256",
    "sim_image_title_description",
    "image_embedding_norm",
    "text_embedding_norm_title",
    "text_embedding_norm_description_256",
    "text_embedding_norm_title_description",
]
VIS_COLS = [
    "width",
    "height",
    "aspect_ratio",
    "log_area",
    "brightness_mean",
    "brightness_std",
    "white_pixel_frac",
    "black_pixel_frac",
]
DOC_COLS = [
    "edge_density",
    "cc_count_filtered",
    "cc_small_count",
    "cc_small_area_ratio",
    "horizontal_line_ratio",
    "vertical_line_ratio",
    "gridness_score",
    "text_like_box_count",
    "text_like_box_area_ratio",
    "mser_count",
    "mser_area_ratio",
]
GROUP_COLS = [
    "number_of_images_in_card",
    "sim_to_card_centroid",
    "max_sim_to_other_images",
    "mean_sim_to_other_images",
    "min_sim_to_other_images",
    "std_sim_to_other_images",
    "image_only_score_rank_within_card",
    "image_text_score_rank_within_card",
    "document_score_rank_within_card",
    "white_background_rank_within_card",
    "brightness_rank_within_card",
    "outlier_score_within_card",
]
STACKER_COLS = ["baseline_pred", "image_model_pred", "multimodal_model_pred"] + SIM_COLS + VIS_COLS + DOC_COLS + GROUP_COLS


@dataclass
class V2RuntimeOutputs:
    baseline_pred: np.ndarray
    image_model_pred: np.ndarray
    multimodal_model_pred: np.ndarray
    v2_stacker_pred: np.ndarray
    similarity: pd.DataFrame
    visual: pd.DataFrame
    document: pd.DataFrame
    group: pd.DataFrame


def predict_v2_runtime(
    ids: list[str],
    titles: list[str],
    descriptions: list[str],
    pil_images: list,
    image_embeddings: np.ndarray,
    title_embeddings: np.ndarray,
    description_embeddings: np.ndarray,
    full_embeddings: np.ndarray,
) -> V2RuntimeOutputs:
    ids_int = np.arange(len(ids))
    sim = _similarity_frame(ids_int, image_embeddings, title_embeddings, description_embeddings, full_embeddings)
    visual = _visual_frame(ids_int, pil_images)
    document = _document_frame(ids_int, pil_images)
    image_pred = _predict_image(image_embeddings)
    multimodal_pred = _predict_multimodal(image_embeddings, title_embeddings, description_embeddings, full_embeddings)
    baseline_pred = _predict_tabular("baseline_model", pd.concat([sim, visual, document], axis=1), SIM_COLS + VIS_COLS + DOC_COLS)
    group = _group_frame(ids_int, image_embeddings, image_pred, multimodal_pred, document, visual)
    stacker_frame = pd.concat(
        [
            pd.DataFrame(
                {
                    "baseline_pred": baseline_pred,
                    "image_model_pred": image_pred,
                    "multimodal_model_pred": multimodal_pred,
                }
            ),
            sim[SIM_COLS],
            visual[VIS_COLS],
            document[DOC_COLS],
            group[GROUP_COLS],
        ],
        axis=1,
    )
    v2_stacker_pred = _predict_tabular("stacker_model", stacker_frame, STACKER_COLS)
    return V2RuntimeOutputs(
        baseline_pred=baseline_pred,
        image_model_pred=image_pred,
        multimodal_model_pred=multimodal_pred,
        v2_stacker_pred=v2_stacker_pred,
        similarity=sim,
        visual=visual,
        document=document,
        group=group,
    )


def _predict_image(image_embeddings: np.ndarray) -> np.ndarray:
    paths = v2_paths()
    model_path = paths["image_model"]
    if model_path is None:
        return np.full(len(image_embeddings), 0.5, dtype=np.float32)
    model = load_joblib(str(model_path))
    return model.predict_proba(image_embeddings.astype(np.float32))[:, 1].astype(np.float32)


def _predict_multimodal(image: np.ndarray, title: np.ndarray, description: np.ndarray, full: np.ndarray) -> np.ndarray:
    paths = v2_paths()
    model_path = paths["multimodal_model"]
    if model_path is None:
        return np.full(len(image), 0.5, dtype=np.float32)
    x = np.concatenate(
        [
            image,
            title,
            description,
            full,
            np.abs(image - title),
            np.abs(image - description),
            np.abs(image - full),
            image * title,
            image * description,
            image * full,
            np.stack([_cos(image, title), _cos(image, description), _cos(image, full)], axis=1),
        ],
        axis=1,
    ).astype(np.float32)
    model = load_joblib(str(model_path))
    return model.predict_proba(x)[:, 1].astype(np.float32)


def _predict_tabular(model_key: str, frame: pd.DataFrame, columns: list[str]) -> np.ndarray:
    paths = v2_paths()
    model_path = paths[model_key]
    if model_path is None:
        return np.full(len(frame), 0.5, dtype=np.float32)
    model = load_joblib(str(model_path))
    x = frame[columns].astype(np.float32)
    return model.predict_proba(x)[:, 1].astype(np.float32)


def _similarity_frame(ids: list[int], image: np.ndarray, title: np.ndarray, desc: np.ndarray, full: np.ndarray) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "id": ids,
            "sim_image_title": _cos(image, title),
            "sim_image_description_256": _cos(image, desc),
            "sim_image_title_description": _cos(image, full),
            "image_embedding_norm": np.linalg.norm(image, axis=1),
            "text_embedding_norm_title": np.linalg.norm(title, axis=1),
            "text_embedding_norm_description_256": np.linalg.norm(desc, axis=1),
            "text_embedding_norm_title_description": np.linalg.norm(full, axis=1),
        }
    )


def _visual_frame(ids: list[int], pil_images: list) -> pd.DataFrame:
    rows = []
    for idx, image in zip(ids, pil_images, strict=False):
        feat = extract_image_features(image)
        area = max(feat.width * feat.height, 1)
        gray = np.asarray(image.convert("L"), dtype=np.float32)
        rows.append(
            {
                "id": idx,
                "width": float(feat.width),
                "height": float(feat.height),
                "aspect_ratio": float(feat.aspect_ratio),
                "log_area": float(np.log1p(area)),
                "brightness_mean": float(feat.brightness_mean),
                "brightness_std": float(feat.brightness_std),
                "white_pixel_frac": float((gray >= 245).mean()),
                "black_pixel_frac": float((gray <= 10).mean()),
            }
        )
    return pd.DataFrame(rows)


def _document_frame(ids: list[int], pil_images: list) -> pd.DataFrame:
    rows = []
    for idx, image in zip(ids, pil_images, strict=False):
        gray = np.asarray(image.convert("L"), dtype=np.float32)
        gx = np.abs(np.diff(gray, axis=1, prepend=gray[:, :1]))
        gy = np.abs(np.diff(gray, axis=0, prepend=gray[:1, :]))
        edge = float(((gx + gy) > 28).mean())
        h, w = gray.shape
        landscape = float(w > h * 1.5)
        text_proxy = float(np.clip(0.55 * edge + 0.30 * landscape + 0.15 * max(((gray >= 240).mean()) - 0.65, 0.0), 0.0, 1.0))
        rows.append(
            {
                "id": idx,
                "edge_density": edge,
                "cc_count_filtered": float(edge * 120),
                "cc_small_count": float(edge * 80),
                "cc_small_area_ratio": float(edge * 0.08),
                "horizontal_line_ratio": float(edge * 0.5 * landscape),
                "vertical_line_ratio": float(edge * 0.15),
                "gridness_score": float(np.sqrt(max(edge * 0.5 * landscape * edge * 0.15, 0.0))),
                "text_like_box_count": float(text_proxy * 25),
                "text_like_box_area_ratio": float(text_proxy * 0.12),
                "mser_count": float(text_proxy * 20),
                "mser_area_ratio": float(text_proxy * 0.08),
            }
        )
    return pd.DataFrame(rows)


def _group_frame(ids: list[int], image_embeddings: np.ndarray, image_scores: np.ndarray, image_text_scores: np.ndarray, document: pd.DataFrame, visual: pd.DataFrame) -> pd.DataFrame:
    emb = image_embeddings.astype(np.float32)
    norms = np.linalg.norm(emb, axis=1, keepdims=True)
    emb = emb / np.maximum(norms, 1e-8)
    if len(emb) == 1:
        sims = np.zeros((1, 1), dtype=np.float32)
        centroid_sim = np.ones(1, dtype=np.float32)
    else:
        sims = emb @ emb.T
        np.fill_diagonal(sims, np.nan)
        centroid = emb.mean(axis=0, keepdims=True)
        centroid = centroid / np.maximum(np.linalg.norm(centroid, axis=1, keepdims=True), 1e-8)
        centroid_sim = (emb * centroid).sum(axis=1)
    document_score = _document_score(document)
    return pd.DataFrame(
        {
            "id": ids,
            "number_of_images_in_card": float(len(ids)),
            "sim_to_card_centroid": centroid_sim,
            "max_sim_to_other_images": np.nanmax(sims, axis=1) if len(emb) > 1 else np.zeros(len(ids)),
            "mean_sim_to_other_images": np.nanmean(sims, axis=1) if len(emb) > 1 else np.zeros(len(ids)),
            "min_sim_to_other_images": np.nanmin(sims, axis=1) if len(emb) > 1 else np.zeros(len(ids)),
            "std_sim_to_other_images": np.nanstd(sims, axis=1) if len(emb) > 1 else np.zeros(len(ids)),
            "image_only_score_rank_within_card": _rank(image_scores),
            "image_text_score_rank_within_card": _rank(image_text_scores),
            "document_score_rank_within_card": _rank(document_score),
            "white_background_rank_within_card": _rank(visual["white_pixel_frac"].to_numpy(float)),
            "brightness_rank_within_card": _rank(visual["brightness_mean"].to_numpy(float)),
            "outlier_score_within_card": 1.0 - centroid_sim,
        }
    )


def _document_score(document: pd.DataFrame) -> np.ndarray:
    cols = ["edge_density", "gridness_score", "text_like_box_area_ratio", "horizontal_line_ratio", "vertical_line_ratio"]
    return document[cols].rank(pct=True).mean(axis=1).to_numpy(float)


def _rank(values: np.ndarray) -> np.ndarray:
    s = pd.Series(values)
    if len(s) <= 1:
        return np.ones(len(s), dtype=np.float32)
    return s.rank(pct=True, method="average").fillna(0.5).to_numpy(np.float32)


def _cos(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    return (a * b).sum(axis=1) / np.maximum(np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1), 1e-8)
