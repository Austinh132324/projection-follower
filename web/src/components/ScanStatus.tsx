import { motion } from 'framer-motion';

export type ScanState = 'pending' | 'scanning' | 'ok' | 'fail';

/** Animated per-image status: a gradient spinner that morphs into a drawn green
 *  check (bet found) or red X (couldn't read). */
export function ScanStatus({ state, size = 44 }: { state: ScanState; size?: number }) {
  if (state === 'pending') {
    return <div className="scan-ring dim" style={{ width: size, height: size }} />;
  }
  if (state === 'scanning') {
    return <div className="scan-ring" style={{ width: size, height: size }} />;
  }
  const color = state === 'ok' ? 'var(--pos)' : 'var(--neg)';
  const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 } };
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 46 46"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
    >
      <motion.circle
        cx="23" cy="23" r="20" fill="none" stroke={color} strokeWidth="3"
        {...draw} transition={{ duration: 0.4 }}
      />
      {state === 'ok' ? (
        <motion.path
          d="M14 23.5l6 6 12-13.5" fill="none" stroke={color} strokeWidth="3.5"
          strokeLinecap="round" strokeLinejoin="round"
          {...draw} transition={{ delay: 0.25, duration: 0.28 }}
        />
      ) : (
        <>
          <motion.path d="M16 16l14 14" stroke={color} strokeWidth="3.5" strokeLinecap="round"
            {...draw} transition={{ delay: 0.25, duration: 0.22 }} />
          <motion.path d="M30 16l-14 14" stroke={color} strokeWidth="3.5" strokeLinecap="round"
            {...draw} transition={{ delay: 0.42, duration: 0.22 }} />
        </>
      )}
    </motion.svg>
  );
}
