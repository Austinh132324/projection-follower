import { motion } from 'framer-motion';
import { CameraIcon, EditIcon } from './icons';

export function AddSheet({
  onClose,
  onManual,
  onPhoto,
}: {
  onClose: () => void;
  onManual: () => void;
  onPhoto: () => void;
}) {
  return (
    <motion.div
      className="backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <div className="sheet-handle" />
        <h3>Add a bet</h3>
        <p className="sub">Log it yourself, or snap the slip and let it read the details.</p>

        <motion.button className="choice" onClick={onPhoto} whileTap={{ scale: 0.98 }}>
          <span className="ic">
            <CameraIcon />
          </span>
          <span>
            <div className="t">Scan a photo</div>
            <div className="d">Read a bet slip screenshot with on-device OCR</div>
          </span>
        </motion.button>

        <motion.button className="choice" onClick={onManual} whileTap={{ scale: 0.98 }}>
          <span className="ic">
            <EditIcon />
          </span>
          <span>
            <div className="t">Enter manually</div>
            <div className="d">Type the book, stake, odds, and legs</div>
          </span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
