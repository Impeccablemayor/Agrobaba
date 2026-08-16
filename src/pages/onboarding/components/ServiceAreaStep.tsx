import type { TaxonomyOption } from '../../../types';
import { SingleTileSelect } from './SingleTileSelect';
import { OtherFreeTextInput } from './OtherFreeTextInput';

interface ServiceAreaStepProps {
  operatingAreaOptions: TaxonomyOption[];
  operatingArea: string | null;
  onOperatingAreaChange: (code: string) => void;
  areaDetails: string[];
  onAreaDetailsChange: (values: string[]) => void;
}

/** Single-select (how wide an area) + free-text-only chip list (which specific places) on
 *  one screen - a shape no other step needs, so it's a small bespoke composite rather than
 *  a third generic abstraction for one occurrence. */
export function ServiceAreaStep({
  operatingAreaOptions, operatingArea, onOperatingAreaChange, areaDetails, onAreaDetailsChange,
}: ServiceAreaStepProps) {
  return (
    <div>
      <h2 className="onboard-heading">Where do you provide services?</h2>
      <p className="onboard-subheading">Pick the one that fits best.</p>
      <SingleTileSelect options={operatingAreaOptions} selected={operatingArea} onChange={onOperatingAreaChange} />

      <label className="onboard-other-label">Specific towns, LGAs or states you serve (optional)</label>
      <OtherFreeTextInput values={areaDetails} onChange={onAreaDetailsChange} placeholder="e.g. Ibadan, Oyo State" />
    </div>
  );
}
