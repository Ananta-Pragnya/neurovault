
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, MeshDistortMaterial, Trail } from '@react-three/drei';
import * as THREE from 'three';

// Define local aliases for Three.js intrinsic elements to resolve JSX type errors
const Group_ = 'group' as any;
const Mesh_ = 'mesh' as any;
const SphereGeometry_ = 'sphereGeometry' as any;
const MeshBasicMaterial_ = 'meshBasicMaterial' as any;

interface CurrencyNodeProps {
  symbol: string;
  position: [number, number, number];
  color: string;
  marketData: { price: number; change: number };
}

export const CurrencyNode: React.FC<CurrencyNodeProps> = ({ symbol, position, color, marketData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const isUp = marketData.change >= 0;
  const pulseSpeed = isUp ? 2 : 0.5;
  const glowColor = isUp ? '#10b981' : '#f43f5e';

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = position[1] + Math.sin(time + position[0]) * 0.2;
    }
    if (glowRef.current) {
      const scale = 1.2 + Math.sin(time * pulseSpeed) * 0.1;
      glowRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Group_ position={position}>
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        {/* Core Sphere */}
        <Mesh_ ref={meshRef}>
          <SphereGeometry_ args={[0.4, 32, 32]} />
          <MeshDistortMaterial 
            color={color} 
            speed={2} 
            distort={0.3} 
            radius={1} 
            emissive={color}
            emissiveIntensity={1.5}
          />
        </Mesh_>

        {/* Outer Glow */}
        <Mesh_ ref={glowRef}>
          <SphereGeometry_ args={[0.6, 32, 32]} />
          <MeshBasicMaterial_ color={glowColor} transparent opacity={0.1} />
        </Mesh_>

        {/* Currency Label */}
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.3}
          color="white"
          font="https://fonts.gstatic.com/s/spacegrotesk/v13/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-g.woff"
          anchorX="center"
          anchorY="middle"
        >
          {symbol}
        </Text>

        {/* Price Tag */}
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.2}
          color={glowColor}
          font="https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.woff"
          anchorX="center"
          anchorY="middle"
        >
          {marketData.change >= 0 ? '+' : ''}{marketData.change}%
        </Text>

        {/* Orbital Trails */}
        <Trail
          width={0.4}
          length={3}
          color={new THREE.Color(glowColor)}
          attenuation={(t) => t * t}
        >
          <Mesh_ position={[0.8, 0, 0]}>
            <SphereGeometry_ args={[0.015]} />
            <MeshBasicMaterial_ color={glowColor} />
          </Mesh_>
        </Trail>
      </Float>
    </Group_>
  );
};
