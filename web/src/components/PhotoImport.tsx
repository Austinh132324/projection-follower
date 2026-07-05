import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Bet } from '../types';
import { tesseractParser } from '../ocr';
import type { BetDraft } from '../betDraft';
import { BetForm } from './BetForm';
import { CloseIcon } from './icons';

type Phase = 'reading' | 'review' | 'error';

/**
 * Runs OCR on a photo the user already picked (in AddSheet) and hands the
 * pre-filled draft to the form. The file is passed in — picking happens upstream
 * from a real tap so it works on iOS.
 */
export function PhotoImport({ file, onSave, onClose }: { file: File; onSave: (bet: Bet) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('reading');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<BetDraft | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [error, setError] = useState('');
  const retryRef = useRef<HTMLInputElement>(null);

  const run = async (f: File) => {
    setPreview(URL.createObjectURL(f));
    setPhase('reading');
    setProgress(0);
    try {
      const result = await tesseractParser.parse(f, setProgress);
      setDraft(result.draft);
      setOcrText(result.text);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the photo');
      setPhase('error');
    }
  };

  useEffect(() => {
    run(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  if (phase === 'review' && draft) {
    return <BetForm initial={draft} title="Review scanned bet" onSave={onSave} onClose={onClose} ocrText={ocrText} />;
  }

  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="modal-inner">
        <div className="modal-head">
          <h2>Scan a bet</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {preview && <img className="ocr-preview" src={preview} alt="bet slip" />}

        {phase === 'reading' && (
          <div className="ocr-status">
            <div className="gauge" style={{ justifyContent: 'center' }}>
              <span className="big">{Math.round(progress * 100)}%</span>
            </div>
            <div className="meter" style={{ maxWidth: 260, margin: '0 auto' }}>
              <motion.div className="meter-fill" animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ ease: 'linear' }} />
            </div>
            <p className="screen-sub" style={{ marginTop: 14 }}>Reading the slip on your device…</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="ocr-status">
            <div className="empty" style={{ padding: 20 }}>
              <div className="big">📷</div>
              {error}
            </div>
            <input
              ref={retryRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) run(f);
              }}
            />
            <button className="btn secondary" onClick={() => retryRef.current?.click()}>
              Choose another
            </button>
          </div>
        )}

        <div className="note" style={{ marginTop: 20 }}>
          Reads a bet-slip screenshot on your device and pre-fills the form to confirm. Works best
          with a full, clear DraftKings / FanDuel / PrizePicks screenshot.
        </div>
      </div>
    </motion.div>
  );
}
