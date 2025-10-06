'use client';

import { GraphNode } from '@/types';
import { useEffect, useRef } from 'react';

interface NodeContextMenuProps {
  node: GraphNode;
  position: { x: number; y: number };
  onClose: () => void;
  onExpandTree: () => void;
  onDeleteSubtree: () => void;
  onResetProgress: () => void;
  onCompleteInstantly: () => void;
  isLocked?: boolean;
}

export default function NodeContextMenu({
  node,
  position,
  onClose,
  onExpandTree,
  onDeleteSubtree,
  onResetProgress,
  onCompleteInstantly,
  isLocked = false,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const currentExp = node.currentExp || 0;
  const requiredExp = node.requiredExp || 100;
  const progress = (currentExp / requiredExp) * 100;

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-2xl p-2 min-w-[200px] z-50 animate-in fade-in zoom-in duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* ノード情報ヘッダー */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: node.color }}
          />
          <span className="text-xs font-semibold text-gray-500 uppercase">
            {node.nodeType}
          </span>
        </div>
        <h3 className="font-bold text-gray-900 text-sm">{node.label}</h3>
        <div className="mt-2">
          <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: node.color,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {currentExp} / {requiredExp} EXP ({Math.floor(progress)}%)
          </p>
        </div>
      </div>

      {/* 説明 */}
      {node.description && (
        <div className="px-3 py-2 border-t border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">{node.description}</p>
        </div>
      )}

      {/* メニューアイテム */}
      <div className="py-1 border-t border-gray-200">
        {node.nodeType !== 'center' && (
          <>
            <button
              onClick={onExpandTree}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md transition flex items-center gap-2 text-sm text-gray-700"
            >
              <span>🌱</span>
              <span>ツリーを伸ばす</span>
            </button>

            {/* ロックされていない場合のみ進捗関連ボタンを表示 */}
            {!isLocked && progress < 100 && (
              <button
                onClick={onCompleteInstantly}
                className="w-full text-left px-3 py-2 hover:bg-green-50 rounded-md transition flex items-center gap-2 text-sm text-green-600"
              >
                <span>⚡</span>
                <span>即座に完了させる</span>
              </button>
            )}
          </>
        )}

        {node.nodeType !== 'center' && (
          <>
            <button
              onClick={onDeleteSubtree}
              className="w-full text-left px-3 py-2 hover:bg-red-50 rounded-md transition flex items-center gap-2 text-sm text-red-600"
            >
              <span>🗑️</span>
              <span>このツリーを削除</span>
            </button>

            {/* ロックされていない場合のみ進捗初期化ボタンを表示 */}
            {!isLocked && (
              <button
                onClick={onResetProgress}
                className="w-full text-left px-3 py-2 hover:bg-orange-50 rounded-md transition flex items-center gap-2 text-sm text-orange-600"
              >
                <span>🔄</span>
                <span>進捗を初期化</span>
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
}
