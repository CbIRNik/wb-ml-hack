# WB Hack ML Delivery App

Репозиторий содержит готовый frontend + backend для демонстрации решения по оценке релевантности изображений карточке товара.

## Что внутри

- `frontend/` - Next.js интерфейс для загрузки карточки и показа результата
- `backend/` - FastAPI ML API с endpoint `POST /api/analyze`
- `docker-compose.yml` - локальный запуск двух сервисов

## Архитектура решения

Система работает как цепочка из четырех уровней:

1. frontend собирает `title`, `description` и изображения карточки
2. backend декодирует изображения, прогоняет warmup и выбирает доступный ML runtime
3. ML runtime считает multimodal, visual, document, card-aware и expert signals
4. финальный blend возвращает ranking изображений, общий score, рекомендации и suggested description

## ML архитектура backend

Backend не опирается на одну модель. Внутри `backend/app/ml/` используется модульная схема:

- `pipeline.py` - основной orchestration layer: принимает payload, собирает признаки, запускает recovered runtime и fallback-ветки, формирует response
- `models.py` - lazy-load HF моделей и recovered encoders
- `features.py` - декодирование изображений, простые visual/layout признаки и служебные функции
- `runtime_assets.py` - поиск локальных артефактов прошлых версий
- `v2_runtime.py` - восстановленный runtime на базе сохраненных `v2` артефактов
- `v41_runtime.py` - card reranker на базе сохраненных `v4.1` артефактов
- `warmup.py` - прогрев моделей на старте сервиса
- `description_generator.py` - улучшение описания через Gemma, если модель доступна

### Как считается ML score

1. Изображения декодируются из base64 в `PIL.Image`
2. Считаются cheap visual признаки:
   - width, height, aspect ratio
   - brightness, white/black pixel share
   - edge density и text-like heuristics
3. Строится online fallback:
   - `SigLIP` image-text judge
   - `CLIP` prompt taxonomy judge
   - card-aware ranking внутри карточки
4. Если доступны локальные артефакты прошлых версий, поднимается recovered runtime:
   - `v2` baseline / image / multimodal / stacker models
   - `v4.1` card reranker models
5. Финальный score - blend recovered runtime + online fallback

### Какие ветки используются

- `SigLIP` - image-text similarity для `title + description`
- `CLIP` - prompt families для product, document, banner, size chart, logo и других классов
- `v2` - supervised recovered ensemble на сохраненных joblib-моделях
- `v4.1` - card-level reranker для перерасчета score внутри карточки
- `Gemma` - генерация suggested description, если включена и модель доступна

### Warmup

При старте backend выполняется warmup:

- пытается загрузить HF-модели
- пытается поднять recovered `v2` encoders
- пытается загрузить `v2` и `v4.1` joblib-артефакты
- сохраняет статус в логах

Если включен `WB_STRICT_WARMUP=1`, backend не стартует без успешного warmup.

## API контракт

### `GET /health`

Проверка живости сервиса.

### `POST /warmup`

Ручной прогрев ML runtime и проверка, какие модели реально поднялись.

### `POST /api/analyze`

Вход:

- `title`
- `description`
- `images[]`
  - `id`
  - `name`
  - `size`
  - `src`
  - `alt`
  - `caption`

Выход:

- `overallScore`
- `rankedImages`
- `suggestedDescription`
- `suggestedOverallScore`
- `suggestedRankedImages`
- `recommendations`

## Локальный запуск

### Через Docker

Из корня репозитория:

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

## Переменные окружения

- `NEXT_PUBLIC_API_BASE_URL` - адрес backend для frontend
- `NEXT_PUBLIC_USE_MOCK_API` - включить mock API на frontend
- `WB_ARTIFACT_ROOT` - корень с локальными ML артефактами, если они лежат не рядом с backend
- `WB_DISABLE_HF_MODELS` - отключает тяжелые HF модели в docker-compose по умолчанию
- `WB_STRICT_WARMUP` - требует успешный warmup при старте backend
- `WB_USE_GEMMA` - включает генерацию suggested description через Gemma
- `WB_GEMMA_MODEL` - имя модели Gemma
- `WB_GEMMA_MAX_NEW_TOKENS` - лимит генерации для Gemma
- `WB_SIGLIP_MODEL` - имя SigLIP модели для online branch
- `WB_CLIP_MODEL` - имя CLIP модели для prompt branch

## Что важно знать о моделях

- Если HF-модели недоступны или окружение урезано, backend не падает
- В этом случае включается fallback-логика
- Если доступны сохраненные артефакты прошлых версий, используется recovered runtime
- Это позволяет сервису оставаться запускаемым даже в нестабильных окружениях

## Frontend

Frontend отправляет payload в backend и показывает:

- общий score
- ranking изображений
- suggested description
- рекомендации

Связка API лежит в:

- `frontend/src/shared/api/product-card-analysis.ts`
- `frontend/src/features/file-loader/model/use-step-4-analyze-trigger.ts`

## ML и идеология решения

Решение построено не вокруг одной модели, а вокруг ensemble-подхода:

- multimodal similarity ловит согласованность текста и изображения
- visual/layout признаки ловят документные и баннерные кадры
- card-aware контекст ловит относительную роль каждого изображения в карточке
- recovered `v2`/`v4.1` модели добавляют сильный supervised сигнал
- fallback-ветки сохраняют работоспособность сервиса в реальном окружении

## Известные ограничения

- exact leaderboard ensemble не всегда можно воспроизвести как runtime 1:1, если часть артефактов существовала только как OOF/submission
- первые загрузки HF-моделей могут быть долгими
- качество fallback-ветки ниже, чем у recovered runtime с полным набором артефактов

## Deployment notes

- backend можно деплоить отдельно от frontend
- frontend ждет backend через `NEXT_PUBLIC_API_BASE_URL`
- при переносе репозитория вместе с ML артефактами важно указать `WB_ARTIFACT_ROOT`

