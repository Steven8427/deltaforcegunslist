import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const CAT_COLOR = {"突击步枪":"#30d060","战斗步枪":"#e0a030","射手步枪":"#50b0e0","冲锋枪":"#d050d0","机枪":"#e06030","狙击步枪":"#4090f0","连狙":"#60c0c0","霰弹枪":"#d04040","手枪":"#a0a0a0","弓弩":"#90d040"};

function Streamers() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStreamer, setSelectedStreamer] = useState(null);
  const [search, setSearch] = useState('');
  const [codeSearch, setCodeSearch] = useState('');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase.from('official_gun_codes').select('*').order('apply_num', { ascending: false });
      setCodes(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  const streamers = useMemo(() => {
    const map = {};
    codes.forEach(c => {
      const name = c.author_nickname || '未知';
      if (!map[name]) map[name] = { name, avatar: c.author_avatar, codes: [], totalApply: 0, totalLikes: 0 };
      map[name].codes.push(c);
      map[name].totalApply += (c.apply_num || 0);
      map[name].totalLikes += (c.like_num || 0);
      if (c.author_avatar && !map[name].avatar) map[name].avatar = c.author_avatar;
    });
    return Object.values(map).sort((a, b) => b.totalApply - a.totalApply);
  }, [codes]);

  // 搜索过滤主播
  const filteredStreamers = useMemo(() => {
    if (!search.trim()) return streamers;
    const s = search.toLowerCase();
    return streamers.filter(st => st.name.toLowerCase().includes(s));
  }, [streamers, search]);

  // 选中主播的改枪码（带搜索）
  const streamerCodes = useMemo(() => {
    if (!selectedStreamer) return [];
    let list = codes.filter(c => c.author_nickname === selectedStreamer).sort((a, b) => (b.apply_num || 0) - (a.apply_num || 0));
    if (codeSearch.trim()) {
      const s = codeSearch.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(s) || c.arms_name?.toLowerCase().includes(s) || c.arms_category?.toLowerCase().includes(s));
    }
    return list;
  }, [codes, selectedStreamer, codeSearch]);

  function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => toast.success('改枪码已复制！')).catch(() => {
      const ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      toast.success('改枪码已复制！');
    });
  }

  function formatNum(n) { if (!n) return '0'; if (n >= 10000) return (n/10000).toFixed(1) + 'w'; if (n >= 1000) return (n/1000).toFixed(1) + 'k'; return String(n); }
  function formatPrice(n) { if (!n) return '-'; if (n >= 10000) return (n/10000).toFixed(1) + 'w'; return n.toLocaleString(); }

  if (loading) return <div className="loading"><div className="spinner"></div>加载主播数据...</div>;

  // 选中主播 → 显示改枪码
  if (selectedStreamer) {
    const s = streamers.find(x => x.name === selectedStreamer);
    return (
      <div>
        <button onClick={() => { setSelectedStreamer(null); setCodeSearch(''); }} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'block' }}>← 返回主播列表</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          {s?.avatar ? <img src={s.avatar} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} />
          : <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(32,232,112,0.1)', border: '3px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{selectedStreamer.charAt(0)}</div>}
          <div>
            <h1 className="page-title" style={{ fontSize: 22, marginBottom: 2 }}>{selectedStreamer}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {s?.codes.length} 个方案 · 总使用 {formatNum(s?.totalApply)} · 总点赞 {formatNum(s?.totalLikes)}
            </p>
          </div>
        </div>

        {/* 搜索 */}
        <div className="search-bar" style={{ marginBottom: 16, flex: 'none' }}>
          <span className="search-icon">🔍</span>
          <input placeholder="搜索枪名或方案名..." value={codeSearch} onChange={e => setCodeSearch(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {streamerCodes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>没有找到匹配的改枪码</div>
          ) : streamerCodes.map(code => {
            const catC = CAT_COLOR[code.arms_category] || '#20e870';
            return (
              <div key={code.id} onClick={() => copyCode(code.solution_code)} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.2s',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${catC}50`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {code.arms_pic && <img src={code.arms_pic} alt="" style={{ width: 52, height: 40, objectFit: 'contain', borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, #1a2a3a, #1e3040)', border: '1px solid var(--border)', padding: 2 }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{code.name}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: `${catC}15`, color: catC, border: `1px solid ${catC}30`, fontWeight: 600 }}>{code.arms_category}</span>
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{formatPrice(code.price)}</span>
                  </div>
                  {code.author_comment && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{code.author_comment}</div>}
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: 'var(--accent)', background: 'rgba(32,232,112,0.04)', border: '1px solid rgba(32,232,112,0.1)', borderRadius: 6, padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{code.solution_code}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#e0a030', fontWeight: 700, fontFamily: "'Orbitron', monospace" }}>{formatNum(code.apply_num)} 使用</span>
                  <span style={{ fontSize: 11, color: '#e04848', fontWeight: 700, fontFamily: "'Orbitron', monospace" }}>{formatNum(code.like_num)} 赞</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 主播列表
  return (
    <div>
      <h1 className="page-title">🎙️ 主播同款改枪码</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
        来自三角洲行动官方社区 · {streamers.length} 位主播 · {codes.length} 个方案
      </p>

      {/* 搜索主播 */}
      <div className="search-bar" style={{ marginBottom: 20, flex: 'none' }}>
        <span className="search-icon">🔍</span>
        <input placeholder="搜索主播名称..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filteredStreamers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>没有找到「{search}」相关的主播</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filteredStreamers.map(s => (
            <div key={s.name} className="author-card" onClick={() => setSelectedStreamer(s.name)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {s.avatar ? <img src={s.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)', flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(32,232,112,0.1)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.name.charAt(0)}</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.codes.length} 个方案</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>总使用</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e0a030', fontFamily: "'Orbitron', monospace" }}>{formatNum(s.totalApply)}</div>
                </div>
                <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>总点赞</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e04848', fontFamily: "'Orbitron', monospace" }}>{formatNum(s.totalLikes)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {s.codes.slice(0, 4).map(c => (
                  <div key={c.id}>{c.arms_pic && <img src={c.arms_pic} alt="" style={{ width: 24, height: 18, objectFit: 'contain', borderRadius: 4, background: 'linear-gradient(135deg, #1a2a3a, #1e3040)' }} />}</div>
                ))}
                {s.codes.length > 4 && <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>+{s.codes.length - 4}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Streamers;