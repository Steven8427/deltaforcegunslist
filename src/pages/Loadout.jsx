import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const TIERS = [
  { key: '11w', name: '大坝、长弓—机密', budget: '11W', color: '#20e870' },
  { key: '18w', name: '航天、巴克什—机密', budget: '18W', color: '#e0a030' },
  { key: '55w', name: '巴克什—绝密', budget: '55W', color: '#e08040' },
  { key: '60w', name: '航天基地—绝密', budget: '60W', color: '#e06040' },
  { key: '78w', name: '潮汐监狱—绝密', budget: '78W', color: '#d050d0' },
];

const STRATEGY_COLORS = { '枪械优先': '#18a0d0', '均衡套装': '#20e870', '胸挂优先': '#d050d0' };
const TYPE_ICONS = { '头盔': '⛑️', '护甲': '🛡️', '胸挂': '🦺', '背包': '🎒', '枪械': '🔫' };

const GRADE_COLORS = { 7: '#e04848', 6: '#e04848', 5: '#ffc040', 4: '#c060e0', 3: '#40a0e0', 2: '#40d070', 1: '#c0c8d0', 0: '#6898b0' };
const GRADE_BG = { 7: 'rgba(224,72,72,0.12)', 6: 'rgba(224,72,72,0.12)', 5: 'rgba(255,192,64,0.12)', 4: 'rgba(192,96,224,0.12)', 3: 'rgba(64,160,224,0.12)', 2: 'rgba(64,208,112,0.12)', 1: 'rgba(192,200,208,0.08)', 0: 'rgba(104,152,176,0.08)' };
const GRADE_BORDER = { 7: 'rgba(224,72,72,0.3)', 6: 'rgba(224,72,72,0.3)', 5: 'rgba(255,192,64,0.3)', 4: 'rgba(192,96,224,0.3)', 3: 'rgba(64,160,224,0.3)', 2: 'rgba(64,208,112,0.3)', 1: 'rgba(192,200,208,0.15)', 0: 'rgba(104,152,176,0.15)' };

function GradeBadge({ grade }) {
  const g = grade || 0;
  if (g === 0) return null;
  return (
    <span style={{
      display: 'inline-block', padding: '1px 7px', borderRadius: 6,
      fontSize: 11, fontWeight: 700,
      background: GRADE_BG[g] || GRADE_BG[0],
      color: GRADE_COLORS[g] || GRADE_COLORS[0],
      border: `1px solid ${GRADE_BORDER[g] || GRADE_BORDER[0]}`,
    }}>{g}级</span>
  );
}

function Loadout() {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState('11w');
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => { fetchPresets(); }, []);

  async function fetchPresets() {
    setLoading(true);
    const { data } = await supabase.from('loadout_presets').select('*').order('sort_order');
    if (data?.length) { setPresets(data); setLastUpdate(data[0].updated_at); }
    setLoading(false);
  }

  function formatPrice(n) { return (!n && n !== 0) ? '-' : n.toLocaleString(); }
  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const tierPresets = presets.filter(p => p.tier === selectedTier);

  if (loading) return <div className="loading"><div className="spinner"></div>加载战备数据中...</div>;
  if (!presets.length) return (
    <div><h1 className="page-title">卡战备系统</h1>
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🃏</div>
        <p style={{ fontSize: 18, marginBottom: 8 }}>暂无战备数据</p>
        <p style={{ fontSize: 14 }}>请管理员在后台获取数据</p>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="page-title">卡战备系统</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
        根据预算推荐最优装备方案 · 更新时间：{formatTime(lastUpdate)}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 24 }}>
        {TIERS.map(t => (
          <button key={t.key} onClick={() => setSelectedTier(t.key)} style={{
            background: selectedTier === t.key ? `${t.color}15` : 'var(--bg-card)',
            border: `2px solid ${selectedTier === t.key ? t.color : 'var(--border)'}`,
            borderRadius: 12, padding: '14px 10px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
          }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: selectedTier === t.key ? t.color : 'var(--text-muted)' }}>{t.budget}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t.name}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {tierPresets.map(preset => {
          const stratColor = STRATEGY_COLORS[preset.description] || '#20e870';
          const budget = preset.budget_min || 0;
          const saved = budget - preset.total_price;
          const equipItems = [
            { type: '枪械', name: preset.gun_name, image: preset.gun_image, price: preset.gun_price, grade: preset.gun_grade },
            { type: '头盔', name: preset.helmet_name, image: preset.helmet_image, price: preset.helmet_price, grade: preset.helmet_grade },
            { type: '护甲', name: preset.armor_name, image: preset.armor_image, price: preset.armor_price, grade: preset.armor_grade },
            { type: '胸挂', name: preset.chest_name, image: preset.chest_image, price: preset.chest_price, grade: preset.chest_grade },
            { type: '背包', name: preset.backpack_name, image: preset.backpack_image, price: preset.backpack_price, grade: preset.backpack_grade },
          ].filter(i => i.name);

          return (
            <div key={preset.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${stratColor}50`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ borderBottom: `3px solid ${stratColor}`, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{preset.description}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '14px 16px', gap: 8, background: `${stratColor}06` }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>预计花费</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: stratColor, fontFamily: "'Orbitron', monospace" }}>{formatPrice(preset.total_price)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>预算</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Orbitron', monospace" }}>{formatPrice(budget)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>预计节省</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: saved > 0 ? '#20e870' : '#e04848', fontFamily: "'Orbitron', monospace" }}>{formatPrice(saved)}</div>
                </div>
              </div>

              <div style={{ padding: '10px 16px 16px' }}>
                {equipItems.map((item, i) => {
                  const gc = GRADE_COLORS[item.grade] || GRADE_COLORS[0];
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                      borderBottom: i < equipItems.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      {item.image ? (
                        <img src={item.image} alt="" style={{
                          width: 40, height: 40, objectFit: 'contain', borderRadius: 8,
                          background: 'linear-gradient(135deg, #1a2a3a, #1e3040)',
                          border: `1px solid ${gc}40`, padding: 2, flexShrink: 0,
                        }} onError={e => e.target.style.display = 'none'} />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 8, background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 18, flexShrink: 0,
                        }}>{TYPE_ICONS[item.type] || '📦'}</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.type}</span>
                          <GradeBadge grade={item.grade} />
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: 'var(--text-primary)', flexShrink: 0 }}>
                        {formatPrice(item.price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 28, padding: 16, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10,
        fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>💡 说明：</strong>
        价格基于交易行实时小时均价，每小时更新。品级颜色：
        <span style={{ color: '#e04848' }}> ■6级</span>
        <span style={{ color: '#ffc040' }}> ■5级</span>
        <span style={{ color: '#c060e0' }}> ■4级</span>
        <span style={{ color: '#40a0e0' }}> ■3级</span>
        <span style={{ color: '#40d070' }}> ■2级</span>
        <span style={{ color: '#c0c8d0' }}> ■1级</span>
      </div>
    </div>
  );
}

export default Loadout;