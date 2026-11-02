import { api } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle2, LocateFixed, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import LocationFields from '../components/LocationFields';
import { addLocationToQuery, coordinatesFromPoint } from '../lib/geolocation';

function SearchMapView({ latitude, longitude, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView([latitude, longitude], zoom); }, [map, latitude, longitude, zoom]);
  return null;
}

// custom markers for the map
const createCustomIcon = (type, label) => {
  let bgColor = '#e63946';
  let innerIcon = '🩸';

  if (type === 'clinic') {
    bgColor = '#10b981';
    innerIcon = '🏥';
  } else if (type === 'center') {
    bgColor = '#3b82f6';
    innerIcon = '🏢';
  }

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        background: white;
        padding: 4px 10px;
        border-radius: 20px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.18);
        border: 2px solid ${bgColor};
        font-family: inherit;
        font-weight: 700;
        font-size: 11px;
        color: #1e293b;
        white-space: nowrap;
        transform: translate(-50%, -100%);
      ">
        <span style="
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${bgColor};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 6px;
          font-size: 10px;
        ">${innerIcon}</span>
        ${label}
      </div>
    `,
    iconSize: [120, 30],
    iconAnchor: [60, 30]
  });
};

export default function NearbyCampsPage() {
  const { user, role } = useAuth();
  const [distanceFilter, setDistanceFilter] = useState('50');
  const [timeFilter, setTimeFilter] = useState('weekend');
  const [bloodFilter, setBloodFilter] = useState('All');
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [registeredCampIds, setRegisteredCampIds] = useState([]);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [detectedLocation, setDetectedLocation] = useState(null);
  const { requestLocation, loading: locating, error: locationError, clearError } = useCurrentLocation();
  const savedLocation = coordinatesFromPoint(user.location);
  const canHost = role === 'hospital' || role === 'ngo';
  const [showHostForm, setShowHostForm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [newCamp, setNewCamp] = useState({ title: '', date: '', endDate: '', address: user.address || '', capacity: 100 });
  const [campLocation, setCampLocation] = useState({ latitude: savedLocation?.latitude ?? '', longitude: savedLocation?.longitude ?? '' });
  const origin = detectedLocation || savedLocation;
  const latitude = origin?.latitude;
  const longitude = origin?.longitude;
  const mapCenter = origin ? [latitude, longitude] : camps[0]?.location
    ? [camps[0].location.coordinates[1], camps[0].location.coordinates[0]] : [20.5937, 78.9629];
  const mapZoom = origin || camps.length ? 13 : 4;
  const detectLocation = async () => {
    const location = await requestLocation();
    if (location) {
      if (location.latitude !== latitude || location.longitude !== longitude) setLoading(true);
      setDetectedLocation(location);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    const query = addLocationToQuery(new URLSearchParams({ radiusKm: distanceFilter, bloodType: bloodFilter.split(' ')[0] }),
      latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null);
    api('/camps?' + query, { signal: controller.signal }).then(data => {
      setError(''); setCamps(data); setRegisteredCampIds(data.filter(c => c.myRegistration).map(c => c._id));
    }).catch(err => { if (!controller.signal.aborted) { setCamps([]); setError(err.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [distanceFilter, bloodFilter, latitude, longitude, reloadKey]);
  const handleHostCamp = async e => {
    e.preventDefault();
    try {
      await api('/camps', { method: 'POST', body: {
        title: newCamp.title, address: newCamp.address, capacity: Number(newCamp.capacity),
        date: new Date(newCamp.date).toISOString(), endDate: new Date(newCamp.endDate).toISOString(),
        latitude: Number(campLocation.latitude), longitude: Number(campLocation.longitude)
      } });
      setRegistrationSuccessMsg('Camp "' + newCamp.title + '" created');
      setNewCamp({ title: '', date: '', endDate: '', address: user.address || '', capacity: 100 });
      setShowHostForm(false); setError(''); setReloadKey(k => k + 1);
    } catch (err) { setError(err.message); }
  };
  const updateCamp = (field, value) => setNewCamp(prev => ({ ...prev, [field]: value }));
  const handleRegisterSlot = async e => {
    e.preventDefault();
    if (!selectedCamp) return;
    try {
      await api('/camps/' + selectedCamp._id + '/register', { method: 'POST', body: { timeSlot: selectedSlot } });
      setRegisteredCampIds(prev => [...prev, selectedCamp._id]);
      setRegistrationSuccessMsg('Booked ' + selectedSlot + ' at ' + selectedCamp.title);
      setSelectedCamp(null);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1280px' }}>
      {loading && <p>Loading...</p>}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
          Nearby Camps & Drives
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Find local mobile blood donation events verified by NGOs.
        </p>
        <div className="location-fields">
          <button type="button" className="btn-outline location-detect" onClick={detectLocation} disabled={locating}>
            <LocateFixed size={17} aria-hidden="true" /> {locating ? 'Finding your location...' : 'Use my location'}
          </button>
          {detectedLocation && savedLocation && <button type="button" className="btn-outline" style={{ marginLeft: '0.75rem' }} disabled={locating}
            onClick={() => {
              if (savedLocation.latitude !== latitude || savedLocation.longitude !== longitude) setLoading(true);
              setDetectedLocation(null); clearError();
            }}>Use saved location</button>}
          <p className="location-hint">{detectedLocation
            ? 'Using your detected location for this search. Your saved profile location has not changed.'
            : savedLocation ? 'Using your saved location. You can search from your current location instead.'
              : 'Use your location to find nearby camps and see distances. You can also save coordinates in My Profile.'}</p>
          {locating && <p role="status" className="location-feedback">Waiting for your browser or device to provide a location...</p>}
          {locationError && <p role="alert" className="location-error">{locationError}</p>}
          {detectedLocation && !locating && <p role="status" className="location-success">Current search location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            {detectedLocation.accuracy !== null ? ` · device accuracy approximately ${Math.max(1, Math.round(detectedLocation.accuracy))} metres` : ''}.</p>}
        </div>

        {/* Filters Bar matching PDF */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {/* Distance Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={distanceFilter}
              onChange={(e) => setDistanceFilter(e.target.value)}
              className="form-select"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1'
              }}
            >
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="form-select"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1'
              }}
            >
              <option value="weekend">This Weekend</option>
              <option value="today">Today Only</option>
              <option value="month">This Month</option>
              <option value="all">All Dates</option>
            </select>
          </div>

          {/* Blood Type Demand Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="form-select"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1'
              }}
            >
              <option value="O+ Needed">O+ Needed</option>
              <option value="O- Needed">O- Needed</option>
              <option value="A+ Needed">A+ Needed</option>
              <option value="B+ Needed">B+ Needed</option>
              <option value="All">All Types Accepted</option>
            </select>
          </div>
        </div>
      </div>

      {canHost && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Host a Donation Camp</h2>
            <button type="button" className={showHostForm ? 'btn-outline' : 'btn-primary'} style={{ padding: '8px 16px', borderRadius: '8px' }} onClick={() => setShowHostForm(v => !v)}>
              {showHostForm ? 'Close' : 'Create Camp'}
            </button>
          </div>
          {showHostForm && (
            <form onSubmit={handleHostCamp} style={{ marginTop: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">CAMP TITLE</label>
                <input className="form-input" value={newCamp.title} onChange={e => updateCamp('title', e.target.value)} maxLength={160} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">STARTS</label>
                  <input className="form-input" type="datetime-local" value={newCamp.date} onChange={e => updateCamp('date', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ENDS</label>
                  <input className="form-input" type="datetime-local" value={newCamp.endDate} onChange={e => updateCamp('endDate', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">CAPACITY</label>
                  <input className="form-input" type="number" min="1" max="1000" value={newCamp.capacity} onChange={e => updateCamp('capacity', e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">ADDRESS</label>
                <input className="form-input" value={newCamp.address} onChange={e => updateCamp('address', e.target.value)} maxLength={500} required />
              </div>
              <LocationFields value={campLocation} onChange={setCampLocation} required hint="Defaults to your institution's location. Use your location or edit the coordinates if the camp is elsewhere." />
              <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', marginTop: '0.75rem' }}>Publish Camp</button>
            </form>
          )}
        </div>
      )}

      {error && <p role="alert">{error}</p>}
      {/* Success Notification */}
      {registrationSuccessMsg && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={20} color="#16a34a" />
          <span>{registrationSuccessMsg}</span>
        </div>
      )}

      {/* Main Split Grid: Camps List on Left (40%), Map on Right (60%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '1.75rem', alignItems: 'start' }}>
        {/* Left Column: Camps Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!loading && !error && camps.length === 0 && <p className="card">No upcoming camps found{origin ? ' within this area. Try a larger distance filter.' : '.'}</p>}
          {camps.map((camp) => {
            const isRegistered = registeredCampIds.includes(camp._id);

            return (
              <div
                key={camp._id}
                className="card"
                style={{
                  padding: '1.4rem',
                  border: isRegistered ? '2px solid #86efac' : '1px solid var(--border-color)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                      {camp.title}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {camp.organizerName}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#059669',
                      backgroundColor: '#ecfdf5',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {camp.demands?.[0] || 'All Types Accepted'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    color: '#64748b',
                    margin: '1rem 0 1.25rem'
                  }}
                >
                  <Clock size={15} />
                  <span>{camp.timeString || new Date(camp.date).toLocaleString()}</span>
                  <span>&bull;</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    {camp.distanceKm != null ? `${camp.distanceKm} km away` : 'Set a search location for distance'}
                  </span>
                </div>

                {/* Register Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {isRegistered ? (
                    <span
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={16} /> Slot Booked
                    </span>
                  ) : (
                    <button
                      disabled={role !== 'donor'} onClick={() => { setSelectedCamp(camp); setSelectedSlot(camp.slots[0]); }}
                      className="btn-primary"
                      style={{
                        padding: '6px 20px',
                        fontSize: '0.85rem',
                        borderRadius: '6px'
                      }}
                    >
                      Register
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Interactive Map matching Figma */}
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            height: '560px',
            position: 'relative',
            borderRadius: '16px',
            border: '1px solid #cbd5e1'
          }}
        >
          {/* Leaflet Map */}
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={false}
          >
            <SearchMapView latitude={mapCenter[0]} longitude={mapCenter[1]} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {origin && <CircleMarker center={[latitude, longitude]} radius={8} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}>
              <Popup>{detectedLocation ? 'Your current search location' : 'Your saved location'}</Popup>
            </CircleMarker>}

            {camps.map(camp => <Marker key={camp._id} position={[camp.location.coordinates[1], camp.location.coordinates[0]]} icon={createCustomIcon('blood-drive', 'Blood Drive')}><Popup><strong>{camp.title}</strong><br />{camp.organizerName}<br />{new Date(camp.date).toLocaleString()}</Popup></Marker>)}
          </MapContainer>

          {/* Map Legend Overlay matching PDF */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(6px)',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px'
              }}
            >
              LEGEND
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem', fontWeight: 600 }}>
              {origin && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                <span>YOUR SEARCH LOCATION</span>
              </div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e63946' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e63946' }} />
                <span>MOBILE BLOOD DRIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal for Time Slot */}
      {selectedCamp && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Register for Donation Drive
              </h3>
              <button
                onClick={() => setSelectedCamp(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Booking for <strong>{selectedCamp.title}</strong> organized by {selectedCamp.organizerName}.
            </p>

            <form onSubmit={handleRegisterSlot}>
              <div className="form-group">
                <label className="form-label">DONOR ID & NAME</label>
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#334155',
                    fontWeight: 600
                  }}
                >
                  {user?.donorId || 'BL-2024-78542'} &bull; {user?.name || 'John Doe'} ({user?.bloodType || 'O+'})
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">CHOOSE APPOINTMENT TIME SLOT</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="form-select"
                >
                  {selectedCamp.slots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </div>

              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  marginBottom: '1.5rem'
                }}
              >
                🎁 You will earn <strong>+50 Blood Coins</strong> upon attending this verified community camp!
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedCamp(null)}
                  className="btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                >
                  Confirm Slot Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
