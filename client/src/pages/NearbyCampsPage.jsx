import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Calendar, Clock, Filter, CheckCircle2, X, PlusCircle, Building2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Custom Leaflet Icons using SVG DivIcon for crisp styling without asset loading issues
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
  const { user } = useAuth();

  // Filters
  const [distanceFilter, setDistanceFilter] = useState('5');
  const [timeFilter, setTimeFilter] = useState('weekend');
  const [bloodFilter, setBloodFilter] = useState('O+ Needed');

  // Camps state
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Registration Modal state
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('09:30 AM - 10:30 AM');
  const [registeredCampIds, setRegisteredCampIds] = useState([]);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState('');

  // Fetch camps from server
  useEffect(() => {
    async function fetchCamps() {
      setLoading(true);
      try {
        const bloodTypeQuery = bloodFilter.split(' ')[0]; // 'O+', 'All', etc.
        const res = await fetch(
          `http://localhost:5000/api/camps?lat=19.0760&lng=72.8777&radiusKm=${distanceFilter}&bloodType=${bloodTypeQuery}`
        );
        if (res.ok) {
          const data = await res.json();
          setCamps(data);
        } else {
          throw new Error('API fetch failed');
        }
      } catch (e) {
        // High fidelity mock data matching nearby-camps.pdf
        setCamps([
          {
            _id: 'camp-1',
            title: 'Metro Central Plaza Drive',
            organizerName: 'Red Cross Chapter 4',
            timeString: 'Saturday, 09:00 AM',
            distanceKm: 1.2,
            demands: ['O+ / A+ Demands'],
            address: 'Metro Central Mall Concourse, Mumbai',
            location: { coordinates: [72.8680, 19.0720] }
          },
          {
            _id: 'camp-2',
            title: 'Community Health Initiative Camp',
            organizerName: 'LifeSource Foundation',
            timeString: 'Sunday, 10:00 AM',
            distanceKm: 3.4,
            demands: ['All Types Accepted'],
            address: 'Community Center Grounds, Mumbai',
            location: { coordinates: [72.8480, 19.0950] }
          }
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchCamps();
  }, [distanceFilter, bloodFilter]);

  // Handle Camp Slot Booking
  const handleRegisterSlot = async (e) => {
    e.preventDefault();
    if (!selectedCamp) return;

    try {
      await fetch(`http://localhost:5000/api/camps/${selectedCamp._id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorId: user?.donorId || 'BL-2024-78542',
          name: user?.name || 'John Doe',
          timeSlot: selectedSlot
        })
      });
    } catch (err) {
      // ignore network errors for offline mock
    }

    setRegisteredCampIds((prev) => [...prev, selectedCamp._id]);
    setRegistrationSuccessMsg(`🎉 Successfully booked slot "${selectedSlot}" at ${selectedCamp.title}!`);
    setSelectedCamp(null);
    setTimeout(() => setRegistrationSuccessMsg(''), 5000);
  };

  return (
    <div className="page-container" style={{ maxWidth: '1280px' }}>
      {/* Header and Filter Row matching nearby-camps.pdf */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
          Nearby Camps & Drives
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Find local mobile blood donation events verified by NGOs.
        </p>

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
              <option value="50">All Distances</option>
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
                  <span>{camp.timeString || 'Saturday, 09:00 AM'}</span>
                  <span>&bull;</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    {camp.distanceKm ? `${camp.distanceKm} km away` : '1.2 km away'}
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
                      onClick={() => setSelectedCamp(camp)}
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
            center={[19.0760, 72.8777]}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Marker 1: Metro Central Plaza Drive */}
            <Marker
              position={[19.0720, 72.8680]}
              icon={createCustomIcon('blood-drive', 'Metro Central Drive (1.2km)')}
            >
              <Popup>
                <strong>Metro Central Plaza Drive</strong><br />
                Red Cross Chapter 4<br />
                Saturday, 09:00 AM
              </Popup>
            </Marker>

            {/* Marker 2: LifeSource Camp */}
            <Marker
              position={[19.0950, 72.8480]}
              icon={createCustomIcon('blood-drive', 'LifeSource Camp (3.4km)')}
            >
              <Popup>
                <strong>Community Health Initiative Camp</strong><br />
                LifeSource Foundation<br />
                Sunday, 10:00 AM
              </Popup>
            </Marker>

            {/* Additional Community Clinic & Center Markers matching PDF map */}
            <Marker
              position={[19.0820, 72.8550]}
              icon={createCustomIcon('clinic', 'Community Clinic')}
            >
              <Popup>
                <strong>Local Municipal Community Clinic</strong><br />
                Open Mon-Sat 8 AM - 4 PM
              </Popup>
            </Marker>

            <Marker
              position={[19.0650, 72.8850]}
              icon={createCustomIcon('center', 'Red Cross Center')}
            >
              <Popup>
                <strong>Red Cross Regional Donation Center</strong><br />
                Permanent blood collection facility
              </Popup>
            </Marker>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>COMMUNITY CLINIC</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                <span>RED CROSS DONATION CENTER</span>
              </div>
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
                  <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                  <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                  <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM</option>
                  <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                  <option value="03:30 PM - 04:30 PM">03:30 PM - 04:30 PM</option>
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
