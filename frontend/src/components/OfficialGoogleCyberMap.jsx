import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';

// Ultra-Dark Cyber Grid Style JSON for Google Maps
const CYBER_MAP_STYLES = [
    { elementType: "geometry", stylers: [{ color: "#070b14" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#070b14" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#040e1a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#111827" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#02040a" }] }
];

export default function OfficialGoogleCyberMap({ accounts = [] }) {
    const navigate = useNavigate();
    const [selectedNode, setSelectedNode] = useState(null);

    // YOUR GOOGLE MAPS API KEY HERE (or from import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
    const GOOGLE_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

    // Default Grid Center (e.g., San Francisco Downtown Grid)
    const defaultCenter = { lat: 37.7749, lng: -122.4194 };

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
            <APIProvider apiKey={GOOGLE_API_KEY}>
                <Map
                    defaultCenter={defaultCenter}
                    defaultZoom={14}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    styles={CYBER_MAP_STYLES}
                    style={{ width: '100%', height: '100%' }}
                >
                    {/* Substation Marker */}
                    <AdvancedMarker position={defaultCenter}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            background: '#090d16',
                            border: '2px solid #38bdf8',
                            boxShadow: '0 0 16px #38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#38bdf8',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            borderRadius: '4px'
                        }}>
                            SS
                        </div>
                    </AdvancedMarker>

                    {/* Dynamic Smart Meter Nodes */}
                    {accounts.map((node, i) => {
                        const lat = node.lat ?? (37.7749 + (i % 2 === 0 ? 0.005 * i : -0.004 * i));
                        const lng = node.lng ?? (-122.4194 + (i % 2 === 0 ? -0.006 * i : 0.005 * i));
                        const score = node.risk_score ?? 0;
                        const isCritical = score >= 0.8;
                        const isElevated = score >= 0.5 && !isCritical;
                        const color = isCritical ? '#f43f5e' : isElevated ? '#f59e0b' : '#10b981';

                        return (
                            <AdvancedMarker
                                key={node.account_id || i}
                                position={{ lat, lng }}
                                onClick={() => setSelectedNode({ ...node, lat, lng })}
                            >
                                <div style={{ position: 'relative', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    {isCritical && (
                                        <div style={{
                                            position: 'absolute',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: `2px solid ${color}`,
                                            animation: 'radarPulse 1.8s ease-out infinite'
                                        }} />
                                    )}
                                    <div style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: color,
                                        border: '2px solid #030712',
                                        boxShadow: `0 0 12px ${color}, 0 0 20px ${color}`
                                    }} />
                                </div>
                            </AdvancedMarker>
                        );
                    })}

                    {/* InfoWindow on Node Click */}
                    {selectedNode && (
                        <InfoWindow
                            position={{ lat: selectedNode.lat, lng: selectedNode.lng }}
                            onCloseClick={() => setSelectedNode(null)}
                        >
                            <div style={{ background: '#090c12', color: '#f8fafc', padding: '8px', minWidth: '160px', fontFamily: 'monospace' }}>
                                <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>NODE: {selectedNode.account_id}</div>
                                <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>Feeder: {selectedNode.feeder_id}</div>
                                <div style={{ color: selectedNode.risk_score >= 0.8 ? '#f43f5e' : '#10b981', fontWeight: 'bold', margin: '4px 0' }}>
                                    Risk: {((selectedNode.risk_score ?? 0) * 100).toFixed(0)}% · {selectedNode.status || 'Active'}
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '11px' }}>Deviation: {selectedNode.deviation}</div>
                                <button
                                    onClick={() => navigate(`/account/${selectedNode.account_id}`)}
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
                        </InfoWindow>
                    )}
                </Map>
            </APIProvider>
        </div>
    );
}