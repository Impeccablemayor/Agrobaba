import { useState, type KeyboardEvent } from 'react';

interface OtherFreeTextInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

/** Shared "chip list + add your own" control - the one place "Other / Add your own" is
 *  implemented, reused everywhere the wizard needs it (enterprise/product/service/need lists). */
export function OtherFreeTextInput({ values, onChange, placeholder = 'Add your own…' }: OtherFreeTextInputProps) {
  const [draft, setDraft] = useState('');

  function addDraft() {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDraft();
    }
  }

  return (
    <div>
      {values.length > 0 && (
        <div className="onboard-chiprow">
          {values.map((v) => (
            <span key={v} className="onboard-chip">
              {v}
              <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="onboard-addrow">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="btn-outline btn-sm btn-inline onboard-addbtn" onClick={addDraft}>
          <i className="fa-solid fa-plus"></i> Add
        </button>
      </div>
    </div>
  );
}
