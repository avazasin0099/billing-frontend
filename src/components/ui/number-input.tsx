import * as React from 'react';

export type NumberInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * A drop-in <input type="number"> that keeps its own text while the user types.
 *
 * Parents usually do `onChange={(e) => setX(Number(e.target.value))}`, which turns an
 * emptied field back into "0" immediately, so the 0 can't be removed and new digits get
 * mixed with it. Here the displayed text is only re-synced from `value` when the numbers
 * actually differ, so the field can be cleared, and leading zeros are dropped ("056" -> "56").
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, onFocus, onBlur, ...props }, ref) => {
    const toText = (v: unknown) => (v === undefined || v === null ? '' : String(v));
    const [text, setText] = React.useState(() => toText(value));

    // After every render, make sure the text matches the parent's number. This runs even when
    // `value` didn't change, e.g. the parent clamps to a max (6) and the user typed "67".
    // Number('') === 0, so an emptied field stays empty while the parent holds 0.
    React.useEffect(() => {
      if (value === undefined) return; // uncontrolled usage
      if (Number(text) !== Number(value)) setText(toText(value));
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      // Strip leading zeros, but keep "0" and "0.x".
      if (/^-?0\d/.test(raw)) {
        raw = raw.replace(/^(-?)0+(?=\d)/, '$1');
        e.target.value = raw;
      }
      setText(raw);
      onChange?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select the content so typing replaces a default 0 instead of appending to it.
      e.target.select();
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // When left empty, show what the parent actually stored (usually 0).
      if (text === '') setText(toText(value));
      onBlur?.(e);
    };

    return (
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        {...props}
      />
    );
  }
);
NumberInput.displayName = 'NumberInput';
