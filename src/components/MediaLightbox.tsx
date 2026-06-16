'use client';
import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export interface LightboxMedia {
  url: string;
  type: 'image' | 'video';
  name?: string;
}

interface Props {
  media: LightboxMedia | null;
  onClose: () => void;
}

export default function MediaLightbox({ media, onClose }: Props) {
  // Fermer avec Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (!media) return;
    document.addEventListener('keydown', handleKey);
    // Bloquer le scroll du body
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [media, handleKey]);

  return (
    <AnimatePresence>
      {media && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Barre top */}
          <div
            className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/70 text-sm truncate max-w-[60vw]">
              {media.name || ''}
            </p>
            <div className="flex items-center gap-2">
              {/* Télécharger */}
              <a
                href={media.url}
                download={media.name || true}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Télécharger"
              >
                <ArrowDownTrayIcon className="h-5 w-5 text-white" />
              </a>
              {/* Fermer */}
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Fermer"
              >
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Contenu */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={media.name || 'image'}
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
                draggable={false}
              />
            ) : (
              <video
                src={media.url}
                controls
                autoPlay
                className="max-w-[95vw] max-h-[90vh] rounded-lg shadow-2xl outline-none"
              />
            )}
          </motion.div>

          {/* Hint fermeture */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs select-none pointer-events-none">
            Cliquer en dehors ou Échap pour fermer
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
