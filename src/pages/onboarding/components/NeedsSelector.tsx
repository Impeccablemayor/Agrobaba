import type { Category } from '../../../types';
import { getSections } from '../../../lib/categories';
import { iconForCode } from '../optionIcons';
import { OtherFreeTextInput } from './OtherFreeTextInput';

interface NeedsSelectorProps {
  categories: Category[];
  selected: string[];
  onChange: (codes: string[]) => void;
  otherValues: string[];
  onOtherChange: (values: string[]) => void;
}

/** Buyer's "what do you usually buy" - maps directly onto the real top-level category sections,
 *  reusing the same getSections() helper the rest of the app uses. No separate taxonomy needed. */
export function NeedsSelector({ categories, selected, onChange, otherValues, onOtherChange }: NeedsSelectorProps) {
  const sections = getSections(categories).filter((s) => s.code !== 'waste' && s.code !== 'uncategorized');

  function toggle(code: string) {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  }

  return (
    <div>
      <h2 className="onboard-heading">What do you usually buy?</h2>
      <p className="onboard-subheading">Select everything that applies.</p>
      <div className="onboard-tilegrid">
        {sections.map((s) => {
          const isSelected = selected.includes(s.code);
          return (
            <div
              key={s.id}
              className={`onboard-tile ${isSelected ? 'selected' : ''}`}
              onClick={() => toggle(s.code)}
            >
              <span className="onboard-tile-check"><i className="fa-solid fa-check"></i></span>
              <span className="onboard-tile-icon"><i className={`fa-solid ${iconForCode(s.code)}`}></i></span>
              <span className="onboard-tile-label">{s.name}</span>
            </div>
          );
        })}
      </div>
      <label className="onboard-other-label">Anything else? Add it here</label>
      <OtherFreeTextInput values={otherValues} onChange={onOtherChange} />
    </div>
  );
}
