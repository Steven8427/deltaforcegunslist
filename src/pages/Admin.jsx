import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const CATS = ["突击步枪","战斗步枪","射手步枪","冲锋枪","机枪","狙击步枪","连狙","霰弹枪","手枪","弓弩"];

function Admin({ isAdmin, setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [guns, setGuns] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newGunName, setNewGunName] = useState('');
  const [newGunCategory, setNewGunCategory] = useState('突击步枪');
  const [newGunImage, setNewGunImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [selectedGunId, setSelectedGunId] = useState('');
  const [variantForm, setVariantForm] = useState({
    version: 'T0', price: '', mod_type: '', code: '', effective_range: '',
  });

  const [editingVariant, setEditingVariant] = useState(null);

  const fetchGuns = useCallback(async () => {
    setLoading(true);
    const { data: gunsData } = await supabase.from('guns').select('*').order('sort_order', { ascending: true });
    const { data: variantsData } = await supabase.from('gun_variants').select('*').order('sort_order', { ascending: true });
    if (gunsData && variantsData) {
      const merged = gunsData.map(gun => ({ ...gun, variants: variantsData.filter(v => v.gun_id === gun.id) }));
      setGuns(merged);
      if (!selectedGunId && gunsData.length > 0) setSelectedGunId(gunsData[0].id);
    }
    setLoading(false);
  }, [selectedGunId]);

  useEffect(() => { if (isAdmin) fetchGuns(); }, [isAdmin, fetchGuns]);

  async function handleLogin(e) {
    e.preventDefault();
    const { data, error } = await supabase.from('admins').select('*').eq('username', username).eq('password_hash', password).single();
    if (error || !data) { toast.error('用户名或密码错误'); return; }
    setIsAdmin(true);
    toast.success('登录成功！');
  }

  // === 图片上传 ===
  async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const { error } = await supabase.storage.from('gun-images').upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('gun-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  async function updateGunImage(gunId, file) {
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImage(file);
      await supabase.from('guns').update({ image_url: imageUrl }).eq('id', gunId);
      toast.success('图片更新成功！');
      fetchGuns();
    } catch (err) { toast.error('图片上传失败'); }
    setUploadingImage(false);
  }

  async function updateGunCategory(gunId, category) {
    await supabase.from('guns').update({ category }).eq('id', gunId);
    toast.success('分类已更新');
    fetchGuns();
  }

  // === 枪械 CRUD ===
  async function addGun() {
    if (!newGunName.trim()) { toast.error('请输入枪械名称'); return; }
    setUploadingImage(true);
    let imageUrl = null;
    try {
      if (newGunImage) imageUrl = await uploadImage(newGunImage);
    } catch { toast.error('图片上传失败'); setUploadingImage(false); return; }

    const maxSort = guns.reduce((max, g) => Math.max(max, g.sort_order || 0), 0);
    const { error } = await supabase.from('guns').insert({
      name: newGunName.trim(),
      category: newGunCategory,
      image_url: imageUrl,
      sort_order: maxSort + 1,
    });
    if (error) { toast.error('添加失败: ' + error.message); setUploadingImage(false); return; }

    toast.success(`${newGunName} 添加成功！`);
    setNewGunName('');
    setNewGunCategory('突击步枪');
    setNewGunImage(null);
    setUploadingImage(false);
    const fileInput = document.getElementById('gun-image-input');
    if (fileInput) fileInput.value = '';
    fetchGuns();
  }

  async function deleteGun(gunId, gunName) {
    if (!window.confirm(`确定删除 ${gunName} 及其所有改装码吗？`)) return;
    await supabase.from('guns').delete().eq('id', gunId);
    toast.success(`${gunName} 已删除`);
    if (selectedGunId === gunId) setSelectedGunId('');
    fetchGuns();
  }

  // === 改装码 CRUD ===
  async function addVariant() {
    if (!selectedGunId) { toast.error('请先选择枪械'); return; }
    if (!variantForm.code.trim() || !variantForm.mod_type.trim()) { toast.error('请填写完整信息'); return; }
    const gun = guns.find(g => g.id === selectedGunId);
    const maxSort = gun ? gun.variants.reduce((max, v) => Math.max(max, v.sort_order || 0), 0) : 0;
    const { error } = await supabase.from('gun_variants').insert({
      gun_id: selectedGunId, ...variantForm, sort_order: maxSort + 1,
    });
    if (error) { toast.error('添加失败'); return; }
    toast.success('改装码添加成功！');
    setVariantForm({ version: 'T0', price: '', mod_type: '', code: '', effective_range: '' });
    fetchGuns();
  }

  async function deleteVariant(variantId) {
    if (!window.confirm('确定删除？')) return;
    await supabase.from('gun_variants').delete().eq('id', variantId);
    toast.success('已删除');
    fetchGuns();
  }

  async function updateVariant() {
    if (!editingVariant) return;
    await supabase.from('gun_variants').update({
      version: editingVariant.version, price: editingVariant.price,
      mod_type: editingVariant.mod_type, code: editingVariant.code,
      effective_range: editingVariant.effective_range,
    }).eq('id', editingVariant.id);
    toast.success('更新成功！');
    setEditingVariant(null);
    fetchGuns();
  }

  // === 未登录 ===
  if (!isAdmin) {
    return (
      <div className="admin-login">
        <h2>⚙️ 管理员登录</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="请输入用户名" />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>登 录</button>
        </form>
      </div>
    );
  }

  // === 已登录 ===
  const selectedGun = guns.find(g => g.id === selectedGunId);

  return (
    <div className="admin-panel" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">管理后台</h1>
        <button className="btn btn-danger btn-small" onClick={() => { setIsAdmin(false); toast.success('已退出'); }}>
          退出登录
        </button>
      </div>

      {/* 添加新枪械 */}
      <div className="admin-section">
        <h3>➕ 添加新枪械</h3>
        <div className="form-row">
          <div className="form-group">
            <label>枪械名称</label>
            <input type="text" value={newGunName} onChange={e => setNewGunName(e.target.value)}
              placeholder="例如: AK-47" onKeyDown={e => e.key === 'Enter' && addGun()} />
          </div>
          <div className="form-group">
            <label>分类</label>
            <select value={newGunCategory} onChange={e => setNewGunCategory(e.target.value)}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>枪械图片</label>
            <input id="gun-image-input" type="file" accept="image/*"
              onChange={e => setNewGunImage(e.target.files[0] || null)} style={{ padding: '7px 10px' }} />
          </div>
        </div>
        {newGunImage && (
          <div style={{ marginBottom: 12 }}>
            <img src={URL.createObjectURL(newGunImage)} alt="预览"
              style={{ height: 60, borderRadius: 8, border: '1px solid var(--border)' }} />
          </div>
        )}
        <button className="btn btn-primary" onClick={addGun} disabled={uploadingImage}>
          {uploadingImage ? '上传中...' : '添加枪械'}
        </button>
      </div>

      {/* 枪械列表 */}
      <div className="admin-section">
        <h3>📋 枪械列表 ({guns.length})</h3>
        {loading ? (
          <div className="loading"><div className="spinner"></div>加载中...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {guns.map(gun => (
              <div key={gun.id} className="admin-gun-item"
                style={selectedGunId === gun.id ? { borderColor: 'var(--accent-dim)' } : {}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  {gun.image_url ? (
                    <img src={gun.image_url} alt={gun.name}
                      style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, background: 'rgba(30,204,96,0.06)' }} />
                  ) : (
                    <span style={{ fontSize: 16 }}>🔫</span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{gun.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select value={gun.category || '突击步枪'}
                        onChange={e => updateGunCategory(gun.id, e.target.value)}
                        style={{
                          padding: '1px 4px', fontSize: 10, background: 'var(--bg-primary)',
                          color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
                        }}>
                        {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span>· {gun.variants.length} 配置</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                  <label className="btn btn-small" style={{ cursor: 'pointer', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    📷 {gun.image_url ? '换图' : '传图'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files[0]) updateGunImage(gun.id, e.target.files[0]); }} />
                  </label>
                  <button className="btn btn-success btn-small" onClick={() => setSelectedGunId(gun.id)}>管理</button>
                  <button className="btn btn-danger btn-small" onClick={() => deleteGun(gun.id, gun.name)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 管理改装码 */}
      {selectedGun && (
        <div className="admin-section">
          <h3>🛠️ {selectedGun.name}
            <span style={{
              marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: 11,
              background: 'rgba(30,204,96,0.1)', color: 'var(--accent)', border: '1px solid rgba(30,204,96,0.2)',
            }}>
              {selectedGun.category}
            </span>
          </h3>

          {/* 添加改装码 */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--accent)', fontSize: 13 }}>
              添加新改装码
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>段位</label>
                <select value={variantForm.version}
                  onChange={e => setVariantForm({ ...variantForm, version: e.target.value })}>
                  {['T0','T1','T2','T3','T4','狙击','连狙','手枪','弓弩'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>改装价格</label>
                <input type="text" value={variantForm.price}
                  onChange={e => setVariantForm({ ...variantForm, price: e.target.value })} placeholder="85w" />
              </div>
              <div className="form-group">
                <label>改装类型</label>
                <input type="text" value={variantForm.mod_type}
                  onChange={e => setVariantForm({ ...variantForm, mod_type: e.target.value })} placeholder="满改大弹鼓" />
              </div>
              <div className="form-group">
                <label>有效射程</label>
                <input type="text" value={variantForm.effective_range}
                  onChange={e => setVariantForm({ ...variantForm, effective_range: e.target.value })} placeholder="52米" />
              </div>
            </div>
            <div className="form-group">
              <label>改枪码</label>
              <input type="text" value={variantForm.code}
                onChange={e => setVariantForm({ ...variantForm, code: e.target.value })} placeholder="输入完整改枪码" />
            </div>
            <button className="btn btn-primary" onClick={addVariant} style={{ marginTop: 4 }}>添加改装码</button>
          </div>

          {/* 已有改装码 */}
          <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)', fontSize: 12 }}>
            已有配置 ({selectedGun.variants.length})
          </div>
          <div className="table-scroll">
            <table className="variants-table">
              <thead>
                <tr>
                  <th>段位</th><th>价格</th><th>改装类型</th><th>改枪码</th><th>射程</th><th style={{ width: 120 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {selectedGun.variants.map(variant => (
                  <tr key={variant.id}>
                    {editingVariant && editingVariant.id === variant.id ? (
                      <>
                        <td>
                          <select value={editingVariant.version}
                            onChange={e => setEditingVariant({ ...editingVariant, version: e.target.value })}
                            style={{ width: 65, padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}>
                            {['T0','T1','T2','T3','狙击','连狙','手枪','弓弩'].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </td>
                        <td><input value={editingVariant.price} onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value })}
                          style={{ width: 55, padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /></td>
                        <td><input value={editingVariant.mod_type} onChange={e => setEditingVariant({ ...editingVariant, mod_type: e.target.value })}
                          style={{ width: 90, padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /></td>
                        <td><input value={editingVariant.code} onChange={e => setEditingVariant({ ...editingVariant, code: e.target.value })}
                          style={{ width: '100%', padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'monospace', fontSize: 10 }} /></td>
                        <td><input value={editingVariant.effective_range} onChange={e => setEditingVariant({ ...editingVariant, effective_range: e.target.value })}
                          style={{ width: 55, padding: 3, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-success btn-small" onClick={updateVariant}>保存</button>
                            <button className="btn btn-small" onClick={() => setEditingVariant(null)} style={{ color: 'var(--text-muted)' }}>取消</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td><span className={`version-badge version-${variant.version.toLowerCase()}`}>{variant.version}</span></td>
                        <td style={{ fontWeight: 600 }}>{variant.price}</td>
                        <td>{variant.mod_type}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', wordBreak: 'break-all' }}>{variant.code}</td>
                        <td>{variant.effective_range && <span className="range-badge">{variant.effective_range}</span>}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-success btn-small" onClick={() => setEditingVariant({ ...variant })}>编辑</button>
                            <button className="btn btn-danger btn-small" onClick={() => deleteVariant(variant.id)}>删除</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;