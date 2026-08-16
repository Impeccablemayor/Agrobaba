import { useMemo } from 'react';
import type { Category } from '../../../types';
import { getChildren } from '../../../lib/categories';
import { OtherFreeTextInput } from './OtherFreeTextInput';

interface SpecializationSelectorProps {
  categories: Category[];
  /** Real Category.code values implied by whatever was picked in the previous GroupSelector step. */
  groupCategoryCodes: string[];
  selected: string[];
  onChange: (codes: string[]) => void;
  otherValues: string[];
  onOtherChange: (values: string[]) => void;
}

/** Generic Category drill-down: for each category implied by the prior step, shows its children
 *  as selectable options (or the category itself if it has none) + "Other" free text. Reused for
 *  farmer specializations, dealer products, and provider services - only groupCategoryCodes differs. */
export function SpecializationSelector({
  categories, groupCategoryCodes, selected, onChange, otherValues, onOtherChange,
}: SpecializationSelectorProps) {
  const options = useMemo(() => {
    const matched = categories.filter((c) => groupCategoryCodes.includes(c.code));
    const seen = new Set<string>();
    const result: Category[] = [];
    for (const m of matched) {
      const children = getChildren(categories, m.id);
      const candidates = children.length > 0 ? children : [m];
      for (const c of candidates) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          result.push(c);
        }
      }
    }
    return result;
  }, [categories, groupCategoryCodes]);

  function toggle(code: string) {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  }

  return (
    <div>
      <h2 className="onboard-heading">Get specific</h2>
      <p className="onboard-subheading">Select everything that applies — you can pick more than one.</p>
      {options.length > 0 && (
        <div className="onboard-tilegrid">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.code);
            return (
              <div
                key={opt.id}
                className={`onboard-tile ${isSelected ? 'selected' : ''}`}
                onClick={() => toggle(opt.code)}
              >
                <span className="onboard-tile-check"><i className="fa-solid fa-check"></i></span>
                <span className="onboard-tile-label">{opt.name}</span>
              </div>
            );
          })}
        </div>
      )}
      {options.length === 0 && (
        <div className="onboard-note">
          <i className="fa-solid fa-circle-info"></i>
          <span>Nothing pre-listed for that yet — tell us below and we'll use it.</span>
        </div>
      )}
      <label className="onboard-other-label">Not listed? Add your own</label>
      <OtherFreeTextInput values={otherValues} onChange={onOtherChange} placeholder="e.g. Grasscutter" />
    </div>
  );
}
