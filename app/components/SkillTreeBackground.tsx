'use client';

import { useEffect, useRef } from 'react';

export default function SkillTreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスサイズを設定
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 稲妻のようなパスを生成
    interface Point {
      x: number;
      y: number;
    }

    interface LightningPath {
      points: Point[];
      progress: number;
      speed: number;
      color: string;
      glow: number;
    }

    const createLightningPath = (): LightningPath => {
      const points: Point[] = [];
      const startX = Math.random() * canvas.width;
      const segments = 8 + Math.floor(Math.random() * 6);

      let currentX = startX;
      let currentY = canvas.height;

      points.push({ x: currentX, y: currentY });

      for (let i = 0; i < segments; i++) {
        currentY -= (canvas.height / segments) + (Math.random() * 40 - 20);
        currentX += Math.random() * 150 - 75;

        // 画面端を超えないように調整
        currentX = Math.max(50, Math.min(canvas.width - 50, currentX));

        points.push({ x: currentX, y: currentY });
      }

      return {
        points,
        progress: 0,
        speed: 0.003 + Math.random() * 0.005,
        color: Math.random() > 0.5 ? '#8b5cf6' : '#3b82f6', // purple or blue
        glow: 0,
      };
    };

    // 複数のパスを生成
    const paths: LightningPath[] = [];
    const pathCount = 5;

    for (let i = 0; i < pathCount; i++) {
      setTimeout(() => {
        paths.push(createLightningPath());
      }, i * 1500);
    }

    // アニメーションループ
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      paths.forEach((path, index) => {
        path.progress += path.speed;

        // プログレスが完了したらリセット
        if (path.progress > 1.2) {
          path.progress = -0.3;
          path.glow = 0;
        }

        // パスを描画
        const totalPoints = path.points.length;

        for (let i = 0; i < totalPoints - 1; i++) {
          const segmentProgress = i / (totalPoints - 1);
          const nextSegmentProgress = (i + 1) / (totalPoints - 1);

          // 現在のプログレスに基づいて透明度を計算
          let opacity = 0;
          const glowSize = 0.15; // グロー範囲

          if (path.progress >= segmentProgress - glowSize && path.progress <= nextSegmentProgress + glowSize) {
            const distance = Math.abs(path.progress - segmentProgress);
            opacity = Math.max(0, 1 - (distance / glowSize));
          }

          if (opacity > 0) {
            const p1 = path.points[i];
            const p2 = path.points[i + 1];

            // グロー効果
            ctx.strokeStyle = path.color;
            ctx.lineWidth = 4;
            ctx.globalAlpha = opacity * 0.3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = path.color;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // メインライン
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = opacity * 0.8;
            ctx.shadowBlur = 15;
            ctx.shadowColor = path.color;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // ノード(接続点)
            if (opacity > 0.7) {
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = opacity;
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
}
