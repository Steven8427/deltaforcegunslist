import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

function Home() {
  const [guns, setGuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchGuns();
  }, []);

  async function fetchGuns() {
    setLoading(true);
    const { data: gunsData, error: gunsError } = await supabase
      .from('guns')
      .select('*')
      .order('sort_order', { ascending: true });

    if (gunsError) {
      console.error(gunsError);
      setLoading(false);
      return;
    }

    const { data: variantsData, error: variantsError } = await supabase
      .from('gun_variants')
      .select('*')
      .order('sort_order', { ascending: true });

    if (variantsError) {
      console.error(variantsError);
      setLoading(false);
      return;
    }

    const gunsWithVariants = gunsData.map(gun => ({
      ...gun,
      variants: variantsData.filter(v => v.gun_id === gun.id)
    }));

    setGuns(gunsWithVariants);
    setLoading(false);
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
      toast.success('改枪码已复制！');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success('改枪码已复制！');
    });
  }

  function getVersionClass(version) {
    const v = version.toUpperCase();
    if (v.includes('T0')) return 'version-t0';
    if (v.includes('T1')) return 'version-t1';
    return 'version-t2';
  }

  const filteredGuns = guns.filter(gun => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    if (gun.name.toLowerCase().includes(s)) return true;
    return gun.variants.some(v =>
      v.mod_type.toLowerCase().includes(s) ||
      v.code.toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        加载枪械数据中...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">改枪码大全</h1>
      <p className="page-subtitle">
        点击改枪码即可复制 · 共收录 {guns.length} 把武器 · {guns.reduce((a, g) => a + g.variants.length, 0)} 个配置
      </p>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索枪械名称、改装类型..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filteredGuns.length === 0 ? (
        <div className="loading" style={{ color: 'var(--text-muted)' }}>
          没有找到匹配的枪械
        </div>
      ) : (
        filteredGuns.map(gun => (
          <div key={gun.id} className="gun-card">
            <div className="gun-card-header">
              <div className="gun-icon">🔫</div>
              <div>
                <div className="gun-name">{gun.name}</div>
                <div className="gun-count">{gun.variants.length} 个配置方案</div>
              </div>
            </div>

            <div className="table-scroll">
              <table className="variants-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th style={{ width: '70px' }}>段位</th>
                    <th style={{ width: '80px' }}>价格</th>
                    <th style={{ width: '120px' }}>改装类型</th>
                    <th>改枪码</th>
                    <th style={{ width: '90px' }}>有效射程</th>
                  </tr>
                </thead>
                <tbody>
                  {gun.variants.map((variant, idx) => (
                    <tr key={variant.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <span className={`version-badge ${getVersionClass(variant.version)}`}>
                          {variant.version}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{variant.price}</td>
                      <td>{variant.mod_type}</td>
                      <td
                        className="code-cell"
                        onClick={() => copyCode(variant.code)}
                        title="点击复制"
                      >
                        {variant.code}
                        <span className="copy-hint">点击复制</span>
                      </td>
                      <td>
                        <span className="range-badge">{variant.effective_range}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Home;
