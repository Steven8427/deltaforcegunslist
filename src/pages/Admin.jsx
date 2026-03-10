import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const CATS = ["突击步枪","战斗步枪","射手步枪","冲锋枪","机枪","狙击步枪","连狙","霰弹枪","手枪","弓弩"];

function Admin({ isAdmin, setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('authors');
  const [authors, setAuthors] = useState([]);
  const [guns, setGuns] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newAuthor, setNewAuthor] = useState({ name: '', slug: '', description: '' });
  const [newAuthorAvatar, setNewAuthorAvatar] = useState(null);
  const [editingAuthor, setEditingAuthor] = useState(null);

  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [newGunName, setNewGunName] = useState('');
  const [newGunCategory, setNewGunCategory] = useState('突击步枪');
  const [newGunImage, setNewGunImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [selectedGunId, setSelectedGunId] = useState('');
  const [variantForm, setVariantForm] = useState({ version: 'T0', price: '', mod_type: '', code: '', effective_range: '' });
  const [editingVariant, setEditingVariant] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: a } = await supabase.from('authors').select('*').order('sort_order');
    const { data: g } = await supabase.from('guns').select('*').order('sort_order');
    const { data: v } = await supabase.from('gun_variants').select('*').order('sort_order');
    if (a) setAuthors(a);
    if (g && v) setGuns(g.map(gun => ({ ...gun, variants: (v || []).filter(x => x.gun_id === gun.id) })));
    if (a?.length && !selectedAuthorId) setSelectedAuthorId(a[0].id);
    setLoading(false);
  }, [selectedAuthorId]);

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin, fetchAll]);

  async function handleLogin(e) {
    e.preventDefault();
    const { data, error } = await supabase.from('admins').select('*').eq('username', username).eq('password_hash', password).single();
    if (error || !data) { toast.error('用户名或密码错误'); return; }
    setIsAdmin(true); toast.success('登录成功！');
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const name = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const { error } = await supabase.storage.from('gun-images').upload(name, file);
    if (error) throw error;
    return supabase.storage.from('gun-images').getPublicUrl(name).data.publicUrl;
  }

  // 作者
  async function addAuthor() {
    if (!newAuthor.name.trim() || !newAuthor.slug.trim()) { toast.error('名称和slug必填'); return; }
    setUploadingImage(true);
    let avatarUrl = null;
    try { if (newAuthorAvatar) avatarUrl = await uploadImage(newAuthorAvatar); } catch { toast.error('头像上传失败'); setUploadingImage(false); return; }
    const mx = authors.reduce((m, a) => Math.max(m, a.sort_order || 0), 0);
    const { error } = await supabase.from('authors').insert({ name: newAuthor.name.trim(), slug: newAuthor.slug.trim().toLowerCase(), description: newAuthor.description, avatar_url: avatarUrl, sort_order: mx + 1 });
    if (error) { toast.error('失败: ' + error.message); setUploadingImage(false); return; }
    toast.success(`${newAuthor.name} 添加成功！`);
    setNewAuthor({ name: '', slug: '', description: '' }); setNewAuthorAvatar(null); setUploadingImage(false); fetchAll();
  }

  async function deleteAuthor(id, name) {
    if (!window.confirm(`删除 ${name}？其下所有枪械也会被删除！`)) return;
    const ag = guns.filter(g => g.author_id === id);
    for (const g of ag) { await supabase.from('gun_variants').delete().eq('gun_id', g.id); await supabase.from('guns').delete().eq('id', g.id); }
    await supabase.from('authors').delete().eq('id', id);
    toast.success(`${name} 已删除`); fetchAll();
  }

  async function updateAuthorAvatar(id, file) {
    try { const url = await uploadImage(file); await supabase.from('authors').update({ avatar_url: url }).eq('id', id); toast.success('头像更新！'); fetchAll(); } catch { toast.error('失败'); }
  }

  async function saveAuthorEdit() {
    if (!editingAuthor) return;
    if (!editingAuthor.name.trim() || !editingAuthor.slug.trim()) { toast.error('名称和slug不能为空'); return; }
    const { error } = await supabase.from('authors').update({ name: editingAuthor.name.trim(), slug: editingAuthor.slug.trim().toLowerCase(), description: editingAuthor.description || '' }).eq('id', editingAuthor.id);
    if (error) { toast.error('失败: ' + error.message); return; }
    toast.success('作者信息已更新！'); setEditingAuthor(null); fetchAll();
  }

  // 枪械
  const authorGuns = guns.filter(g => g.author_id === selectedAuthorId);
  const selectedGun = guns.find(g => g.id === selectedGunId);

  async function addGun() {
    if (!selectedAuthorId) { toast.error('请先选择作者'); return; }
    if (!newGunName.trim()) { toast.error('请输入名称'); return; }
    setUploadingImage(true);
    let imageUrl = null;
    try { if (newGunImage) imageUrl = await uploadImage(newGunImage); } catch { toast.error('图片失败'); setUploadingImage(false); return; }
    const mx = guns.reduce((m, g) => Math.max(m, g.sort_order || 0), 0);
    await supabase.from('guns').insert({ name: newGunName.trim(), category: newGunCategory, image_url: imageUrl, author_id: selectedAuthorId, sort_order: mx + 1 });
    toast.success(`${newGunName} 添加成功！`); setNewGunName(''); setNewGunCategory('突击步枪'); setNewGunImage(null); setUploadingImage(false); fetchAll();
  }

  async function deleteGun(id, name) { if (!window.confirm(`删除 ${name}？`)) return; await supabase.from('guns').delete().eq('id', id); toast.success('已删除'); if (selectedGunId === id) setSelectedGunId(''); fetchAll(); }
  async function updateGunImage(id, file) { try { const url = await uploadImage(file); await supabase.from('guns').update({ image_url: url }).eq('id', id); toast.success('更新！'); fetchAll(); } catch { toast.error('失败'); } }
  async function updateGunCategory(id, cat) { await supabase.from('guns').update({ category: cat }).eq('id', id); toast.success('已更新'); fetchAll(); }

  // 改装码
  async function addVariant() {
    if (!selectedGunId || !variantForm.code.trim() || !variantForm.mod_type.trim()) { toast.error('填写完整'); return; }
    const gun = guns.find(g => g.id === selectedGunId);
    const mx = gun ? gun.variants.reduce((m, v) => Math.max(m, v.sort_order || 0), 0) : 0;
    await supabase.from('gun_variants').insert({ gun_id: selectedGunId, ...variantForm, sort_order: mx + 1 });
    toast.success('添加成功！'); setVariantForm({ version: 'T0', price: '', mod_type: '', code: '', effective_range: '' }); fetchAll();
  }
  async function deleteVariant(id) { if (!window.confirm('确定？')) return; await supabase.from('gun_variants').delete().eq('id', id); toast.success('已删除'); fetchAll(); }
  async function updateVariant() {
    if (!editingVariant) return;
    await supabase.from('gun_variants').update({ version: editingVariant.version, price: editingVariant.price, mod_type: editingVariant.mod_type, code: editingVariant.code, effective_range: editingVariant.effective_range }).eq('id', editingVariant.id);
    toast.success('更新成功！'); setEditingVariant(null); fetchAll();
  }

  // 未登录
  if (!isAdmin) {
    return (
      <div className="admin-login">
        <h2>⚙️ 管理员登录</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group"><label>用户名</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" /></div>
          <div className="form-group"><label>密码</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>登 录</button>
        </form>
      </div>
    );
  }

  const selAuthor = authors.find(a => a.id === selectedAuthorId);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">管理后台</h1>
        <button className="btn btn-danger btn-small" onClick={() => { setIsAdmin(false); toast.success('已退出'); }}>退出</button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[['authors', '👤 作者管理'], ['guns', '🔫 枪械管理']].map(([k, l]) => (
          <button key={k} className={`filter-chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ===== 作者管理 ===== */}
      {tab === 'authors' && (<>
        <div className="admin-section">
          <h3>➕ 添加作者/主播</h3>
          <div className="form-row">
            <div className="form-group"><label>名称</label><input type="text" value={newAuthor.name} onChange={e => setNewAuthor({ ...newAuthor, name: e.target.value })} placeholder="聪聪" /></div>
            <div className="form-group"><label>Slug (网址路径)</label><input type="text" value={newAuthor.slug} onChange={e => setNewAuthor({ ...newAuthor, slug: e.target.value.replace(/\s/g, '') })} placeholder="congcong" /></div>
            <div className="form-group"><label>简介</label><input type="text" value={newAuthor.description} onChange={e => setNewAuthor({ ...newAuthor, description: e.target.value })} placeholder="一句话简介" /></div>
            <div className="form-group"><label>头像</label><input type="file" accept="image/*" onChange={e => setNewAuthorAvatar(e.target.files[0] || null)} style={{ padding: '7px 10px' }} /></div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            填 <code style={{ color: 'var(--accent)' }}>congcong</code> → 访问 <code style={{ color: 'var(--accent)' }}>/author/congcong</code>
          </p>
          <button className="btn btn-primary" onClick={addAuthor} disabled={uploadingImage}>{uploadingImage ? '上传中...' : '添加作者'}</button>
        </div>

        <div className="admin-section">
          <h3>📋 作者列表 ({authors.length})</h3>
          {authors.map(a => (
            <div key={a.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              {editingAuthor?.id === a.id ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
                      : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(30,204,96,0.1)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{a.name.charAt(0)}</div>
                    }
                    <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>编辑作者信息</span>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>名称</label><input type="text" value={editingAuthor.name} onChange={e => setEditingAuthor({ ...editingAuthor, name: e.target.value })} /></div>
                    <div className="form-group"><label>Slug</label><input type="text" value={editingAuthor.slug} onChange={e => setEditingAuthor({ ...editingAuthor, slug: e.target.value.replace(/\s/g, '') })} /></div>
                    <div className="form-group"><label>简介</label><input type="text" value={editingAuthor.description || ''} onChange={e => setEditingAuthor({ ...editingAuthor, description: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button className="btn btn-primary btn-small" onClick={saveAuthorEdit}>保存</button>
                    <button className="btn btn-small" onClick={() => setEditingAuthor(null)} style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>取消</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
                      : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(30,204,96,0.1)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{a.name.charAt(0)}</div>
                    }
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        /{a.slug} · {guns.filter(g => g.author_id === a.id).length} 把枪
                        {a.description && <span> · {a.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <label className="btn btn-small" style={{ cursor: 'pointer', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      📷 头像<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) updateAuthorAvatar(a.id, e.target.files[0]); }} />
                    </label>
                    <button className="btn btn-success btn-small" onClick={() => setEditingAuthor({ ...a })}>✏️ 编辑</button>
                    <button className="btn btn-danger btn-small" onClick={() => deleteAuthor(a.id, a.name)}>删除</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </>)}

      {/* ===== 枪械管理 ===== */}
      {tab === 'guns' && (<>
        <div className="admin-section">
          <h3>👤 选择作者</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {authors.map(a => (
              <button key={a.id} className={`filter-chip ${selectedAuthorId === a.id ? 'active' : ''}`}
                onClick={() => { setSelectedAuthorId(a.id); setSelectedGunId(''); }}>{a.name} ({guns.filter(g => g.author_id === a.id).length})</button>
            ))}
          </div>
        </div>

        {selAuthor && (<>
          <div className="admin-section">
            <h3>➕ 给「{selAuthor.name}」添加枪械</h3>
            <div className="form-row">
              <div className="form-group"><label>名称</label><input type="text" value={newGunName} onChange={e => setNewGunName(e.target.value)} placeholder="AK-47" /></div>
              <div className="form-group"><label>分类</label><select value={newGunCategory} onChange={e => setNewGunCategory(e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="form-group"><label>图片</label><input type="file" accept="image/*" onChange={e => setNewGunImage(e.target.files[0] || null)} style={{ padding: '7px 10px' }} /></div>
            </div>
            <button className="btn btn-primary" onClick={addGun} disabled={uploadingImage}>{uploadingImage ? '上传中...' : '添加'}</button>
          </div>

          <div className="admin-section">
            <h3>📋 {selAuthor.name} 的枪械 ({authorGuns.length})</h3>
            {authorGuns.map(gun => (
              <div key={gun.id} className="admin-gun-item" style={selectedGunId === gun.id ? { borderColor: 'var(--accent-dim)' } : {}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  {gun.image_url ? <img src={gun.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 5, background: 'rgba(30,204,96,0.06)' }} /> : <span>🔫</span>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{gun.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select value={gun.category || '突击步枪'} onChange={e => updateGunCategory(gun.id, e.target.value)}
                        style={{ padding: '1px 4px', fontSize: 10, background: 'var(--bg-primary)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
                        {CATS.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <span>· {gun.variants.length} 配置</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <label className="btn btn-small" style={{ cursor: 'pointer', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>📷<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) updateGunImage(gun.id, e.target.files[0]); }} /></label>
                  <button className="btn btn-success btn-small" onClick={() => setSelectedGunId(gun.id)}>管理</button>
                  <button className="btn btn-danger btn-small" onClick={() => deleteGun(gun.id, gun.name)}>删</button>
                </div>
              </div>
            ))}
          </div>

          {selectedGun && (
            <div className="admin-section">
              <h3>🛠️ {selectedGun.name} <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: 11, background: 'rgba(30,204,96,0.1)', color: 'var(--accent)', border: '1px solid rgba(30,204,96,0.2)' }}>{selectedGun.category}</span></h3>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--accent)', fontSize: 13 }}>添加改装码</div>
                <div className="form-row">
                  <div className="form-group"><label>段位</label><select value={variantForm.version} onChange={e => setVariantForm({ ...variantForm, version: e.target.value })}>{['T0','T1','T2','T3','T4','狙击','连狙','手枪','弓弩'].map(t => <option key={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label>价格</label><input type="text" value={variantForm.price} onChange={e => setVariantForm({ ...variantForm, price: e.target.value })} placeholder="85w" /></div>
                  <div className="form-group"><label>类型</label><input type="text" value={variantForm.mod_type} onChange={e => setVariantForm({ ...variantForm, mod_type: e.target.value })} placeholder="满改" /></div>
                  <div className="form-group"><label>射程</label><input type="text" value={variantForm.effective_range} onChange={e => setVariantForm({ ...variantForm, effective_range: e.target.value })} placeholder="52米" /></div>
                </div>
                <div className="form-group"><label>改枪码</label><input type="text" value={variantForm.code} onChange={e => setVariantForm({ ...variantForm, code: e.target.value })} placeholder="完整改枪码" /></div>
                <button className="btn btn-primary" onClick={addVariant}>添加</button>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)', fontSize: 12 }}>已有 ({selectedGun.variants.length})</div>
              <div className="table-scroll">
                <table className="variants-table">
                  <thead><tr><th>段位</th><th>价格</th><th>类型</th><th>改枪码</th><th>射程</th><th style={{ width: 110 }}>操作</th></tr></thead>
                  <tbody>
                    {selectedGun.variants.map(v => (
                      <tr key={v.id}>
                        {editingVariant?.id === v.id ? (<>
                          <td><select value={editingVariant.version} onChange={e => setEditingVariant({ ...editingVariant, version: e.target.value })} style={{ width: 60, padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}>{['T0','T1','T2','T3','狙击','连狙','手枪','弓弩'].map(t => <option key={t}>{t}</option>)}</select></td>
                          <td><input value={editingVariant.price} onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value })} style={{ width: 50, padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /></td>
                          <td><input value={editingVariant.mod_type} onChange={e => setEditingVariant({ ...editingVariant, mod_type: e.target.value })} style={{ width: 80, padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /></td>
                          <td><input value={editingVariant.code} onChange={e => setEditingVariant({ ...editingVariant, code: e.target.value })} style={{ width: '100%', padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'monospace', fontSize: 10 }} /></td>
                          <td><input value={editingVariant.effective_range} onChange={e => setEditingVariant({ ...editingVariant, effective_range: e.target.value })} style={{ width: 50, padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /></td>
                          <td><div style={{ display: 'flex', gap: 3 }}><button className="btn btn-success btn-small" onClick={updateVariant}>存</button><button className="btn btn-small" onClick={() => setEditingVariant(null)} style={{ color: 'var(--text-muted)' }}>消</button></div></td>
                        </>) : (<>
                          <td><span className={`version-badge version-${v.version.toLowerCase()}`}>{v.version}</span></td>
                          <td style={{ fontWeight: 600 }}>{v.price}</td>
                          <td>{v.mod_type}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', wordBreak: 'break-all' }}>{v.code}</td>
                          <td>{v.effective_range && <span className="range-badge">{v.effective_range}</span>}</td>
                          <td><div style={{ display: 'flex', gap: 3 }}><button className="btn btn-success btn-small" onClick={() => setEditingVariant({ ...v })}>编</button><button className="btn btn-danger btn-small" onClick={() => deleteVariant(v.id)}>删</button></div></td>
                        </>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>)}
      </>)}
    </div>
  );
}

export default Admin;