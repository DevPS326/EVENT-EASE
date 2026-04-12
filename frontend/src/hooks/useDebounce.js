import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after
 * the component has not received a new value for `delay` ms.
 *
 * @param {*}      value - The value to debounce
 * @param {number} delay - Debounce delay in milliseconds (default 500)
 */
const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
