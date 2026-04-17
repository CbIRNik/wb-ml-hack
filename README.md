# WB Hack ML Delivery App

Репозиторий содержит frontend + backend для демонстрации решения по оценке релевантности изображений карточке товара Wildberries.

## Что внутри

- `frontend/` - Next.js интерфейс для загрузки карточки и показа результата
- `backend/` - FastAPI ML API с `POST /api/analyze`
- `docker-compose.yml` - локальный запуск двух сервисов

## End-to-End Flow

Пайплайн работает так:

1. frontend собирает `title`, `description` и список изображений
2. backend декодирует изображения и делает warmup ML runtime
3. backend выбирает recovered runtime, если доступны локальные артефакты
4. если часть моделей недоступна, включается fallback-ветка
5. ML runtime считает multimodal, visual, document, retrieval и card-aware сигналы
6. финальный blend возвращает ranking изображений, общий score, рекомендации и suggested description

## ML Architecture

Backend построен как модульный ensemble, а не как одна монолитная модель.

### Модули

- `backend/app/ml/pipeline.py` - orchestration layer: собирает признаки, запускает recovered runtime, формирует response
- `backend/app/ml/models.py` - lazy-load HF моделей, SigLIP/CLIP judges, recovered encoders
- `backend/app/ml/features.py` - декодирование изображений, cheap visual/layout признаки, служебные функции
- `backend/app/ml/runtime_assets.py` - поиск локальных ML артефактов прошлых версий
- `backend/app/ml/v2_runtime.py` - восстановленный runtime на базе сохраненных `v2` joblib-моделей
- `backend/app/ml/v41_runtime.py` - recovered card reranker на базе `v4.1` joblib-моделей
- `backend/app/ml/warmup.py` - прогрев моделей при старте сервиса
- `backend/app/ml/description_generator.py` - генерация suggested description через Gemma, если она доступна

### Основные ветки scoring

- `SigLIP` image-text judge - согласованность изображения и `title + description`
- `CLIP` prompt taxonomy judge - product/document/banner/size chart/logo/ambiguous families
- `v2` recovered supervised ensemble - baseline, image-only, multimodal, stacker
- `v4.1` card reranker - переоценка изображения внутри карточки
- `Gemma` description editor - улучшение описания карточки

### Как считается итоговый score

1. Изображения декодируются из base64 в `PIL.Image`
2. Считаются cheap признаки:
   - width
   - height
   - aspect ratio
   - brightness mean/std
   - white/black pixel share
   - edge density
   - text-like heuristics
3. Строится online fallback:
   - SigLIP similarity
   - CLIP prompt taxonomy
   - card-aware ranking
4. Если доступны local artifacts, поднимается recovered runtime:
   - `baseline_model.joblib`
   - `image_model_full.joblib`
   - `multimodal_model_full.joblib`
   - `stacker_model.joblib`
   - `card_reranker_seed_*.joblib`
5. Финальный score = blend recovered runtime + online fallback

## API Contract

### `GET /health`

Проверка живости сервиса.

### `POST /warmup`

Ручной прогрев ML runtime и проверка того, какие модели реально поднялись.

### `POST /api/analyze`

#### Request fields

- `title` - название карточки
- `description` - описание карточки
- `images[]` - массив изображений карточки
- `images[].id` - ID изображения
- `images[].name` - имя файла
- `images[].size` - размер файла
- `images[].src` - base64 data URL
- `images[].alt` - alt text, если есть
- `images[].caption` - caption, если есть

#### Response fields

- `overallScore` - общий score карточки
- `rankedImages` - изображения, отсортированные по релевантности
- `suggestedDescription` - улучшенная версия описания
- `suggestedOverallScore` - score для suggested description
- `suggestedRankedImages` - ranking для suggested description
- `recommendations` - короткие рекомендации по карточке

## Input Parameters in ML Stack

### SigLIP judge

- `text` - `f"{title}. {description}"[:300]`
- `images` - список `PIL.Image`
- `padding=True` - паддинг текстов в батче
- `truncation=True` - обрезка длинного текста
- `return_tensors="pt"` - выход `torch.Tensor`

### CLIP prompt judge

- `prompts` - список prompt-ов по семействам классов
- `images` - оригинальные изображения
- `flipped` - horizontal flip TTA
- `padding=True` - паддинг prompt-ов
- `truncation=True` - обрезка prompt-ов
- `return_tensors="pt"` - tensor output

### Recovered `v2` multimodal runtime

- `title_text` - title, обрезанный до 128 символов
- `description_text` - description, обрезанный до 256 символов
- `full_text` - объединенный текст, обрезанный до 300 символов
- `image_embeddings` - image encoder embeddings
- `title_embeddings` - embeddings для title
- `description_embeddings` - embeddings для description
- `full_embeddings` - embeddings для полного текста

### Recovered `v4.1` reranker

- `baseline_pred` - recovered baseline score
- `image_model_pred` - recovered image-only score
- `multimodal_model_pred` - recovered multimodal score
- `v2_stacker_pred` - recovered stacker score
- `card_size_log` - логарифм размера карточки
- `pred_rank_within_card` - ранг изображения внутри карточки
- `pred_gap_top1_top2_within_card` - разрыв между top-1 и top-2
- `sim_margin_centroids` - centroid margin из retrieval блока
- `sim_to_top1_pred_image` - similarity до лучшего фото карточки
- `sim_margin_strong_weak_card` - margin между strong и weak частью карточки

## Runtime and Warmup

При старте backend:

- пытается загрузить HF модели
- пытается поднять recovered `v2` encoders
- пытается загрузить `v2` и `v4.1` joblib-артефакты
- пишет статус warmup в лог

Если включен `WB_STRICT_WARMUP=1`, backend не стартует без успешного warmup.

Если `WB_USE_GEMMA=1`, backend пытается сгенерировать suggested description через Gemma, а при ошибке уходит в алгоритмический fallback.

## ML Parameters and Environment

- `NEXT_PUBLIC_API_BASE_URL` - адрес backend для frontend
- `NEXT_PUBLIC_USE_MOCK_API` - включить mock API на frontend
- `WB_ARTIFACT_ROOT` - корень, где лежат локальные ML артефакты
- `WB_DISABLE_HF_MODELS` - отключение тяжелых HF моделей в docker-compose по умолчанию
- `WB_STRICT_WARMUP` - требовать успешный warmup при старте backend
- `WB_USE_GEMMA` - включить Gemma для suggested description
- `WB_GEMMA_MODEL` - имя Gemma модели
- `WB_GEMMA_MAX_NEW_TOKENS` - лимит генерации Gemma
- `WB_SIGLIP_MODEL` - имя SigLIP модели
- `WB_CLIP_MODEL` - имя CLIP модели

## Local Run

### Через Docker

```bash
docker compose up --build
```

Открыть:

- frontend: `http://localhost:3000`
- backend: `http://localhost:8000`

### Без Docker

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
cp .env.example .env.local
bun install
bun dev
```

## Version History and Hypotheses

### Summary Table

| Version | Hypothesis | Main Change | Result | Verdict |
| --- | --- | --- | --- | --- |
| v0 / baseline | Single multimodal baseline is enough | similarity + visual meta | public around `0.799` then `0.854` | useful start, too weak |
| v2 | Supervised experts + stacker will beat simple baseline | baseline + image + multimodal + stacker | local `0.968359`, public around `0.948` | major breakthrough |
| v3 | Retrieval + card-aware context will add the next step | kNN, centroid margins, group features | local `0.961892`, public around `0.940` | partially useful, not enough alone |
| v4 | v2 + retrieval + reranker should improve | retrieval-augmented stack + reranker | public around `0.949` | incremental gain |
| v4.1 | Improve reranker and blend only | better card reranker | public `0.952` | small but real gain |
| v8 | Treat card as a set | set transformer / card-set logic | used later as strong expert | useful as ensemble member |
| v10 | Add hard router / specialist | document/product routing | used later in v11 | useful but sensitive |
| v11 | Best ensemble of strong experts | v8_set + v10 + hard router + set transformer | local `0.972494`, public `0.953` | strongest stable stack |
| v12 | Mini-VLM branch adds diversity | mini_vlm logistic/hgb/extra | useful as extra experts | diverse but not leading |
| v13 | Zero-shot multimodal judge adds new signal | SigLIP + CLIP prompt families | useful research branch | weak standalone, good diversity |
| v14 | Fast meta-blend can squeeze a bit more | lightweight blend over cached preds | local `0.972537`, public around `0.949` | tiny gain |
| v15 | Zero-shot SigLIP expert should diversify blend | SigLIP image-text score + card-aware norm | local `0.972636`, public `0.952` | real tiny gain |
| v16 | Multi-prompt SigLIP should improve judge | positive/negative prompt families | no confirmed final gain | interesting, not decisive |
| v17 | Pseudo-labeling confident test will reduce shift | pseudo labels + retrain meta stack | no improvement over v15 | not helpful |
| v18.1 | Freeze backbone, train only projection head | projection-head-only binary training | model stayed near `0.5` | failed as trained |

### What each version tested

- v0 / baseline - can a simple similarity-based multimodal model solve the task?
- v2 - do supervised experts and stacker matter more than one encoder?
- v3 - does global retrieval context help?
- v4 / v4.1 - does reranking inside card help?
- v8 / v10 - does set/card context and routing help?
- v11 - can we combine strong experts into one stable ensemble?
- v12 - do mini VLM experts add diversity?
- v13 - can zero-shot SigLIP + CLIP prompts add a new view?
- v14 - can we squeeze extra quality with a fast meta-blend?
- v15 - is a weak but diverse zero-shot SigLIP expert useful in the final blend?
- v16 - does multi-prompt zero-shot improve over single-prompt?
- v17 - does pseudo-labeling help the meta layer?
- v18.1 - can we fine-tune only the projection head and get a useful cheap gain?

## What Worked Best

- supervised experts
- stacker/blend over multiple views
- card-aware and set-aware logic
- `fp_specialist` for hard false positives
- small diverse zero-shot expert on top of a strong stack

## What Did Not Help Enough

- OCR as a core feature block
- naive averaging of best submissions
- pseudo-labeling of confident test predictions
- projection-head-only fine-tuning in the current setup

## Frontend Contract

Frontend отправляет данные в backend и показывает:

- общий score
- ranking изображений
- suggested description
- recommendations

Связка API:

- `frontend/src/shared/api/product-card-analysis.ts`
- `frontend/src/features/file-loader/model/use-step-4-analyze-trigger.ts`

## Limitations

- exact leaderboard ensemble не всегда можно воспроизвести 1:1 как online runtime
- первые загрузки HF моделей могут быть долгими
- fallback-ветка хуже recovered runtime
- качество сильно зависит от того, доступны ли локальные артефакты прошлых версий

## Deployment Notes

- backend можно деплоить отдельно от frontend
- frontend ждет backend через `NEXT_PUBLIC_API_BASE_URL`
- для локальных ML артефактов укажите `WB_ARTIFACT_ROOT`
- если хотите строгий startup, включите `WB_STRICT_WARMUP=1`

