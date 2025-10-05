'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GraphNode } from '@/types';
import { FaLightbulb, FaCertificate, FaBriefcase, FaTimes } from 'react-icons/fa';

interface UnlockCelebrationProps {
  unlockedNodes: GraphNode[];
  onClose: () => void;
}

export default function UnlockCelebration({ unlockedNodes, onClose }: UnlockCelebrationProps) {
  if (unlockedNodes.length === 0) return null;

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'skill':
        return <FaLightbulb className="text-yellow-400 text-2xl" />;
      case 'cert':
        return <FaCertificate className="text-purple-400 text-2xl" />;
      case 'position':
        return <FaBriefcase className="text-orange-400 text-2xl" />;
      default:
        return <FaLightbulb className="text-yellow-400 text-2xl" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition"
            >
              <FaTimes size={24} />
            </button>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <div className="text-6xl mb-2">🎉</div>
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2">おめでとうございます！</h2>
            <p className="text-white/90">新しいスキルがアンロックされました</p>
          </div>

          {/* アンロックされたノードリスト */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {unlockedNodes.map((node, index) => (
                <motion.div
                  key={node.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-shrink-0">
                    {getNodeIcon(node.nodeType || 'skill')}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{node.label}</h3>
                    {node.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {node.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* フッター */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition"
            >
              続ける
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
