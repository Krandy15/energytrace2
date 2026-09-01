import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function createCyberIcon(score) {
    const isCritical = score >= 0.8;
    const isElevated = score >= 0.5 && !isCritical;
    const color = isCritical ? '#f43f5e' : isElevated ? '#f59e0b' : '#10b981';

    return L.divIcon({
        className: 'custom-cyber-pin',
        html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        ${isCritical ? `
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid ${color};
            animation: radarPulse 1.8s ease-out infinite;
          "></div>
        ` : ''}
        <div style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #030712;
          box-shadow: 0 0 12px ${color}, 0 0 20px ${color};
        "></div>
      </div>
    `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

const substationIcon = L.divIcon({
    className: 'custom-substation-pin',
    html: `
    <div style="
      width: 22px;
      height: 22px;
      background: #090d16;
      border: 2px solid #38bdf8;
      box-shadow: 0 0 16px #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
      font-size: 10px;
      font-weight: bold;
      border-radius: 4px;
    ">SS</div>
  `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
});

export default function RealWorldCyberMap({ accounts }) {
    const navigate = useNavigate();
    const substationPos = [37.7749, -122.4194];

    const geoNodes = [
        { ...accounts[0], pos: [37.7794, -122.4114] },
        { ...accounts[1], pos: [37.7734, -122.4084] },
        { ...accounts[2], pos: [37.7684, -122.4244] },
        { ...accounts[3], pos: [37.7714, -122.4314] },
        { ...accounts[4], pos: [37.7814, -122.4264] },
        { ...accounts[5], pos: [37.7644, -122.4184] },
        { ...accounts[6], pos: [37.7764, -122.4154] }
    ];

    return (
        <div style={{
            position: 'relative',
            height: '520px',
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            boxShadow: '0 14px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(56, 189, 248, 0.15)'
        }}>
            <style>{`
        @keyframes radarPulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: rgba(9, 12, 18, 0.95) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(56, 189, 248, 0.4) !important;
          border-radius: 6px !important;
          backdrop-filter: blur(12px) !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(56, 189, 248, 0.2) !important;
        }
        .leaflet-popup-tip {
          background: rgba(9, 12, 18, 0.95) !important;
        }
      `}</style>

            <MapContainer
                center={substationPos}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', background: '#02040a' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <Marker position={substationPos} icon={substationIcon}>
                    <Popup>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                            <strong style={{ color: '#38bdf8' }}>CENTRAL SUBSTATION SS-01</strong>
                            <div>Primary 11kV Feeder Backbone</div>
                        </div>
                    </Popup>
                </Marker>

                {geoNodes.map((node, i) => {
                    if (!node.pos) return null;
                    const isCritical = (node.risk_score ?? 0) >= 0.8;
                    const lineColor = isCritical ? '#f43f5e' : (node.risk_score ?? 0) >= 0.5 ? '#f59e0b' : '#38bdf8';

                    return (
                        <React.Fragment key={node.account_id || i}>
                            <Polyline
                                positions={[substationPos, node.pos]}
                                pathOptions={{
                                    color: lineColor,
                                    weight: isCritical ? 2.5 : 1.5,
                                    dashArray: isCritical ? '6 6' : undefined,
                                    opacity: isCritical ? 0.85 : 0.4
                                }}
                            />

                            <Marker position={node.pos} icon={createCyberIcon(node.risk_score ?? 0)}>
                                <Popup>
                                    <div style={{ fontFamily: 'monospace', fontSize: '12px', minWidth: '150px' }}>
                                        <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>
                                            NODE: {node.account_id}
                                        </div>
                                        <div style={{ color: '#94a3b8' }}>Feeder: {node.feeder_id}</div>
                                        <div style={{ color: isCritical ? '#f43f5e' : '#10b981', fontWeight: 'bold', margin: '3px 0' }}>
                                            Risk: {((node.risk_score ?? 0) * 100).toFixed(0)}% · {node.status || 'Active'}
                                        </div>
                                        <div style={{ color: '#cbd5e1' }}>Deviation: {node.deviation}</div>
                                        <button
                                            onClick={() => navigate(`/account/${node.account_id}`)}
                                            style={{
                                                marginTop: '8px',
                                                width: '100%',
                                                padding: '6px 0',
                                                background: 'rgba(56, 189, 248, 0.15)',
                                                border: '1px solid #38bdf8',
                                                color: '#38bdf8',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '11px'
                                            }}
                                        >
                                            Inspect Node &rarr;
                                        </button>
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