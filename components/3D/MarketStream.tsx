
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// Fix: Define local alias for group to resolve JSX type error
const Group_ = 'group' as any;

const TICKERS = ['AAPL 182.52', 'NVDA 875.28', 'RELIANCE 2984.10', 'BTC 64,120', 'TSLA 175.40', 'ETH 3,450'];

export const MarketStream: React.FC = () => {
  const count = 40;
  const points = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 - 5,
      ] as [number, number, number],
      speed: 0.01 + Math.random() * 0.05,
      text: TICKERS[Math.floor(Math.random() * TICKERS.length)],
      opacity: 0.1 + Math.random() * 0.4
    }));
  }, []);

  return (
    <Group_>
      {points.map((p, i) => (
        <TickerItem key={i} {...p} />
      ))}
    </Group_>
  );
};

const TickerItem: React.FC<{ position: [number, number, number]; speed: number; text: string; opacity: number }> = ({ position, speed, text, opacity }) => {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.position.y += speed;
      if (ref.current.position.y > 10) ref.current.position.y = -10;
    }
  });

  return (
    <Group_ ref={ref} position={position}>
      <Text
        fontSize={0.15}
        color="#ffffff"
        fillOpacity={opacity}
        font="https://fonts.gstatic.com/s/spacegrotesk/v13/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-g.woff"
      >
        {text}
      </Text>
    </Group_>
  );
};
