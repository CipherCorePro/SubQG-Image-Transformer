import React, { useMemo } from 'react';

interface HarmonyVisualizerProps {
  harmonyScore: number | null;
}

const HarmonyVisualizer: React.FC<HarmonyVisualizerProps> = ({ harmonyScore }) => {
  const animationStyle = useMemo(() => {
    if (harmonyScore === null || isNaN(harmonyScore) || harmonyScore < 0 || harmonyScore > 1) {
      return {
        background: 'linear-gradient(270deg, #334155, #475569, #334155, #475569, #334155)',
        backgroundSize: '400% 400%',
        animationDuration: '8s',
      };
    }

    const speed = 5.5 - harmonyScore * 4; // Duration from 5.5s (low) to 1.5s (high)
    
    let colorStops: string[];

    if (harmonyScore < 0.15) { // Very Low Harmony: chaotic, darker, cool
      colorStops = ['#2c3e50', '#34495e', '#1a2533', '#34495e', '#2c3e50'];
    } else if (harmonyScore < 0.33) { // Low Harmony: Cool colors, slow
      colorStops = ['#3b82f6', '#581c87', '#1d4ed8', '#581c87', '#3b82f6']; // Blues, deep purples
    } else if (harmonyScore < 0.66) { // Medium Harmony: Transitioning, moderate speed
      const midFactor = (harmonyScore - 0.33) / 0.33;
      const R = Math.round(59 + midFactor * (5 - 59)); // Blue to Green-Teal (R)
      const G = Math.round(130 + midFactor * (150 - 130)); // Blue to Green-Teal (G)
      const B = Math.round(246 + midFactor * (100 - 246)); // Blue to Green-Teal (B)
      colorStops = [
        `rgb(${R}, ${G}, ${B})`,
        `#059669`, // Teal/Green
        `rgb(${R*0.8}, ${G*1.1}, ${B*0.9})`,
        `#047857`, // Darker Teal
        `rgb(${R}, ${G}, ${B})`,
      ];
    } else if (harmonyScore < 0.85) { // High Harmony: Warmer colors, faster
      colorStops = ['#f59e0b', '#ea580c', '#facc15', '#ea580c','#f59e0b']; // Oranges, Yellows
    } else { // Very High Harmony: Bright, warm, smooth, fastest
        colorStops = ['#fde047', '#fb923c', '#fffbeb', '#fb923c', '#fde047']; // Bright Yellow, Light Orange, Cream
    }

    return {
      background: `linear-gradient(270deg, ${colorStops.join(', ')})`,
      backgroundSize: '600% 600%',
      animationDuration: `${Math.max(1.5, Math.min(speed, 8)).toFixed(2)}s`,
    };
  }, [harmonyScore]);

  return (
    <div className="w-full my-3" title={`Harmony Score: ${harmonyScore !== null && !isNaN(harmonyScore) ? harmonyScore.toFixed(3) : 'N/A'}`}>
      <style>
        {`
          @keyframes harmonyWaveAnimation {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <div
        className="w-full h-3 md:h-4 rounded-full shadow-inner" // Changed to rounded-full for a pill shape
        style={{
          ...animationStyle,
          animationName: 'harmonyWaveAnimation',
          animationTimingFunction: 'ease-in-out', // Smoother transition
          animationIterationCount: 'infinite',
        }}
      />
    </div>
  );
};

export default HarmonyVisualizer;
