import type { TaxonomyOption } from '../../../types';

interface SingleTileSelectProps {
  options: TaxonomyOption[];
  selected: string | null;
  onChange: (code: string) => void;
}

/** Bare single-select tile grid - no icons, no "Other". Used for closed-vocabulary questions
 *  (purchase scale/frequency, sourcing area, fulfillment) where the choices are operational,
 *  not domain topics, so a plain text tile reads better than an icon guess. */
export function SingleTileSelect({ options, selected, onChange }: SingleTileSelectProps) {
  return (
    <div className="onboard-singlegrid">
      {options.map((opt) => (
        <div
          key={opt.code}
          className={`onboard-tile ${selected === opt.code ? 'selected' : ''}`}
          onClick={() => onChange(opt.code)}
        >
          <span className="onboard-tile-check"><i className="fa-solid fa-check"></i></span>
          <span className="onboard-tile-label">{opt.label}</span>
        </div>
      ))}
    </div>
  );
}
