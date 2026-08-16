import type { TaxonomyOption } from '../../../types';
import { SingleTileSelect } from './SingleTileSelect';

interface SingleTileSelectStepProps {
  title: string;
  subtitle: string;
  options: TaxonomyOption[];
  selected: string | null;
  onChange: (code: string) => void;
}

/** Heading + one single-select tile block - a smaller sibling of the dual-question
 *  ScaleFrequencyStep/LocationDeliveryStep, for standalone single-select questions
 *  (farm scale). */
export function SingleTileSelectStep({ title, subtitle, options, selected, onChange }: SingleTileSelectStepProps) {
  return (
    <div>
      <h2 className="onboard-heading">{title}</h2>
      <p className="onboard-subheading">{subtitle}</p>
      <SingleTileSelect options={options} selected={selected} onChange={onChange} />
    </div>
  );
}
