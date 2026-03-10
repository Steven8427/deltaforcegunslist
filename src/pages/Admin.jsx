import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

function Admin({ isAdmin, setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [guns, setGuns] = useState([]);
  const [loading, setLoading] = useState(false);

  // 新增枪械表单
  const [newGunName, setNewGunName] = useState('');

  // 新增改装码表单
  const [selectedGunId, setSelectedGunId] = useState('');
  const [variantForm, setVariantForm] = useState({
    version: 'T0',
    price: '',
    mod_type: '',
    code: '',
    effective_range: '',
  });

  // 编辑状态
  const [editingVariant, setEditingVariant] = useState(null);

  const fetchGuns = useCallback(async () => {
    setLoading(true);
    const { data: gunsData } = await supabase
      .from('guns')
      .select('*')
      .order('sort_order', { ascending: true });

    const { data: variantsData } = await supabase
      .from('gun_variants')
      .select('*')
      .order('sort_order', { ascending: true });

    if (gunsData && variantsData) {
      const gunsWithVariants = gunsData.map(gun => ({
        ...gun,
        variants: variantsData.filter(v => v.gun_id === gun.id),
      }));
      setGuns(gunsWithVariants);
      if (!selectedGunId && gunsData.length > 0) {
        setSelectedGunId(gunsData[0].id);
      }
    }
    setLoading(false);
  }, [selectedGunId]);

  useEffect(() => {
    if (isAdmin) fetchGuns();
  }, [isAdmin, fetchGuns]);

  async function handleLogin(e) {
    e.preventDefault();
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .eq('password_hash', password)
      .single();

    if (error || !data) {
      toast.error('用户名或密码错误');
      return;
    }

    setIsAdmin(true);
    toast.success('登录成功！');
  }

  // ===== 枪械 CRUD =====
  async function addGun() {
    if (!newGunName.trim()) {
      toast.error('请输入枪械名称');
      return;
    }

    const maxSort = guns.reduce((max, g) => Math.max(max, g.sort_order || 0), 0);
    const { error } = await supabase.from('guns').insert({
      name: newGunName.trim(),
      sort_order: maxSort + 1,
    });

    if (error) {
      toast.error('添加失败: ' + error.message);
      return;
    }

    toast.success(`${newGunName} 添加成功！`);
    setNewGunName('');
    fetchGuns();
  }

  async function deleteGun(gunId, gunName) {
    if (!window.confirm(`确定删除 ${gunName} 及其所有改装码吗？`)) return;

    const { error } = await supabase.from('guns').delete().eq('id', gunId);
    if (error) {
      toast.error('删除失败');
      return;
    }

    toast.success(`${gunName} 已删除`);
    if (selectedGunId === gunId) setSelectedGunId('');
    fetchGuns();
  }

  // ===== 改装码 CRUD =====
  async function addVariant() {
    if (!selectedGunId) {
      toast.error('请先选择枪械');
      return;
    }
    if (!variantForm.code.trim() || !variantForm.mod_type.trim()) {
      toast.error('请填写完整信息');
      return;
    }

    const gun = guns.find(g => g.id === selectedGunId);
    const maxSort = gun ? gun.variants.reduce((max, v) => Math.max(max, v.sort_order || 0), 0) : 0;

    const { error } = await supabase.from('gun_variants').insert({
      gun_id: selectedGunId,
      version: variantForm.version,
      price: variantForm.price,
      mod_type: variantForm.mod_type,
      code: variantForm.code,
      effective_range: variantForm.effective_range,
      sort_order: maxSort + 1,
    });

    if (error) {
      toast.error('添加失败: ' + error.message);
      return;
    }

    toast.success('改装码添加成功！');
    setVariantForm({ version: 'T0', price: '', mod_type: '', code: '', effective_range: '' });
    fetchGuns();
  }

  async function deleteVariant(variantId) {
    if (!window.confirm('确定删除这条改装码吗？')) return;

    const { error } = await supabase.from('gun_variants').delete().eq('id', variantId);
    if (error) {
      toast.error('删除失败');
      return;
    }
    toast.success('已删除');
    fetchGuns();
  }

  async function updateVariant() {
    if (!editingVariant) return;

    const { error } = await supabase
      .from('gun_variants')
      .update({
        version: editingVariant.version,
        price: editingVariant.price,
        mod_type: editingVariant.mod_type,
        code: editingVariant.code,
        effective_range: editingVariant.effective_range,
      })
      .eq('id', editingVariant.id);

    if (error) {
      toast.error('更新失败');
      return;
    }
    toast.success('更新成功！');
    setEditingVariant(null);
    fetchGuns();
  }

  // ===== 未登录 - 登录页 =====
  if (!isAdmin) {
    return (
      <div className="admin-login">
        <h2>⚙️ 管理员登录</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
            登 录
          </button>
        </form>
      </div>
    );
  }

  // ===== 已登录 - 管理面板 =====
  const selectedGun = guns.find(g => g.id === selectedGunId);

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">管理后台</h1>
        <button
          className="btn btn-danger btn-small"
          onClick={() => { setIsAdmin(false); toast.success('已退出'); }}
        >
          退出登录
        </button>
      </div>

      {/* 添加新枪械 */}
      <div className="admin-section">
        <h3>➕ 添加新枪械</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>枪械名称</label>
            <input
              type="text"
              value={newGunName}
              onChange={e => setNewGunName(e.target.value)}
              placeholder="例如: AK-47"
              onKeyDown={e => e.key === 'Enter' && addGun()}
            />
          </div>
          <button className="btn btn-primary" onClick={addGun}>
            添加枪械
          </button>
        </div>
      </div>

      {/* 枪械列表 */}
      <div className="admin-section">
        <h3>📋 枪械列表 ({guns.length})</h3>
        {loading ? (
          <div className="loading"><div className="spinner"></div>加载中...</div>
        ) : (
          <div className="admin-gun-list">
            {guns.map(gun => (
              <div
                key={gun.id}
                className="admin-gun-item"
                style={selectedGunId === gun.id ? { borderColor: 'var(--accent-dim)' } : {}}
              >
                <div className="admin-gun-info">
                  <span style={{ fontSize: 18 }}>🔫</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{gun.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {gun.variants.length} 个配置
                    </div>
                  </div>
                </div>
                <div className="admin-gun-actions">
                  <button
                    className="btn btn-success btn-small"
                    onClick={() => setSelectedGunId(gun.id)}
                  >
                    管理配置
                  </button>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => deleteGun(gun.id, gun.name)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 管理改装码 */}
      {selectedGun && (
        <div className="admin-section">
          <h3>🛠️ 管理改装码 - {selectedGun.name}</h3>

          {/* 添加改装码表单 */}
          <div className="admin-variant-form">
            <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--accent)' }}>
              添加新改装码
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>段位 (版本)</label>
                <select
                  value={variantForm.version}
                  onChange={e => setVariantForm({...variantForm, version: e.target.value})}
                >
                  <option value="T0">T0</option>
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                  <option value="T3">T3</option>
                  <option value="T4">T4</option>
                </select>
              </div>
              <div className="form-group">
                <label>改装价格</label>
                <input
                  type="text"
                  value={variantForm.price}
                  onChange={e => setVariantForm({...variantForm, price: e.target.value})}
                  placeholder="例如: 85w"
                />
              </div>
              <div className="form-group">
                <label>改装类型</label>
                <input
                  type="text"
                  value={variantForm.mod_type}
                  onChange={e => setVariantForm({...variantForm, mod_type: e.target.value})}
                  placeholder="例如: 满改大弹鼓"
                />
              </div>
              <div className="form-group">
                <label>有效射程</label>
                <input
                  type="text"
                  value={variantForm.effective_range}
                  onChange={e => setVariantForm({...variantForm, effective_range: e.target.value})}
                  placeholder="例如: 52米"
                />
              </div>
            </div>
            <div className="form-group">
              <label>改枪码</label>
              <input
                type="text"
                value={variantForm.code}
                onChange={e => setVariantForm({...variantForm, code: e.target.value})}
                placeholder="输入完整改枪码"
              />
            </div>
            <button className="btn btn-primary" onClick={addVariant} style={{ marginTop: 4 }}>
              添加改装码
            </button>
          </div>

          {/* 已有改装码列表 */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
              已有配置 ({selectedGun.variants.length})
            </div>
            <div className="table-scroll">
              <table className="variants-table">
                <thead>
                  <tr>
                    <th>段位</th>
                    <th>价格</th>
                    <th>改装类型</th>
                    <th>改枪码</th>
                    <th>射程</th>
                    <th style={{ width: '140px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGun.variants.map(variant => (
                    <tr key={variant.id}>
                      {editingVariant && editingVariant.id === variant.id ? (
                        <>
                          <td>
                            <select
                              value={editingVariant.version}
                              onChange={e => setEditingVariant({...editingVariant, version: e.target.value})}
                              style={{ width: '60px', padding: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}
                            >
                              <option>T0</option>
                              <option>T1</option>
                              <option>T2</option>
                              <option>T3</option>
                            </select>
                          </td>
                          <td>
                            <input
                              value={editingVariant.price}
                              onChange={e => setEditingVariant({...editingVariant, price: e.target.value})}
                              style={{ width: '60px', padding: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}
                            />
                          </td>
                          <td>
                            <input
                              value={editingVariant.mod_type}
                              onChange={e => setEditingVariant({...editingVariant, mod_type: e.target.value})}
                              style={{ width: '100px', padding: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}
                            />
                          </td>
                          <td>
                            <input
                              value={editingVariant.code}
                              onChange={e => setEditingVariant({...editingVariant, code: e.target.value})}
                              style={{ width: '100%', padding: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}
                            />
                          </td>
                          <td>
                            <input
                              value={editingVariant.effective_range}
                              onChange={e => setEditingVariant({...editingVariant, effective_range: e.target.value})}
                              style={{ width: '60px', padding: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}
                            />
                          </td>
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
                          <td>{variant.price}</td>
                          <td>{variant.mod_type}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', wordBreak: 'break-all' }}>{variant.code}</td>
                          <td><span className="range-badge">{variant.effective_range}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-success btn-small" onClick={() => setEditingVariant({...variant})}>编辑</button>
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
        </div>
      )}
    </div>
  );
}

export default Admin;
