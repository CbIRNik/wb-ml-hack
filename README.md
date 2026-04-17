# WB Hack ML Delivery App

Готовый deliverable для жюри:

- `frontend/` — фронтенд на Next.js, привязан к реальному HTTP backend
- `backend/` — FastAPI backend с endpoint `POST /api/analyze`, использующий recovered `v11-runtime`
- `docker-compose.yml` — запуск обоих сервисов без ручных правок

## Что делает backend

Backend принимает:

- `title`
- `description`
- `images[]`
  - `id`
  - `name`
  - `size`
  - `src` — base64 data URL изображения

И возвращает результат в формате, который уже ожидает фронтенд:

- `overallScore`
- `rankedImages`
- `suggestedDescription`
- `suggestedOverallScore`
- `suggestedRankedImages`
- `recommendations`

Внутри backend используется отдельный модуль `backend/app/ml/` с recovered `v11-runtime` логикой:

- реальные сохраненные `v2` модели:
  - `baseline_model.joblib`
  - `image_model_full.joblib`
  - `multimodal_model_full.joblib`
  - `stacker_model.joblib`
- реальные сохраненные `v4.1` card reranker модели
- online fallback-ветка:
  - `SigLIP` image-text judge
  - `CLIP` prompt taxonomy judge
  - layout/document признаки
  - card-aware ranking внутри текущей карточки

То есть backend сначала пытается поднять восстановленный runtime из артефактов прошлых версий, а если часть весов недоступна или окружение не дотягивает HF-модели, уходит в безопасный `v11-like` fallback без падения API.

## Структура

```text
delivery_app/
backend/
  app/
    ml/
    main.py
    schemas.py
    service.py
  requirements.txt
    Dockerfile
  frontend/
    src/...
    .env.example
    Dockerfile
  docker-compose.yml
  README.md
```

## Требования к окружению

### Локальный запуск без Docker

- Python `3.11+`
- Node.js `20+`
- npm `10+`
- интернет на первом запуске backend для скачивания HF-весов fallback-ветки
- локальные артефакты проекта в репозитории или путь к ним через `WB_ARTIFACT_ROOT`

### Запуск через Docker

- Docker
- Docker Compose

## Запуск без Docker

### 1. Backend

```bash
cd delivery_app/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Если артефакты соревнования лежат не в корне этого репозитория, перед запуском выставьте:

```bash
export WB_ARTIFACT_ROOT=/absolute/path/to/wbhack2026
```

Проверка:

```bash
curl http://localhost:8000/health
```

Ожидается:

```json
{"status":"ok"}
```

Примечание:

- первый запуск backend может занять больше времени, потому что скачиваются веса `SigLIP` и `CLIP`
- дальше модель держится в памяти процесса и повторно не инициализируется на каждый запрос

### 2. Frontend

```bash
cd delivery_app/frontend
cp .env.example .env.local
npm install
npm run dev
```

Открыть:

```text
http://localhost:3000
```

## Запуск через Docker

Из папки `delivery_app/`:

```bash
docker compose up --build
```

Открыть:

- frontend: `http://localhost:3000`
- backend health: `http://localhost:8000/health`

## API контракт

### POST `/api/analyze`

Request:

```json
{
  "title": "Платье летнее",
  "description": "Легкое платье из хлопка",
  "images": [
    {
      "id": "1",
      "name": "photo-1.jpg",
      "size": 123456,
      "src": "data:image/jpeg;base64,..."
    }
  ]
}
```

Response:

```json
{
  "overallScore": 81,
  "rankedImages": [
    {
      "id": "1",
      "score": 86,
      "reason": "Фото хорошо поддерживает карточку и выглядит как основной товарный кадр."
    }
  ],
  "suggestedDescription": "....",
  "suggestedOverallScore": 85,
  "suggestedRankedImages": [
    {
      "id": "1",
      "score": 88,
      "reason": "Фото хорошо поддерживает карточку и выглядит как основной товарный кадр."
    }
  ],
  "recommendations": [
    "Повторите в первых фото материал, сценарий и главный тезис описания."
  ]
}
```

## Что поменяно во фронтенде

- убран чисто mock-only режим по умолчанию
- добавлен реальный `fetch` в backend
- перед отправкой изображения конвертируются в base64 data URL
- контракт фронтенда и backend согласован

Файлы:

- `frontend/src/shared/api/product-card-analysis.ts`
- `frontend/src/features/file-loader/model/use-step-4-analyze-trigger.ts`

## Smoke test

Минимальная ручная проверка:

1. поднять backend
2. открыть frontend
3. ввести title и description
4. загрузить хотя бы 1 изображение
5. перейти к шагу анализа
6. убедиться, что:
   - backend отвечает без 500
   - фронтенд показывает ranked images и scores

## Известные ограничения

- часть `v11` веток в истории проекта сохранилась только как `OOF/submission`, а не как отдельные runtime-модели
- поэтому backend сейчас использует максимально близкий recovered-runtime: реальные `v2`/`v4.1` модели плюс `v11-like` fallback
- API-контракт при этом стабильный, так что ML-часть можно усиливать без правок фронтенда
