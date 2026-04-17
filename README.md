# WB Hack ML Delivery App

Готовый deliverable для жюри:

- `frontend/` — Next.js приложение + Vercel Python API в одном deployable проекте
- `backend/` — отдельный Python runtime, оставлен для локальной разработки и reference
- `docker-compose.yml` — запуск frontend + backend

## Что делает backend

Runtime принимает:

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

Для Vercel используется `frontend/api/index.py` + `frontend/ml_backend/`:

- Next.js отдает UI
- Python runtime на Vercel отдает `/api/analyze`, `/api/health`, `/api/warmup`
- модели греются на startup FastAPI app

Папка `backend/` сохранена как отдельный локальный runtime.

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

- Node.js `20+`
- Bun `1+`

### Запуск через Docker

- Docker
- Docker Compose

## Запуск без Docker

### 1. Vercel deploy

Импортируйте в Vercel папку `frontend/` как project root.

Важно:

- frontend и backend едут одним Vercel project
- Python API entrypoint: `frontend/api/index.py`
- если нужны реальные `v2` / `v4.1` артефакты, положите их в `frontend/artifacts/` или задайте `WB_ARTIFACT_ROOT`

### 2. Локально

```bash
docker compose up --build
```

Локально frontend ходит в `http://localhost:8000` через `NEXT_PUBLIC_API_BASE_URL`.

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

## Что поменяно

- `frontend/api/index.py` добавлен как Vercel Python backend
- `frontend/ml_backend/` содержит ML runtime внутри frontend project
- fallback runtime из frontend вырезан
- frontend по умолчанию бьет в same-origin `/api/analyze` на Vercel

Файлы:

- `frontend/src/shared/api/product-card-analysis.ts`
- `frontend/src/features/file-loader/model/use-step-4-analyze-trigger.ts`

## Smoke test

Минимальная ручная проверка:

1. поднять frontend + backend
2. открыть приложение
3. ввести title и description
4. загрузить хотя бы 1 изображение
5. перейти к шагу анализа
6. убедиться, что:
   - `POST /api/analyze` отвечает без 500
   - фронтенд показывает ranked images и scores

## Известные ограничения

- для Vercel Python API нужны Python зависимости и доступные артефакты/модели
- локально через `next dev` root-level Python `/api/*.py` не поднимется; для полного Vercel-подобного режима нужен `docker compose` или `vercel dev`
- точный `v2`/`v4.1` runtime требует реальные `.joblib` артефакты в `frontend/artifacts/` или через `WB_ARTIFACT_ROOT`
