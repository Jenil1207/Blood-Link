import { api } from '../lib/api';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Gift, Coffee, ShoppingBag, Utensils, Dumbbell, Music, BookOpen } from 'lucide-react';

// Fallback gradient backgrounds per index for vouchers without images
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
];

const CARD_ICONS = [Coffee, ShoppingBag, Utensils, Dumbbell, Gift, Music, BookOpen, Gift];
export default function RewardsStorePage() {
  const { user, setUser } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [redeemedCode, setRedeemedCode] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [brokenImages, setBrokenImages] = useState([]);
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
              <div key={item.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {/* Voucher image / fallback */}
                <div style={{ height: '160px', width: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                  {item.image && !brokenImages.includes(item.id) ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      onError={() => setBrokenImages(prev => [...prev, item.id])}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: CARD_GRADIENTS[vouchers.indexOf(item) % CARD_GRADIENTS.length],
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                      {React.createElement(CARD_ICONS[vouchers.indexOf(item) % CARD_ICONS.length], { size: 40, color: 'rgba(255,255,255,0.9)' })}
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {item.provider || 'Reward'}
                      </span>
                    </div>
                  )}
                  {/* Cost badge overlay */}
                  <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                    color: '#fbbf24', fontWeight: 800, fontSize: '0.8rem',
                    padding: '4px 10px', borderRadius: '9999px'
                  }}>
                    {item.cost} coins
                  </div>
                </div>

                <div style={{ padding: '1.1rem 1.25rem 1.25rem' }}>
                  <h3 style={{ fontSize: '0.975rem', fontWeight: 700, color: '#0f172a', marginBottom: '3px', lineHeight: 1.3 }}>
                    {item.title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                    {item.provider}
                    {item.stock !== undefined && (
                      <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: 700, color: item.stock > 0 ? '#16a34a' : '#dc2626' }}>
                        {item.stock > 0 ? `${item.stock} left` : 'Out of stock'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, color: '#b45309', fontSize: '0.9rem' }}>
                      {item.cost} Blood Coins
                    </div>

                    <button
                      onClick={() => handleRedeem(item)}
                      disabled={item.stock === 0 || userCoins < item.cost}
                      className="btn-primary"
                      style={{
                        padding: '6px 16px',
                        fontSize: '0.85rem',
                        borderRadius: '6px',
                        backgroundColor: item.stock === 0 || userCoins < item.cost ? '#94a3b8' : '#1e293b',
                        cursor: item.stock === 0 || userCoins < item.cost ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {item.stock === 0 ? 'Sold Out' : userCoins < item.cost ? 'Insufficient' : 'Redeem'}
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
