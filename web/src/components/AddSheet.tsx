import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ImagesIcon, CameraIcon, EditIcon } from './icons';

/**
 * The "add a bet" chooser. Photo pickers are opened from a *direct tap* on these
 * buttons (not programmatically on mount) — iOS Safari only opens a file input
 * within a real user gesture, which is what makes "Photo Library" actually work.
 *
 * - Photo Library: `accept="image/*"` with no `capture` → iOS shows Photo
 *   Library / Choose File (Files), so you can grab a screenshot from anywhere.
 * - Take a photo: `capture="environment"` → opens the camera.
 */
export function AddSheet({
  onClose,
  onManual,
  onPhotoFile,
}: {
  onClose: () => void;
  onManual: () => void;
  onPhotoFile: (file: File) => void;
}) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (file) onPhotoFile(file);
  };

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
        <p className="sub">Import a slip screenshot, or enter it yourself.</p>

        <input ref={libraryRef} type="file" accept="image/*" hidden onChange={pick} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />

        <motion.button className="choice" onClick={() => libraryRef.current?.click()} whileTap={{ scale: 0.98 }}>
          <span className="ic">
            <ImagesIcon />
          </span>
          <span>
            <div className="t">Photo Library</div>
            <div className="d">Pick a screenshot from Photos or Files</div>
          </span>
        </motion.button>

        <motion.button className="choice" onClick={() => cameraRef.current?.click()} whileTap={{ scale: 0.98 }}>
          <span className="ic">
            <CameraIcon />
          </span>
          <span>
            <div className="t">Take a photo</div>
            <div className="d">Snap the bet slip now</div>
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
