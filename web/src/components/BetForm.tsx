import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Bet, Book, BetType, BetStatus, BetResult } from '../types';
import { BOOK_LABELS, BET_TYPE_LABELS } from '../types';
import {
  type BetDraft,
  type DraftLeg,
  draftToBet,
  computePotentialPayout,
  BOOK_OPTIONS,
  BET_TYPES,
  RESULT_OPTIONS,
} from '../betDraft';
import { LEAGUES } from '../espn';
import { money } from '../stats';
import { CloseIcon, TrashIcon } from './icons';
import { OddsInput } from './OddsInput';

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
function fromDateInput(v: string): string {
  return new Date(`${v}T12:00:00Z`).toISOString();
}

export function BetForm({
  initial,
  title,
  onSave,
  onClose,
  onSkip,
  stepLabel,
  ocrText,
}: {
  initial: BetDraft;
  title: string;
  onSave: (bet: Bet) => void;
  onClose: () => void;
  onSkip?: () => void;
  stepLabel?: string;
  ocrText?: string;
}) {
  const [draft, setDraft] = useState<BetDraft>(initial);
  const patch = (p: Partial<BetDraft>) => setDraft((d) => ({ ...d, ...p }));

  const setLeg = (i: number, p: Partial<DraftLeg>) =>
    setDraft((d) => ({ ...d, legs: d.legs.map((l, idx) => (idx === i ? { ...l, ...p } : l)) }));
  const addLeg = () =>
    setDraft((d) => ({
      ...d,
      legs: [...d.legs, { selection: '', market: '', event: '', oddsAmerican: null, result: null }],
      betType: d.legs.length >= 1 && d.betType === 'single' ? 'parlay' : d.betType,
    }));
  const removeLeg = (i: number) =>
    setDraft((d) => ({ ...d, legs: d.legs.filter((_, idx) => idx !== i) }));

  const canSave =
    draft.legs.some((l) => l.selection.trim()) &&
    (draft.stake > 0 || (draft.potentialPayout ?? 0) > 0);
  const projected = computePotentialPayout(draft);

  return (
    <motion.div
      className="modal"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <div>
            {stepLabel && <div className="eyebrow" style={{ marginBottom: 2 }}>{stepLabel}</div>}
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="form-row">
          <div className="form-field">
            <select value={draft.book} onChange={(e) => patch({ book: e.target.value as Book })}>
              {BOOK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {BOOK_LABELS[b]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <select value={draft.betType} onChange={(e) => patch({ betType: e.target.value as BetType })}>
              {BET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BET_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <select value={draft.league ?? ''} onChange={(e) => patch({ league: e.target.value || null })}>
            <option value="">League — optional</option>
            {LEAGUES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="seg">
          {(['open', 'settled'] as BetStatus[]).map((s) => (
            <button key={s} className={draft.status === s ? 'on' : ''} onClick={() => patch({ status: s })}>
              {s === 'open' ? 'Open' : 'Settled'}
            </button>
          ))}
        </div>

        {draft.status === 'settled' && (
          <div className="seg" style={{ marginTop: 12 }}>
            {RESULT_OPTIONS.map((r) => (
              <button
                key={r}
                className={draft.result === r ? 'on' : ''}
                onClick={() => patch({ result: r as BetResult })}
              >
                {r[0]!.toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        )}

        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-field">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Stake $"
              value={draft.stake || ''}
              onChange={(e) => patch({ stake: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="form-field">
            <OddsInput value={draft.oddsAmerican} onChange={(n) => patch({ oddsAmerican: n })} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <input
              type="number"
              inputMode="decimal"
              placeholder={`Payout $${projected}`}
              value={draft.potentialPayout ?? ''}
              onChange={(e) =>
                patch({ potentialPayout: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </div>
          <div className="form-field">
            <input
              type="date"
              value={toDateInput(draft.placedAt)}
              onChange={(e) => patch({ placedAt: fromDateInput(e.target.value) })}
            />
          </div>
        </div>

        <div className="section-head" style={{ margin: '8px 2px 10px' }}>
          <h2 style={{ fontSize: 15 }}>Legs</h2>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>To win {money(projected)}</span>
        </div>

        {draft.legs.map((leg, i) => (
          <div className="leg-edit" key={i}>
            {draft.legs.length > 1 && (
              <div className="top">
                <span>{i + 1}</span>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => removeLeg(i)}>
                  <TrashIcon size={16} />
                </button>
              </div>
            )}
            <div className="form-field" style={{ marginBottom: 8 }}>
              <input
                className="mini"
                placeholder="Selection"
                value={leg.selection}
                onChange={(e) => setLeg(i, { selection: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  className="mini"
                  placeholder="Matchup"
                  value={leg.event}
                  onChange={(e) => setLeg(i, { event: e.target.value })}
                />
              </div>
              <div className="form-field" style={{ marginBottom: 0, maxWidth: 132 }}>
                <OddsInput
                  value={leg.oddsAmerican}
                  onChange={(n) => setLeg(i, { oddsAmerican: n })}
                />
              </div>
            </div>
          </div>
        ))}

        <button className="add-leg" onClick={addLeg}>
          + Add leg
        </button>

        {ocrText && (
          <details className="note" style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Scanned text</summary>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                margin: '8px 0 0',
                fontSize: 12,
              }}
            >
              {ocrText}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {onSkip && (
            <motion.button className="btn secondary" style={{ flex: '0 0 34%' }} whileTap={{ scale: 0.97 }} onClick={onSkip}>
              Skip
            </motion.button>
          )}
          <motion.button
            className="btn"
            style={{ flex: 1 }}
            disabled={!canSave}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSave(draftToBet(draft))}
          >
            Save
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
