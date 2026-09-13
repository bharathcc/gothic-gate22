import React, { useEffect, useRef } from 'react';

interface GothicBackgroundProps {
  isLightningActive: boolean;
  isSuccessTransition: boolean;
  mouseParallax: { x: number; y: number };
  isSinging?: boolean;
}

export const GothicBackground: React.FC<GothicBackgroundProps> = ({
  isLightningActive,
  isSuccessTransition,
  mouseParallax,
  isSinging = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rain & Wind particles simulation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // 1. Rain Drops Pool (layered for depth)
    const rainCount = 280;
    const drops: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      thickness: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < rainCount; i++) {
      drops.push({
        x: Math.random() * (width + 500) - 250,
        y: Math.random() * height,
        length: 22 + Math.random() * 32,
        speed: 18 + Math.random() * 26,
        thickness: 0.7 + Math.random() * 1.5,
        opacity: 0.25 + Math.random() * 0.5,
      });
    }

    // 2. Wind Gust Streak Lines (dynamic howling wind effect)
    const windCount = 45;
    const windStreaks: Array<{
      x: number;
      y: number;
      length: number;
      speedX: number;
      speedY: number;
      thickness: number;
      opacity: number;
      curve: number;
    }> = [];

    for (let i = 0; i < windCount; i++) {
      windStreaks.push({
        x: Math.random() * (width + 600) - 300,
        y: Math.random() * height,
        length: 60 + Math.random() * 140,
        speedX: 14 + Math.random() * 18,
        speedY: 2 + Math.random() * 4,
        thickness: 0.8 + Math.random() * 1.4,
        opacity: 0.08 + Math.random() * 0.22,
        curve: (Math.random() - 0.5) * 8,
      });
    }

    // 3. Atmospheric Floating Dust / Mist Embers (singing reactive)
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      speedX: number;
      speedY: number;
      opacity: number;
      pulseAngle: number;
    }> = [];

    for (let i = 0; i < 48; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1 + Math.random() * 2.5,
        speedX: 2 + Math.random() * 4,
        speedY: (Math.random() - 0.5) * 0.8,
        opacity: 0.15 + Math.random() * 0.35,
        pulseAngle: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Rain speed multiplier: slower during gate opening or slightly fluctuating with singing
      const speedMultiplier = isSuccessTransition ? 0.2 : (isSinging ? 1.15 : 1.0);
      const angle = 0.28; // ~16 degrees diagonal wind direction

      // A. Render Wind Gust Streaks
      windStreaks.forEach((w) => {
        ctx.strokeStyle = isLightningActive
          ? `rgba(220, 240, 255, ${w.opacity * 2.2})`
          : `rgba(175, 215, 245, ${w.opacity * (isSuccessTransition ? 0.3 : (isSinging ? 1.4 : 1))})`;
        ctx.lineWidth = w.thickness * (isSinging ? 1.2 : 1);
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.quadraticCurveTo(
          w.x + w.length * 0.5,
          w.y + w.curve + (isSinging ? Math.sin(w.x * 0.02) * 5 : 0),
          w.x + w.length,
          w.y + w.speedY * 2
        );
        ctx.stroke();

        w.x += w.speedX * speedMultiplier;
        w.y += w.speedY * speedMultiplier;

        if (w.x > width + 200) {
          w.x = -w.length - Math.random() * 200;
          w.y = Math.random() * height;
        }
        if (w.y > height) {
          w.y = -10;
        }
      });

      // B. Render Rain Drops
      drops.forEach((d) => {
        ctx.lineWidth = d.thickness;
        ctx.strokeStyle = isLightningActive
          ? `rgba(235, 248, 255, ${Math.min(1, d.opacity * 1.8)})`
          : isSinging
          ? `rgba(180, 225, 255, ${d.opacity * 1.25})`
          : `rgba(150, 190, 225, ${d.opacity})`;

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + Math.sin(angle) * d.length, d.y + Math.cos(angle) * d.length);
        ctx.stroke();

        d.x += Math.sin(angle) * d.speed * speedMultiplier;
        d.y += Math.cos(angle) * d.speed * speedMultiplier;

        if (d.y > height) {
          d.y = -d.length;
          d.x = Math.random() * (width + 400) - 200;
        }
        if (d.x > width + 300) {
          d.x = -150;
        }
      });

      // C. Render Drifting Wind-blown Particles / Musical Embers
      particles.forEach((p) => {
        p.pulseAngle += 0.04;
        const radiusScale = isSinging ? 1 + Math.sin(p.pulseAngle) * 0.5 : 1;
        ctx.fillStyle = isSinging
          ? `rgba(165, 235, 255, ${Math.min(0.8, p.opacity * 1.8)})`
          : `rgba(180, 220, 250, ${p.opacity * (isLightningActive ? 1.6 : 1)})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * radiusScale, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.speedX * speedMultiplier;
        p.y += (p.speedY + (isSinging ? Math.sin(p.pulseAngle) * 0.4 : 0)) * speedMultiplier;

        if (p.x > width) p.x = 0;
        if (p.y > height) p.y = 0;
        if (p.y < 0) p.y = height;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLightningActive, isSuccessTransition, isSinging]);

  // Subtle Mouse / Touch Parallax
  const px = mouseParallax.x * 12;
  const py = mouseParallax.y * 8;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#020509] pointer-events-none z-0 select-none">
      {/* 1. Main Gothic Background Image Layer */}
      <div
        className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(${px}px, ${py}px, 0) scale(1.03)`,
        }}
      >
        <img
          src="/background.png"
          alt="Gothic Castle Storm Atmosphere"
          className={`w-full h-full object-cover object-center transition-all duration-500 ${
            isLightningActive
              ? 'brightness-125 contrast-115 saturate-110'
              : isSuccessTransition
              ? 'brightness-105 contrast-110'
              : 'brightness-90 contrast-105'
          }`}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* 2. Steel-Blue Cinematic Grading & Moody Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030914]/45 via-transparent to-[#010408]/85 mix-blend-multiply pointer-events-none" />

      {/* 3. Deep Atmospheric Rolling Ground Fog (Parts away from center during success) */}
      <div
        className={`absolute -bottom-10 -left-1/4 w-[150%] h-[35vh] bg-gradient-to-t from-[#02050a] via-[#091829]/40 to-transparent blur-3xl animate-fog-slow pointer-events-none transition-all duration-1000 ${
          isSuccessTransition ? '-translate-x-1/3 opacity-30' : 'translate-x-0 opacity-100'
        }`}
      />
      <div
        className={`absolute bottom-4 -right-1/4 w-[140%] h-[25vh] bg-gradient-to-t from-transparent via-[#0f243a]/30 to-transparent blur-2xl animate-fog-fast pointer-events-none transition-all duration-1000 ${
          isSuccessTransition ? 'translate-x-1/3 opacity-30' : 'translate-x-0 opacity-100'
        }`}
      />
      {isSinging && (
        <div className="absolute inset-0 bg-cyan-950/15 mix-blend-screen transition-opacity duration-300 animate-pulse pointer-events-none" />
      )}

      {/* 4. Canvas for Dynamic Rain, Wind Gusts & Singing Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* 5. Lightning Flash Overlay (Brief steel-blue/white illumination) */}
      <div
        className={`absolute inset-0 pointer-events-none z-20 transition-opacity duration-75 ${
          isLightningActive ? 'opacity-85 bg-[#c8e2fb]/30 mix-blend-screen' : 'opacity-0'
        }`}
      />

      {/* 6. Cinematic Vignette (keeps center focused and borders dark) */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,5,10,0.6)_75%,rgba(1,2,5,0.92)_100%)]" />
    </div>
  );
};
