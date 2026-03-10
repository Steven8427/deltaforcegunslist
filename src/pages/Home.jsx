import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const CATS = ["全部","突击步枪","战斗步枪","射手步枪","冲锋枪","机枪","狙击步枪","连狙","霰弹枪","手枪","弓弩"];
const CAT_ICON = {"突击步枪":"🔫","战斗步枪":"⚔️","射手步枪":"🎯","冲锋枪":"💨","机枪":"🔥","狙击步枪":"🔭","连狙":"🎯","霰弹枪":"💥","手枪":"🔫","弓弩":"🏹"};
const CAT_COLOR = {"突击步枪":"#30d060","战斗步枪":"#e0a030","射手步枪":"#50b0e0","冲锋枪":"#d050d0","机枪":"#e06030","狙击步枪":"#4090f0","连狙":"#60c0c0","霰弹枪":"#d04040","手枪":"#a0a0a0","弓弩":"#90d040"};

function Home() {
  const [guns, setGuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('全部');
  const [filterVer, setFilterVer] = useState('全部');
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => { fetchGuns(); }, []);

  async function fetchGuns() {
    setLoading(true);
    const { data: gunsData } = await supabase.from('guns').select('*').order('sort_order', { ascending: true });
    const { data: variantsData } = await supabase.from('gun_variants').select('*').order('sort_order', { ascending: true });
    if (gunsData && variantsData) {
      setGuns(gunsData.map(gun => ({ ...gun, variants: variantsData.filter(v => v.gun_id === gun.id) })));
    }
    setLoading(false);
  }

  const versions = useMemo(() => {
    const s = new Set();
    guns.forEach(g => g.variants.forEach(v => s.add(v.version)));
    return ['全部', ...Array.from(s).sort()];
  }, [guns]);

  const filtered = useMemo(() => {
    let r = guns;
    if (filterCat !== '全部') r = r.filter(g => g.category === filterCat);
    if (filterVer !== '全部') r = r.filter(g => g.variants.some(v => v.version === filterVer));
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter(g => g.name.toLowerCase().includes(s) || g.category?.toLowerCase().includes(s) || g.variants.some(v => v.mod_type.toLowerCase().includes(s)));
    }
    if (filterVer !== '全部') r = r.map(g => ({ ...g, variants: g.variants.filter(v => v.version === filterVer) }));
    if (sortBy === 'price_asc') r = [...r].sort((a, b) => Math.min(...a.variants.map(v => parseFloat(v.price) || 999)) - Math.min(...b.variants.map(v => parseFloat(v.price) || 999)));
    if (sortBy === 'price_desc') r = [...r].sort((a, b) => Math.max(...b.variants.map(v => parseFloat(v.price) || 0)) - Math.max(...a.variants.map(v => parseFloat(v.price) || 0)));
    return r;
  }, [guns, filterCat, filterVer, search, sortBy]);

  function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => toast.success('改枪码已复制！')).catch(() => {
      const ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      toast.success('改枪码已复制！');
    });
  }

  function getVersionClass(v) {
    if (v.includes('T0')) return 'version-t0';
    if (v.includes('T1')) return 'version-t1';
    if (v.includes('T2')) return 'version-t2';
    return 'version-t0';
  }

  if (loading) return <div className="loading"><div className="spinner"></div>加载枪械数据中...</div>;

  return (
    <div>
      <h1 className="page-title">有力气的改枪码</h1>
      <p className="page-subtitle">
        点击改枪码即可复制 · {guns.length} 把武器 · {guns.reduce((a, g) => a + g.variants.length, 0)} 个配置
      </p>

      {/* Category Filter */}
      <div className="filter-bar">
        {CATS.map(c => (
          <button key={c} className={`filter-chip ${filterCat === c ? 'active' : ''}`} onClick={() => setFilterCat(c)}>
            {c !== '全部' && (CAT_ICON[c] || '') + ' '}{c}
          </button>
        ))}
      </div>

      {/* Search + Version + Sort */}
      <div className="search-row">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input placeholder="搜索枪械名称、改装类型..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterVer} onChange={e => setFilterVer(e.target.value)}>
          {versions.map(v => <option key={v} value={v}>{v === '全部' ? '全部段位' : v}</option>)}
        </select>
        <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="default">默认排序</option>
          <option value="price_asc">价格 低→高</option>
          <option value="price_desc">价格 高→低</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="loading" style={{ color: 'var(--text-muted)' }}>没有找到匹配的枪械</div>
      ) : (
        filtered.map(gun => {
          const catC = CAT_COLOR[gun.category] || '#1ecc60';
          return (
            <div key={gun.id} className="gun-card">
              <div className="gun-card-header" style={{ background: `linear-gradient(135deg, ${catC}08 0%, transparent 50%)` }}>
                {gun.image_url ? (
                  <img src={gun.image_url} alt={gun.name} className="gun-header-img" />
                ) : (
                  <div className="gun-icon">{CAT_ICON[gun.category] || '🔫'}</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span className="gun-name">{gun.name}</span>
                    <span className="cat-badge" style={{
                      background: `${catC}18`, color: catC, border: `1px solid ${catC}33`
                    }}>
                      {CAT_ICON[gun.category] || ''} {gun.category}
                    </span>
                  </div>
                  <div className="gun-count">{gun.variants.length} 个配置方案</div>
                </div>
              </div>

              <div className="table-scroll">
                <table className="variants-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th style={{ width: 60 }}>段位</th>
                      <th style={{ width: 70 }}>价格</th>
                      <th style={{ width: 110 }}>改装类型</th>
                      <th>改枪码</th>
                      <th style={{ width: 85 }}>有效射程</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gun.variants.map((v, idx) => (
                      <tr key={v.id} onClick={() => copyCode(v.code)} style={{ cursor: 'pointer' }}>
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td><span className={`version-badge ${getVersionClass(v.version)}`}>{v.version}</span></td>
                        <td style={{ fontWeight: 600 }}>{v.price}</td>
                        <td>{v.mod_type}</td>
                        <td className="code-cell">{v.code}</td>
                        <td>{v.effective_range && <span className="range-badge">{v.effective_range}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Home;
