# AI / data pipeline

Offline scripts that turn raw usage data into the risk-scored, geo-tagged
node files the frontend renders. There's no live model-serving code here —
these are one-shot generators you run locally and commit the output of.

```
ai/
├── data/
│   └── raw_dataset.csv        # your source usage-history dataset (NOT in git — see below)
└── scripts/
    ├── generate_mock_nodes.py # synthetic demo data, no CSV needed
    └── map_real_data.py       # maps raw_dataset.csv -> scored nodes
```

> **`raw_dataset.csv` is ~156MB and is git-ignored.** GitHub rejects any
> pushed file over 100MB, so this file is deliberately excluded from version
> control (see root `.gitignore`). It's still included in this download —
> just don't `git add -f` it. For a real deploy, either:
> - keep it out of git entirely and load it from wherever you store data
>   (S3, a shared drive, etc.), or
> - track it with [Git LFS](https://git-lfs.com/) if it truly needs to live
>   in the repo.

## generate_mock_nodes.py

Produces fully synthetic nodes (no real data needed) for demos:

```bash
cd ai/scripts
python generate_mock_nodes.py                 # writes 400 nodes to frontend/src/data/mock_400_nodes.json
python generate_mock_nodes.py --count 200 --out somewhere/else.json
```

## map_real_data.py

Samples rows from `ai/data/raw_dataset.csv`, assigns each a risk score and a
plausible lat/lon, and writes scored nodes for the frontend:

```bash
cd ai/scripts
python map_real_data.py                       # writes up to 1000 nodes to frontend/src/data/mock_1000_nodes.json
python map_real_data.py --csv ../data/raw_dataset.csv --sample-size 500
```

If your CSV's column names don't match `account_id`, `risk_score`,
`drop_percentage`, `estimated_loss_kwh`, `load_deviation`, `anomaly_reason`,
edit the `row.get(...)` calls inside `build_nodes()` to match your real headers.

## Where this fits

Today the frontend imports these generated JSON files directly (no backend
involved). If/when `backend/` becomes a real API, the natural next step is to
move the scoring logic here into an importable function the backend calls at
request time instead of a script you run ahead of time — see `backend/README.md`.
