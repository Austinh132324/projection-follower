import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExpandIcon, CloseIcon } from './icons';

/**
 * A floating control to make the app immersive: an expand button to enter
 * fullscreen, and an X in the corner to exit. Uses the Fullscreen API (with the
 * WebKit-prefixed fallback).
 *
 * On iPhone Safari the Fullscreen API isn't available — the truly native path
 * there is "Add to Home Screen", which launches standalone (no browser chrome)
 * thanks to the apple-mobile-web-app meta tags. When already running standalone,
 * or where fullscreen isn't supported, this control hides itself.
 */

interface FsDoc extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}
interface FsEl extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function FullscreenToggle() {
  const doc = document as FsDoc;
  const el = document.documentElement as FsEl;
  const supported = !!(el.requestFullscreen || el.webkitRequestFullscreen);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [doc]);

  // Already immersive (installed to Home Screen) or unsupported → nothing to show.
  if (isStandalone() || !supported) return null;

  const enter = () => (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
  const exit = () => (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());

  return (
    <motion.button
      className="fs-btn"
      onClick={() => (isFs ? exit() : enter())}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-label={isFs ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFs ? <CloseIcon size={19} /> : <ExpandIcon />}
    </motion.button>
  );
}
