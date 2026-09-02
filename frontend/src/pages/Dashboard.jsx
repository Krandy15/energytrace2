// Author: Krish Gohil (25BLC1108)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import CyberVectorMap from '../components/CyberVectorMap';
import mockData from '../data/mock_400_nodes.json';
import { getRiskLevel } from '../utils/risk'; // Ensure this path correctly points to your risk.js file

class CyberAudioEngine {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  playChirp(freq = 880, duration = 0.04) {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { }
  }
  playWarpBoom() {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) { }
  }
}
const audio = new CyberAudioEngine();

function createShiningTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(56, 189, 248, 0.95)');
  grad.addColorStop(0.6, 'rgba(14, 165, 233, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function CyberMatrixBackground({ isExiting }) {
  const gridRef = useRef(null);
  const glowTexture = useMemo(() => createShiningTexture(), []);
  const cols = 50;
  const rows = 35;
  const count = cols * rows;

  const [positions, origPos, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);
    const colsArr = new Float32Array(count * 3);
    const primary = new THREE.Color('#38bdf8').multiplyScalar(1.5);
    const accent = new THREE.Color('#a855f7').multiplyScalar(1.8);

    let idx = 0;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = (i - cols / 2) * 0.75;
        const z = (j - rows / 2) * 0.75 - 2;
        const y = -3.2;
        pos[idx * 3] = x;
        pos[idx * 3 + 1] = y;
        pos[idx * 3 + 2] = z;
        orig[idx * 3] = x;
        orig[idx * 3 + 1] = y;
        orig[idx * 3 + 2] = z;
        const col = Math.random() > 0.85 ? accent : primary;
        colsArr[idx * 3] = col.r;
        colsArr[idx * 3 + 1] = col.g;
        colsArr[idx * 3 + 2] = col.b;
        idx++;
      }
    }
    return [pos, orig, colsArr];
  }, [cols, rows, count]);

  useFrame((state) => {
    if (!gridRef.current) return;
    const time = state.clock.getElapsedTime();
    const { x: mx, y: my } = state.pointer;
    const posArr = gridRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ox = origPos[i3];
      const oz = origPos[i3 + 2];
      const wave = Math.sin(time * 1.5 + ox * 0.4 + oz * 0.3) * 0.35;
      posArr[i3 + 1] = origPos[i3 + 1] + wave;
    }
    gridRef.current.geometry.attributes.position.needsUpdate = true;
    gridRef.current.rotation.y = time * 0.015 + mx * 0.04;
    gridRef.current.rotation.x = 0.22 - my * 0.04;
  });

  return (
    <points ref={gridRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.13}
        map={glowTexture}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [viewMode, setViewMode] = useState("table"); 
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 50);

    const loadData = () => {
      try {
        const mappedData = mockData.map((item) => {
          // Unified logic: rely entirely on risk.js for status assignment
          const riskInfo = getRiskLevel(item.risk_score); 
          return {
            account_id: item.account_id,
            feeder_id: item.feeder_zone,
            risk_score: item.risk_score,
            deviation: item.load_deviation,
            loss_kwh: item.est_loss_kwh,
            status: riskInfo.label, 
            tamper_flag: item.primary_anomaly,
            lat: item.latitude,
            lng: item.longitude
          };
        });
        setAccounts(mappedData);
      } catch (error) {
        console.error("Failed to load local data:", error);
      }
    };

    loadData();
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (path) => {
    if (isExiting) return;
    audio.playWarpBoom();
    setIsExiting(true);
    setTimeout(() => navigate(path), 450);
  };

  const metrics = useMemo(() => {
    const total = accounts.length || 1;
    // Unified logic: calculate metrics using risk.js categories
    const criticalCount = accounts.filter(a => getRiskLevel(a.risk_score).level === 'CRITICAL').length; 
    const elevatedCount = accounts.filter(a => {
      const lvl = getRiskLevel(a.risk_score).level;
      return lvl === 'HIGH' || lvl === 'MEDIUM'; 
    }).length;
    
    const totalLossKwh = accounts.reduce((sum, a) => sum + (Number(a.loss_kwh) || 0), 0);

    return {
      criticalCount,
      elevatedCount,
      totalLossKwh: totalLossKwh.toLocaleString(),
      avgTheftRisk: Math.round((accounts.reduce((sum, a) => sum + (a.risk_score || 0), 0) / total) * 100)
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matches =
        (item.account_id || "").toLowerCase().includes(q) ||
        (item.feeder_id || "").toLowerCase().includes(q) ||
        (item.tamper_flag || "").toLowerCase().includes(q);

      if (!matches) return false;
      
      const riskLevel = getRiskLevel(item.risk_score).level; 
      if (filter === "critical") return riskLevel === 'CRITICAL';
      if (filter === "elevated") return riskLevel === 'HIGH' || riskLevel === 'MEDIUM';
      if (filter === "normal") return riskLevel === 'LOW';
      return true;
    });
  }, [accounts, filter, searchQuery]);

  return (
    <div style={styles.viewportWrapper}>
      <style>{`
        .cyber-dashboard-fade {
          opacity: ${isMounted && !isExiting ? 1 : 0};
          transform: ${isMounted && !isExiting ? 'scale(1) translateY(0)' : isExiting ? 'scale(0.97) translateY(8px)' : 'scale(1.02) translateY(-8px)'};
          transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dashboard-row {
          transition: all 0.22s ease;
          cursor: pointer;
        }
        .dashboard-row:hover {
          background: rgba(56, 189, 248, 0.12) !important;
          transform: translateX(6px);
          box-shadow: inset 2px 0 0 #38bdf8;
        }
        .toggle-tab {
          padding: 8px 18px;
          border-radius: 4px;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(12, 16, 24, 0.85);
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .toggle-tab.active {
          background: rgba(56, 189, 248, 0.22);
          border-color: #38bdf8;
          color: #ffffff;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.4);
        }
      `}</style>

      <div style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 2, 7.5], fov: 48 }} gl={{ antialias: true, toneMappingExposure: 1.25 }}>
          <color attach="background" args={['#02040a']} />
          <ambientLight intensity={0.25} />
          <CyberMatrixBackground isExiting={isExiting} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.22} luminanceSmoothing={0.85} intensity={2.0} blendFunction={BlendFunction.SCREEN} />
          </EffectComposer>
        </Canvas>
      </div>

      <div className="cyber-dashboard-fade" style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.badgeLabel}>
              <span style={styles.pulseDot}></span>
              AUTONOMOUS GRID INTEL COMMAND · INDIA REGIONAL ZONE
            </div>
            <h1 style={styles.pageTitle}>Fleet Telemetry & Feeder Topology</h1>
          </div>
          <button onClick={() => handleNavigate('/')} style={styles.backBtn} onMouseEnter={() => audio.playChirp(700)}>
            &larr; Exit Terminal
          </button>
        </div>

        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricTitle}>CRITICAL THEFT NODES</span>
            <span style={{ ...styles.metricValue, color: '#f43f5e', textShadow: '0 0 20px rgba(244, 63, 94, 0.65)' }}>
              {metrics.criticalCount}
            </span>
            <span style={styles.metricSub}>Immediate Inspection Flagged</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricTitle}>ELEVATED ANOMALIES</span>
            <span style={{ ...styles.metricValue, color: '#f59e0b', textShadow: '0 0 20px rgba(245, 158, 11, 0.65)' }}>
              {metrics.elevatedCount}
            </span>
            <span style={styles.metricSub}>Telemetry Drift Detected</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricTitle}>ESTIMATED DRAIN (KWH)</span>
            <span style={{ ...styles.metricValue, color: '#38bdf8', textShadow: '0 0 20px rgba(56, 189, 248, 0.65)' }}>
              {metrics.totalLossKwh}
            </span>
            <span style={styles.metricSub}>Cumulative Periodic Loss</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricTitle}>MEAN THEFT RISK</span>
            <span style={{ ...styles.metricValue, color: '#f8fafc', textShadow: '0 0 16px rgba(255, 255, 255, 0.45)' }}>
              {metrics.avgTheftRisk}%
            </span>
            <span style={styles.metricSub}>Feeder Aggregate Confidence</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`toggle-tab ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => {
                audio.playChirp(900);
                setViewMode('map');
              }}
            >
              🌐 GEOSPATIAL FEEDER MAP
            </button>
            <button
              className={`toggle-tab ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => {
                audio.playChirp(900);
                setViewMode('table');
              }}
            >
              📊 TELEMETRY DATA MATRIX
            </button>
          </div>

          {viewMode === 'table' && (
            <input
              type="text"
              placeholder="Search node, feeder zone, or tamper vector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          )}
        </div>

        {viewMode === 'map' ? (
          <CyberVectorMap accounts={accounts} />
        ) : (
          <div style={styles.tablePanel}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>ACCOUNT ID</th>
                  <th style={styles.th}>FEEDER ZONE</th>
                  <th style={styles.th}>RISK SCORE</th>
                  <th style={styles.th}>LOAD DEVIATION</th>
                  <th style={styles.th}>EST. LOSS</th>
                  <th style={styles.th}>PRIMARY ANOMALY</th>
                  <th style={styles.thRight}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((node, i) => {
                  // Unified logic: generate table colors directly from risk.js
                  const riskInfo = getRiskLevel(node.risk_score); 

                  return (
                    <tr
                      key={node.account_id || i}
                      className="dashboard-row"
                      style={styles.tr}
                      onClick={() => handleNavigate(`/account/${node.account_id}`)}
                      onMouseEnter={() => audio.playChirp(800, 0.02)}
                    >
                      <td style={styles.td}>
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>{node.account_id}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>{node.feeder_id}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '3px 9px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: riskInfo.color,
                          background: riskInfo.bgVar,
                          border: `1px solid ${riskInfo.borderVar}`
                        }}>
                          {(node.risk_score * 100).toFixed(0)}% · {node.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontFamily: 'monospace', color: (node.deviation || '').startsWith('-') ? '#f43f5e' : '#10b981' }}>
                          {node.deviation}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{node.loss_kwh} kWh</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{node.tamper_flag}</span>
                      </td>
                      <td style={styles.tdRight}>
                        <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.82rem' }}>Inspect &rarr;</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  viewportWrapper: {
    minHeight: '100vh',
    width: '100%',
    position: 'relative',
    background: '#02040a',
    color: '#f8fafc',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  canvasContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    pointerEvents: 'none'
  },
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '36px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  badgeLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#38bdf8',
    marginBottom: '6px',
    textShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#38bdf8',
    boxShadow: '0 0 10px #38bdf8, 0 0 20px #38bdf8'
  },
  pageTitle: {
    fontSize: '2.1rem',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.02em',
    color: '#ffffff',
    textShadow: '0 0 24px rgba(255, 255, 255, 0.2)'
  },
  backBtn: {
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    padding: '9px 18px',
    borderRadius: '4px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 0 14px rgba(56, 189, 248, 0.2)',
    transition: 'all 0.2s ease'
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px'
  },
  metricCard: {
    background: 'rgba(10, 14, 22, 0.85)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)'
  },
  metricTitle: {
    fontSize: '0.68rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: '#94a3b8'
  },
  metricValue: {
    fontSize: '1.85rem',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  metricSub: {
    fontSize: '0.72rem',
    color: '#64748b'
  },
  searchInput: {
    minWidth: '280px',
    background: 'rgba(10, 14, 22, 0.85)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '4px',
    padding: '9px 14px',
    color: '#f8fafc',
    fontSize: '0.85rem',
    outline: 'none',
    backdropFilter: 'blur(10px)'
  },
  tablePanel: {
    background: 'rgba(10, 14, 22, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    overflow: 'hidden',
    backdropFilter: 'blur(14px)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  thRow: {
    background: 'rgba(5, 8, 14, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  th: {
    padding: '14px 18px',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: '#94a3b8'
  },
  thRight: {
    padding: '14px 18px',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: '#94a3b8',
    textAlign: 'right'
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    background: 'transparent'
  },
  td: {
    padding: '14px 18px',
    fontSize: '0.88rem',
    verticalAlign: 'middle'
  },
  tdRight: {
    padding: '14px 18px',
    fontSize: '0.85rem',
    verticalAlign: 'middle',
    textAlign: 'right'
  }
};