import type { TaxonomyOption } from '../../../types';
import { TileMultiSelect } from './TileMultiSelect';
import { OtherFreeTextInput } from './OtherFreeTextInput';

interface GroupSelectorProps {
  title: string;
  subtitle: string;
  options: TaxonomyOption[];
  selected: string[];
  onChange: (codes: string[]) => void;
  otherValues: string[];
  onOtherChange: (values: string[]) => void;
  otherPlaceholder?: string;
}

/** Generic multi-select over TaxonomyOption[] + "Other" free text. Reused for farmer enterprises,
 *  agro-dealer product types, service-provider service types, buyer types, and buying purpose -
 *  only the options/copy differ. Composes TileMultiSelect (the bare grid) + OtherFreeTextInput. */
export function GroupSelector({
  title, subtitle, options, selected, onChange, otherValues, onOtherChange, otherPlaceholder,
}: GroupSelectorProps) {
  return (
    <div>
      <h2 className="onboard-heading">{title}</h2>
      <p className="onboard-subheading">{subtitle}</p>
      <TileMultiSelect options={options} selected={selected} onChange={onChange} />
      <label className="onboard-other-label">Not listed? Add your own</label>
      <OtherFreeTextInput values={otherValues} onChange={onOtherChange} placeholder={otherPlaceholder} />
    </div>
  );
}
