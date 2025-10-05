'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  variant?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

export default function Toast({
  isOpen,
  onClose,
  message,
  variant = 'info',
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    info: {
      bg: 'bg-gradient-to-r from-blue-500 to-purple-600',
      icon: 'ℹ️',
    },
    success: {
      bg: 'bg-gradient-to-r from-green-500 to-teal-500',
      icon: '✅',
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500 to-pink-500',
      icon: '❌',
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      icon: '⚠️',
    },
  };

  const style = variantStyles[variant];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div
          className={`${style.bg} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 max-w-md`}
        >
          <span className="text-2xl">{style.icon}</span>
          <p className="font-medium">{message}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
