from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .runtime_assets import load_joblib, v41_paths
from .v2_runtime import V2RuntimeOutputs


RETRIEVAL_FEATURE_COLUMNS = [
    "knn_mean_sim_5",
    "knn_mean_sim_10",
    "knn_max_sim_5",
    "knn_std_sim_10",
    "knn_pos_ratio_5",
    "knn_pos_ratio_10",
    "mean_sim_to_pos_5",
    "mean_sim_to_neg_5",
    "max_sim_to_pos",
    "max_sim_to_neg",
    "margin_pos_neg",
    "sim_to_pos_centroid",
    "sim_to_neg_centroid",
    "sim_margin_centroids",
]
CARD_RERANK_COLUMNS = [
    "card_size_log",
    "pred_mean_within_card",
    "pred_max_within_card",
    "pred_min_within_card",
    "pred_std_within_card",
    "pred_rank_within_card",
    "pred_delta_mean_within_card",
    "pred_zscore_within_card",
    "pred_gap_top1_top2_within_card",
    "pred_gap_to_top1_within_card",
    "pred_gap_to_top2_within_card",
    "multimodal_rank_within_card",
    "image_rank_within_card",
    "baseline_rank_within_card",
    "document_rank_within_card_v4",
    "retrieval_margin_rank_within_card",
    "retrieval_margin_delta_mean_within_card",
    "centroid_margin_rank_within_card",
    "sim_to_top1_pred_image",
    "sim_to_top2_pred_mean",
    "sim_to_top3_pred_mean",
    "sim_margin_strong_weak_card",
    "score_disagreement_max",
    "score_mean_3experts",
    "score_std_3experts",
    "photo_like_score",
    "mm_vs_document_margin",
    "mm_vs_image_margin",
    "expert_consensus_margin",
]
V41_MODEL_COLUMNS = [
    "v2_stacker_pred",
    "multimodal_model_pred",
    "image_model_pred",
    "baseline_pred",
    *CARD_RERANK_COLUMNS,
    *RETRIEVAL_FEATURE_COLUMNS,
]


@dataclass
class V41RuntimeOutputs:
    reranker_pred: np.ndarray
    features: pd.DataFrame


def predict_v41_reranker(ids: list[str], image_embeddings: np.ndarray, v2: V2RuntimeOutputs) -> V41RuntimeOutputs:
    frame = pd.DataFrame({"id": ids, "card_identifier_id": "runtime_card"})
    frame["baseline_pred"] = v2.baseline_pred
    frame["image_model_pred"] = v2.image_model_pred
    frame["multimodal_model_pred"] = v2.multimodal_model_pred
    frame["v2_stacker_pred"] = v2.v2_stacker_pred
    for source in [v2.similarity, v2.visual, v2.document, v2.group]:
        for col in source.columns:
            if col != "id" and col not in frame.columns:
                frame[col] = source[col].values

    frame = _add_retrieval_surrogates(frame)
    frame = _add_card_rerank_features(frame, image_embeddings=image_embeddings)
    pred = _predict(frame[V41_MODEL_COLUMNS])
    return V41RuntimeOutputs(reranker_pred=pred, features=frame)


def _predict(frame: pd.DataFrame) -> np.ndarray:
    paths = v41_paths()["card_rerankers"]
    if not paths:
        return np.full(len(frame), 0.5, dtype=np.float32)
    preds = []
    x = frame.replace([np.inf, -np.inf], np.nan).astype(np.float32)
    for path in paths:
        model = load_joblib(str(path))
        if model is None:
            continue
        preds.append(model.predict_proba(x)[:, 1].astype(np.float32))
    if not preds:
        return np.full(len(frame), 0.5, dtype=np.float32)
    return np.mean(np.stack(preds, axis=0), axis=0).astype(np.float32)


def _add_retrieval_surrogates(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    sim_mean = out.get("mean_sim_to_other_images", pd.Series(np.zeros(len(out)), index=out.index)).to_numpy(float)
    sim_max = out.get("max_sim_to_other_images", pd.Series(np.zeros(len(out)), index=out.index)).to_numpy(float)
    sim_centroid = out.get("sim_to_card_centroid", pd.Series(np.ones(len(out)), index=out.index)).to_numpy(float)
    mm_rank = out.get("image_text_score_rank_within_card", pd.Series(np.full(len(out), 0.5), index=out.index)).to_numpy(float)
    doc_score = _document_score(out)
    out["knn_mean_sim_5"] = sim_mean
    out["knn_mean_sim_10"] = sim_mean
    out["knn_max_sim_5"] = sim_max
    out["knn_std_sim_10"] = out.get("std_sim_to_other_images", pd.Series(np.zeros(len(out)), index=out.index)).to_numpy(float)
    out["knn_pos_ratio_5"] = mm_rank
    out["knn_pos_ratio_10"] = mm_rank
    out["mean_sim_to_pos_5"] = sim_centroid
    out["mean_sim_to_neg_5"] = doc_score
    out["max_sim_to_pos"] = sim_max
    out["max_sim_to_neg"] = doc_score
    out["margin_pos_neg"] = out["max_sim_to_pos"] - out["max_sim_to_neg"]
    out["sim_to_pos_centroid"] = sim_centroid
    out["sim_to_neg_centroid"] = doc_score
    out["sim_margin_centroids"] = out["sim_to_pos_centroid"] - out["sim_to_neg_centroid"]
    return out


def _add_card_rerank_features(df: pd.DataFrame, image_embeddings: np.ndarray) -> pd.DataFrame:
    out = df.copy()
    primary = "v2_stacker_pred"
    document_score = _document_score(out)
    out["photo_like_score"] = (1.0 - document_score).clip(0.0, 1.0)
    experts = ["baseline_pred", "image_model_pred", "multimodal_model_pred"]
    out["score_mean_3experts"] = out[experts].mean(axis=1)
    out["score_std_3experts"] = out[experts].std(axis=1).fillna(0.0)
    out["score_disagreement_max"] = out[experts].max(axis=1) - out[experts].min(axis=1)
    out["expert_consensus_margin"] = out["score_mean_3experts"] - document_score
    out["mm_vs_document_margin"] = out["multimodal_model_pred"] - document_score
    out["mm_vs_image_margin"] = out["multimodal_model_pred"] - out["image_model_pred"]
    out["card_size_log"] = np.log1p(float(len(out)))
    out["pred_mean_within_card"] = out[primary].mean()
    out["pred_max_within_card"] = out[primary].max()
    out["pred_min_within_card"] = out[primary].min()
    out["pred_std_within_card"] = out[primary].std(ddof=0)
    out["pred_rank_within_card"] = _rank(out[primary].to_numpy(float))
    out["pred_delta_mean_within_card"] = out[primary] - out["pred_mean_within_card"]
    std = float(out["pred_std_within_card"].iloc[0]) if len(out) else 0.0
    out["pred_zscore_within_card"] = out["pred_delta_mean_within_card"] / max(std, 1e-8)
    out["pred_gap_top1_top2_within_card"] = _top_gap(out[primary].to_numpy(float))
    out["pred_gap_to_top1_within_card"] = out["pred_max_within_card"] - out[primary]
    out["pred_gap_to_top2_within_card"] = _gap_to_kth(out[primary].to_numpy(float), kth=2)
    out["multimodal_rank_within_card"] = _rank(out["multimodal_model_pred"].to_numpy(float))
    out["image_rank_within_card"] = _rank(out["image_model_pred"].to_numpy(float))
    out["baseline_rank_within_card"] = _rank(out["baseline_pred"].to_numpy(float))
    out["document_rank_within_card_v4"] = _rank(document_score)
    out["retrieval_margin_rank_within_card"] = _rank(out["sim_margin_centroids"].to_numpy(float))
    out["retrieval_margin_delta_mean_within_card"] = out["sim_margin_centroids"] - out["sim_margin_centroids"].mean()
    out["centroid_margin_rank_within_card"] = _rank(out["sim_margin_centroids"].to_numpy(float))
    sim = _top_image_similarity_features(image_embeddings, out[primary].to_numpy(float))
    for col, values in sim.items():
        out[col] = values
    return out


def _top_image_similarity_features(image_embeddings: np.ndarray, scores: np.ndarray) -> dict[str, np.ndarray]:
    emb = _normalize(np.asarray(image_embeddings, dtype=np.float32))
    if len(emb) <= 1:
        return {
            "sim_to_top1_pred_image": np.ones(len(emb), dtype=np.float32),
            "sim_to_top2_pred_mean": np.ones(len(emb), dtype=np.float32),
            "sim_to_top3_pred_mean": np.ones(len(emb), dtype=np.float32),
            "sim_margin_strong_weak_card": np.zeros(len(emb), dtype=np.float32),
        }
    order = np.argsort(scores)[::-1]
    top1 = _normalize(emb[order[:1]].mean(axis=0, keepdims=True))[0]
    top2 = _normalize(emb[order[: min(2, len(order))]].mean(axis=0, keepdims=True))[0]
    top3 = _normalize(emb[order[: min(3, len(order))]].mean(axis=0, keepdims=True))[0]
    weak = _normalize(emb[order[-min(3, len(order)) :]].mean(axis=0, keepdims=True))[0]
    strong = _normalize(emb[order[: min(3, len(order))]].mean(axis=0, keepdims=True))[0]
    return {
        "sim_to_top1_pred_image": (emb @ top1).astype(np.float32),
        "sim_to_top2_pred_mean": (emb @ top2).astype(np.float32),
        "sim_to_top3_pred_mean": (emb @ top3).astype(np.float32),
        "sim_margin_strong_weak_card": ((emb @ strong) - (emb @ weak)).astype(np.float32),
    }


def _normalize(x: np.ndarray) -> np.ndarray:
    return x / np.maximum(np.linalg.norm(x, axis=1, keepdims=True), 1e-8)


def _document_score(df: pd.DataFrame) -> np.ndarray:
    cols = ["edge_density", "gridness_score", "text_like_box_area_ratio", "horizontal_line_ratio", "vertical_line_ratio"]
    return df[cols].rank(pct=True).mean(axis=1).to_numpy(float)


def _rank(values: np.ndarray) -> np.ndarray:
    series = pd.Series(values)
    if len(series) <= 1:
        return np.ones(len(series), dtype=np.float32)
    return series.rank(pct=True, method="average").fillna(0.5).to_numpy(np.float32)


def _top_gap(values: np.ndarray) -> np.ndarray:
    if len(values) < 2:
        return np.zeros(len(values), dtype=np.float32)
    top = np.sort(values)[-2:]
    return np.full(len(values), float(top[-1] - top[-2]), dtype=np.float32)


def _gap_to_kth(values: np.ndarray, kth: int) -> np.ndarray:
    if len(values) < kth:
        kth_value = float(values.max()) if len(values) else 0.0
    else:
        kth_value = float(np.sort(values)[-kth])
    return (kth_value - values).astype(np.float32)
