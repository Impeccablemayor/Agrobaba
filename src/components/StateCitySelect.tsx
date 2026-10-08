import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { api } from '../lib/api';
import {
  createLocationSelect,
  type LocationPrefill,
  type LocationSelect,
  type LocationSelectSnapshot,
} from '../lib/locationSelect';
import { type LocationOption, type LocationSelection } from '../lib/locations';

/** The catalogue endpoints live here (not in lib/locations) so the pure helper module stays
 *  loadable under `node --test`, which cannot evaluate Vite's `import.meta.env`. */
const fetchStates = () => api.get<LocationOption[]>('/api/states');
const fetchCities = (stateId: number) => api.get<LocationOption[]>(`/api/states/${stateId}/cities`);

interface StateCitySelectProps {
  /** Prefix for the control ids, e.g. "checkout" -> checkout-state / checkout-city. */
  idPrefix: string;
  /** Prefill from the user's existing profile; applied once the state catalogue loads. */
  initial?: LocationPrefill;
  /** Reports every selection change (after mount), so the parent can build payloads. */
  onChange?: (selection: LocationSelection) => void;
  required?: boolean;
  disabled?: boolean;
  /** Labelled block class: "form-group" (register, post listing) or "field" (checkout, account). */
  fieldClassName?: string;
  /** Grid cell class shared by both controls, e.g. "col-md-6". Omit when the fields sit free in their column. */
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  stateLabel?: string;
  cityLabel?: string;
  statePlaceholder?: string;
  cityPlaceholder?: string;
}

function FieldNote({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <p style={{ fontSize: 12, color: 'var(--danger)', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span>{error}</span>
      <button type="button" className="btn-outline btn-sm btn-inline" onClick={onRetry}>
        <i className="fa-solid fa-rotate-right"></i> Retry
      </button>
    </p>
  );
}

export function StateCitySelect({
  idPrefix,
  initial,
  onChange,
  required,
  disabled,
  fieldClassName = 'field',
  wrapperClassName,
  wrapperStyle,
  stateLabel = 'State',
  cityLabel = 'City / Town',
  statePlaceholder = 'Select a state…',
  cityPlaceholder = 'Select a city…',
}: StateCitySelectProps) {
  const controllerRef = useRef<LocationSelect | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createLocationSelect({
      fetchStates,
      fetchCities,
      prefill: initial,
    });
  }
  const controller = controllerRef.current;
  const snapshot: LocationSelectSnapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => {
    controller.loadStates();
  }, [controller]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  // Skip the mount notification: the parent usually seeds its own state from the same prefill,
  // and re-reporting it (possibly an empty selection before states load) would clobber that.
  const firstReport = useRef(true);
  useEffect(() => {
    if (firstReport.current) {
      firstReport.current = false;
      return;
    }
    onChangeRef.current?.(snapshot.selection);
  }, [snapshot.selection]);

  const { selection } = snapshot;
  const stateId = selection.stateId;
  const statesLoading = snapshot.statesStatus === 'loading';
  const statesFailed = snapshot.statesStatus === 'error';
  const citiesLoading = snapshot.citiesStatus === 'loading';
  const citiesFailed = snapshot.citiesStatus === 'error';
  const asterisk = required ? <span style={{ color: 'var(--danger)' }}> *</span> : null;

  function wrap(children: React.ReactNode) {
    if (wrapperClassName === undefined && wrapperStyle === undefined) return children;
    return <div className={wrapperClassName} style={wrapperStyle}>{children}</div>;
  }

  return (
    <>
      {wrap(
        <div className={fieldClassName}>
          <label htmlFor={`${idPrefix}-state`}>{stateLabel}{asterisk}</label>
          <select
            id={`${idPrefix}-state`}
            required={required}
            disabled={disabled || statesLoading || statesFailed}
            value={stateId ?? ''}
            onChange={(e) => controller.selectState(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">
              {statesFailed ? 'Could not load states' : statesLoading ? 'Loading states…' : statePlaceholder}
            </option>
            {snapshot.states.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {statesFailed && (
            <FieldNote error={snapshot.statesError} onRetry={() => controller.loadStates()} />
          )}
        </div>,
      )}
      {wrap(
        <div className={fieldClassName}>
          <label htmlFor={`${idPrefix}-city`}>{cityLabel}{asterisk}</label>
          <select
            id={`${idPrefix}-city`}
            required={required}
            disabled={disabled || stateId === null || citiesLoading || citiesFailed}
            value={selection.cityId ?? ''}
            onChange={(e) => controller.selectCity(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">
              {citiesFailed
                ? 'Could not load cities'
                : citiesLoading
                  ? 'Loading cities…'
                  : stateId === null
                    ? 'Select a state first'
                    : cityPlaceholder}
            </option>
            {snapshot.cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {citiesFailed && stateId !== null && (
            <FieldNote
              error={snapshot.citiesError}
              onRetry={() => controller.selectState(stateId)}
            />
          )}
        </div>,
      )}
    </>
  );
}
