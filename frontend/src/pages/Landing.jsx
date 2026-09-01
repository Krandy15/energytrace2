import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

function createGlowingStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(186, 230, 253, 0.55)');
    grad.addColorStop(0.8, 'rgba(192, 132, 252, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

function MilkyWayRealisticField({ isBursting }) {
    const pointsRef = useRef(null);
    const count = 12000;
    const burstTime = useRef(0);
    const starTexture = useMemo(() => createGlowingStarTexture(), []);

    const [basePositions, colors, vels, phases] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const cols = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const phs = new Float32Array(count);

        const colorDeepBlue = new THREE.Color('#1d4ed8');
        const colorCyan = new THREE.Color('#38bdf8');
        const colorPurple = new THREE.Color('#a855f7');
        const colorMagenta = new THREE.Color('#ec4899');
        const colorDawnPink = new THREE.Color('#f43f5e');
        const colorWhite = new THREE.Color('#ffffff');

        const angle = -0.66;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        for (let i = 0; i < count; i++) {
            const isGalacticCore = i < count * 0.78;
            let x, y, z;
            let col = new THREE.Color();

            if (isGalacticCore) {
                const t = (Math.random() - 0.5) * 22;
                const u1 = Math.random();
                const u2 = Math.random();
                const gaussian = Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2);
                const spread = gaussian * (0.85 + Math.abs(t) * 0.16);
                const depth = (Math.random() - 0.5) * 3.5;

                x = t * cosA - spread * sinA + 1.0;
                y = t * sinA + spread * cosA - 0.2;
                z = depth - 1.5;

                const normY = (y + 5) / 10;
                if (normY < 0.28) {
                    col.lerpColors(colorDawnPink, colorMagenta, normY / 0.28);
                } else if (normY < 0.6) {
                    col.lerpColors(colorMagenta, colorPurple, (normY - 0.28) / 0.32);
                } else if (normY < 0.85) {
                    col.lerpColors(colorPurple, colorDeepBlue, (normY - 0.6) / 0.25);
                } else {
                    col.lerpColors(colorDeepBlue, colorCyan, (normY - 0.85) / 0.15);
                }

                if (Math.random() < 0.18) col.lerp(colorWhite, 0.7);

                const brightness = 1.4 + Math.random() * 1.6;
                cols[i * 3] = col.r * brightness;
                cols[i * 3 + 1] = col.g * brightness;
                cols[i * 3 + 2] = col.b * brightness;
            } else {
                x = (Math.random() - 0.5) * 26;
                y = (Math.random() - 0.5) * 18;
                z = (Math.random() - 0.5) * 6 - 2.5;

                col = Math.random() > 0.6 ? colorCyan : colorDeepBlue;
                const dimness = 0.4 + Math.random() * 0.7;
                cols[i * 3] = col.r * dimness;
                cols[i * 3 + 1] = col.g * dimness;
                cols[i * 3 + 2] = col.b * dimness;
            }

            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;

            phs[i] = Math.random() * Math.PI * 2;

            const burstSpeed = 8.0 + Math.random() * 10.0;
            velocities[i * 3] = (x / Math.max(Math.abs(x), 0.1)) * burstSpeed + (Math.random() - 0.5) * 4;
            velocities[i * 3 + 1] = (y / Math.max(Math.abs(y), 0.1)) * burstSpeed + (Math.random() - 0.5) * 4;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 12 + 8.0;
        }

        return [pos, cols, velocities, phs];
    }, []);

    useFrame((state, delta) => {
        if (!pointsRef.current) return;
        const time = state.clock.getElapsedTime();
        const { x: mx, y: my } = state.pointer;

        const posAttr = pointsRef.current.geometry.attributes.position;
        const colAttr = pointsRef.current.geometry.attributes.color;

        if (isBursting) {
            burstTime.current += delta * 1.8;
            const t = burstTime.current;
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                posAttr.array[i3] = basePositions[i3] + vels[i3] * t;
                posAttr.array[i3 + 1] = basePositions[i3 + 1] + vels[i3 + 1] * t;
                posAttr.array[i3 + 2] = basePositions[i3 + 2] + vels[i3 + 2] * t;
            }
            posAttr.needsUpdate = true;
        } else {
            const mouseX = mx * 6.5;
            const mouseY = my * 4.5;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const dx = basePositions[i3] - mouseX;
                const dy = basePositions[i3 + 1] - mouseY;
                const distSq = dx * dx + dy * dy;

                let shimmer = Math.sin(time * 2.8 + phases[i]);
                if (distSq < 2.5) {
                    const shutter = Math.sin(time * 32 + phases[i] * 4) > 0 ? 2.6 : 0.4;
                    shimmer = 2.0 * shutter;
                }

                colAttr.array[i3] = colors[i3] * (0.85 + shimmer * 0.25);
                colAttr.array[i3 + 1] = colors[i3 + 1] * (0.85 + shimmer * 0.25);
                colAttr.array[i3 + 2] = colors[i3 + 2] * (0.85 + shimmer * 0.25);
            }
            colAttr.needsUpdate = true;

            pointsRef.current.rotation.y = time * 0.006 + mx * 0.03;
            pointsRef.current.rotation.x = -my * 0.03;
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={basePositions.slice()}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={count}
                    array={colors.slice()}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.13}
                map={starTexture}
                vertexColors
                transparent
                opacity={0.95}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
            />
        </points>
    );
}

export default function Landing() {
    const [isBursting, setIsBursting] = useState(false);
    const navigate = useNavigate();

    const handleLaunch = (e) => {
        e.preventDefault();
        if (isBursting) return;
        setIsBursting(true);

        setTimeout(() => {
            navigate('/dashboard');
        }, 850);
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            position: 'relative',
            background: 'radial-gradient(circle at 50% 95%, #250d32 0%, #080d24 50%, #02030a 100%)',
            margin: 0,
            overflow: 'hidden'
        }}>
            {/* Supernova Flash upon Launch */}
            {isBursting && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(168,85,247,0.4) 50%, transparent 100%)',
                    zIndex: 100,
                    pointerEvents: 'none',
                    animation: 'flashBurst 0.85s forwards'
                }} />
            )}

            <style>{`
                @keyframes flashBurst {
                  0% { opacity: 0; transform: scale(0.6); }
                  30% { opacity: 1; transform: scale(1.2); }
                  100% { opacity: 0; transform: scale(2.0); }
                }
            `}</style>

            {/* Overlay UI */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '8%',
                transform: isBursting ? 'translateY(-50%) scale(0.95)' : 'translateY(-50%) scale(1)',
                zIndex: 10,
                color: '#f8fafc',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                opacity: isBursting ? 0 : 1,
                transition: 'opacity 0.65s ease, transform 0.65s ease'
            }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '20px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)'
                }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}></span>
                    Cosmic Grid Telemetry
                </div>

                <h1 style={{
                    fontSize: '4.8rem',
                    fontWeight: 800,
                    lineHeight: 1.02,
                    margin: '0 0 18px 0',
                    letterSpacing: '-0.04em',
                    background: 'linear-gradient(135deg, #ffffff 30%, #e2e8f0 55%, #c084fc 80%, #60a5fa 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    EnergyTrace
                </h1>

                <p style={{
                    fontSize: '1.15rem',
                    lineHeight: 1.6,
                    color: '#94a3b8',
                    margin: '0 0 36px 0',
                    maxWidth: '460px'
                }}>
                    Real-time electricity theft localization powered by stream anomaly telemetry and pattern intelligence.
                </p>

                <button
                    onClick={handleLaunch}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 50%, #f43f5e 100%)',
                        color: '#ffffff',
                        padding: '15px 36px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '1.02rem',
                        letterSpacing: '0.04em',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 0 30px rgba(168, 85, 247, 0.65), inset 0 0 12px rgba(255, 255, 255, 0.35)',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 0 45px rgba(244, 63, 94, 0.85), inset 0 0 18px rgba(255, 255, 255, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0px) scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.65), inset 0 0 12px rgba(255, 255, 255, 0.35)';
                    }}
                >
                    {isBursting ? 'Warping In...' : 'Launch Terminal \u2192'}
                </button>
            </div>

            <Canvas
                camera={{ position: [0, 0, 7.5], fov: 50 }}
                gl={{ antialias: true, toneMappingExposure: 1.25 }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
            >
                <color attach="background" args={['#02030a']} />
                <ambientLight intensity={0.25} />

                <MilkyWayRealisticField isBursting={isBursting} />

                <EffectComposer>
                    <Bloom
                        luminanceThreshold={0.2}
                        luminanceSmoothing={0.85}
                        intensity={1.8}
                        blendFunction={BlendFunction.SCREEN}
                    />
                </EffectComposer>
            </Canvas>
        </div>
    );
}