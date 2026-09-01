import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

const DEFAULT_TEST_TELEMETRY = [
  { month: "Jan", baseline: 410, actual: 405 },
  { month: "Feb", baseline: 430, actual: 420 },
  { month: "Mar", baseline: 395, actual: 380 },
  { month: "Apr", baseline: 460, actual: 230 },
  { month: "May", baseline: 485, actual: 165 },
  { month: "Jun", baseline: 510, actual: 140 },
  { month: "Jul", baseline: 530, actual: 130 },
  { month: "Aug", baseline: 505, actual: 155 },
  { month: "Sep", baseline: 470, actual: 120 }
];

function createGlowingParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.15, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(56, 189, 248, 0.9)');
  gradient.addColorStop(0.7, 'rgba(14, 165, 233, 0.35)');
  gradient.addColorStop(1, 'rgba(2, 132, 199, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 3D Integrating & Disintegrating Orb
function IntegratingCyberOrb({ isHovered, isLoaded }) {
  const pointsRef = useRef(null);
  const linesMeshRef = useRef(null);
  const coreRef = useRef(null);
  const count = 380;

  // Track continuous integration progress (0 = dispersed entry, 1 = integrated sphere)
  const integrationProgress = useRef(0);
  const hoverDisperseFactor = useRef(0);

  const glowTexture = useMemo(() => createGlowingParticleTexture(), []);

  const [positions, spherePositions, initialScatter, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spherePos = new Float32Array(count * 3);
    const scatter = new Float32Array(count * 3);
    const phs = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.1 + (Math.random() - 0.5) * 0.2;

      // Target sphere position
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      spherePos[i * 3] = x;
      spherePos[i * 3 + 1] = y;
      spherePos[i * 3 + 2] = z;

      // Initial wide dispersed positions when entering
      const scatterRadius = 8.0 + Math.random() * 6.0;
      scatter[i * 3] = (Math.random() - 0.5) * scatterRadius;
      scatter[i * 3 + 1] = (Math.random() - 0.5) * scatterRadius;
      scatter[i * 3 + 2] = (Math.random() - 0.5) * scatterRadius;

      pos[i * 3] = scatter[i * 3];
      pos[i * 3 + 1] = scatter[i * 3 + 1];
      pos[i * 3 + 2] = scatter[i * 3 + 2];

      phs[i] = Math.random() * Math.PI * 2;
    }

    return [pos, spherePos, scatter, phs];
  }, []);

  const maxConnections = (count * (count - 1)) / 2;
  const linePositions = useMemo(() => new Float32Array(maxConnections * 6), [maxConnections]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !linesMeshRef.current) return;
    const time = state.clock.getElapsedTime();
    const { x: mx, y: my } = state.pointer;

    // 1. Calculate Entry Integration (from scattered field to unified orb)
    const targetIntegrate = isLoaded ? 1 : 0;
    integrationProgress.current = THREE.MathUtils.damp(integrationProgress.current, targetIntegrate, 2.5, delta);

    // 2. Calculate Hover Dispersion
    const targetHover = isHovered ? 1 : 0;
    hoverDisperseFactor.current = THREE.MathUtils.damp(hoverDisperseFactor.current, targetHover, 3.2, delta);

    const posArray = pointsRef.current.geometry.attributes.position.array;
    const intFactor = integrationProgress.current;
    const dispFactor = hoverDisperseFactor.current;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const phase = phases[i];

      const orbFlutter = Math.sin(time * 1.8 + phase) * 0.08;
      const targetX = spherePositions[idx] + orbFlutter;
      const targetY = spherePositions[idx + 1] + orbFlutter;
      const targetZ = spherePositions[idx + 2] + Math.cos(time * 1.4 + phase) * 0.08;

      // Base coordinate moving from scatter to sphere
      const currentBaseX = THREE.MathUtils.lerp(initialScatter[idx], targetX, intFactor);
      const currentBaseY = THREE.MathUtils.lerp(initialScatter[idx + 1], targetY, intFactor);
      const currentBaseZ = THREE.MathUtils.lerp(initialScatter[idx + 2], targetZ, intFactor);

      // Hover scatter offset
      const flyWanderX = Math.sin(time * 2.2 + phase) * 1.2;
      const flyWanderY = Math.cos(time * 2.6 + phase) * 1.2;
      const flyWanderZ = Math.sin(time * 1.8 + phase * 2.0) * 1.2;

      posArray[idx] = currentBaseX + flyWanderX * dispFactor;
      posArray[idx + 1] = currentBaseY + flyWanderY * dispFactor;
      posArray[idx + 2] = currentBaseZ + flyWanderZ * dispFactor;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = time * 0.08 + mx * 0.25;
    pointsRef.current.rotation.x = -my * 0.25;

    // Connect Lines as Orb reaches high integration
    let lineVertexCount = 0;
    const maxDistance = 0.85;
    const linePosAttr = linesMeshRef.current.geometry.attributes.position.array;

    if (intFactor > 0.4) {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        for (let j = i + 1; j < count; j++) {
          const j3 = j * 3;
          const dx = posArray[i3] - posArray[j3];
          const dy = posArray[i3 + 1] - posArray[j3 + 1];
          const dz = posArray[i3 + 2] - posArray[j3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDistance) {
            linePosAttr[lineVertexCount++] = posArray[i3];
            linePosAttr[lineVertexCount++] = posArray[i3 + 1];
            linePosAttr[lineVertexCount++] = posArray[i3 + 2];

            linePosAttr[lineVertexCount++] = posArray[j3];
            linePosAttr[lineVertexCount++] = posArray[j3 + 1];
            linePosAttr[lineVertexCount++] = posArray[j3 + 2];
          }
        }
      }
    }

    linesMeshRef.current.geometry.setDrawRange(0, lineVertexCount / 3);
    linesMeshRef.current.geometry.attributes.position.needsUpdate = true;
    linesMeshRef.current.rotation.y = pointsRef.current.rotation.y;
    linesMeshRef.current.rotation.x = pointsRef.current.rotation.x;

    if (linesMeshRef.current.material) {
      linesMeshRef.current.material.opacity = intFactor * (1 - dispFactor) * 0.4;
    }

    if (coreRef.current) {
      const coreScale = intFactor * (1 - dispFactor * 0.9) * (1 + Math.sin(time * 2.5) * 0.05);
      coreRef.current.scale.set(coreScale, coreScale, coreScale);
      coreRef.current.rotation.y = -time * 0.15;
    }
  });

  return (
    <group position={[2.5, 0, -0.5]}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshBasicMaterial
          color="#38bdf8"
          wireframe
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <lineSegments ref={linesMeshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.28}
          map={glowTexture}
          color={new THREE.Color("#38bdf8").multiplyScalar(3.5)}
          transparent
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>

      <pointLight color="#38bdf8" intensity={12} distance={14} />
      <pointLight color="#ffffff" intensity={6} distance={6} />
    </group>
  );
}

function DynamicTelemetryGraph({ data, textPopProps }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const width = 800;
  const height = 240;
  const padX = 50;
  const padY = 30;

  const chartData = useMemo(() => {
    const sourceData = (data && data.length > 0) ? data : DEFAULT_TEST_TELEMETRY;
    return sourceData.map((d, i) => ({
      label: d.month || d.timestamp || d.date || `T-${i + 1}`,
      baseline: Number(d.baseline ?? d.expected ?? 400),
      actual: Number(d.actual ?? d.consumption ?? 180)
    }));
  }, [data]);

  const { maxVal, coords } = useMemo(() => {
    if (chartData.length === 0) return { maxVal: 100, coords: [] };
    const max = Math.max(...chartData.flatMap(d => [d.baseline, d.actual]), 10) * 1.15;
    const len = chartData.length;
    const step = (width - padX * 2) / (len > 1 ? len - 1 : 1);

    const calculatedCoords = chartData.map((d, i) => {
      const x = padX + i * step;
      const yBaseline = height - padY - (d.baseline / max) * (height - padY * 2);
      const yActual = height - padY - (d.actual / max) * (height - padY * 2);
      return { x, yBaseline, yActual, ...d };
    });

    return { maxVal: max, coords: calculatedCoords };
  }, [chartData, width, height, padX, padY]);

  const makePath = (key) => {
    if (coords.length === 0) return "";
    return coords.reduce((acc, pt, i) => {
      const y = key === 'baseline' ? pt.yBaseline : pt.yActual;
      if (i === 0) return `M ${pt.x} ${y}`;
      const prev = coords[i - 1];
      const prevY = key === 'baseline' ? prev.yBaseline : prev.yActual;
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prevY}, ${cx} ${y}, ${pt.x} ${y}`;
    }, "");
  };

  const actualPath = makePath('actual');
  const baselinePath = makePath('baseline');

  const actualArea = coords.length > 0
    ? `${actualPath} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`
    : "";

  const handleMouseMove = (e) => {
    if (!svgRef.current || coords.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    let closestIndex = 0;
    let minDistance = Infinity;
    coords.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });
    setHoverIndex(closestIndex);
  };

  const activePoint = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div style={styles.chartPanel}>
      <div style={styles.panelTitleRow}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.04em', textTransform: 'uppercase' }} {...textPopProps}>
            Real-Time Consumption vs Baseline (kWh)
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
            TELEMETRY STREAM HARMONICS · {coords.length} INTERVAL NODES
          </span>
        </div>
        <div style={styles.legend}>
          <span style={styles.legendItem} {...textPopProps}>
            <span style={{ ...styles.legendDot, background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }}></span> Expected Load
          </span>
          <span style={styles.legendItem} {...textPopProps}>
            <span style={{ ...styles.legendDot, background: '#f43f5e', boxShadow: '0 0 10px #f43f5e' }}></span> Live Meter Telemetry
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="actualGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="baselineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padY + ratio * (height - padY * 2);
            const val = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx}>
                <line
                  x1={padX}
                  y1={y}
                  x2={width - padX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padX - 8}
                  y={y + 3}
                  fill="#475569"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {actualArea && <path d={actualArea} fill="url(#actualGrad)" />}

          {baselinePath && (
            <path
              d={baselinePath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="5 5"
              style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))' }}
            />
          )}

          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.7))' }}
            />
          )}

          {coords.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.yActual}
                r={hoverIndex === i ? 5.5 : 3}
                fill="#f43f5e"
                stroke="#0f172a"
                strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 8px #f43f5e)', transition: 'r 0.15s ease' }}
              />
              <text
                x={pt.x}
                y={height - 8}
                fill={hoverIndex === i ? "#38bdf8" : "#475569"}
                fontSize="11"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight={hoverIndex === i ? "bold" : "normal"}
              >
                {pt.label}
              </text>
            </g>
          ))}

          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padY}
                x2={activePoint.x}
                y2={height - padY}
                stroke="rgba(56, 189, 248, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.yBaseline}
                r="4.5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 8px #38bdf8)' }}
              />
            </g>
          )}
        </svg>

        {activePoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(Math.min(activePoint.yActual, activePoint.yBaseline) / height) * 100}%`,
              transform: 'translate(-50%, -120%)',
              background: 'rgba(10, 10, 12, 0.95)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 15px rgba(56, 189, 248, 0.25)',
              borderRadius: '4px',
              padding: '8px 12px',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: '135px',
              backdropFilter: 'blur(8px)'
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginBottom: '4px', fontWeight: 600, fontFamily: 'monospace' }}>
              {activePoint.label.toUpperCase()} TELEMETRY
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#f43f5e' }}>
              <span>Actual:</span>
              <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{activePoint.actual} kWh</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#38bdf8' }}>
              <span>Expected:</span>
              <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{activePoint.baseline} kWh</span>
            </div>
            <div style={{
              marginTop: '4px',
              paddingTop: '4px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.72rem',
              color: '#f8fafc',
              textAlign: 'right'
            }}>
              <span style={{ fontFamily: 'monospace', color: activePoint.actual < activePoint.baseline ? '#f43f5e' : '#10b981' }}>
                {activePoint.baseline > 0 ? (((activePoint.actual - activePoint.baseline) / activePoint.baseline) * 100).toFixed(1) : 0}% Deviation
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountDetail() {
  const { accountId } = useParams();
  const [account, setAccount] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setAccount({
      account_id: accountId || "HH10234",
      risk_score: 0.94,
      metrics: {
        confidence: 94.2,
        deviation: "-68.4%",
        estimated_loss_kwh: "1,640 kWh",
        tamper_probability: "Critical"
      },
      top_reasons: [
        "Consumption dropped 68.4% vs baseline over the last 90 days",
        "Weekend nighttime usage flattened to zero-load threshold",
        "Discrepancy detected against feeder transformer telemetry"
      ],
      telemetry: DEFAULT_TEST_TELEMETRY
    });

    // Trigger dash entry movement & orb integration sequence
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 60);

    return () => clearTimeout(timer);
  }, [accountId]);

  const textPopProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    className: "cyber-pop-text"
  };

  if (!account) return null;

  return (
    <div style={styles.viewportWrapper}>
      <style>{`
        /* Staggered dash entry animations for cyber cards */
        @keyframes cyberDashIn {
          0% {
            opacity: 0;
            transform: translateX(-48px) scale(0.97);
            filter: blur(4px);
          }
          65% {
            transform: translateX(4px) scale(1.005);
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateX(0px) scale(1);
          }
        }

        .dash-card-1 {
          animation: cyberDashIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both;
        }
        .dash-card-2 {
          animation: cyberDashIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        .dash-card-3 {
          animation: cyberDashIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
        }
        .dash-card-4 {
          animation: cyberDashIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
        }

        .cyber-pop-text {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), text-shadow 0.2s ease, color 0.2s ease;
          display: inline-block;
          cursor: crosshair;
        }
        .cyber-pop-text:hover {
          transform: scale(1.04) translateY(-1px);
          color: #ffffff !important;
          text-shadow: 0 0 16px #38bdf8, 0 0 28px rgba(56, 189, 248, 0.6) !important;
        }
        .cyber-matt-card {
          position: relative;
          background: rgba(12, 14, 18, 0.88);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
          border-radius: 6px;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .cyber-matt-card:hover {
          border-color: rgba(56, 189, 248, 0.45);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 22px rgba(56, 189, 248, 0.2);
          transform: translateY(-2px);
        }
      `}</style>

      {/* 3D Integrating Background Orb */}
      <div style={styles.canvasBackground}>
        <Canvas
          camera={{ position: [0, 0, 7.5], fov: 45 }}
          gl={{ antialias: true, toneMappingExposure: 1.3 }}
        >
          <color attach="background" args={['#06080d']} />
          <ambientLight intensity={0.2} />

          <IntegratingCyberOrb isHovered={isHovered} isLoaded={isLoaded} />

          <EffectComposer>
            <Bloom
              luminanceThreshold={0.12}
              luminanceSmoothing={0.9}
              intensity={2.6}
              blendFunction={BlendFunction.SCREEN}
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Foreground UI Terminal with Dash Movement */}
      <div style={styles.container}>
        <div style={styles.topBar}>
          <Link to="/dashboard" style={styles.backLink} {...textPopProps}>
            &larr; BACK TO FLEET OVERVIEW
          </Link>
          <div style={styles.telemetryStatusBadge}>
            <span style={styles.pulsingDot}></span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              NODE IDENTITY: <strong style={{ color: '#38bdf8' }}>TRACE-{account.account_id}</strong>
            </span>
          </div>
        </div>

        <div style={styles.contentGrid}>
          {/* Header Card (Dash Stage 1) */}
          <div className="cyber-matt-card dash-card-1" style={styles.headerCard}>
            <div>
              <div style={styles.headerSub} {...textPopProps}>NODE TELEMETRY & PATTERN ANALYSIS</div>
              <h1 style={styles.title} {...textPopProps}>{account.account_id}</h1>
            </div>
            <div style={{
              ...styles.riskBadge,
              color: '#f43f5e',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              boxShadow: '0 0 20px rgba(244, 63, 94, 0.2)'
            }} {...textPopProps}>
              {(account.risk_score * 100).toFixed(0)}% · CRITICAL
            </div>
          </div>

          {/* Quick Metrics (Dash Stage 2) */}
          <div className="dash-card-2" style={styles.statsRow}>
            <div className="cyber-matt-card" style={styles.statCard}>
              <span style={styles.statLabel} {...textPopProps}>THEFT CONFIDENCE</span>
              <span style={{ ...styles.statValue, color: '#38bdf8', textShadow: '0 0 16px rgba(56, 189, 248, 0.6)' }} {...textPopProps}>
                {account.metrics.confidence}%
              </span>
            </div>
            <div className="cyber-matt-card" style={styles.statCard}>
              <span style={styles.statLabel} {...textPopProps}>USAGE DEVIATION</span>
              <span style={{ ...styles.statValue, color: '#f43f5e', textShadow: '0 0 16px rgba(244, 63, 94, 0.6)' }} {...textPopProps}>
                {account.metrics.deviation}
              </span>
            </div>
            <div className="cyber-matt-card" style={styles.statCard}>
              <span style={styles.statLabel} {...textPopProps}>ESTIMATED DRAIN</span>
              <span style={{ ...styles.statValue, color: '#f8fafc' }} {...textPopProps}>
                {account.metrics.estimated_loss_kwh}
              </span>
            </div>
            <div className="cyber-matt-card" style={styles.statCard}>
              <span style={styles.statLabel} {...textPopProps}>TAMPER STATUS</span>
              <span style={{ ...styles.statValue, color: '#f59e0b' }} {...textPopProps}>
                {account.metrics.tamper_probability}
              </span>
            </div>
          </div>

          {/* Telemetry Chart (Dash Stage 3) */}
          <div className="cyber-matt-card dash-card-3">
            <DynamicTelemetryGraph
              data={account.telemetry}
              textPopProps={textPopProps}
            />
          </div>

          {/* Vectors Panel (Dash Stage 4) */}
          <div className="cyber-matt-card dash-card-4" style={styles.reasonsPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.04em', textTransform: 'uppercase' }} {...textPopProps}>
                Signal Discrepancy & Root Cause Vectors
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#f43f5e', fontFamily: 'monospace' }} {...textPopProps}>
                {account.top_reasons.length} VECTORS FLAGGED
              </span>
            </div>
            <div style={styles.reasonsList}>
              {account.top_reasons.map((reason, i) => (
                <div key={i} style={styles.reasonItem}>
                  <span style={styles.reasonBullet}>&#x25C8;</span>
                  <span style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5, fontFamily: 'monospace' }} {...textPopProps}>
                    {reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  viewportWrapper: {
    minHeight: '100vh',
    width: '100%',
    position: 'relative',
    background: '#06080d',
    overflowX: 'hidden',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  canvasBackground: {
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
    maxWidth: '1080px',
    margin: '0 auto',
    padding: '32px 24px',
    boxSizing: 'border-box'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  backLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontSize: '0.82rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    padding: '8px 16px',
    background: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '4px',
    boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)'
  },
  telemetryStatusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    background: 'rgba(10, 12, 16, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '4px',
    backdropFilter: 'blur(8px)'
  },
  pulsingDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#38bdf8',
    boxShadow: '0 0 10px #38bdf8'
  },
  contentGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  headerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 30px'
  },
  headerSub: {
    fontSize: '0.72rem',
    letterSpacing: '0.08em',
    color: '#64748b',
    fontWeight: 600,
    marginBottom: '6px'
  },
  title: {
    fontSize: '2.2rem',
    margin: 0,
    letterSpacing: '-0.02em',
    color: '#ffffff',
    fontFamily: 'monospace'
  },
  riskBadge: {
    padding: '8px 18px',
    borderRadius: '4px',
    fontSize: '0.95rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    fontFamily: 'monospace'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '20px 22px'
  },
  statLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#64748b'
  },
  statValue: {
    fontSize: '1.7rem',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  chartPanel: {
    padding: '26px 30px'
  },
  panelTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  legend: {
    display: 'flex',
    gap: '16px',
    fontSize: '0.78rem',
    color: '#94a3b8'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '2px'
  },
  reasonsPanel: {
    padding: '26px 30px'
  },
  reasonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  reasonItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '4px'
  },
  reasonBullet: {
    color: '#38bdf8',
    fontSize: '0.8rem',
    marginTop: '1px'
  }
};