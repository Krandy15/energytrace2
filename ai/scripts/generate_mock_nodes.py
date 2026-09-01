"""
Generates synthetic, geographically-plausible "suspected account" nodes for
demo purposes and writes them straight into the frontend's data folder.

Usage:
    python ai/scripts/generate_mock_nodes.py
    python ai/scripts/generate_mock_nodes.py --count 400 --out ../../frontend/src/data/mock_400_nodes.json
"""
import argparse
import json
import random
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUT = SCRIPT_DIR / ".." / ".." / "frontend" / "src" / "data" / "mock_400_nodes.json"

hubs = [
    # Maharashtra Grid (Mumbai) - Push East to avoid Arabian Sea
    {"name": "Maharashtra Grid", "lat": 19.0760, "lon": 72.8777, "lat_min": -1.5, "lat_max": 1.5, "lon_min": 0.2, "lon_max": 2.5},
    
    # Nagpur Grid (Replaces Chennai) - Central India, safe to spread in all directions
    {"name": "Nagpur Grid", "lat": 21.1458, "lon": 79.0882, "lat_min": -2.0, "lat_max": 2.0, "lon_min": -2.0, "lon_max": 2.0},
    
    # West Bengal Grid (Kolkata) - Push West/North to avoid Bay of Bengal
    {"name": "West Bengal Grid", "lat": 22.5726, "lon": 88.3639, "lat_min": 0.2, "lat_max": 2.0, "lon_min": -2.5, "lon_max": -0.2},
    
    # Karnataka Grid (Bangalore) - Inland south, spread moderately
    {"name": "Karnataka Grid", "lat": 12.9716, "lon": 77.5946, "lat_min": -1.0, "lat_max": 1.5, "lon_min": -1.2, "lon_max": 1.2},
    
    # Gujarat Grid (Ahmedabad) - Push North/East to avoid Arabian Sea
    {"name": "Gujarat Grid", "lat": 23.0225, "lon": 72.5714, "lat_min": 0.1, "lat_max": 2.0, "lon_min": 0.1, "lon_max": 2.0},
    
    # UP Grid (Kanpur) - Landlocked, safe to spread wide
    {"name": "UP Grid", "lat": 26.4499, "lon": 80.3319, "lat_min": -1.5, "lat_max": 2.0, "lon_min": -2.5, "lon_max": 2.5}
]

anomalies = [
    "unusually constant daily usage", "missing readings spike in last 30 days",
    "sudden zero-variance flatline detected", "night-time consumption dropped to absolute zero"
]

def generate(count: int):
    data = []
    for _ in range(count):
        hub = random.choice(hubs)
        # Apply specific directional boundaries to keep nodes purely on land
        lat = hub["lat"] + random.uniform(hub["lat_min"], hub["lat_max"])
        lon = hub["lon"] + random.uniform(hub["lon_min"], hub["lon_max"])

        risk_val = random.randint(40, 100)
        tier = "CRITICAL" if risk_val > 85 else ("ELEVATED" if risk_val > 65 else "MONITOR")

        data.append({
            "account_id": f"HH{random.randint(10000, 99999)}",
            "feeder_zone": f"consumption dropped {random.randint(25, 100)}% vs same period last year",
            "risk_score_display": f"{risk_val}% - {tier}",
            "risk_score": risk_val / 100.0,
            "load_deviation": f"-{round(random.uniform(10.0, 35.0), 1)}%",
            "est_loss_kwh": random.randint(500, 2500),
            "primary_anomaly": random.choice(anomalies),
            "latitude": round(lat, 4),
            "longitude": round(lon, 4)
        })

    data.sort(key=lambda x: x["risk_score"], reverse=True)
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=400, help="Number of nodes to generate")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output JSON path")
    args = parser.parse_args()

    nodes = generate(args.count)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(nodes, f, indent=4)

    print(f"✅ Generated {len(nodes)} inland hierarchical nodes -> {args.out.resolve()}")