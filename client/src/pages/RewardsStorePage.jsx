import { api } from '../lib/api';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Gift } from 'lucide-react';
import fitnessPhoto from '../assets/rewards/fitness-accessory.webp';
import moviePhoto from '../assets/rewards/movie-ticket.webp';
import healthPhoto from '../assets/rewards/health-check.webp';

const rewardPhotos = [
  { matches: /\b(fitness|gym|yoga|workout|sports?|exercise)\b/i, src: fitnessPhoto, alt: 'Dumbbells, a yoga mat, water bottle and towel in a sunlit workout space' },
  { matches: /\b(movies?|cinema|theat(?:er|re))\b/i, src: moviePhoto, alt: 'Popcorn and admission tickets on a red cinema seat' },
  { matches: /\b(health|medical|clinic|checkup|check-up|screening)\b/i, src: healthPhoto, alt: 'A stethoscope and blood pressure cuff on a bright clinic desk' },
];

function RewardPhoto({ item }) {
  const [failedSources, setFailedSources] = useState([]);
  const fallback = rewardPhotos.find(photo => photo.matches.test(`${item.title} ${item.provider}`));
  const customPhoto = typeof item.image === 'string' ? item.image.trim() : '';
  // Preserve admin-supplied photos; use a bundled photo when one is absent or fails.
  const source = [customPhoto, fallback?.src].find(src => src && !failedSources.includes(src));
  if (!source) return <Gift size={56} color="#94a3b8" aria-label={item.title} />;
  return (
    <img
      src={source}
      alt={source === fallback?.src ? fallback.alt : item.title}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSources(prev => prev.includes(source) ? prev : [...prev, source])}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

export default function RewardsStorePage() {
  const { user, setUser } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [redeemedCode, setRedeemedCode] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const requestKeys = useRef(new Map());
  const busy = useRef(false);
  useEffect(() => {
    api('/rewards').then(items => setVouchers(items.map(item => ({ ...item, id: item._id, cost: item.costCoins }))))
      .catch(err => setErrorMsg(err.message));
  }, []);
  const handleRedeem = async item => {
    if (busy.current) return;
    busy.current = true; setErrorMsg('');
    if (!requestKeys.current.has(item.id)) requestKeys.current.set(item.id, crypto.randomUUID());
    try {
      const result = await api('/rewards/redeem', { method: 'POST', headers: { 'Idempotency-Key': requestKeys.current.get(item.id) }, body: { rewardItemId: item.id } });
      requestKeys.current.delete(item.id);
      setUser(prev => ({ ...prev, coins: result.newBalance }));
      setRedeemedCode({ name: item.title, code: result.voucherCode });
      setVouchers(prev => prev.map(v => v.id === item.id ? { ...v, stock: Math.max(0, v.stock - 1) } : v));
    } catch (err) { setErrorMsg(err.message); } finally { busy.current = false; }
  };
  const userCoins = user?.coins ?? 0;

  return (
    <div className="page-container" style={{ maxWidth: '1240px' }}>
      {/* Balance Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          MY BALANCE
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '6px 0' }}>
          {userCoins} Blood Coins
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          Keep donating to achieve Silver tier status.
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            fontWeight: 600
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Main Grid: Vouchers on left, How to earn on right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Vouchers list */}
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
            Redeem Vouchers
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
            {vouchers.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ height: '170px', width: '100%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RewardPhoto item={item} />
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px', lineHeight: 1.3 }}>
                    {item.title}
                  </h3>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem' }}>
                    {item.provider}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, color: '#b45309', fontSize: '0.95rem' }}>
                      {item.cost} {item.cost === 300 ? 'Blood Coins' : 'Coins'}
                    </div>

                    <button
                      onClick={() => handleRedeem(item)}
                      className="btn-primary"
                      style={{
                        padding: '6px 16px',
                        fontSize: '0.85rem',
                        borderRadius: '6px',
                        backgroundColor: '#1e293b'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: How to earn coins card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
            How to Earn Coins
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.9rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Blood Donation Completion
              </div>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>
                +100 PTS
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.9rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Camp Event Attendance
              </div>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>
                +50 PTS
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.9rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Official Hospital Endorsement
              </div>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>
                +75 PTS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal after redeeming */}
      {redeemedCode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '420px',
              width: '90%',
              textAlign: 'center'
            }}
          >
            <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Voucher Redeemed!
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {redeemedCode.name}
            </p>

            <div
              style={{
                backgroundColor: '#f1f5f9',
                padding: '12px',
                borderRadius: '8px',
                letterSpacing: '2px',
                fontWeight: 800,
                fontSize: '1.25rem',
                color: '#e63946',
                border: '1px dashed #cbd5e1',
                marginBottom: '1.5rem'
              }}
            >
              {redeemedCode.code}
            </div>

            <button
              onClick={() => setRedeemedCode(null)}
              className="btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
