from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from ..schemas import (
    AnalyzeProductCardImageInput,
    AnalyzeProductCardPayload,
    AnalyzeProductCardRankedImage,
    AnalyzeProductCardResult,
)
from .features import EPS, decode_image, extract_image_features, rank01, softmax_np, tokens
from .models import (
    get_clip_prompt_judge,
    get_siglip_judge,
    get_v2_image_encoder,
    get_v2_multimodal_encoder,
)
from .v2_runtime import predict_v2_runtime
from .v41_runtime import predict_v41_reranker


logger = logging.getLogger(__name__)

NEGATIVE_HINTS = {
    "таблица",
    "размер",
    "размерная",
    "сетка",
    "сертификат",
    "инструкция",
    "логотип",
    "баннер",
    "инфографика",
    "схема",
    "иконка",
    "документ",
    "чертеж",
}


@dataclass
class CardScore:
    image_id: str
    final_score: float
    v2_stacker_score: float
    reranker_score: float
    online_score: float
    document_signal: float
    card_rank: float
    card_gap_top: float
    card_z: float
    text_proxy: float
    negative_hits: int


def analyze_product_card_ml(payload: AnalyzeProductCardPayload) -> AnalyzeProductCardResult:
    title = payload.title.strip()
    description = payload.description.strip()

    card_scores = score_card(payload.images, title, description)
    ranked = to_ranked_images(card_scores)
    overall = overall_score(ranked)

    suggested_description = build_suggested_description(title, description, ranked)
    suggested_scores = score_card(payload.images, title, suggested_description)
    suggested_ranked = to_ranked_images(suggested_scores)
    suggested_overall = overall_score(suggested_ranked, bonus=3)

    return AnalyzeProductCardResult(
        overallScore=overall,
        rankedImages=ranked,
        suggestedDescription=suggested_description,
        suggestedOverallScore=suggested_overall,
        suggestedRankedImages=suggested_ranked,
        recommendations=recommendations(card_scores),
    )


def score_card(
    images: list[AnalyzeProductCardImageInput],
    title: str,
    description: str,
) -> list[CardScore]:
    pil_images = [decode_image(image.src) for image in images]
    features = [extract_image_features(img) for img in pil_images]
    meta_tokens = [tokens(" ".join([img.name, img.alt or "", img.caption or "", title, description])) for img in images]
    negative_hits = np.asarray([len(toks & NEGATIVE_HINTS) for toks in meta_tokens], dtype=np.float32)
    full_text = f"{title}. {description}".strip()[:300]

    online_scores, document_signal = build_online_branch(pil_images, features, full_text, negative_hits)
    recovered = build_recovered_branch(images, pil_images, title, description, online_scores, document_signal)
    if recovered is None:
        final = online_scores
        v2_stacker = online_scores
        reranker = online_scores
    else:
        v2_stacker, reranker, final = recovered

    final = np.clip(final, 0.0, 1.0)
    card_rank = rank01(final)
    top = float(final.max()) if len(final) else 0.0
    mean = float(final.mean()) if len(final) else 0.0
    std = float(final.std()) if len(final) else 0.0

    out: list[CardScore] = []
    for idx, image in enumerate(images):
        z = 0.0 if len(images) == 1 else float((final[idx] - mean) / (std + EPS))
        gap = 0.0 if len(images) == 1 else float(top - final[idx])
        out.append(
            CardScore(
                image_id=image.id,
                final_score=float(final[idx]),
                v2_stacker_score=float(v2_stacker[idx]),
                reranker_score=float(reranker[idx]),
                online_score=float(online_scores[idx]),
                document_signal=float(document_signal[idx]),
                card_rank=float(card_rank[idx]),
                card_gap_top=gap,
                card_z=z,
                text_proxy=float(features[idx].text_proxy),
                negative_hits=int(negative_hits[idx]),
            )
        )
    return sorted(out, key=lambda item: item.final_score, reverse=True)


def build_recovered_branch(
    images: list[AnalyzeProductCardImageInput],
    pil_images: list,
    title: str,
    description: str,
    online_scores: np.ndarray,
    document_signal: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray] | None:
    image_encoder = get_v2_image_encoder()
    multimodal_encoder = get_v2_multimodal_encoder()
    if image_encoder is None or multimodal_encoder is None:
        logger.warning("Recovered runtime unavailable: v2 encoders not loaded, fallback to online branch")
        return None

    try:
        image_embeddings = np.asarray(image_encoder.encode_pils(pil_images), dtype=np.float32)
        title_text = title.strip()[:128]
        description_text = description.strip()[:256]
        full_text = f"{title}. {description}".strip()[:300]
        title_embeddings = np.asarray(multimodal_encoder.encode_texts([title_text or ""] * len(images)), dtype=np.float32)
        desc_embeddings = np.asarray(multimodal_encoder.encode_texts([description_text or ""] * len(images)), dtype=np.float32)
        full_embeddings = np.asarray(multimodal_encoder.encode_texts([full_text or ""] * len(images)), dtype=np.float32)

        v2 = predict_v2_runtime(
            ids=[image.id for image in images],
            titles=[title] * len(images),
            descriptions=[description] * len(images),
            pil_images=pil_images,
            image_embeddings=image_embeddings,
            title_embeddings=title_embeddings,
            description_embeddings=desc_embeddings,
            full_embeddings=full_embeddings,
        )
        v41 = predict_v41_reranker([image.id for image in images], image_embeddings=image_embeddings, v2=v2)
    except Exception as exc:
        logger.exception("Recovered runtime failed, fallback to online branch: %s", exc)
        return None

    card_rank = rank01(v2.v2_stacker_pred)
    final = np.clip(
        0.72 * v2.v2_stacker_pred
        + 0.18 * v41.reranker_pred
        + 0.10 * online_scores
        + 0.04 * card_rank
        - 0.05 * np.clip(document_signal, 0.0, 1.0),
        0.0,
        1.0,
    ).astype(np.float32)
    return v2.v2_stacker_pred.astype(np.float32), v41.reranker_pred.astype(np.float32), final


def build_online_branch(pil_images: list, features: list, text: str, negative_hits: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    siglip = build_siglip_branch(pil_images, text, features)
    taxonomy = build_prompt_taxonomy_branch(pil_images, features)
    score, document_signal = blend_v11_online(siglip, taxonomy, features, negative_hits)
    return score, document_signal


def build_siglip_branch(pil_images: list, text: str, features: list) -> np.ndarray:
    judge = get_siglip_judge()
    if judge is not None:
        return judge.score_images(pil_images, text)
    out = []
    for feat in features:
        score = (
            0.52
            + 0.12 * feat.portrait
            + 0.06 * feat.square
            - 0.18 * feat.text_proxy
            - 0.08 * feat.landscape
            + 0.06 * min(feat.brightness_std / 64.0, 1.0)
        )
        out.append(float(np.clip(score, 0.0, 1.0)))
    return np.asarray(out, dtype=np.float32)


def build_prompt_taxonomy_branch(pil_images: list, features: list) -> dict[str, np.ndarray]:
    judge = get_clip_prompt_judge()
    if judge is not None:
        fam = judge.score_families(pil_images)
        product = np.maximum.reduce([fam["positive"], fam["package"], fam["lifestyle"]])
        document = np.maximum.reduce(
            [fam["document"], fam["banner"], fam["size_chart"], fam["certificate"], fam["screenshot"], fam["logo_only"]]
        )
        ambiguous = fam["ambiguous"]
        family_matrix = np.column_stack([product, document, ambiguous])
        probs = softmax_np(family_matrix)
        return {
            "product_union": product,
            "document_union": document,
            "ambiguous_union": ambiguous,
            "product_doc_margin": product - document,
            "doc_conflict": np.maximum(document, ambiguous) - product,
            "prompt_entropy": -(probs * np.log(np.clip(probs, EPS, 1.0))).sum(axis=1),
        }

    product = np.asarray([0.75 - 0.18 * f.text_proxy + 0.10 * f.portrait + 0.05 * f.square for f in features], dtype=np.float32)
    document = np.asarray(
        [0.25 + 0.30 * f.text_proxy + 0.12 * f.landscape + 0.10 * max(f.white_frac - 0.75, 0.0) for f in features],
        dtype=np.float32,
    )
    ambiguous = np.maximum(document, product * 0.85)
    probs = softmax_np(np.column_stack([product, document, ambiguous]))
    return {
        "product_union": np.clip(product, 0.0, 1.0),
        "document_union": np.clip(document, 0.0, 1.0),
        "ambiguous_union": np.clip(ambiguous, 0.0, 1.0),
        "product_doc_margin": product - document,
        "doc_conflict": np.maximum(document, ambiguous) - product,
        "prompt_entropy": -(probs * np.log(np.clip(probs, EPS, 1.0))).sum(axis=1),
    }


def blend_v11_online(
    siglip: np.ndarray,
    taxonomy: dict[str, np.ndarray],
    features: list,
    negative_hits: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    siglip_rank = rank01(siglip)
    margin_rank = rank01(taxonomy["product_doc_margin"])
    product_rank = rank01(taxonomy["product_union"])
    doc_rank = rank01(taxonomy["document_union"])
    doc_conflict_rank = rank01(taxonomy["doc_conflict"])
    entropy_rank = 1.0 - rank01(taxonomy["prompt_entropy"])
    text_proxy = np.asarray([f.text_proxy for f in features], dtype=np.float32)
    edge = np.asarray([f.edge_density for f in features], dtype=np.float32)
    white = np.asarray([f.white_frac for f in features], dtype=np.float32)
    portrait = np.asarray([f.portrait for f in features], dtype=np.float32)
    doc_like = np.clip(0.55 * text_proxy + 0.25 * edge + 0.10 * white + 0.10 * (negative_hits > 0), 0.0, 1.0)
    photo_like = np.clip(0.55 * siglip + 0.25 * taxonomy["product_union"] + 0.12 * portrait - 0.15 * text_proxy, 0.0, 1.0)
    score = (
        0.34 * siglip
        + 0.16 * siglip_rank
        + 0.16 * margin_rank
        + 0.10 * product_rank
        + 0.08 * entropy_rank
        + 0.12 * photo_like
        - 0.16 * doc_rank
        - 0.08 * doc_conflict_rank
        - 0.08 * doc_like
    )
    score = np.clip(score, 0.0, 1.0)
    card_rank = rank01(score)
    mean = float(score.mean()) if len(score) else 0.0
    std = float(score.std()) if len(score) else 0.0
    z = np.zeros_like(score) if len(score) <= 1 else (score - mean) / (std + EPS)
    gap_top = (float(score.max()) - score) if len(score) else score
    final = np.clip(score + 0.10 * card_rank + 0.05 * np.clip(z, -1.0, 1.5) - 0.08 * np.clip(gap_top, 0.0, 1.0), 0.0, 1.0)
    return final.astype(np.float32), doc_like.astype(np.float32)


def to_ranked_images(card_scores: list[CardScore]) -> list[AnalyzeProductCardRankedImage]:
    return [
        AnalyzeProductCardRankedImage(
            id=item.image_id,
            score=int(np.clip(round(item.final_score * 100.0), 1, 99)),
            reason=reason(item),
        )
        for item in card_scores
    ]


def reason(item: CardScore) -> str:
    if item.final_score >= 0.82 and item.v2_stacker_score >= 0.75:
        return "Recovered v11-runtime считает кадр сильным: и основной стек, и карточечный reranker поддерживают фото товара."
    if item.document_signal > 0.55 or item.negative_hits > 0:
        return "Кадр выглядит как служебный или инфографический материал, поэтому score понижен."
    if item.card_gap_top > 0.18:
        return "Фото заметно уступает лучшим кадрам карточки по recovered v11-runtime сигналам."
    return "Кадр частично поддерживает карточку, но есть более сильные товарные фото."


def overall_score(ranked: list[AnalyzeProductCardRankedImage], bonus: int = 0) -> int:
    top = [item.score for item in ranked[: min(3, len(ranked))]]
    weak = sum(item.score < 45 for item in ranked)
    avg_top = float(np.mean(top)) if top else 0.0
    return int(np.clip(round(20 + avg_top * 0.72 - weak * 5 + bonus), 1, 99))


def build_suggested_description(title: str, description: str, ranked: list[AnalyzeProductCardRankedImage]) -> str:
    base = description.strip() if description.strip() else title.strip()
    notes = []
    if ranked and ranked[0].score < 75:
        notes.append("Сформулируйте в первых строках, как выглядит основной товар и что покупатель увидит на главном фото.")
    if any(item.score < 45 for item in ranked):
        notes.append("Разведите в описании основные фото товара и служебные материалы вроде таблиц размеров и инфографики.")
    notes.append("Добавьте короткий тезис про материал, форму и сценарий использования.")
    return "\n\n".join([base, *notes])


def recommendations(card_scores: list[CardScore]) -> list[str]:
    recs = []
    if any(item.document_signal > 0.55 or item.negative_hits > 0 for item in card_scores):
        recs.append("Уберите служебные изображения из первых позиций карточки или сделайте их явно вторичными.")
    if card_scores and card_scores[0].final_score < 0.75:
        recs.append("Главное фото стоит сделать ближе к чистому товарному кадру без лишнего текста и графики.")
    if any(item.card_gap_top > 0.18 for item in card_scores[1:]):
        recs.append("Слабые кадры стоит заменить: recovered-runtime видит сильный разрыв между top фото и остальными.")
    if not recs:
        recs.append("Карточка выглядит устойчиво: сохраните сильные товарные кадры и удерживайте единый стиль.")
    return recs[:3]
