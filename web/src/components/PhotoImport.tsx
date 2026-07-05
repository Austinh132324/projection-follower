import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Bet } from '../types';
import { tesseractParser } from '../ocr';
import type { BetDraft } from '../betDraft';
import { BetForm } from './BetForm';
import { CloseIcon } from './icons';

type Phase = 'pick' | 'reading' | 'review' | 'error';

export function PhotoImport({ onSave, onClose }: { onSave: (bet: Bet) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<BetDraft | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Open the picker immediately when the flow starts.
  useEffect(() => {
    inputRef.current?.click();
  }, []);

  const onFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setPhase('reading');
    setProgress(0);
    try {
      const result = await tesseractParser.parse(file, setProgress);
      setDraft(result.draft);
      setOcrText(result.text);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the photo');
      setPhase('error');
    }
  };

  if (phase === 'review' && draft) {
    return <BetForm initial={draft} title="Review scanned bet" onSave={onSave} onClose={onClose} ocrText={ocrText} />;
  }

  return (
    <motion.div
      className="modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2>Scan a bet</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            else if (phase === 'pick') onClose();
          }}
        />

        {preview && <img className="ocr-preview" src={preview} alt="bet slip" />}

        {phase === 'pick' && (
          <div className="ocr-status">
            <div className="spinner" />
            <p className="screen-sub">Opening your photos…</p>
            <button className="btn secondary" style={{ marginTop: 16 }} onClick={() => inputRef.current?.click()}>
              Choose a photo
            </button>
          </div>
        )}

        {phase === 'reading' && (
          <div className="ocr-status">
            <div className="gauge" style={{ justifyContent: 'center' }}>
              <span className="big">{Math.round(progress * 100)}%</span>
            </div>
            <div className="meter" style={{ maxWidth: 260, margin: '0 auto' }}>
              <motion.div
                className="meter-fill"
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ ease: 'linear' }}
              />
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
            <button className="btn secondary" onClick={() => inputRef.current?.click()}>
              Try another photo
            </button>
          </div>
        )}

        <div className="note" style={{ marginTop: 20 }}>
          On-device OCR reads clear bet-slip screenshots best. It pre-fills the form — you confirm
          before saving. Nothing leaves your device.
        </div>
      </div>
    </motion.div>
  );
}
