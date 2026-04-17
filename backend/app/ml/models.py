from __future__ import annotations

import logging
import os
from contextlib import nullcontext
from functools import lru_cache

import numpy as np
import torch
from PIL import ImageOps


logger = logging.getLogger(__name__)
EPS = 1e-6


class _BaseHFModel:
    def __init__(self, model_name: str) -> None:
        import torch
        from transformers import AutoModel, AutoProcessor

        self._torch = torch
        self.model_name = model_name
        self.device = self._pick_device(torch)
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.processor = AutoProcessor.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name, torch_dtype=self.dtype if self.device == "cuda" else None).to(self.device).eval()
        logger.info("Loaded model=%s device=%s", model_name, self.device)

    @staticmethod
    def _pick_device(torch_module: object) -> str:
        torch = torch_module
        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _autocast(self):
        if self.device == "cuda":
            return self._torch.autocast(device_type="cuda", dtype=self._torch.float16)
        return nullcontext()

    def _to_numpy(self, out):
        if hasattr(out, "detach"):
            return out.detach().float().cpu().numpy()
        for name in ["image_embeds", "text_embeds", "pooler_output"]:
            value = getattr(out, name, None)
            if value is not None:
                return self._to_numpy(value)
        hidden = getattr(out, "last_hidden_state", None)
        if hidden is not None:
            return hidden[:, 0].detach().float().cpu().numpy()
        raise TypeError(type(out))

    def _l2(self, x: np.ndarray) -> np.ndarray:
        return x / (np.linalg.norm(x, axis=1, keepdims=True) + EPS)


class SiglipTextJudge(_BaseHFModel):
    def __init__(self) -> None:
        super().__init__(os.getenv("WB_SIGLIP_MODEL", "google/siglip-base-patch16-224"))

    def score_images(self, images: list, text: str) -> np.ndarray:
        if not images:
            return np.zeros(0, dtype=np.float32)
        batch = self.processor(text=[text] * len(images), images=images, padding=True, truncation=True, return_tensors="pt")
        batch = {k: v.to(self.device) for k, v in batch.items()}
        with self._torch.no_grad(), self._autocast():
            image_emb = self._to_numpy(self.model.get_image_features(pixel_values=batch["pixel_values"]))
            text_inputs = {k: v for k, v in batch.items() if k != "pixel_values"}
            text_emb = self._to_numpy(self.model.get_text_features(**text_inputs))
        image_emb = self._l2(image_emb.astype(np.float32))
        text_emb = self._l2(text_emb.astype(np.float32))
        return ((image_emb * text_emb).sum(axis=1) + 1.0) / 2.0


class ClipPromptJudge(_BaseHFModel):
    def __init__(self) -> None:
        super().__init__(os.getenv("WB_CLIP_MODEL", "openai/clip-vit-large-patch14"))
        self.families = {
            "positive": ["фото товара", "продукт на белом фоне", "товар крупным планом", "real product photo", "product on white background"],
            "package": ["упаковка товара", "товар в упаковке", "product package"],
            "lifestyle": ["товар в использовании", "lifestyle product photo", "product in use"],
            "document": ["документ", "инструкция", "certificate", "manual"],
            "banner": ["рекламный баннер", "инфографика", "advertising banner", "infographic"],
            "size_chart": ["таблица размеров", "размерная сетка", "size chart", "measurement table"],
            "certificate": ["сертификат", "техническая документация", "certificate of quality"],
            "screenshot": ["скриншот маркетплейса", "marketplace screenshot", "product card screenshot"],
            "logo_only": ["логотип без товара", "иконка", "logo without product", "icon"],
            "ambiguous": ["product photo with a lot of text", "small product photo inside infographic", "товар с большим количеством текста"],
        }
        self._prompt_names = list(self.families)
        prompts = [p for fam in self._prompt_names for p in self.families[fam]]
        self.prompt_emb = self.encode_texts(prompts)

    def encode_texts(self, prompts: list[str]) -> np.ndarray:
        batch = self.processor(text=prompts, padding=True, truncation=True, return_tensors="pt")
        batch = {k: v.to(self.device) for k, v in batch.items()}
        with self._torch.no_grad(), self._autocast():
            emb = self._to_numpy(self.model.get_text_features(**batch))
        return self._l2(emb.astype(np.float32))

    def encode_images(self, images: list) -> np.ndarray:
        if not images:
            return np.zeros((0, self.prompt_emb.shape[1]), dtype=np.float32)
        flipped = [ImageOps.mirror(img) for img in images]
        batch1 = self.processor(images=images, return_tensors="pt")
        batch2 = self.processor(images=flipped, return_tensors="pt")
        batch1 = {k: v.to(self.device) for k, v in batch1.items()}
        batch2 = {k: v.to(self.device) for k, v in batch2.items()}
        with self._torch.no_grad(), self._autocast():
            emb1 = self._to_numpy(self.model.get_image_features(**batch1))
            emb2 = self._to_numpy(self.model.get_image_features(**batch2))
        return self._l2((0.5 * emb1 + 0.5 * emb2).astype(np.float32))

    def score_families(self, images: list) -> dict[str, np.ndarray]:
        img_emb = self.encode_images(images)
        sims = img_emb @ self.prompt_emb.T
        out: dict[str, np.ndarray] = {}
        start = 0
        for fam in self._prompt_names:
            end = start + len(self.families[fam])
            out[fam] = sims[:, start:end].max(axis=1)
            start = end
        return out


@lru_cache(maxsize=1)
def get_siglip_judge() -> SiglipTextJudge | None:
    try:
        return SiglipTextJudge()
    except Exception as exc:
        logger.warning("SigLIP load failed, fallback enabled: %s", exc)
        return None


@lru_cache(maxsize=1)
def get_clip_prompt_judge() -> ClipPromptJudge | None:
    try:
        return ClipPromptJudge()
    except Exception as exc:
        logger.warning("CLIP prompt load failed, fallback enabled: %s", exc)
        return None


class FrozenImageEncoder:
    def __init__(self, candidates: list[str], device: str = "auto") -> None:
        self.device = _BaseHFModel._pick_device(torch) if device == "auto" else device
        self.model_name = ""
        self.backend = ""
        self.processor = None
        self.model = None
        errors = []
        for name in candidates:
            try:
                self._load(name)
                return
            except Exception as exc:
                errors.append(f"{name}: {exc}")
        raise RuntimeError("No image backbone loaded:\n" + "\n".join(errors))

    def _load(self, name: str) -> None:
        if name.startswith("timm/"):
            import timm
            from torchvision import transforms

            model_name = name.replace("timm/", "", 1)
            self.model = timm.create_model(model_name, pretrained=True, num_classes=0).to(self.device).eval()
            data_cfg = timm.data.resolve_model_data_config(self.model)
            self.processor = transforms.Compose(
                [
                    transforms.Resize((data_cfg["input_size"][1], data_cfg["input_size"][2])),
                    transforms.ToTensor(),
                    transforms.Normalize(mean=data_cfg["mean"], std=data_cfg["std"]),
                ]
            )
            self.model_name = name
            self.backend = "timm"
            return
        from transformers import AutoImageProcessor, AutoModel

        self.processor = AutoImageProcessor.from_pretrained(name)
        self.model = AutoModel.from_pretrained(name).to(self.device).eval()
        self.model_name = name
        self.backend = "hf"

    @torch.inference_mode()
    def encode_pils(self, images: list) -> np.ndarray:
        assert self.model is not None and self.processor is not None
        if self.backend == "timm":
            tensors = torch.stack([self.processor(img) for img in images]).to(self.device)
            with torch.autocast(device_type="cuda", enabled=self.device.startswith("cuda")):
                output = self.model(tensors)
            return output.detach().float().cpu().numpy()
        inputs = self.processor(images=images, return_tensors="pt").to(self.device)
        with torch.autocast(device_type="cuda", enabled=self.device.startswith("cuda")):
            output = self.model(**inputs)
        return _BaseHFModel._to_numpy(self, output)


class FrozenMultimodalEncoder:
    def __init__(self, candidates: list[str], text_max_length: int = 64, device: str = "auto") -> None:
        from transformers import AutoModel, AutoProcessor

        self.device = _BaseHFModel._pick_device(torch) if device == "auto" else device
        self.text_max_length = text_max_length
        self.model_name = ""
        errors = []
        for name in candidates:
            try:
                self.processor = AutoProcessor.from_pretrained(name)
                self.model = AutoModel.from_pretrained(name).to(self.device).eval()
                tokenizer_max = getattr(getattr(self.processor, "tokenizer", None), "model_max_length", text_max_length)
                config_max = getattr(getattr(self.model.config, "text_config", None), "max_position_embeddings", text_max_length)
                self.text_max_length = int(min(tokenizer_max, config_max, text_max_length))
                self.model_name = name
                return
            except Exception as exc:
                errors.append(f"{name}: {exc}")
        raise RuntimeError("No multimodal encoder loaded:\n" + "\n".join(errors))

    @torch.inference_mode()
    def encode_image_pils(self, images: list) -> np.ndarray:
        inputs = self.processor(images=images, return_tensors="pt").to(self.device)
        with torch.autocast(device_type="cuda", enabled=self.device.startswith("cuda")):
            if hasattr(self.model, "get_image_features"):
                emb = self.model.get_image_features(**inputs)
            else:
                emb = self.model.vision_model(**inputs)
        return _BaseHFModel._to_numpy(self, emb)

    @torch.inference_mode()
    def encode_texts(self, texts: list[str]) -> np.ndarray:
        inputs = self.processor(text=texts, padding=True, truncation=True, max_length=self.text_max_length, return_tensors="pt").to(self.device)
        with torch.autocast(device_type="cuda", enabled=self.device.startswith("cuda")):
            if hasattr(self.model, "get_text_features"):
                emb = self.model.get_text_features(**inputs)
            else:
                emb = self.model.text_model(**inputs)
        return _BaseHFModel._to_numpy(self, emb)


@lru_cache(maxsize=1)
def get_v2_image_encoder() -> FrozenImageEncoder | None:
    try:
        return FrozenImageEncoder(
            [
                "facebook/dinov3-vitb16-pretrain-lvd1689m",
                "facebook/dinov2-base",
            ]
        )
    except Exception as exc:
        logger.warning("v2 image encoder load failed, recovered runtime disabled: %s", exc)
        return None


@lru_cache(maxsize=1)
def get_v2_multimodal_encoder() -> FrozenMultimodalEncoder | None:
    try:
        return FrozenMultimodalEncoder(
            [
                "google/siglip2-base-patch16-224-multilingual",
                "google/siglip2-base-patch16-224",
                "google/siglip-base-patch16-224",
            ],
            text_max_length=64,
        )
    except Exception as exc:
        logger.warning("v2 multimodal encoder load failed, recovered runtime disabled: %s", exc)
        return None
