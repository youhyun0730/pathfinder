'use client';

import { GraphNode } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface MaxExpCelebrationProps {
  node: GraphNode | null;
  onClose: () => void;
}

export default function MaxExpCelebration({ node, onClose }: MaxExpCelebrationProps) {
  if (!node) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl shadow-2xl p-8 max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* キラキラエフェクト */}
          <div className="text-center">
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="text-8xl mb-4"
            >
              🎉
            </motion.div>

            <h2 className="text-3xl font-bold text-white mb-2">
              おめでとうございます！
            </h2>

            <p className="text-xl text-white/90 mb-4">
              「{node.label}」をマスターしました！
            </p>

            <div className="bg-white/20 rounded-lg p-4 mb-6">
              <p className="text-white font-semibold">
                EXP {node.currentExp} / {node.requiredExp}
              </p>
              <div className="mt-2 bg-white/30 rounded-full h-3 overflow-hidden">
                <div className="bg-white h-full w-full" />
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-3 bg-white text-yellow-600 rounded-lg font-bold hover:bg-yellow-50 transition shadow-lg"
            >
              続ける
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
