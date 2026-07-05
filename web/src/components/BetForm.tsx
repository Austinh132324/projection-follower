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
  ocrText,
}: {
  initial: BetDraft;
  title: string;
  onSave: (bet: Bet) => void;
  onClose: () => void;
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

  const canSave = draft.stake > 0 && draft.legs.some((l) => l.selection.trim());
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
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Book</label>
            <select value={draft.book} onChange={(e) => patch({ book: e.target.value as Book })}>
              {BOOK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {BOOK_LABELS[b]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Type</label>
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
          <label>League (for live ESPN stats &amp; prediction)</label>
          <select value={draft.league ?? ''} onChange={(e) => patch({ league: e.target.value || null })}>
            <option value="">— none —</option>
            {LEAGUES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Status</label>
          <div className="seg">
            {(['open', 'settled'] as BetStatus[]).map((s) => (
              <button key={s} className={draft.status === s ? 'on' : ''} onClick={() => patch({ status: s })}>
                {s === 'open' ? 'Open' : 'Settled'}
              </button>
            ))}
          </div>
        </div>

        {draft.status === 'settled' && (
          <div className="form-field">
            <label>Result</label>
            <div className="seg">
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
          </div>
        )}

        <div className="form-row">
          <div className="form-field">
            <label>Stake ($)</label>
            <input
              type="number"
              inputMode="decimal"
              value={draft.stake || ''}
              onChange={(e) => patch({ stake: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="form-field">
            <label>Odds (American)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="-110"
              value={draft.oddsAmerican ?? ''}
              onChange={(e) => patch({ oddsAmerican: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Payout if win ($)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder={String(projected)}
              value={draft.potentialPayout ?? ''}
              onChange={(e) =>
                patch({ potentialPayout: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </div>
          <div className="form-field">
            <label>Date placed</label>
            <input
              type="date"
              value={toDateInput(draft.placedAt)}
              onChange={(e) => patch({ placedAt: fromDateInput(e.target.value) })}
            />
          </div>
        </div>

        <div className="section-head" style={{ margin: '10px 2px 10px' }}>
          <h2 style={{ fontSize: 15 }}>Legs</h2>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>To win {money(projected)}</span>
        </div>

        {draft.legs.map((leg, i) => (
          <div className="leg-edit" key={i}>
            <div className="top">
              <span>Leg {i + 1}</span>
              {draft.legs.length > 1 && (
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => removeLeg(i)}>
                  <TrashIcon size={16} />
                </button>
              )}
            </div>
            <div className="form-field" style={{ marginBottom: 8 }}>
              <input
                className="mini"
                placeholder="Selection — e.g. Celtics -6.5"
                value={leg.selection}
                onChange={(e) => setLeg(i, { selection: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  className="mini"
                  placeholder="Event — Celtics vs Knicks"
                  value={leg.event}
                  onChange={(e) => setLeg(i, { event: e.target.value })}
                />
              </div>
              <div className="form-field" style={{ marginBottom: 0, maxWidth: 100 }}>
                <input
                  className="mini"
                  type="number"
                  placeholder="Odds"
                  value={leg.oddsAmerican ?? ''}
                  onChange={(e) =>
                    setLeg(i, { oddsAmerican: e.target.value === '' ? null : Number(e.target.value) })
                  }
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
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>What the scan read</summary>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0', fontSize: 12 }}>{ocrText}</pre>
          </details>
        )}

        <motion.button
          className="btn"
          style={{ marginTop: 20 }}
          disabled={!canSave}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSave(draftToBet(draft))}
        >
          Save bet
        </motion.button>
      </div>
    </motion.div>
  );
}
