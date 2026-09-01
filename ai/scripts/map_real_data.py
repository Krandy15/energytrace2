"""
Maps a real usage-history CSV onto risk-scored, geo-tagged nodes and writes
them into the frontend's data folder.

Usage:
    python ai/scripts/map_real_data.py
    python ai/scripts/map_real_data.py --csv ../data/raw_dataset.csv --out ../../frontend/src/data/mock_1000_nodes.json

If your CSV column names differ from the defaults below, edit the
`row.get("...")` calls in the loop to match your actual headers.
"""
import argparse
import csv
import json
import random
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CSV = SCRIPT_DIR / ".." / "data" / "raw_dataset.csv"
DEFAULT_OUT = SCRIPT_DIR / ".." / ".." / "frontend" / "src" / "data" / "mock_1000_nodes.json"

# Geographic hubs to create realistic grid clusters
hubs = [
    {"lat": 28.7041, "lon": 77.1025}, {"lat": 19.0760, "lon": 72.8777},
    {"lat": 12.8406, "lon": 80.1534}, {"lat": 22.5726, "lon": 88.3639},
    {"lat": 12.9716, "lon": 77.5946}, {"lat": 23.0225, "lon": 72.5714},
    {"lat": 26.4499, "lon": 80.3319}
]

# Fallback anomalies if your dataset doesn't have a specific anomaly reason column
fallback_anomalies = [
    "unusually constant daily usage", "missing readings spike in last 30 days",
    "sudden zero-variance flatline detected", "night-time consumption dropped to absolute zero"
]

def load_rows(csv_path: Path, sample_size: int):
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)

    n = min(sample_size, len(all_rows))
    return random.sample(all_rows, n)


def build_nodes(sampled_rows):
    data = []
    for row in sampled_rows:
        # Generate random location
        hub = random.choice(hubs)
        lat = hub["lat"] + random.uniform(-4.5, 4.5)
        lon = hub["lon"] + random.uniform(-4.5, 4.5)
        
        # ==========================================
        # 2. MAP YOUR ACTUAL CSV COLUMNS HERE
        # Replace 'YOUR_CSV_COLUMN_NAME' with the exact headers from your CSV
        # ==========================================
        
        # Example: if your CSV has a column called 'account_id', use row.get('account_id')
        account_id = row.get("account_id", f"HH{random.randint(10000, 99999)}")
        
        # If your dataset already has a risk score (e.g., 0.0 to 1.0), multiply by 100
        # Otherwise, generating a random one for the demo if it's missing
        risk_val = float(row.get("risk_score", random.randint(40, 100)))
        if risk_val <= 1.0: 
            risk_val = int(risk_val * 100)
            
        tier = "CRITICAL" if risk_val > 85 else ("ELEVATED" if risk_val > 65 else "MONITOR")
        
        # Map actual KWh loss or usage drops if they exist in your dataset
        drop_pct = row.get("drop_percentage", random.randint(25, 100))
        est_loss = row.get("estimated_loss_kwh", random.randint(500, 2500))
        load_dev = row.get("load_deviation", f"-{round(random.uniform(10.0, 35.0), 1)}")

        data.append({
            "account_id": str(account_id),
            "feeder_zone": f"consumption dropped {drop_pct}% vs same period last year", 
            "risk_score_display": f"{int(risk_val)}% - {tier}",
            "risk_score": float(risk_val) / 100.0,
            "load_deviation": f"{load_dev}%" if not str(load_dev).endswith("%") else load_dev,
            "est_loss_kwh": int(float(est_loss)),
            "primary_anomaly": row.get("anomaly_reason", random.choice(fallback_anomalies)),
            "latitude": round(lat, 4),
            "longitude": round(lon, 4)
        })

    # Sort descending so highest risk is at the top of your UI table
    data.sort(key=lambda x: x["risk_score"], reverse=True)
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Path to the raw dataset CSV")
    parser.add_argument("--sample-size", type=int, default=1000, help="Number of rows to sample")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output JSON path")
    args = parser.parse_args()

    sampled = load_rows(args.csv, args.sample_size)
    nodes = build_nodes(sampled)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(nodes, f, indent=4)

    print(f"✅ Successfully mapped {len(nodes)} real dataset rows -> {args.out.resolve()}")