import { DAY_NAMES, GRID_HOURS, WEEK_ORDER, timeZoneName } from '../../utils/availability';

const pad = (h) => `${String(h).padStart(2, '0')}:00`;

// Weekly calendar for mentors (spec 4.3): tap the hours you are usually free. Times are in the mentor's own time zone.
export default function AvailabilityPicker({ value, onChange, error }) {
  const set = new Set(value);
  const toggle = (key) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange([...next]);
  };
  const toggleDay = (day) => {
    const keys = GRID_HOURS.map((h) => `${day}-${h}`);
    const allOn = keys.every((k) => set.has(k));
    const next = new Set(set);
    keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
    onChange([...next]);
  };

  return (
    <fieldset>
      <legend className="block text-sm font-medium">Weekly availability</legend>
      <p className="text-xs text-ink-soft mt-0.5 mb-2">
        Tap the hours you are usually free for a 1-hour session. Times are in your time zone ({timeZoneName()}). {value.length} {value.length === 1 ? 'hour' : 'hours'} chosen.
      </p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-xs border-collapse select-none">
          <thead>
            <tr className="bg-paper">
              <th scope="col" className="w-12 p-1"><span className="sr-only">Time</span></th>
              {WEEK_ORDER.map((d) => (
                <th key={d} scope="col" className="p-0.5">
                  <button type="button" onClick={() => toggleDay(d)} className="w-full min-h-9 rounded font-semibold text-ink hover:bg-brand-soft" aria-label={`Select all of ${DAY_NAMES[d]}`}>
                    {DAY_NAMES[d].slice(0, 3)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRID_HOURS.map((h) => (
              <tr key={h}>
                <th scope="row" className="p-1 text-right font-medium text-ink-soft tabular-nums whitespace-nowrap">{pad(h)}</th>
                {WEEK_ORDER.map((d) => {
                  const key = `${d}-${h}`;
                  const on = set.has(key);
                  return (
                    <td key={key} className="p-0.5">
                      <button type="button" onClick={() => toggle(key)} aria-pressed={on}
                        aria-label={`${DAY_NAMES[d]} ${pad(h)} to ${pad(h + 1)}`}
                        className={`w-full h-7 rounded transition-colors ${on ? 'bg-brand hover:bg-brand-dark' : 'bg-brand-soft/60 hover:bg-brand-soft'}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-1 text-sm text-danger" role="alert">{error}</p>}
    </fieldset>
  );
}
