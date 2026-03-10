import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function Landing() {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gunCounts, setGunCounts] = useState({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: authorsData } = await supabase.from('authors').select('*').order('sort_order', { ascending: true });
      const { data: gunsData } = await supabase.from('guns').select('id, author_id');
      const { data: variantsData } = await supabase.from('gun_variants').select('gun_id');

      if (authorsData) setAuthors(authorsData);

      // 统计每个作者的枪械数和配置数
      if (gunsData && variantsData) {
        const counts = {};
        authorsData?.forEach(a => {
          const authorGuns = gunsData.filter(g => g.author_id === a.id);
          const authorGunIds = new Set(authorGuns.map(g => g.id));
          const variantCount = variantsData.filter(v => authorGunIds.has(v.gun_id)).length;
          counts[a.id] = { guns: authorGuns.length, variants: variantCount };
        });
        setGunCounts(counts);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner"></div>加载中...</div>;
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 40, paddingTop: 20 }}>
        <img src="/logo.png" alt="logo" style={{ width: 90, height: 90, objectFit: 'contain', marginBottom: 16 }}
          onError={e => { e.target.style.display = 'none'; }} />
        <h1 className="page-title" style={{ fontSize: 28, marginBottom: 8 }}>有力气的改枪码</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 500, margin: '0 auto' }}>
          三角洲行动改枪码大全 · 多位大神的改枪方案 · 点击进入查看
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        maxWidth: 900,
        margin: '0 auto',
      }}>
        {authors.map(author => {
          const c = gunCounts[author.id] || { guns: 0, variants: 0 };
          return (
            <Link to={`/author/${author.slug}`} key={author.id} style={{ textDecoration: 'none' }}>
              <div className="author-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt={author.name}
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', background: 'rgba(30,204,96,0.12)',
                      border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, flexShrink: 0,
                    }}>
                      {author.name.charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent-bright)', marginBottom: 4 }}>
                      {author.name}
                    </div>
                    {author.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {author.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span className="author-stat">🔫 {c.guns} 把武器</span>
                      <span className="author-stat">📋 {c.variants} 个配置</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--accent)', fontSize: 20, flexShrink: 0 }}>→</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {authors.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          暂无作者，请管理员添加
        </div>
      )}
    </div>
  );
}

export default Landing;
