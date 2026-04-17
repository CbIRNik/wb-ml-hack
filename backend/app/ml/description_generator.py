from __future__ import annotations

import logging
import os
import re
from functools import lru_cache

import torch

logger = logging.getLogger(__name__)


def generate_description_with_gemma(
    title: str,
    description: str,
    keywords: list[str],
) -> str | None:
    if os.getenv("WB_USE_GEMMA", "1") != "1":
        return None

    model_name = os.getenv("WB_GEMMA_MODEL", "google/gemma-2-2b-it")
    max_new_tokens = int(os.getenv("WB_GEMMA_MAX_NEW_TOKENS", "180"))

    tokenizer, model, device = _load_gemma_model(model_name)
    if tokenizer is None or model is None:
        return None

    prompt = _build_prompt(title=title, description=description, keywords=keywords)
    try:
        inputs = tokenizer(prompt, return_tensors="pt")
        if device != "cpu":
            inputs = {name: tensor.to(device) for name, tensor in inputs.items()}
        with torch.inference_mode():
            output_ids = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=0.45,
                top_p=0.92,
                eos_token_id=tokenizer.eos_token_id,
                pad_token_id=tokenizer.eos_token_id,
            )
        generated = tokenizer.decode(output_ids[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True)
        text = _cleanup_generated(generated)
        return text or None
    except (RuntimeError, ValueError) as exc:
        logger.warning("Gemma generation failed, fallback to algorithm: %s", exc)
        return None


def _build_prompt(title: str, description: str, keywords: list[str]) -> str:
    keyword_line = ", ".join(keywords[:8]) if keywords else "форма, материал, назначение"
    return (
        "Ты редактор карточек маркетплейса.\n"
        "Перепиши описание товара на русском языке.\n"
        "Требования:\n"
        "- Только финальный текст описания, без комментариев и советов.\n"
        "- Без фраз вроде 'добавьте', 'рекомендуется', 'в первых строках'.\n"
        "- 2-4 предложения.\n"
        "- Сохранить факты исходника, улучшить читабельность и структуру.\n"
        f"Название: {title}\n"
        f"Исходное описание: {description}\n"
        f"Ключевые слова: {keyword_line}\n"
        "Улучшенное описание:\n"
    )


def _cleanup_generated(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"^(Улучшенное описание:|Описание:)\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip(" \"'")
    if cleaned and cleaned[-1] not in ".!?":
        cleaned = f"{cleaned}."
    return cleaned


@lru_cache(maxsize=2)
def _load_gemma_model(model_name: str):
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError as exc:
        logger.warning("Transformers unavailable for Gemma, fallback to algorithm: %s", exc)
        return None, None, "cpu"

    device = _pick_device()
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        if tokenizer.pad_token_id is None:
            tokenizer.pad_token = tokenizer.eos_token

        torch_dtype = torch.float16 if device in {"cuda", "mps"} else torch.float32
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch_dtype,
        )
        if device != "cpu":
            model = model.to(device)
        model.eval()
        logger.info("Gemma loaded model=%s device=%s", model_name, device)
        return tokenizer, model, device
    except (OSError, RuntimeError, ValueError) as exc:
        logger.warning("Gemma load failed, fallback to algorithm: %s", exc)
        return None, None, device


def _pick_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"
