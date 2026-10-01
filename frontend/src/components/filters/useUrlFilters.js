import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Keeps filters in the page address (e.g. /opportunities?funding=fully_funded&region=East%20Africa),
// so a filtered search can be bookmarked or shared, and the back button works.
// The screen updates instantly; the address is updated right after.
//
// spec (define it OUTSIDE the component so it stays the same object):
//   { region: { type: 'list' }, sort: { type: 'value', default: 'deadline' }, q: { type: 'value' } }
function parse(spec, params) {
  return Object.fromEntries(Object.entries(spec).map(([key, s]) => {
    const raw = params.get(key);
    if (s.type === 'list') return [key, raw ? raw.split(',').filter(Boolean) : []];
    return [key, raw ?? s.default ?? ''];
  }));
}

export function useUrlFilters(spec) {
  const [params, setParams] = useSearchParams();
  const [values, setValues] = useState(() => parse(spec, params));
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Address changed from outside (back/forward button, a shared link): follow it.
  const paramsKey = params.toString();
  const lastWritten = useRef(paramsKey);
  useEffect(() => {
    if (paramsKey === lastWritten.current) return;
    lastWritten.current = paramsKey;
    setValues(parse(spec, new URLSearchParams(paramsKey)));
  }, [paramsKey, spec]);

  const update = useCallback((patch) => {
    const next = { ...valuesRef.current };
    for (const [key, v] of Object.entries(patch)) {
      const s = spec[key];
      next[key] = s.type === 'list' ? (v || []) : (v === '' || v == null ? s.default ?? '' : String(v));
    }
    valuesRef.current = next;
    setValues(next);

    const sp = new URLSearchParams(window.location.search);
    for (const [key, s] of Object.entries(spec)) {
      const v = next[key];
      const empty = s.type === 'list' ? v.length === 0 : v === '' || v === s.default;
      if (empty) sp.delete(key); else sp.set(key, s.type === 'list' ? v.join(',') : v);
    }
    lastWritten.current = sp.toString();
    setParams(sp, { replace: true });
  }, [setParams, spec]);

  const toggle = useCallback((key, value) => {
    const current = valuesRef.current[key];
    update({ [key]: current.includes(value) ? current.filter((x) => x !== value) : [...current, value] });
  }, [update]);

  // Clears every filter except sorting.
  const clearAll = useCallback(() => {
    update(Object.fromEntries(Object.entries(spec)
      .filter(([key]) => key !== 'sort')
      .map(([key, s]) => [key, s.type === 'list' ? [] : ''])));
  }, [spec, update]);

  const activeCount = Object.entries(spec).reduce((n, [key, s]) => {
    if (key === 'sort' || key === 'q') return n;
    const v = values[key];
    return n + (s.type === 'list' ? v.length : v && v !== s.default ? 1 : 0);
  }, 0);

  return { values, update, toggle, clearAll, activeCount };
}
