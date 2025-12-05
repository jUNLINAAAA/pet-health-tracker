"use client";

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showTooltip?: boolean;
}

export function InteractiveSparkline({
  data,
  color = 'blue',
  height = 48,
  showTooltip = true
}: InteractiveSparklineProps) {
  // Ensure we have valid numeric data - filter out NaN/undefined/null
  const validData = (data || []).filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
  const hasData = validData.length >= 2; // Need at least 2 points for a line
  const safeData = hasData ? validData : [50, 50]; // Default to flat line at 50 if no data
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const colorMap: Record<string, string> = {
    blue: '#3B82F6',
    green: '#10B981',
    red: '#EF4444',
    purple: '#8B5CF6',
    orange: '#F59E0B',
  };

  const strokeColor = colorMap[color] || colorMap.blue;

  const max = Math.max(...safeData);
  const min = Math.min(...safeData);
  const range = max - min || 1;

  const points = safeData.map((value, index) => {
    // Prevent division by zero: use max(1, length-1)
    const divisor = Math.max(1, safeData.length - 1);
    const x = (index / divisor) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 50 : y, value };
  });

  const pathPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Show empty state only if original data was truly empty
  const emptyState = validData.length === 0 ? <div style={{ height }} /> : null;

  const handleInteraction = useCallback((clientX: number) => {
    if (!svgRef.current || !showTooltip) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentX = (x / rect.width) * 100;

    const closest = points.reduce((prev, curr) =>
      Math.abs(curr.x - percentX) < Math.abs(prev.x - percentX) ? curr : prev
    );

    const closestIndex = points.indexOf(closest);
    setHoveredIndex(closestIndex);
    setTooltipPos({
      x: (closest.x / 100) * rect.width,
      y: (closest.y / 100) * rect.height,
    });
  }, [points, showTooltip]);

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

  if (emptyState) {
    return emptyState;
  }

  return (
    <div ref={containerRef} className="relative w-full group" style={{ height }}>
      <svg
        ref={svgRef}
        className={`w-full h-full cursor-crosshair touch-none transition-transform duration-200 ${isHovering ? 'scale-[1.02]' : ''}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchStart={handleEnter}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleLeave}
      >
        {/* Area fill */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path
          d={`M0,100 L${points.map(p => `${p.x},${p.y}`).join(' L')} L100,100 Z`}
          fill={`url(#gradient-${color})`}
        />
        
        {/* Line */}
        <polyline
          points={pathPoints}
          fill="none"
          stroke={strokeColor}
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
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray="2,2"
            vectorEffect="non-scaling-stroke"
            opacity={0.4}
          />
        )}
      </svg>

      {/* Hover marker with pulse ring */}
      <AnimatePresence>
        {showTooltip && hoveredIndex !== null && (
          <>
            {/* Pulse ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0.6, 0], scale: [1, 2] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="pointer-events-none absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y,
                backgroundColor: strokeColor,
              }}
            />
            {/* Main marker */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute z-30 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y,
                backgroundColor: strokeColor,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-none z-50"
            style={{
              left: Math.max(40, Math.min(tooltipPos.x, (containerRef.current?.offsetWidth || 200) - 40)),
              top: Math.max(10, tooltipPos.y - 55),
              transform: 'translateX(-50%)'
            }}
          >
            <div className="bg-gray-900/95 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md border border-white/10">
              <div className="text-center">
                <div className="text-lg font-bold">{safeData[hoveredIndex]?.toLocaleString() ?? '—'}</div>
                <div className="text-gray-300 text-[10px] mt-0.5">
                  {hoveredIndex === safeData.length - 1 ? 'Today' :
                   hoveredIndex === 0 ? `${safeData.length - 1}d ago` :
                   `${safeData.length - 1 - hoveredIndex}d ago`}
                </div>
              </div>
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900/95"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
