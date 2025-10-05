'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
}

export default function Dialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'キャンセル',
  variant = 'info',
}: DialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    info: {
      gradient: 'from-blue-500 to-purple-600',
      hoverGradient: 'hover:from-blue-600 hover:to-purple-700',
      icon: 'ℹ️',
    },
    warning: {
      gradient: 'from-yellow-500 to-orange-500',
      hoverGradient: 'hover:from-yellow-600 hover:to-orange-600',
      icon: '⚠️',
    },
    error: {
      gradient: 'from-red-500 to-pink-500',
      hoverGradient: 'hover:from-red-600 hover:to-pink-600',
      icon: '❌',
    },
    success: {
      gradient: 'from-green-500 to-teal-500',
      hoverGradient: 'hover:from-green-600 hover:to-teal-600',
      icon: '✅',
    },
  };

  const style = variantStyles[variant];

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
          <div className={`bg-gradient-to-r ${style.gradient} p-6 text-center relative`}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition"
            >
              <FaTimes size={20} />
            </button>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <div className="text-5xl mb-2">{style.icon}</div>
            </motion.div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>

          {/* メッセージ */}
          <div className="p-6">
            <p className="text-gray-700 text-center whitespace-pre-line">{message}</p>
          </div>

          {/* ボタン */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
            {onConfirm ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 bg-gradient-to-r ${style.gradient} text-white font-bold py-3 rounded-lg ${style.hoverGradient} transition`}
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className={`w-full bg-gradient-to-r ${style.gradient} text-white font-bold py-3 rounded-lg ${style.hoverGradient} transition`}
              >
                {confirmText}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
