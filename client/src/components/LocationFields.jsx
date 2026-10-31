import React, { useEffect, useId, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

export default function LocationFields({ value, onChange, required = false, disabled = false, onPendingChange, hint }) {
  const id = useId();
  const { requestLocation, loading, error, clearError } = useCurrentLocation();
  const [accuracy, setAccuracy] = useState(null);
  const [detected, setDetected] = useState(false);
  useEffect(() => {
    onPendingChange?.(loading);
    return () => onPendingChange?.(false);
  }, [loading, onPendingChange]);
  const detect = async () => {
    setDetected(false);
    const location = await requestLocation();
    if (!location) return;
    onChange({ latitude: location.latitude, longitude: location.longitude });
    setAccuracy(location.accuracy); setDetected(true);
  };
  const edit = (field, next) => {
    clearError(); setDetected(false); setAccuracy(null);
    onChange({ ...value, [field]: next });
  };
  return <fieldset className="location-fields" disabled={disabled || loading} aria-busy={loading}>
    <legend>Location{required ? ' (required)' : ''}</legend>
    <button type="button" className="btn-outline location-detect" onClick={detect}>
      <LocateFixed size={17} aria-hidden="true" /> {loading ? 'Finding your location...' : 'Use my location'}
    </button>
    <p className="location-hint" id={id + '-hint'}>{hint || 'Allow location access to fill the coordinates, or enter them manually.'}</p>
    {loading && <p role="status" className="location-feedback">Waiting for your browser or device to provide a location...</p>}
    {error && <p role="alert" className="location-error">{error}</p>}
    {detected && <p role="status" className="location-success">Location detected{accuracy !== null ? ` (device accuracy approximately ${Math.max(1, Math.round(accuracy))} metres)` : ''}. Review the coordinates before saving.</p>}
    <div className="location-coordinates">
      {['latitude', 'longitude'].map(field => <div className="form-group" key={field}>
        <label className="form-label" htmlFor={id + '-' + field}>{field.toUpperCase()}</label>
        <input id={id + '-' + field} className="form-input" type="number" step="any"
          min={field === 'latitude' ? -90 : -180} max={field === 'latitude' ? 90 : 180}
          value={value[field]} onChange={e => edit(field, e.target.value)} required={required} aria-describedby={id + '-hint'} />
      </div>)}
    </div>
  </fieldset>;
}
