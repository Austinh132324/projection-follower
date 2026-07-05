import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Bet } from '../types';
import { tesseractParser } from '../ocr';
import type { BetDraft } from '../betDraft';
import { BetForm } from './BetForm';
import { CloseIcon } from './icons';
import { ScanStatus, type ScanState } from './ScanStatus';

interface Item {
  url: string;
  state: ScanState;
  count: number;
}

/**
 * Batch photo import: scans one or more picked images (each may contain several
 * bets, e.g. a "My Bets" list), showing an animated status per image — a
 * gradient spinner that resolves to a green check (bets found) or red X — then
 * steps through every found bet for you to confirm.
 */
export function PhotoImport({
  files,
  onSave,
  onClose,
}: {
  files: File[];
  onSave: (bet: Bet) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    files.map((f) => ({ url: URL.createObjectURL(f), state: 'pending', count: 0 })),
  );
  const [phase, setPhase] = useState<'scanning' | 'review' | 'empty'>('scanning');
  const [drafts, setDrafts] = useState<BetDraft[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const collected: BetDraft[] = [];
      for (let i = 0; i < files.length; i++) {
        setItems((s) => s.map((it, idx) => (idx === i ? { ...it, state: 'scanning' } : it)));
        try {
          const res = await tesseractParser.parse(files[i]!);
          const found = res.drafts.filter((d) => d.legs.some((l) => l.selection.trim()));
          collected.push(...found);
          setItems((s) =>
            s.map((it, idx) => (idx === i ? { ...it, state: found.length ? 'ok' : 'fail', count: found.length } : it)),
          );
        } catch {
          setItems((s) => s.map((it, idx) => (idx === i ? { ...it, state: 'fail' } : it)));
        }
      }
      setDrafts(collected);
      await new Promise((r) => setTimeout(r, 650)); // let the last check animate
      setPhase(collected.length ? 'review' : 'empty');
    })();
  }, [files]);

  const next = () => {
    if (reviewIdx + 1 < drafts.length) setReviewIdx((i) => i + 1);
    else onClose();
  };

  if (phase === 'review' && drafts[reviewIdx]) {
    return (
      <BetForm
        key={reviewIdx}
        initial={drafts[reviewIdx]!}
        title="Review bet"
        stepLabel={drafts.length > 1 ? `Bet ${reviewIdx + 1} of ${drafts.length}` : undefined}
        onSave={(bet) => {
          onSave(bet);
          next();
        }}
        onSkip={drafts.length > 1 ? next : undefined}
        onClose={onClose}
        ocrText={drafts[reviewIdx]!.rawText as string | undefined}
      />
    );
  }

  const total = items.reduce((n, it) => n + it.count, 0);

  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="modal-inner">
        <div className="modal-head">
          <h2>{phase === 'scanning' ? 'Scanning…' : 'Scan complete'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {items.map((it, i) => (
          <div className="scan-item" key={i}>
            <img className="scan-thumb" src={it.url} alt={`photo ${i + 1}`} />
            <div className="meta">
              <div className="t">Photo {i + 1}</div>
              <div className="d">
                {it.state === 'pending' && 'Waiting…'}
                {it.state === 'scanning' && 'Reading on device…'}
                {it.state === 'ok' && `${it.count} bet${it.count === 1 ? '' : 's'} found`}
                {it.state === 'fail' && "Couldn't read a bet"}
              </div>
            </div>
            <ScanStatus state={it.state} />
          </div>
        ))}

        {phase === 'empty' && (
          <div className="note" style={{ marginTop: 16 }}>
            No bets could be read. Try a fuller, clearer screenshot — or add it manually.
          </div>
        )}

        {phase === 'review' && total === 0 && <div className="spinner" />}
      </div>
    </motion.div>
  );
}
