import type { TaxonomyOption } from '../../../types';
import { SingleTileSelect } from './SingleTileSelect';

interface ScaleFrequencyStepProps {
  scaleOptions: TaxonomyOption[];
  scale: string | null;
  onScaleChange: (code: string) => void;
  frequencyOptions: TaxonomyOption[];
  frequency: string | null;
  onFrequencyChange: (code: string) => void;
}

export function ScaleFrequencyStep({
  scaleOptions, scale, onScaleChange, frequencyOptions, frequency, onFrequencyChange,
}: ScaleFrequencyStepProps) {
  return (
    <div>
      <h2 className="onboard-heading">How do you usually buy?</h2>
      <p className="onboard-subheading">Purchase scale</p>
      <SingleTileSelect options={scaleOptions} selected={scale} onChange={onScaleChange} />

      <p className="onboard-subheading" style={{ marginTop: 24 }}>How often do you usually buy?</p>
      <SingleTileSelect options={frequencyOptions} selected={frequency} onChange={onFrequencyChange} />
    </div>
  );
}
