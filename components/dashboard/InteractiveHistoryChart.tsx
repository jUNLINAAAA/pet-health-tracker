"use client";

import React, { useState, useRef, useId, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveHistoryChartProps {
  data: number[];
  height?: number;
  color?: string;
  label?: string;
}

export function InteractiveHistoryChart({ data, height = 192, color = 'blue', label = 'Health Score' }: InteractiveHistoryChartProps) {
  // Ensure we have valid numeric data - filter out NaN/undefined/null
  const validData = (data || []).filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
  const hasData = validData.length >= 2; // Need at least 2 points for a line
  const safeData = hasData ? validData : [50, 50]; // Default to flat line if no data
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [markerPos, setMarkerPos] = useState({ x: 0, y: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 300, height: 192 });
  const [isHovering, setIsHovering] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  // Color theming with rgba variants for effects
  const colors = useMemo(() => ({
    blue: { primary: '#3b82f6', secondary: '#4f46e5', light: '#93c5fd', glow: 'rgba(59, 130, 246, 0.4)' },
    green: { primary: '#10b981', secondary: '#059669', light: '#6ee7b7', glow: 'rgba(16, 185, 129, 0.4)' },
    purple: { primary: '#8b5cf6', secondary: '#7c3aed', light: '#c4b5fd', glow: 'rgba(139, 92, 246, 0.4)' },
    orange: { primary: '#f59e0b', secondary: '#d97706', light: '#fcd34d', glow: 'rgba(245, 158, 11, 0.4)' },
  }), []);

  const theme = colors[color as keyof typeof colors] || colors.blue;

  // Track container size for responsive calculations
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const emptyState = !hasData ? (
    <div style={{ height }} className="flex items-center justify-center text-gray-400 text-sm">
      No historical data
    </div>
  ) : null;

  const max = Math.max(...safeData, 100);
  const min = Math.min(...safeData, 0);
  const range = max - min || 1;

  const points = safeData.map((value, index) => {
    const x = (index / (safeData.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 90 - 5;
    return { x, y, value };
  });

  const pathPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M0,100 L${pathPoints} L100,100 Z`;

  const handleInteraction = useCallback((clientX: number) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentX = (x / rect.width) * 100;

    const closest = points.reduce((prev, curr) =>
      Math.abs(curr.x - percentX) < Math.abs(prev.x - percentX) ? curr : prev
    );

    const closestIndex = points.indexOf(closest);
    setHoveredIndex(closestIndex);

    // Calculate pixel positions for marker and tooltip (outside SVG)
    const pixelX = (closest.x / 100) * rect.width;
    const pixelY = (closest.y / 100) * rect.height;

    setMarkerPos({ x: pixelX, y: pixelY });
    setTooltipPos({ x: pixelX, y: pixelY });
    setContainerDimensions({ width: rect.width, height: rect.height });
  }, [points]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    handleInteraction(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      handleInteraction(e.touches[0].clientX);
    }
  };

  const handleLeave = () => {
    setHoveredIndex(null);
    setIsHovering(false);
  };

  const handleEnter = () => {
    setIsHovering(true);
  };

  if (emptyState) return emptyState;

  return (
    <div ref={containerRef} className="relative w-full group" style={{ height }}>
      {/* SVG Chart - only for lines and area, no circles */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair touch-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchStart={handleEnter}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleLeave}
      >
        <defs>
          {/* Area gradient using theme colors */}
          <linearGradient id={`historyGradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.secondary} stopOpacity="0.25" />
            <stop offset="60%" stopColor={theme.primary} stopOpacity="0.1" />
            <stop offset="100%" stopColor={theme.light} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#e5e7eb"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#historyGradient-${gradientId})`} />

        {/* Main line with theme color */}
        <polyline
          points={pathPoints}
          fill="none"
          stroke={theme.primary}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Vertical hover line */}
        {hoveredIndex !== null && (
          <line
            x1={points[hoveredIndex].x}
            y1="0"
            x2={points[hoveredIndex].x}
            y2="100"
            stroke={theme.primary}
            strokeWidth="1"
            strokeDasharray="3,3"
            vectorEffect="non-scaling-stroke"
            opacity={0.4}
          />
        )}
      </svg>

      {/* HTML Marker - positioned outside SVG to avoid stretching */}
      <AnimatePresence>
        {hoveredIndex !== null && (
          <>
            {/* Pulse ring */}
            <motion.div
              key="pulse-ring"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0.6, 0], scale: [1, 2.5] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
              className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: markerPos.x,
                top: markerPos.y,
                backgroundColor: theme.primary,
              }}
            />
            {/* Main marker dot */}
            <motion.div
              key="marker-dot"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="pointer-events-none absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{
                left: markerPos.x,
                top: markerPos.y,
                backgroundColor: theme.primary,
                boxShadow: `0 0 12px ${theme.glow}, 0 2px 8px rgba(0,0,0,0.15)`,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute pointer-events-none z-50"
            style={{
              left: Math.max(55, Math.min(tooltipPos.x, containerDimensions.width - 55)),
              top: Math.max(10, tooltipPos.y - 75),
              transform: 'translateX(-50%)'
            }}
          >
            <div
              className="relative bg-gray-900/95 text-white px-3 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 overflow-hidden"
              style={{ boxShadow: `0 12px 28px -8px ${theme.glow}` }}
            >
              {/* Theme color accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: `linear-gradient(90deg, transparent, ${theme.primary}, transparent)` }}
              />
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: theme.light }}>{data[hoveredIndex]}</div>
                <div className="text-[10px] text-gray-300 mt-0.5">{label}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">
                  {hoveredIndex === data.length - 1 ? 'Today' :
                   hoveredIndex === 0 ? `${data.length - 1}d ago` :
                   `${data.length - 1 - hoveredIndex}d ago`}
                </div>
              </div>
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900/95"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Axis labels */}
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-gray-400 mt-2 px-2">
        <span>{data.length - 1}d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
