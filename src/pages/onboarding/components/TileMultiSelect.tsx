import type { TaxonomyOption } from '../../../types';
import { iconForCode } from '../optionIcons';

interface TileMultiSelectProps {
  options: TaxonomyOption[];
  selected: string[];
  onChange: (codes: string[]) => void;
  showIcons?: boolean;
}

/** Bare multi-select tile grid - no "Other" input, no heading. The shared rendering behind
 *  GroupSelector (which adds Other + copy) and any screen that just needs plain multi-select
 *  tiles (buying preferences, equipment/service intent). */
export function TileMultiSelect({ options, selected, onChange, showIcons = true }: TileMultiSelectProps) {
  function toggle(code: string) {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  }

  return (
    <div className="onboard-tilegrid">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.code);
        return (
          <div
            key={opt.code}
            className={`onboard-tile ${isSelected ? 'selected' : ''}`}
            onClick={() => toggle(opt.code)}
          >
            <span className="onboard-tile-check"><i className="fa-solid fa-check"></i></span>
            {showIcons && (
              <span className="onboard-tile-icon"><i className={`fa-solid ${iconForCode(opt.code)}`}></i></span>
            )}
            <span className="onboard-tile-label">{opt.label}</span>
          </div>
        );
      })}
    </div>
  );
}
