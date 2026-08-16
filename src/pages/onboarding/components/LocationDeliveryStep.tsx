import type { TaxonomyOption } from '../../../types';
import { SingleTileSelect } from './SingleTileSelect';

interface LocationDeliveryStepProps {
  sourcingOptions: TaxonomyOption[];
  sourcingArea: string | null;
  onSourcingChange: (code: string) => void;
  fulfillmentOptions: TaxonomyOption[];
  fulfillment: string | null;
  onFulfillmentChange: (code: string) => void;
}

export function LocationDeliveryStep({
  sourcingOptions, sourcingArea, onSourcingChange, fulfillmentOptions, fulfillment, onFulfillmentChange,
}: LocationDeliveryStepProps) {
  return (
    <div>
      <h2 className="onboard-heading">Where should we source from, and how?</h2>
      <p className="onboard-subheading">Preferred sourcing area</p>
      <SingleTileSelect options={sourcingOptions} selected={sourcingArea} onChange={onSourcingChange} />

      <p className="onboard-subheading" style={{ marginTop: 24 }}>Preferred fulfillment</p>
      <SingleTileSelect options={fulfillmentOptions} selected={fulfillment} onChange={onFulfillmentChange} />

      <div className="onboard-note" style={{ marginTop: 20 }}>
        <i className="fa-solid fa-circle-info"></i>
        <span>These preferences influence ranking and recommendations — they never stop you from searching the full marketplace.</span>
      </div>
    </div>
  );
}
