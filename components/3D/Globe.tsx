
import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sphere, Stars, Html, Float, Line } from '@react-three/drei';
import * as THREE from 'three';
import data from '../../data/globalRevenue.json';

const CityMarker = ({ city, country, onHover }: { city: any, country: string, onHover: (d: any) => void }) => {
    const [hovered, setHovered] = useState(false);
    const revenueHeight = city.revenue / 20;

    // Convert lat/lng to 3D position on a sphere of radius 2
    const pos = useMemo(() => {
        const phi = (90 - city.lat) * (Math.PI / 180);
        const theta = (city.lng + 180) * (Math.PI / 180);
        const x = -(2 * Math.sin(phi) * Math.cos(theta));
        const z = (2 * Math.sin(phi) * Math.sin(theta));
        const y = (2 * Math.cos(phi));
        return new THREE.Vector3(x, y, z);
    }, [city]);

    return (
        <group position={pos}>
            <mesh
                onPointerOver={() => { setHovered(true); onHover({ ...city, country }); }}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshBasicMaterial color={hovered ? "#00fadd" : "#D4AF37"} />
            </mesh>

            {/* Revenue Bar */}
            <mesh position={[0, revenueHeight / 2, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.005, 0.005, revenueHeight, 8]} />
                <meshBasicMaterial color="#00fadd" transparent opacity={0.6} />
            </mesh>

            {/* Pulsing Ring */}
            {hovered && (
                <mesh rotation-x={Math.PI / 2}>
                    <ringGeometry args={[0.03, 0.04, 32]} />
                    <meshBasicMaterial color="#00fadd" transparent opacity={0.5} />
                </mesh>
            )}
        </group>
    );
};

const ConnectionArc = ({ from, to }: { from: any, to: any }) => {
    const points = useMemo(() => {
        const getPos = (lat: number, lng: number) => {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);
            const x = -(2 * Math.sin(phi) * Math.cos(theta));
            const z = (2 * Math.sin(phi) * Math.sin(theta));
            const y = (2 * Math.cos(phi));
            return new THREE.Vector3(x, y, z);
        };

        const start = getPos(from.lat, from.lng);
        const end = getPos(to.lat, to.lng);

        // Create an arc by interpolating and lifting the middle point
        const cb = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5).normalize().multiplyScalar(2.5);
        const curve = new THREE.QuadraticBezierCurve3(start, cb, end);
        return curve.getPoints(50);
    }, [from, to]);

    return <Line points={points} color="#D4AF37" lineWidth={0.5} opacity={0.3} transparent />;
};

export const Globe = ({ onCityHover }: { onCityHover: (d: any) => void }) => {
    const globeRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (globeRef.current) {
            globeRef.current.rotation.y += 0.001;
        }
    });

    const cityMap = useMemo(() => {
        const map: Record<string, any> = {};
        data.countries.forEach(c => c.cities.forEach(city => { map[city.name] = city; }));
        return map;
    }, []);

    return (
        <group ref={globeRef}>
            <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade speed={1} />

            {/* Atmosphere Glow */}
            <Sphere args={[2.1, 64, 64]}>
                <meshPhongMaterial
                    color="#0b172a"
                    transparent
                    opacity={0.1}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                />
            </Sphere>

            {/* Earth Sphere */}
            <Sphere args={[2, 64, 64]}>
                <meshPhongMaterial
                    color="#050a14"
                    emissive="#00142a"
                    specular="#111"
                    shininess={10}
                />
            </Sphere>

            {/* Grid Overlay */}
            <Sphere args={[2.01, 64, 64]}>
                <meshBasicMaterial
                    color="#1e293b"
                    wireframe
                    transparent
                    opacity={0.05}
                />
            </Sphere>

            {/* Markers */}
            {data.countries.map(country =>
                country.cities.map(city => (
                    <CityMarker key={city.name} city={city} country={country.name} onHover={onCityHover} />
                ))
            )}

            {/* Arcs */}
            {data.connections.map((conn, i) => (
                <ConnectionArc
                    key={i}
                    from={cityMap[conn.from]}
                    to={cityMap[conn.to]}
                />
            ))}
        </group>
    );
};
