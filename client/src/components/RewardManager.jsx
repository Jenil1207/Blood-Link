import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { api } from '../lib/api';

const emptyReward = { title: '', provider: '', costCoins: 100, stock: 10, image: '' };

export default function RewardManager() {
  const [rewards, setRewards] = useState([]);
  const [form, setForm] = useState(emptyReward);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const load = () => api('/rewards').then(setRewards).catch(err => setMessage(err.message));
  useEffect(() => { load(); }, []);
  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const startEdit = reward => {
    setEditingId(reward._id);
    setForm({ title: reward.title, provider: reward.provider, costCoins: reward.costCoins, stock: reward.stock, image: reward.image || '' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyReward); };
  const handleSubmit = async e => {
    e.preventDefault();
    const body = { ...form, title: form.title.trim(), provider: form.provider.trim(), image: form.image.trim(), costCoins: Number(form.costCoins), stock: Number(form.stock), isActive: true };
    try {
      await api(editingId ? '/rewards/' + editingId : '/rewards', { method: editingId ? 'PUT' : 'POST', body });
      setMessage(editingId ? 'Reward updated' : 'Reward added');
      cancelEdit(); await load();
    } catch (err) { setMessage(err.message); }
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>Rewards Store Items</h2>
      {message && <p role="status" style={{ marginBottom: '1rem', fontWeight: 600, color: '#166534' }}>{message}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">TITLE</label>
          <input className="form-input" value={form.title} onChange={e => update('title', e.target.value)} maxLength={160} required />
        </div>
        <div className="form-group">
          <label className="form-label">PROVIDER</label>
          <input className="form-input" value={form.provider} onChange={e => update('provider', e.target.value)} maxLength={160} required />
        </div>
        <div className="form-group">
          <label className="form-label">COST (BLOOD COINS)</label>
          <input className="form-input" type="number" min="1" value={form.costCoins} onChange={e => update('costCoins', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">STOCK</label>
          <input className="form-input" type="number" min="0" value={form.stock} onChange={e => update('stock', e.target.value)} required />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">IMAGE URL (OPTIONAL)</label>
          <input className="form-input" type="url" placeholder="https://..." value={form.image} onChange={e => update('image', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>{editingId ? 'Save Changes' : 'Add Reward'}</button>
          {editingId && <button type="button" className="btn-outline" style={{ padding: '10px 20px', borderRadius: '8px' }} onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {!rewards.length && <p style={{ color: '#64748b' }}>No rewards yet.</p>}
        {rewards.map(reward => (
          <div key={reward._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {reward.image ? <img src={reward.image} alt={reward.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Gift size={24} color="#94a3b8" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{reward.title}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{reward.provider} &bull; {reward.costCoins} coins &bull; {reward.stock} left</div>
            </div>
            <button type="button" className="btn-outline" style={{ fontSize: '0.85rem', padding: '6px 14px' }} onClick={() => startEdit(reward)}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}
