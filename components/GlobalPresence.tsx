import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { motion, AnimatePresence } from 'framer-motion';

const CITIES = [
    { name: "New York", coords: [-74.006, 40.7128] },
    { name: "London", coords: [-0.1276, 51.5072] },
    { name: "Tokyo", coords: [139.6503, 35.6762] },
    { name: "Singapore", coords: [103.8198, 1.3521] },
    { name: "Hong Kong", coords: [114.1694, 22.3193] },
    { name: "Shanghai", coords: [121.4737, 31.2304] },
    { name: "Chicago", coords: [-87.6298, 41.8781] },
    { name: "Frankfurt", coords: [8.6821, 50.1109] },
    { name: "Sydney", coords: [151.2093, -33.8688] },
    { name: "Dubai", coords: [55.2708, 25.2048] },
    { name: "São Paulo", coords: [-46.6333, -23.5505] },
    { name: "Johannesburg", coords: [28.0473, -26.2041] },
    { name: "Paris", coords: [2.3522, 48.8566] },
    { name: "Mumbai", coords: [72.8777, 19.0760] },
    { name: "Toronto", coords: [-79.3832, 43.6532] }
];

const CONNECTIONS = [
    ["New York", "London"], ["London", "Frankfurt"], ["Frankfurt", "Dubai"],
    ["Dubai", "Singapore"], ["Singapore", "Hong Kong"], ["Hong Kong", "Tokyo"],
    ["Tokyo", "Sydney"], ["London", "Singapore"], ["New York", "Tokyo"],
    ["New York", "São Paulo"], ["London", "Johannesburg"]
];

const GlobalPresence: React.FC = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredCity, setHoveredCity] = useState<{name: string, x: number, y: number} | null>(null);
    const [activeCity, setActiveCity] = useState<string | null>(null);
    const [liveMetric, setLiveMetric] = useState({ value: 84.2, diff: 1.24, up: true });
    
    // Fake sparkline points
    const [sparkline, setSparkline] = useState<number[]>(Array.from({length: 12}, () => Math.random() * 30 + 5));

    useEffect(() => {
        const interval = setInterval(() => {
            setLiveMetric(prev => {
                const up = Math.random() > 0.4;
                const change = (Math.random() * 0.5) * (up ? 1 : -1);
                return { value: prev.value + change, diff: change, up: change >= 0 };
            });
            setSparkline(prev => [...prev.slice(1), Math.random() * 30 + 5]);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const sparklinePath = () => {
        const maxPoints = 12;
        const dx = 200 / (maxPoints - 1);
        let d = `M 0,${40 - sparkline[0]}`;
        for(let i=1; i<sparkline.length; i++) {
            const x0 = (i-1)*dx;
            const y0 = 40 - sparkline[i-1];
            const x1 = i*dx;
            const y1 = 40 - sparkline[i];
            const cpX = x0 + dx/2;
            d += ` C ${cpX},${y0} ${cpX},${y1} ${x1},${y1}`;
        }
        return d;
    };

    // Initialize Rotatable D3 Globe Map
    useEffect(() => {
        if (!mapRef.current) return;
        const width = 1200;
        const height = 800;

        d3.select(mapRef.current).selectAll("svg").remove();

        const svg = d3.select(mapRef.current)
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .style("filter", "drop-shadow(0 0 30px rgba(0,0,0,0.5))");

        // 1. USE ORTHOGRAPHIC PROJECTION FOR ROTATABLE 3D GLOBE
        const projection = d3.geoOrthographic()
            .scale(350)
            .translate([width / 2, height / 2])
            .clipAngle(90) // Only render the visible hemisphere
            .precision(0.5);

        // Initial slight tilt
        projection.rotate([-10, -20, 0]);

        const path = d3.geoPath().projection(projection) as any;
        const g = svg.append("g");

        // Draw deep ocean sphere background
        g.append("path")
            .datum({type: "Sphere"})
            .attr("class", "ocean")
            .attr("d", path)
            .style("fill", "#050a14")
            .style("stroke", "#1a2f50")
            .style("stroke-width", "1px");

        d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((world: any) => {
            const countries = (topojson.feature(world, world.objects.countries) as any).features;

            // Render Countries
            g.selectAll("path.country")
                .data(countries)
                .enter()
                .append("path")
                .attr("class", "country")
                .attr("d", path)
                .style("fill", "#0d1f3c")
                .style("stroke", "rgba(26, 47, 80, 0.4)")
                .style("stroke-width", "0.5px");

            const getCoords = (name: string) => CITIES.find(c => c.name === name)!.coords;

            // Connections as GeoJSON LineStrings -> clips perfectly on the sphere edge
            const linkFeatures = CONNECTIONS.map(pair => ({
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [getCoords(pair[0]), getCoords(pair[1])]
                }
            }));

            g.selectAll("path.connection-line")
                .data(linkFeatures)
                .enter()
                .append("path")
                .attr("class", "connection-line")
                .attr("d", path)
                .style("fill", "none")
                .style("stroke", "#4a8fa8")
                .style("stroke-width", "1.5px")
                .style("opacity", "0.4")
                .style("stroke-dasharray", "600")
                .style("stroke-dashoffset", "600")
                .style("animation", () => `dash 4s linear infinite ${Math.random() * 2}s`);

            // Cities as GeoJSON Points
            const cityFeatures = CITIES.map(c => ({
                type: "Feature",
                properties: c,
                geometry: { type: "Point", coordinates: c.coords }
            }));

            // Blurred backdrop glows
            g.selectAll("path.city-glow")
                .data(cityFeatures)
                .enter()
                .append("path")
                .attr("class", "city-glow")
                .attr("d", path.pointRadius(6))
                .style("fill", "#e8c84a")
                .style("filter", "blur(4px)")
                .style("opacity", "0.4")
                .style("pointer-events", "none")
                .style("animation", () => `pulse-glow 3s infinite alternate ${Math.random() * 2}s`);

            // Actual interactive precise points
            g.selectAll("path.city-dot")
                .data(cityFeatures)
                .enter()
                .append("path")
                .attr("class", "city-dot")
                .attr("d", path.pointRadius(3))
                .style("fill", "#e8c84a")
                .style("cursor", "pointer")
                .style("transition", "fill 0.2s")
                .on("mouseover", function(event, d: any) {
                    d3.select(this).style("fill", "#fff").attr("d", path.pointRadius(6) as any);
                    // Extract exact screen coords from projection to render HTML tooltip
                    const projected = projection(d.geometry.coordinates as [number, number]);
                    if (projected) {
                        setHoveredCity({ name: d.properties.name, x: projected[0], y: projected[1] });
                    }
                })
                .on("mouseout", function() {
                    d3.select(this).style("fill", "#e8c84a").attr("d", path.pointRadius(3) as any);
                    setHoveredCity(null);
                })
                .on("click", (event, d: any) => {
                    setActiveCity(d.properties.name);
                });

            // 2. IMPLEMENT DRAG-TO-ROTATE functionality
            let v0: [number, number];
            let r0: [number, number, number];
            
            const drag = d3.drag<SVGSVGElement, unknown>()
                .on("start", (event) => {
                    v0 = [event.x, event.y];
                    r0 = projection.rotate();
                    // Clear interaction states during rapid drag
                    setHoveredCity(null);
                })
                .on("drag", (event) => {
                    const v1 = [event.x, event.y];
                    // Map screen movement to spherical rotation angles
                    const r1 = [
                        r0[0] + (v1[0] - v0[0]) * 0.5,
                        r0[1] - (v1[1] - v0[1]) * 0.5,
                        r0[2]
                    ] as [number, number, number];
                    
                    // Limit vertical pitch to prevent flipping
                    r1[1] = Math.max(-80, Math.min(80, r1[1]));
                    
                    projection.rotate(r1);

                    // Re-render all spherical paths immediately
                    g.selectAll("path.ocean").attr("d", path as any);
                    g.selectAll("path.country").attr("d", path as any);
                    g.selectAll("path.connection-line").attr("d", path as any);
                    g.selectAll("path.city-glow").attr("d", path.pointRadius(6) as any);
                    g.selectAll("path.city-dot").attr("d", path.pointRadius(3) as any);
                });

            svg.call(drag);
        });

    }, []); // Run once on mount

    // Parallax UI effect (only affects cards now since map handles its own drag)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const x = e.clientX / window.innerWidth - 0.5;
            const y = e.clientY / window.innerHeight - 0.5;
            const cards = containerRef.current.querySelectorAll('.parallax-card');
            cards.forEach((c: any) => {
                c.style.transform = `translate(${x * -8}px, ${y * -8}px)`;
            });
        };
        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <section id="presence" ref={containerRef} className="relative h-screen w-full bg-[#050d1a] overflow-hidden font-mono text-white select-none">
            <style>{`
                @keyframes dash { to { stroke-dashoffset: -600; } }
                @keyframes pulse-glow { 0% { opacity: 0.3; transform: scale(1); } 100% { opacity: 0.8; transform: scale(1.5); } }
            `}</style>
            
            <div className="absolute top-1/2 left-1/2 w-[80vw] h-[60vh] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(13,31,60,0.8)_0%,_transparent_70%)] blur-[60px] opacity-80 pointer-events-none z-0"></div>

            <div 
                ref={mapRef} 
                className="absolute top-1/2 left-1/2 w-[120vw] h-[120vh] -ml-[60vw] -mt-[60vh] flex items-center justify-center z-10 cursor-grab active:cursor-grabbing"
            ></div>

            {/* Tooltip */}
            <AnimatePresence>
                {hoveredCity && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute z-50 bg-[#050f23]/90 border border-[#e8c84a] text-[#e8c84a] px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-widest pointer-events-none backdrop-blur shadow-lg shadow-black/50"
                        style={{
                            left: `calc(50% + ${(hoveredCity.x - 600) * (window.innerWidth / 1200)}px)`,
                            top: `calc(50% + ${(hoveredCity.y - 400 - 15) * (window.innerHeight / 800)}px)`,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        {hoveredCity.name}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Left Overlay */}
            <div className="parallax-card absolute left-6 md:left-12 top-6 md:top-12 max-w-sm z-20 bg-[#050f23]/75 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl pointer-events-none">
                <div className="flex items-center gap-2 text-[#4a8fa8] text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
                    <span className="w-1.5 h-1.5 bg-[#4a8fa8] rounded-full shadow-[0_0_8px_#4a8fa8]"></span>
                    Global Infrastructure
                </div>
                <h1 className="font-heading text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-4">
                    Autonomous Intelligence Node
                </h1>
                <p className="text-[#8b9bb4] text-xs leading-relaxed">
                    Interactive global network. Drag to rotate. Click active nodes for live sub-millisecond data feeds.
                </p>
            </div>

            {/* Right Stats Overlay */}
            <div className="parallax-card absolute right-6 md:right-12 top-6 md:top-12 w-72 z-20 bg-[#050f23]/75 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-2xl pointer-events-none">
                <div className="mb-4">
                    <p className="text-[#8b9bb4] text-[10px] uppercase tracking-[0.15em] mb-1">System Liquidity</p>
                    <div className="flex items-baseline gap-3">
                        <span className="font-heading text-3xl font-black text-white">${liveMetric.value.toFixed(2)}B</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${liveMetric.up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {liveMetric.diff >= 0 ? '+' : ''}{liveMetric.diff.toFixed(2)}%
                        </span>
                    </div>
                    <svg className="w-full h-10 mt-2 overflow-visible">
                        <path d={sparklinePath()} fill="none" stroke="#e8c84a" strokeWidth="2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(232, 200, 74, 0.3))'}} />
                    </svg>
                </div>
            </div>

            {/* Bottom Panel (Active City Data) */}
            <AnimatePresence>
                {activeCity && (
                    <motion.div
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 w-[90%] md:w-[400px] z-30 bg-[#050f23]/90 backdrop-blur-md border border-[#e8c84a]/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-between"
                    >
                        <button 
                            className="absolute top-3 right-4 text-[#8b9bb4] hover:text-[#e8c84a] transition-colors"
                            onClick={() => setActiveCity(null)}
                        >×</button>
                        
                        <div>
                            <p className="text-[#8b9bb4] text-[10px] uppercase tracking-[0.15em] mb-1">Active Hub</p>
                            <h2 className="font-heading text-2xl font-black text-[#e8c84a] uppercase">{activeCity}</h2>
                            <p className="text-xs text-white mt-1 pt-1 border-t border-white/10">Connected & Verified</p>
                        </div>
                        <div className="text-right">
                            <p className="text-green-400 text-xs font-bold tracking-widest uppercase mb-1">Live Feed</p>
                            <p className="text-white text-sm font-bold">• {Math.floor(Math.random()*40 + 5)}ms Ping</p>
                            <p className="text-[#8b9bb4] text-[10px] mt-1">Vol {(Math.random()*3 + 0.1).toFixed(1)}M/s</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default GlobalPresence;
