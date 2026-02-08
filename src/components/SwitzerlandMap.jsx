import { useState } from 'react';

const cantonPaths = {
  'ZH': { d: 'M280,95 L310,85 L340,95 L345,120 L330,145 L295,150 L270,135 L265,110 Z', cx: 305, cy: 115 },
  'BE': { d: 'M120,150 L180,130 L220,145 L240,180 L230,230 L200,260 L150,270 L100,240 L90,200 L100,160 Z', cx: 165, cy: 195 },
  'VD': { d: 'M50,220 L100,200 L130,220 L140,270 L120,310 L70,320 L30,290 L25,250 Z', cx: 85, cy: 265 },
  'GE': { d: 'M25,310 L55,295 L70,320 L60,350 L30,355 L15,335 Z', cx: 45, cy: 325 },
  'VS': { d: 'M100,280 L180,260 L220,280 L240,320 L220,360 L160,370 L100,350 L80,310 Z', cx: 165, cy: 315 },
  'NE': { d: 'M85,170 L120,155 L140,175 L135,205 L105,215 L75,200 Z', cx: 108, cy: 185 },
  'FR': { d: 'M100,200 L140,185 L170,200 L175,240 L150,265 L110,255 L95,225 Z', cx: 135, cy: 225 },
  'JU': { d: 'M95,120 L130,105 L155,120 L150,150 L120,165 L90,150 Z', cx: 122, cy: 138 },
  'BS': { d: 'M175,75 L195,65 L210,78 L205,95 L185,100 L172,88 Z', cx: 190, cy: 82 },
  'BL': { d: 'M155,90 L185,80 L195,100 L185,125 L155,130 L145,110 Z', cx: 170, cy: 105 },
  'SO': { d: 'M150,115 L190,105 L215,120 L210,150 L175,160 L150,145 Z', cx: 180, cy: 132 },
  'AG': { d: 'M210,100 L250,90 L275,110 L270,140 L235,155 L210,140 Z', cx: 240, cy: 120 },
  'LU': { d: 'M215,145 L255,135 L280,155 L275,190 L240,200 L215,180 Z', cx: 248, cy: 167 },
  'ZG': { d: 'M270,145 L295,140 L310,160 L300,180 L275,182 L265,165 Z', cx: 285, cy: 162 },
  'SZ': { d: 'M295,155 L330,150 L350,175 L340,205 L305,210 L290,185 Z', cx: 320, cy: 180 },
  'NW': { d: 'M260,185 L290,180 L300,205 L285,225 L260,220 L252,200 Z', cx: 275, cy: 202 },
  'OW': { d: 'M235,195 L265,190 L275,220 L260,245 L230,240 L225,215 Z', cx: 250, cy: 218 },
  'UR': { d: 'M280,220 L310,210 L330,240 L320,280 L290,285 L270,255 Z', cx: 300, cy: 250 },
  'GL': { d: 'M330,175 L365,165 L385,195 L375,230 L340,235 L325,205 Z', cx: 355, cy: 200 },
  'SH': { d: 'M280,55 L310,45 L335,60 L330,85 L300,90 L278,75 Z', cx: 305, cy: 68 },
  'AR': { d: 'M375,105 L400,95 L415,115 L405,135 L380,138 L370,120 Z', cx: 392, cy: 117 },
  'AI': { d: 'M385,130 L405,125 L415,145 L405,162 L385,160 L378,145 Z', cx: 395, cy: 145 },
  'SG': { d: 'M340,100 L385,90 L410,120 L400,165 L355,175 L335,145 Z', cx: 370, cy: 132 },
  'GR': { d: 'M320,230 L380,200 L430,230 L440,300 L400,350 L340,340 L300,290 Z', cx: 370, cy: 280 },
  'TG': { d: 'M330,70 L375,60 L395,85 L385,110 L345,115 L325,95 Z', cx: 358, cy: 88 },
  'TI': { d: 'M260,320 L310,300 L340,340 L330,400 L280,420 L250,390 L245,350 Z', cx: 295, cy: 360 },
};

export default function SwitzerlandMap({ selectedCantons, onToggleCanton, cantonData }) {
  const [hoveredCanton, setHoveredCanton] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e, cantonId) => {
    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10 });
    setHoveredCanton(cantonId);
  };

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 460 440" className="w-full h-auto">
        <defs>
          <linearGradient id="selectedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="100%" stopColor="#0052CC" />
          </linearGradient>
        </defs>

        {Object.entries(cantonPaths).map(([id, path]) => {
          const isSelected = selectedCantons.includes(id);
          const isHovered = hoveredCanton === id;

          return (
            <g key={id}>
              <path
                d={path.d}
                fill={isSelected ? 'url(#selectedGrad)' : '#e5e5e5'}
                stroke={isSelected ? '#0052CC' : '#ffffff'}
                strokeWidth={isSelected ? 2 : 1}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  filter: isHovered ? 'brightness(0.92)' : 'none',
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: `${path.cx}px ${path.cy}px`,
                }}
                onClick={() => onToggleCanton(id)}
                onMouseMove={(e) => handleMouseMove(e, id)}
                onMouseLeave={() => setHoveredCanton(null)}
              />
              <text
                x={path.cx}
                y={path.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="600"
                fill={isSelected ? 'white' : '#737373'}
                style={{ pointerEvents: 'none' }}
              >
                {id}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredCanton && cantonData[hoveredCanton] && (
        <div
          className="animate-fade absolute z-10 bg-gray-900 text-white px-3.5 py-2.5 rounded-[10px] text-[13px] pointer-events-none shadow-lg whitespace-nowrap"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold mb-1">{cantonData[hoveredCanton].name}</div>
          <div className="opacity-70">{cantonData[hoveredCanton].count} établissements</div>
        </div>
      )}
    </div>
  );
}
