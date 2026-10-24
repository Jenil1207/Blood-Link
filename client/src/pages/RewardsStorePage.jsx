import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Gift, CheckCircle, Sparkles, X } from 'lucide-react';

export default function RewardsStorePage() {
  const { user, setUser } = useAuth();

  // default items in stock
  const [vouchers, setVouchers] = useState([
    {
      id: 1,
      title: 'Full Body Diagnostic Health Voucher',
      provider: 'Clinica Lab Services',
      cost: 300,
      image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 2,
      title: 'Local Premium Coffee & Snack Bundle',
      provider: 'The Roasted Bean Cafe',
      cost: 100,
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 3,
      title: 'Standard Movie Ticket Pass',
      provider: 'Starlight Cine',
      cost: 150,
      image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 4,
      title: 'Smart Fitness Watch Straps',
      provider: 'PulseFit Apparel',
      cost: 200,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
    }
  ]);

  const [redeemedCode, setRedeemedCode] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // redeem a voucher and deduct points
  const handleRedeem = (item) => {
    setErrorMsg('');
    const currentCoins = user?.coins ?? 450;

    if (currentCoins < item.cost) {
      setErrorMsg(`Not enough coins! You have ${currentCoins} coins, but this voucher costs ${item.cost}.`);
      return;
    }

    const newCoins = currentCoins - item.cost;
    const code = 'VCH-' + Math.floor(100000 + Math.random() * 900000);

    // update coins in auth context and storage
    if (setUser) {
      setUser((prev) => {
        const updated = { ...prev, coins: newCoins };
        localStorage.setItem('bloodlink_user', JSON.stringify(updated));
        return updated;
      });
    }

    setRedeemedCode({
      name: item.title,
      code: code
    });
  };

  const userCoins = user?.coins ?? 450;

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
                <div style={{ height: '170px', width: '100%', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
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
