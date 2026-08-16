import type { TaxonomyOption } from '../../../types';
import { TileMultiSelect } from './TileMultiSelect';

interface TileMultiSelectStepProps {
  title: string;
  subtitle: string;
  options: TaxonomyOption[];
  selected: string[];
  onChange: (codes: string[]) => void;
  showIcons?: boolean;
}

/** Heading + plain multi-select tile grid, no "Other" input - for closed-vocabulary multi-select
 *  questions (buying preferences, equipment/service intent) where free text doesn't apply.
 *  Reused across both rather than two near-identical wrapper components. */
export function TileMultiSelectStep({ title, subtitle, options, selected, onChange, showIcons }: TileMultiSelectStepProps) {
  return (
    <div>
      <h2 className="onboard-heading">{title}</h2>
      <p className="onboard-subheading">{subtitle}</p>
      <TileMultiSelect options={options} selected={selected} onChange={onChange} showIcons={showIcons} />
    </div>
  );
}
