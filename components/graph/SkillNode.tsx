'use client';

import { memo, useState, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GraphNode } from '@/types';
import { FaStar, FaUserCircle, FaLightbulb, FaCertificate, FaBriefcase } from 'react-icons/fa';

function SkillNode({ data }: NodeProps<GraphNode & { isHighlighted?: boolean; isLocked?: boolean }>) {
  const [isClicking, setIsClicking] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentExp = data.currentExp || 0;
  const requiredExp = data.requiredExp || 100;
  const progress = (currentExp / requiredExp) * 100;
  const isCenter = data.nodeType === 'center';
  const isCurrent = data.nodeType === 'current';
  const isHighlighted = data.isHighlighted || false;
  const isLocked = data.isLocked || false;
  const nodeType = data.nodeType || 'skill';
  const isMaxed = currentExp >= requiredExp;

  // ノードタイプ別のサイズ
  const nodeSize = isCenter ? 'w-60 h-60' : isCurrent ? 'w-40 h-40' : 'w-32 h-32';
  const circleRadius = isCenter ? 78 : isCurrent ? 78 : 62;

  // ノードタイプ別のアイコン
  const getNodeIcon = () => {
    if (isCenter) return <FaStar className="text-white text-3xl" />;
    if (isCurrent) return <FaUserCircle className="text-white text-2xl" />;

    switch (nodeType) {
      case 'skill':
        return <FaLightbulb className="text-white text-xl" />;
      case 'cert':
        return <FaCertificate className="text-white text-xl" />;
      case 'position':
        return <FaBriefcase className="text-white text-xl" />;
      default:
        return <FaLightbulb className="text-white text-xl" />;
    }
  };

  const handleMouseDown = () => {
    if (!isCenter && !isLocked) {
      setIsClicking(true);
    }
  };

  const handleMouseUp = () => {
    if (isClicking) {
      setTimeout(() => setIsClicking(false), 600);
    }
  };

  // タッチイベントハンドラー
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isCenter || isLocked) return;

    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    // 500msの長押し検出
    longPressTimerRef.current = setTimeout(() => {
      // 長押しイベントを発火（contextmenu イベントをシミュレート）
      const target = e.currentTarget;
      const syntheticEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      target.dispatchEvent(syntheticEvent);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // 移動距離が10px以上なら長押しをキャンセル
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  return (
    <>
      <style jsx>{`
        @keyframes slowPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        @keyframes sparkle {
          0%, 100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1) rotate(180deg);
          }
        }
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.6);
          }
        }
      `}</style>
      <div
        className={`
        relative ${nodeSize} rounded-full transition-all duration-300 flex items-center justify-center
        ${isCenter ? 'cursor-default' : isLocked ? 'cursor-not-allowed' : isMaxed ? 'cursor-default' : 'cursor-pointer'}
        ${isCenter ? 'ring-4 ring-yellow-400' : ''}
        ${isHighlighted ? 'ring-8 ring-pink-500 shadow-2xl shadow-pink-500/50' : ''}
        ${isMaxed && !isCenter ? 'ring-4 ring-yellow-300' : ''}
        ${!isCenter && !isMaxed && !isLocked ? 'hover:scale-110 hover:shadow-xl active:scale-95' : ''}
        ${isLocked ? 'opacity-50' : ''}
      `}
        style={{
          backgroundColor: isLocked ? '#9CA3AF' : data.color,
          zIndex: isHighlighted ? 20 : 10,
          pointerEvents: isCenter || isMaxed ? 'none' : (isClicking ? 'none' : 'auto'),
          animation: isHighlighted
            ? 'slowPulse 2s ease-in-out infinite'
            : isMaxed && !isCenter
            ? 'glow 2s ease-in-out infinite'
            : 'none',
          opacity: 1,
          boxShadow: isMaxed && !isCenter
            ? '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4)'
            : undefined,
        }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* クリックリップルエフェクト */}
        {isClicking && (
          <div
            className="absolute inset-0 rounded-full border-4 pointer-events-none"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.8)',
              animation: 'ripple 0.6s ease-out',
            }}
          />
        )}
        {/* 中央ハンドル - 完全に非表示 */}
        <Handle
          type="target"
          position={Position.Top}
          id="center"
          className="opacity-0"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="center"
          className="opacity-0"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* コンテンツ */}
        <div className="text-center px-2 flex flex-col items-center justify-center">
          {/* アイコン */}
          <div className="mb-2">
            {getNodeIcon()}
          </div>

          {/* タイトル */}
          <h3 className="font-bold text-white text-xs leading-tight line-clamp-2">
            {data.label}
          </h3>
        </div>

        {/* プログレスリング - Centerノード以外のみ表示 */}
        {!isCenter && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r={circleRadius}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="3"
            />
            <circle
              cx="50%"
              cy="50%"
              r={circleRadius}
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * circleRadius}`}
              strokeDashoffset={`${2 * Math.PI * circleRadius * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
        )}
      </div>
    </>
  );
}

export default memo(SkillNode);
