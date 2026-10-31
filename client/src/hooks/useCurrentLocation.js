import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentLocation } from '../lib/geolocation';

export function useCurrentLocation() {
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const requestLocation = useCallback(async () => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setLoading(true); setError('');
    try {
      const location = await getCurrentLocation();
      return mounted.current ? location : null;
    } catch (err) {
      if (mounted.current) setError(err.message);
      return null;
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  const clearError = useCallback(() => setError(''), []);
  return { requestLocation, loading, error, clearError };
}
