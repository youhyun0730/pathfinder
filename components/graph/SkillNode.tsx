'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GraphNode } from '@/types';

function SkillNode({ data }: NodeProps<GraphNode>) {
  const currentExp = data.currentExp || data.current_exp || 0;
  const requiredExp = data.requiredExp || data.required_exp || 100;
  const progress = (currentExp / requiredExp) * 100;
  const isLocked = data.isLocked || data.is_locked || false;
  const isCenter = data.nodeType === 'center' || data.node_type === 'center';

  return (
    <div
      className={`
        relative w-32 h-32 rounded-full shadow-lg transition-all flex items-center justify-center
        ${isLocked ? 'opacity-60' : 'opacity-100'}
        ${isCenter ? 'ring-4 ring-yellow-400' : ''}
        hover:shadow-xl hover:scale-110
      `}
      style={{
        backgroundColor: data.color,
        zIndex: 10,
      }}
    >
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
      <div className="text-center px-2">
        {/* タイトル */}
        <h3 className="font-bold text-white text-sm mb-1 leading-tight line-clamp-2">
          {data.label}
        </h3>

        {/* EXP表示 */}
        <div className="text-xs text-white/90">
          {Math.floor(progress)}%
        </div>

        {isCenter && <div className="text-lg mt-1">⭐</div>}
        {isLocked && <div className="text-lg mt-1">🔒</div>}
      </div>

      {/* プログレスリング */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="62"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
        />
        <circle
          cx="50%"
          cy="50%"
          r="62"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 62}`}
          strokeDashoffset={`${2 * Math.PI * 62 * (1 - progress / 100)}`}
          className="transition-all duration-300"
        />
      </svg>
    </div>
  );
}

export default memo(SkillNode);
