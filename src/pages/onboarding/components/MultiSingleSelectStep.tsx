import type { TaxonomyOption } from '../../../types';
import { SingleTileSelect } from './SingleTileSelect';

export interface SingleSelectQuestion {
  label: string;
  options: TaxonomyOption[];
  selected: string | null;
  onChange: (code: string) => void;
}

interface MultiSingleSelectStepProps {
  title: string;
  subtitle: string;
  questions: SingleSelectQuestion[];
  note?: string;
}

/** Heading + N single-select tile blocks, each with its own sub-label - the generic form of
 *  what ScaleFrequencyStep/LocationDeliveryStep hand-built for buyers (2 questions each).
 *  Used here for dealer's 4-question restocking screen and 2-question location screen; not
 *  retrofitted onto the buyer components, which are already working and already verified. */
export function MultiSingleSelectStep({ title, subtitle, questions, note }: MultiSingleSelectStepProps) {
  return (
    <div>
      <h2 className="onboard-heading">{title}</h2>
      <p className="onboard-subheading">{subtitle}</p>
      {questions.map((q, i) => (
        <div key={q.label} style={i > 0 ? { marginTop: 24 } : undefined}>
          <p className="onboard-subheading" style={{ marginBottom: 10 }}>{q.label}</p>
          <SingleTileSelect options={q.options} selected={q.selected} onChange={q.onChange} />
        </div>
      ))}
      {note && (
        <div className="onboard-note" style={{ marginTop: 20 }}>
          <i className="fa-solid fa-circle-info"></i>
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}
