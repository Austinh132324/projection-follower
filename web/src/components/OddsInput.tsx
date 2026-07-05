import { useState } from 'react';

/**
 * American-odds input with a −/+ sign toggle (the field itself is magnitude
 * only). Defaults to − since most odds are negative. Emits a signed number, or
 * null when empty.
 */
export function OddsInput({
  value,
  onChange,
  placeholder = 'Odds',
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
}) {
  const [sign, setSign] = useState<1 | -1>(value != null && value > 0 ? 1 : -1);
  const mag = value == null ? '' : String(Math.abs(value));

  const applySign = (s: 1 | -1) => {
    setSign(s);
    if (value != null) onChange(s * Math.abs(value));
  };
  const applyMag = (str: string) => {
    if (str === '') return onChange(null);
    onChange(sign * Math.abs(Number(str)));
  };

  return (
    <div className="odds-input">
      <div className="sign-seg">
        <button type="button" className={sign < 0 ? 'on' : ''} onClick={() => applySign(-1)}>
          −
        </button>
        <button type="button" className={sign > 0 ? 'on' : ''} onClick={() => applySign(1)}>
          +
        </button>
      </div>
      <input
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        value={mag}
        onChange={(e) => applyMag(e.target.value)}
      />
    </div>
  );
}
