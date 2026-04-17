# WB Hack ML Delivery App

- `frontend/` — Next.js UI
- `backend/` — Python ML API
- `docker-compose.yml` — локальный запуск двух сервисов

## Архитектура

Frontend отправляет запросы во внешний backend:

- frontend -> `NEXT_PUBLIC_API_BASE_URL/api/analyze`
- frontend -> `NEXT_PUBLIC_API_BASE_URL/health`

Backend принимает:

- `title`
- `description`
- `images[]`
  - `id`
  - `name`
  - `size`
  - `src`

И возвращает:

- `overallScore`
- `rankedImages`
- `suggestedDescription`
- `suggestedOverallScore`
- `suggestedRankedImages`
- `recommendations`

## Локальный запуск

```bash
docker compose up --build
```

Открыть:

- frontend: `http://localhost:3000`
- backend health: `http://localhost:8000/health`

Без Docker:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

```bash
cd frontend
cp .env.example .env.local
bun install
bun dev
```

## Deploy

Frontend деплой отдельно:

- Vercel
- env var: `NEXT_PUBLIC_API_BASE_URL=https://your-backend.example.com`

Backend деплой отдельно:

- любой Python host с Docker или Python 3.11+
- нужны модели/артефакты и `WB_ARTIFACT_ROOT`, если они не лежат по default path

## Важно

- встроенный backend из `frontend/` убран
- если `NEXT_PUBLIC_API_BASE_URL` не задан в production, frontend выбросит явную ошибку
- endpoint path у backend остается `/api/analyze`
