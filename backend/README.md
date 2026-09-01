# Backend — not yet implemented

There was no backend code in the original project export — this folder is a
placeholder so the repo has the right shape to drop one in.

Right now the frontend runs entirely off local files (`frontend/public/scores.json`
and the generated files in `frontend/src/data/`), so **the app works with this
folder empty**. Nothing is blocked on the backend existing.

## What the frontend already expects from you

Two pieces of frontend code assume a backend will show up on `http://localhost:8000`:

1. `frontend/vite.config.js` proxies these paths to `localhost:8000` in dev:
   `/accounts`, `/model`, `/inspections`, `/audit`, `/simulate`
2. `frontend/src/api/client.js` currently reads local JSON directly, but is the
   single place all "backend" calls go through. Point its functions at real
   `fetch()` calls once an API exists, and nothing else in the app needs to change.

## Suggested contract (inferred from the mock data already in the repo)

Based on `frontend/src/mocks/rankedAccounts.json` and
`frontend/src/mocks/accountDetail.json`, a real backend would likely expose:

```
GET  /accounts?limit=&offset=
     -> { total: number, results: [{ account_id, risk_score, rank, top_reasons[] }] }

GET  /accounts/:accountId
     -> { account_id, risk_score, rank, top_reasons[],
          daily_readings: [{ date, kwh, was_missing }] }

GET  /model/...        (model version / metadata — path reserved by vite proxy)
GET  /inspections/...  (inspection scheduling/results — path reserved by vite proxy)
GET  /audit/...        (audit trail — path reserved by vite proxy)
POST /simulate         (what-if simulation — path reserved by vite proxy)
```

Treat this as a starting draft, not a spec — confirm field names against
whatever `frontend/src/api/client.js` ends up calling once you build against it.

## Suggested stack

Nothing here is prescribed by the frontend beyond "serves JSON over HTTP on
port 8000." FastAPI (Python) is a natural fit since the `ai/` folder is
already Python — it would let the scoring logic in `ai/` be imported
directly instead of shelling out. Structure once you start:

```
backend/
├── app/
│   ├── main.py          # FastAPI app + routes above
│   ├── models.py        # Pydantic response models matching the contract
│   └── scoring.py        # import from ai/ for risk scores
├── requirements.txt
└── .env                  # not committed — DB URL, etc.
```
