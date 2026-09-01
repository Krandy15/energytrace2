import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 1. National HQ (Delhi)
const mainStationPos = [28.7041, 77.1025]; 

// 2. State Regional Hubs
const subStations = [
    { id: 'SS-MH', pos: [19.0760, 72.8777], name: "Maharashtra Regional Grid" },
    { id: 'SS-NG', pos: [21.1458, 79.0882], name: "Nagpur Regional Grid" }, // Moved here
    { id: 'SS-WB', pos: [22.5726, 88.3639], name: "West Bengal Regional Grid" },
    { id: 'SS-KA', pos: [12.9716, 77.5946], name: "Karnataka Regional Grid" },
    { id: 'SS-GJ', pos: [23.0225, 72.5714], name: "Gujarat Regional Grid" },
    { id: 'SS-UP', pos: [26.4499, 80.3319], name: "UP Regional Grid" }
];

// Map Pin Styling
const mainStationIcon = L.divIcon({
    className: 'main-station-pin',
    html: `<div style="width: 32px; height: 32px; background: #090d16; border: 2px solid #facc15; box-shadow: 0 0 25px #facc15, inset 0 0 10px #facc15; display: flex; align-items: center; justify-content: center; color: #facc15; font-size: 13px; font-weight: 900; border-radius: 4px;">HQ</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16]
});

const subStationIcon = L.divIcon({
    className: 'substation-pin',
    html: `<div style="width: 24px; height: 24px; background: #090d16; border: 2px solid #38bdf8; box-shadow: 0 0 16px #38bdf8; display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 10px; font-weight: 800; border-radius: 4px;">SS</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12]
});

function createCyberIcon(score) {
    const isCritical = score >= 0.8;
    const isElevated = score >= 0.5 && !isCritical;
    const color = isCritical ? '#f43f5e' : isElevated ? '#f59e0b' : '#10b981';
    return L.divIcon({
        className: 'custom-map-pin',
        html: `
      <div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
        ${isCritical ? `<div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${color}; animation: radarPulse 1.6s ease-out infinite;"></div>` : ''}
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; box-shadow: 0 0 10px ${color};"></div>
      </div>`,
        iconSize: [20, 20], iconAnchor: [10, 10]
    });
}

// Auto-camera adjuster for India
function MapBoundsAdjuster() {
    const map = useMap();
    useEffect(() => {
        const bounds = L.latLngBounds([[8.0, 68.1], [37.6, 97.3]]);
        map.fitBounds(bounds, { padding: [20, 20] });
    }, [map]);
    return null;
}

export default function CyberVectorMap({ accounts = [] }) {
    const navigate = useNavigate();

    const validNodes = useMemo(() => {
        return accounts
            .map((acc) => ({ ...acc, pos: [Number(acc.lat), Number(acc.lng)] }))
            .filter(acc => !isNaN(acc.pos[0]) && !isNaN(acc.pos[1]));
    }, [accounts]);

    return (
        <div style={{ position: 'relative', height: '560px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
            <style>{`
        @keyframes radarPulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
        .leaflet-popup-content-wrapper { background: rgba(9, 12, 18, 0.95) !important; color: #f8fafc !important; border: 1px solid rgba(56, 189, 248, 0.4) !important; border-radius: 6px !important; }
        .leaflet-popup-tip { background: rgba(9, 12, 18, 0.95) !important; }
        .leaflet-control-attribution { display: none !important; }
        /* Google Maps Color Inversion Hack */
        .cyber-tiles { filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%); }
      `}</style>

            <MapContainer center={[22.0, 79.0]} zoom={5} scrollWheelZoom={true} style={{ height: '100%', width: '100%', background: '#02040a' }}>
                <TileLayer 
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
                    className="cyber-tiles"
                />
                <MapBoundsAdjuster />

                {/* 1. National HQ Marker */}
                <Marker position={mainStationPos} icon={mainStationIcon}>
                    <Popup><div style={{ color: '#facc15', fontWeight: 'bold' }}>NATIONAL GRID HQ (DELHI)</div></Popup>
                </Marker>

                {/* 2. Backbone Lines: HQ to State Sub-Stations */}
                {subStations.map((sub, i) => (
                    <React.Fragment key={`sub-${i}`}>
                        <Polyline positions={[mainStationPos, sub.pos]} pathOptions={{ color: '#38bdf8', weight: 2.5, opacity: 0.7 }} />
                        <Marker position={sub.pos} icon={subStationIcon}>
                            <Popup><div style={{ color: '#38bdf8', fontWeight: 'bold' }}>{sub.name}</div></Popup>
                        </Marker>
                    </React.Fragment>
                ))}

                {/* 3. Local Lines: State Sub-Stations to Houses */}
                {validNodes.map((node, i) => {
                    // Find closest substation dynamically
                    let closestSub = subStations[0];
                    let minRadius = Infinity;
                    subStations.forEach(sub => {
                        const dist = Math.pow(sub.pos[0] - node.pos[0], 2) + Math.pow(sub.pos[1] - node.pos[1], 2);
                        if(dist < minRadius) { minRadius = dist; closestSub = sub; }
                    });

                    const score = node.risk_score ?? 0;
                    const isCritical = score >= 0.8;
                    const lineColor = isCritical ? '#f43f5e' : score >= 0.5 ? '#f59e0b' : '#10b981';

                    return (
                        <React.Fragment key={node.account_id || i}>
                            <Polyline positions={[closestSub.pos, node.pos]} pathOptions={{ color: lineColor, weight: isCritical ? 1.5 : 1.0, dashArray: isCritical ? '4 6' : undefined, opacity: isCritical ? 0.8 : 0.3 }} />
                            <Marker position={node.pos} icon={createCyberIcon(score)}>
                                <Popup>
                                    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                        <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>NODE: {node.account_id}</div>
                                        <div style={{ color: isCritical ? '#f43f5e' : '#10b981', fontWeight: 'bold', margin: '4px 0' }}>Risk: {(score * 100).toFixed(0)}%</div>
                                        <button onClick={() => navigate(`/account/${node.account_id}`)} style={{ width: '100%', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '4px', cursor: 'pointer', padding: '4px 0', marginTop: '6px' }}>Inspect</button>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}
            </MapContainer>
        </div>
    );
}