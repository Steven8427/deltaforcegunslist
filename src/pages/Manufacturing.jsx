import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PLACES = [
  { key: 'all', name: '全部', icon: '📦' },
  { key: 'tech', name: '技术中心', icon: '🔧' },
  { key: 'workbench', name: '工作台', icon: '⚙️' },
  { key: 'pharmacy', name: '制药台', icon: '💊' },
  { key: 'armory', name: '防具台', icon: '🛡️' },
];

const PLACE_COLORS = {
  tech: '#20e870',
  workbench: '#18a0d0',
  pharmacy: '#e0a030',
  armory: '#d050d0',
};

function Manufacturing() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState('all');
  const [sortBy, setSortBy] = useState('profit_per_hour');
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase
      .from('manufacturing_items')
      .select('*')
      .order('profit_per_hour', { ascending: false });

    if (data && data.length > 0) {
      setItems(data);
      setLastUpdate(data[0].updated_at);
    }
    setLoading(false);
  }

  function formatPrice(n) {
    if (!n && n !== 0) return '-';
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    return n.toLocaleString();
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const filtered = items
    .filter(item => selectedPlace === 'all' || item.place === selectedPlace)
    .sort((a, b) => {
      if (sortBy === 'profit_per_hour') return (b.profit_per_hour || 0) - (a.profit_per_hour || 0);
      if (sortBy === 'profit') return (b.profit || 0) - (a.profit || 0);
      if (sortBy === 'sale_price') return (b.sale_price || 0) - (a.sale_price || 0);
      if (sortBy === 'period') return (a.period || 0) - (b.period || 0);
      return 0;
    });

  if (loading) return <div className="loading"><div className="spinner"></div>加载制造数据中...</div>;

  return (
    <div>
      <h1 className="page-title">特勤处制造利润</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
        更新时间：{formatTime(lastUpdate) || '暂无数据'} · 共 {items.length} 个制造方案
      </p>

      {/* 筛选 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {PLACES.map(p => (
          <button key={p.key}
            className={`filter-chip ${selectedPlace === p.key ? 'active' : ''}`}
            onClick={() => setSelectedPlace(p.key)}>
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="profit_per_hour">利润/小时 高→低</option>
          <option value="profit">总利润 高→低</option>
          <option value="sale_price">售价 高→低</option>
          <option value="period">耗时 短→长</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💰</div>
          <p style={{ fontSize: 18, marginBottom: 8 }}>暂无制造数据</p>
          <p style={{ fontSize: 14 }}>请管理员在后台获取或手动添加数据</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((item, idx) => {
            const color = PLACE_COLORS[item.place] || '#20e870';
            const isProfitable = item.profit > 0;
            return (
              <div key={item.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                transition: 'border-color 0.2s',
                flexWrap: 'wrap',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = color + '60'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* 排名 */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: idx < 3 ? `${color}20` : 'var(--bg-secondary)',
                  border: `1px solid ${idx < 3 ? color + '40' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700,
                  color: idx < 3 ? color : 'var(--text-muted)',
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </div>

                {/* 物品图片 */}
                {item.item_image && (
                  <img src={item.item_image} alt={item.item_name}
                    style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: 2, flexShrink: 0 }}
                    onError={e => e.target.style.display = 'none'} />
                )}

                {/* 名称+部门 */}
                <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {item.item_name}
                    {item.per_count > 1 && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>×{item.per_count}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8,
                      background: `${color}15`, color: color, border: `1px solid ${color}30`,
                    }}>
                      {item.place_name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Lv.{item.level} · {item.period}h
                    </span>
                  </div>
                </div>

                {/* 价格信息 */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center', minWidth: 65 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>售价</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{formatPrice(item.sale_price)}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 65 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>成本</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{formatPrice(item.cost_price)}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 65 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>利润</div>
                    <div style={{
                      fontSize: 15, fontWeight: 700,
                      color: isProfitable ? '#20e870' : '#e04848',
                    }}>
                      {isProfitable ? '+' : ''}{formatPrice(item.profit)}
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'center', minWidth: 75,
                    background: isProfitable ? 'rgba(32,232,112,0.08)' : 'rgba(224,72,72,0.08)',
                    border: `1px solid ${isProfitable ? 'rgba(32,232,112,0.2)' : 'rgba(224,72,72,0.2)'}`,
                    borderRadius: 10, padding: '6px 10px',
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>利润/小时</div>
                    <div style={{
                      fontSize: 16, fontWeight: 900,
                      fontFamily: "'Orbitron', monospace",
                      color: isProfitable ? '#20e870' : '#e04848',
                    }}>
                      {formatPrice(item.profit_per_hour)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: 28, padding: 16, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10,
        fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>💡 说明：</strong>
        利润 = 售价 × 数量 - 材料成本 - 手续费。数据来自游戏交易行实时均价，仅供参考。
      </div>
    </div>
  );
}

export default Manufacturing;
