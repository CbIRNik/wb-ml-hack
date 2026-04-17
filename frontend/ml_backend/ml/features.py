from __future__ import annotations

import base64
import io
import re
from dataclasses import dataclass

import numpy as np
from PIL import Image


TOKEN_RE = re.compile(r"[a-zA-Zа-яА-Я0-9]+")
EPS = 1e-6


@dataclass
class ImageFeatures:
    width: int
    height: int
    aspect_ratio: float
    brightness_mean: float
    brightness_std: float
    white_frac: float
    edge_density: float
    landscape: float
    portrait: float
    square: float
    text_proxy: float


def decode_image(src: str | None) -> Image.Image:
    if not src:
        return Image.new("RGB", (224, 224), (255, 255, 255))
    try:
        encoded = src.split(",", 1)[1] if "," in src else src
        payload = base64.b64decode(encoded)
        return Image.open(io.BytesIO(payload)).convert("RGB")
    except Exception:
        return Image.new("RGB", (224, 224), (255, 255, 255))


def extract_image_features(image: Image.Image) -> ImageFeatures:
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    height, width = gray.shape
    aspect_ratio = float(width / max(height, 1))
    brightness_mean = float(gray.mean())
    brightness_std = float(gray.std())
    white_frac = float((gray >= 240).mean())
    gx = np.abs(np.diff(gray, axis=1, prepend=gray[:, :1]))
    gy = np.abs(np.diff(gray, axis=0, prepend=gray[:1, :]))
    edge_density = float(((gx + gy) > 28).mean())
    landscape = float(width > height * 1.35)
    portrait = float(height > width * 1.15)
    square = float(0.85 <= aspect_ratio <= 1.15)
    text_proxy = float(np.clip(0.55 * edge_density + 0.30 * landscape + 0.15 * max(white_frac - 0.65, 0.0), 0.0, 1.0))
    return ImageFeatures(
        width=width,
        height=height,
        aspect_ratio=aspect_ratio,
        brightness_mean=brightness_mean,
        brightness_std=brightness_std,
        white_frac=white_frac,
        edge_density=edge_density,
        landscape=landscape,
        portrait=portrait,
        square=square,
        text_proxy=text_proxy,
    )


def tokens(text: str) -> set[str]:
    return {m.group(0).lower() for m in TOKEN_RE.finditer(text)}


def softmax_np(x: np.ndarray) -> np.ndarray:
    z = x - x.max(axis=1, keepdims=True)
    ez = np.exp(np.clip(z, -40, 40))
    return ez / np.clip(ez.sum(axis=1, keepdims=True), EPS, None)


def rank01(x: np.ndarray) -> np.ndarray:
    order = np.argsort(x, kind="stable")
    ranks = np.empty_like(order, dtype=np.float32)
    if len(x) == 1:
        ranks[order] = 1.0
        return ranks
    ranks[order] = np.linspace(1.0 / len(x), 1.0, num=len(x), dtype=np.float32)
    return ranks
