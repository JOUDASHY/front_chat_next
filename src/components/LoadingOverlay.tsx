'use client';

import { motion, AnimatePresence } from 'framer-motion';
import AppLogo from './AppLogo';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export default function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-md bg-black/40"
        >
          {/* Spinner + logo */}
          <div className="relative flex items-center justify-center">
            {/* Cercle tournant */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              className="absolute w-24 h-24 rounded-full border-4 border-transparent border-t-[#f68c09] border-r-[#f68c09]/40"
            />
            {/* Logo au centre */}
            <AppLogo size={56} />
          </div>

          {/* Message optionnel */}
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 text-white/80 text-sm font-medium tracking-wide"
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
