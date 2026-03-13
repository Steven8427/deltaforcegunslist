import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const CAT_COLOR = {"突击步枪":"#30d060","战斗步枪":"#e0a030","射手步枪":"#50b0e0","冲锋枪":"#d050d0","机枪":"#e06030","狙击步枪":"#4090f0","连狙":"#60c0c0","霰弹枪":"#d04040","手枪":"#a0a0a0","弓弩":"#90d040"};

function OfficialCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('全部');
  const [sortBy, setSortBy] = useState('apply');
  const [lastSync, setLastSync] = useState('');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase.from('official_gun_codes').select('*').order('sort_order');
      if (data?.length) { setCodes(data); setLastSync(data[0].synced_at); }
      setLoading(false);
    }
    fetch();
  }, []);

  const categories = useMemo(() => {
    const s = new Set(); codes.forEach(c => { if (c.arms_category) s.add(c.arms_category); });
    return ['全部', ...Array.from(s).sort()];
  }, [codes]);

  const filtered = useMemo(() => {
    let r = codes;
    if (filterCat !== '全部') r = r.filter(c => c.arms_category === filterCat);
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter(c => c.name.toLowerCase().includes(s) || c.arms_name?.toLowerCase().includes(s) || c.author_nickname?.toLowerCase().includes(s));
    }
    if (sortBy === 'apply') r = [...r].sort((a, b) => (b.apply_num || 0) - (a.apply_num || 0));
    if (sortBy === 'like') r = [...r].sort((a, b) => (b.like_num || 0) - (a.like_num || 0));
    if (sortBy === 'price_asc') r = [...r].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortBy === 'price_desc') r = [...r].sort((a, b) => (b.price || 0) - (a.price || 0));
    return r;
  }, [codes, filterCat, search, sortBy]);

  function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => toast.success('改枪码已复制！')).catch(() => {
      const ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      toast.success('改枪码已复制！');
    });
  }

  function formatNum(n) { if (!n) return '0'; if (n >= 10000) return (n/10000).toFixed(1) + 'w'; if (n >= 1000) return (n/1000).toFixed(1) + 'k'; return n.toString(); }
  function formatPrice(n) { if (!n) return '-'; if (n >= 10000) return (n/10000).toFixed(1) + 'w'; return n.toLocaleString(); }
  function formatTime(ts) { if (!ts) return ''; const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

  if (loading) return <div className="loading"><div className="spinner"></div>加载官方改枪码...</div>;

  return (
    <div>
      <h1 className="page-title">🔥 官方热门改枪码</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
        来自三角洲行动官方社区的热门改枪方案 · {codes.length} 个方案 · 同步时间：{formatTime(lastSync)}
      </p>

      {/* 筛选 */}
      <div className="filter-bar">
        {categories.map(c => (
          <button key={c} className={`filter-chip ${filterCat === c ? 'active' : ''}`} onClick={() => setFilterCat(c)}>{c}</button>
        ))}
      </div>

      <div className="search-row">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input placeholder="搜索枪名、方案名、作者..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="apply">使用量 高→低</option>
          <option value="like">点赞 高→低</option>
          <option value="price_asc">价格 低→高</option>
          <option value="price_desc">价格 高→低</option>
        </select>
      </div>

      {/* 卡片列表 */}
      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map((code, idx) => {
          const catC = CAT_COLOR[code.arms_category] || '#20e870';
          return (
            <div key={code.id} onClick={() => copyCode(code.solution_code)} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
              transition: 'border-color 0.2s', display: 'flex', gap: 14, alignItems: 'flex-start',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${catC}50`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {/* 排名 */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: idx < 3 ? `${catC}20` : 'var(--bg-secondary)',
                border: `1px solid ${idx < 3 ? catC + '40' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700,
                color: idx < 3 ? catC : 'var(--text-muted)',
              }}>{idx + 1}</div>

              {/* 枪械图片 */}
              {code.arms_pic && (
                <img src={code.arms_pic} alt="" style={{
                  width: 56, height: 42, objectFit: 'contain', borderRadius: 8,
                  background: 'linear-gradient(135deg, #1a2a3a, #1e3040)',
                  border: '1px solid var(--border)', padding: 2, flexShrink: 0,
                }} onError={e => e.target.style.display = 'none'} />
              )}

              {/* 信息 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{code.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8,
                    background: `${catC}15`, color: catC, border: `1px solid ${catC}30`,
                  }}>{code.arms_category}</span>
                </div>

                {/* 作者 + 价格 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {code.author_avatar && <img src={code.author_avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{code.author_nickname}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{formatPrice(code.price)}</span>
                  {code.maps && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{code.maps}</span>}
                </div>

                {/* 说明 */}
                {code.author_comment && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {code.author_comment}
                  </div>
                )}

                {/* 改枪码 */}
                <div style={{
                  fontFamily: "'Courier New', monospace", fontSize: 12, color: 'var(--accent)',
                  background: 'rgba(32,232,112,0.04)', border: '1px solid rgba(32,232,112,0.1)',
                  borderRadius: 6, padding: '6px 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{code.solution_code}</div>
              </div>

              {/* 数据 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>使用</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e0a030', fontFamily: "'Orbitron', monospace" }}>{formatNum(code.apply_num)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>点赞</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e04848', fontFamily: "'Orbitron', monospace" }}>{formatNum(code.like_num)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text-muted)' }}>
        💡 点击任意方案即可复制改枪码。数据来自三角洲行动官方社区，每6小时自动同步。
      </div>
    </div>
  );
}

export default OfficialCodes;
