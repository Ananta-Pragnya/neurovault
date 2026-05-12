
import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Stars, PerspectiveCamera, ScrollControls, useScroll } from '@react-three/drei';
import { CurrencyNode } from './CurrencyNode';
import { MarketStream } from './MarketStream';
import * as THREE from 'three';

// Define local aliases for Three.js intrinsic elements to resolve JSX type errors
const AmbientLight_ = 'ambientLight' as any;
const PointLight_ = 'pointLight' as any;
const Group_ = 'group' as any;
const Line_ = 'line' as any;
const LineBasicMaterial_ = 'lineBasicMaterial' as any;

const CURRENCIES = [
  { symbol: '$ (USD)', color: '#3b82f6', pos: [-4, 0, 0], data: { price: 100, change: 1.2 } },
  { symbol: '₹ (INR)', color: '#f59e0b', pos: [4, 1, -2], data: { price: 83, change: -0.4 } },
  { symbol: '€ (EUR)', color: '#8b5cf6', pos: [0, 3, -4], data: { price: 1.08, change: 0.8 } },
  { symbol: '¥ (JPY)', color: '#ec4899', pos: [-2, -3, -3], data: { price: 151, change: -1.1 } },
  { symbol: 'A$ (AUD)', color: '#10b981', pos: [5, -2, -1], data: { price: 1.5, change: 0.3 } },
];

const SceneContent = () => {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const s = scroll.offset;
    // Camera movement based on scroll
    state.camera.position.z = 5 - s * 10;
    state.camera.position.x = Math.sin(s * Math.PI) * 2;
    state.camera.lookAt(0, 0, -5);

    if (groupRef.current) {
      groupRef.current.rotation.y = s * Math.PI * 0.5;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={75} />
      <AmbientLight_ intensity={0.4} />
      <PointLight_ position={[10, 10, 10]} intensity={2} color="#D4AF37" />
      <PointLight_ position={[-10, -10, -10]} intensity={1.5} color="#E5E4E2" />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Group_ ref={groupRef}>
        {CURRENCIES.map((c, i) => (
          <CurrencyNode
            key={i}
            symbol={c.symbol}
            position={c.pos as [number, number, number]}
            color={i % 2 === 0 ? "#D4AF37" : "#E5E4E2"}
            marketData={c.data}
          />
        ))}
        <MarketStream />
        <Lines />
      </Group_>

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={1} intensity={1.5} radius={0.5} />
        <Noise opacity={0.08} />
        <Vignette eskil={false} offset={0.1} darkness={1.3} />
      </EffectComposer>
    </>
  );
};

const Lines = () => {
  const points = useMemo(() => {
    return CURRENCIES.map(c => new THREE.Vector3(...c.pos));
  }, []);

  return (
    <Group_>
      {points.map((p, i) => points.slice(i + 1).map((p2, j) => (
        <LineItem key={`${i}-${j}`} start={p} end={p2} />
      )))}
    </Group_>
  );
};

const LineItem = ({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) => {
  const ref = useRef<THREE.LineSegments>(null);
  useFrame((state) => {
    if (ref.current) {
      const material = ref.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.05 + Math.sin(state.clock.getElapsedTime() * 2) * 0.03;
    }
  });

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([start, end]);
  }, [start, end]);

  return (
    <Line_ ref={ref} geometry={geometry}>
      <LineBasicMaterial_ color="#4f46e5" transparent opacity={0.1} />
    </Line_>
  );
};

export const HeroScene: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 bg-[#05070d]">
      <Canvas dpr={[1, 2]} gl={{ antialias: false }}>
        <Suspense fallback={null}>
          <ScrollControls pages={4} damping={0.2}>
            <SceneContent />
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
};
