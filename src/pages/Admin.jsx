import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const CATS = ["突击步枪","战斗步枪","射手步枪","冲锋枪","机枪","狙击步枪","连狙","霰弹枪","手枪","弓弩"];
const PW_MAPS = [
  { id: 1, name: '零号大坝', icon: '🏗️', color: '#20e870' },
  { id: 2, name: '长弓溪谷', icon: '🏔️', color: '#18a0d0' },
  { id: 3, name: '巴克什', icon: '🏜️', color: '#e0a030' },
  { id: 4, name: '航天基地', icon: '🚀', color: '#d050d0' },
  { id: 5, name: '潮汐监狱', icon: '⛓️', color: '#e06040' },
];

// 枪械名称到分类的映射
const CLASS_TO_CAT = {
  gunRifle: '突击步枪', gunSmg: '冲锋枪', gunShotgun: '霰弹枪',
  gunSniper: '狙击步枪', gunMarksman: '射手步枪', gunLmg: '机枪',
  gunPistol: '手枪', gunBow: '弓弩',
};

function Admin({ isAdmin, setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('guns');
  const [adminInfo, setAdminInfo] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [guns, setGuns] = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);

  const [newAuthor, setNewAuthor] = useState({ name: '', slug: '', description: '' });
  const [newAuthorAvatar, setNewAuthorAvatar] = useState(null);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [newGunName, setNewGunName] = useState('');
  const [newGunCategory, setNewGunCategory] = useState('突击步枪');
  const [newGunImage, setNewGunImage] = useState(null);
  const [newGunImageUrl, setNewGunImageUrl] = useState(''); // 从目录自动获取的图片
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedGunId, setSelectedGunId] = useState('');
  const [variantForm, setVariantForm] = useState({ version: 'T0', price: '', mod_type: '', code: '', effective_range: '' });
  const [editingVariant, setEditingVariant] = useState(null);
  const [pwInputs, setPwInputs] = useState({});
  const [currentPw, setCurrentPw] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mfgRefreshing, setMfgRefreshing] = useState(false);
  const [priceRefreshing, setPriceRefreshing] = useState(false);
  const [loadoutRefreshing, setLoadoutRefreshing] = useState(false);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'admin', author_id: '', display_name: '' });

  // 枪械目录搜索
  const [catalogResults, setCatalogResults] = useState([]);
  const [showCatalog, setShowCatalog] = useState(false);

  const isSuper = adminInfo?.role === 'super';

  const fetchAll = useCallback(async () => {
    const { data: a } = await supabase.from('authors').select('*').order('sort_order');
    const { data: g } = await supabase.from('guns').select('*').order('sort_order');
    const { data: v } = await supabase.from('gun_variants').select('*').order('sort_order');
    if (a) setAuthors(a);
    if (g && v) setGuns(g.map(gun => ({ ...gun, variants: (v || []).filter(x => x.gun_id === gun.id) })));
    if (adminInfo?.role === 'admin' && adminInfo?.author_id && a) setSelectedAuthorId(adminInfo.author_id);
    else if (a?.length && !selectedAuthorId) setSelectedAuthorId(a[0].id);
  }, [adminInfo, selectedAuthorId]);

  const fetchPasswords = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    let { data } = await supabase.from('daily_passwords').select('*').eq('date', today).order('map_id');
    if (!data?.length) { const { data: l } = await supabase.from('daily_passwords').select('*').order('date', { ascending: false }).order('map_id').limit(10); data = l || []; }
    setCurrentPw(data); const inputs = {}; data.forEach(p => { inputs[p.map_id] = p.secret; }); setPwInputs(inputs);
  }, []);

  const fetchAdmins = useCallback(async () => { const { data } = await supabase.from('admins').select('*').order('created_at'); setAllAdmins(data || []); }, []);

  useEffect(() => { if (isAdmin) { fetchAll(); fetchPasswords(); if (isSuper) fetchAdmins(); } }, [isAdmin, fetchAll, fetchPasswords, fetchAdmins, isSuper]);

  // 枪械目录搜索
  async function searchCatalog(query) {
    setNewGunName(query);
    if (query.length < 1) { setCatalogResults([]); setShowCatalog(false); return; }
    const { data } = await supabase.from('gun_catalog').select('*').ilike('object_name', `%${query}%`).limit(10);
    setCatalogResults(data || []);
    setShowCatalog(true);
  }

  function selectFromCatalog(item) {
    // 去掉后缀（如"突击步枪"、"冲锋枪"等）
    let name = item.object_name;
    const suffixes = ['突击步枪','射手步枪','狙击步枪','冲锋枪','轻机枪','通用机枪','霰弹枪','紧凑突击步枪','战斗步枪'];
    for (const s of suffixes) { name = name.replace(s, '').trim(); }
    setNewGunName(name);
    setNewGunImageUrl(item.pic || '');
    setNewGunCategory(CLASS_TO_CAT[item.second_class] || '突击步枪');
    setShowCatalog(false);
    toast.success(`已选择 ${name}，图片自动填充！`);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const { data, error } = await supabase.from('admins').select('*').eq('username', username).eq('password_hash', password).single();
    if (error || !data) { toast.error('用户名或密码错误'); return; }
    setAdminInfo({ role: data.role || 'admin', author_id: data.author_id, display_name: data.display_name || data.username });
    setIsAdmin(true); toast.success(`欢迎回来，${data.display_name || data.username}！`);
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const name = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const { error } = await supabase.storage.from('gun-images').upload(name, file);
    if (error) throw error;
    return supabase.storage.from('gun-images').getPublicUrl(name).data.publicUrl;
  }

  // ===== 作者 =====
  async function addAuthor() {
    if (!newAuthor.name.trim() || !newAuthor.slug.trim()) { toast.error('名称和slug必填'); return; }
    setUploadingImage(true); let avatarUrl = null;
    try { if (newAuthorAvatar) avatarUrl = await uploadImage(newAuthorAvatar); } catch { toast.error('头像失败'); setUploadingImage(false); return; }
    const mx = authors.reduce((m, a) => Math.max(m, a.sort_order || 0), 0);
    await supabase.from('authors').insert({ name: newAuthor.name.trim(), slug: newAuthor.slug.trim().toLowerCase(), description: newAuthor.description, avatar_url: avatarUrl, sort_order: mx + 1 });
    toast.success('添加成功！'); setNewAuthor({ name: '', slug: '', description: '' }); setNewAuthorAvatar(null); setUploadingImage(false); fetchAll();
  }
  async function deleteAuthor(id, name) {
    if (!window.confirm(`删除 ${name}？`)) return;
    const ag = guns.filter(g => g.author_id === id);
    for (const g of ag) { await supabase.from('gun_variants').delete().eq('gun_id', g.id); await supabase.from('guns').delete().eq('id', g.id); }
    await supabase.from('authors').delete().eq('id', id); toast.success('已删除'); fetchAll();
  }
  async function updateAuthorAvatar(id, file) { try { const url = await uploadImage(file); await supabase.from('authors').update({ avatar_url: url }).eq('id', id); toast.success('更新！'); fetchAll(); } catch { toast.error('失败'); } }
  async function saveAuthorEdit() {
    if (!editingAuthor?.name?.trim()) { toast.error('不能为空'); return; }
    await supabase.from('authors').update({ name: editingAuthor.name.trim(), slug: editingAuthor.slug.trim().toLowerCase(), description: editingAuthor.description || '' }).eq('id', editingAuthor.id);
    toast.success('已更新！'); setEditingAuthor(null); fetchAll();
  }

  // ===== 枪械 =====
  const authorGuns = guns.filter(g => g.author_id === selectedAuthorId);
  const selectedGun = guns.find(g => g.id === selectedGunId);

  async function addGun() {
    if (!selectedAuthorId || !newGunName.trim()) { toast.error('填完整'); return; }
    setUploadingImage(true);
    let imageUrl = newGunImageUrl || null; // 优先用目录自动匹配的图片
    try { if (newGunImage) imageUrl = await uploadImage(newGunImage); } catch { toast.error('失败'); setUploadingImage(false); return; }
    const mx = guns.reduce((m, g) => Math.max(m, g.sort_order || 0), 0);
    await supabase.from('guns').insert({ name: newGunName.trim(), category: newGunCategory, image_url: imageUrl, author_id: selectedAuthorId, sort_order: mx + 1 });
    toast.success('添加成功！'); setNewGunName(''); setNewGunImage(null); setNewGunImageUrl(''); setUploadingImage(false); fetchAll();
  }
  async function deleteGun(id, name) { if (!window.confirm(`删除 ${name}？`)) return; await supabase.from('guns').delete().eq('id', id); toast.success('已删除'); if (selectedGunId === id) setSelectedGunId(''); fetchAll(); }
  async function updateGunImage(id, file) { try { const url = await uploadImage(file); await supabase.from('guns').update({ image_url: url }).eq('id', id); toast.success('更新！'); fetchAll(); } catch { toast.error('失败'); } }
  async function updateGunCategory(id, cat) { await supabase.from('guns').update({ category: cat }).eq('id', id); fetchAll(); }

  async function addVariant() {
    if (!selectedGunId || !variantForm.code.trim() || !variantForm.mod_type.trim()) { toast.error('填完整'); return; }
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

  // ===== 密码 =====
  async function autoFetchPw() { setRefreshing(true); try { const r = await (await fetch('https://iugcmnqglxrcmdodugqk.supabase.co/functions/v1/fetch-passwords', { method: 'POST' })).json(); if (r.success) { toast.success(`获取成功！`); await fetchPasswords(); } else toast.error('失败'); } catch { toast.error('请求失败'); } setRefreshing(false); }
  async function manualSavePw() {
    const entries = Object.entries(pwInputs).filter(([_, v]) => v && v.trim());
    if (!entries.length) { toast.error('至少输入一个'); return; }
    const today = new Date().toISOString().split('T')[0]; let c = 0;
    for (const [id, secret] of entries) { const map = PW_MAPS.find(m => m.id === parseInt(id)); if (!map) continue; const { error } = await supabase.from('daily_passwords').upsert({ map_id: parseInt(id), map_name: map.name, secret: secret.trim(), date: today, updated_at: new Date().toISOString() }, { onConflict: 'map_id,date' }); if (!error) c++; }
    toast.success(`更新 ${c} 个密码！`); await fetchPasswords();
  }

  // ===== 数据刷新 =====
  const sf = 'https://iugcmnqglxrcmdodugqk.supabase.co/functions/v1/';
  async function refreshData(name, setLoading) { setLoading(true); try { const r = await (await fetch(sf + name)).json(); if (r.success) toast.success(`${name} 更新成功！`); else toast.error('失败'); } catch { toast.error('请求失败'); } setLoading(false); }

  // ===== 管理员 =====
  async function addNewAdmin() {
    if (!newAdmin.username.trim() || !newAdmin.password.trim()) { toast.error('用户名和密码必填'); return; }
    if (newAdmin.role === 'admin' && !newAdmin.author_id) { toast.error('普通管理员必须关联作者'); return; }
    const { error } = await supabase.from('admins').insert({
      username: newAdmin.username.trim(), password_hash: newAdmin.password,
      role: newAdmin.role, author_id: newAdmin.role === 'admin' ? newAdmin.author_id : null,
      display_name: newAdmin.display_name.trim() || newAdmin.username.trim(),
    });
    if (error) { toast.error('失败：' + error.message); return; }
    toast.success('管理员添加成功！'); setNewAdmin({ username: '', password: '', role: 'admin', author_id: '', display_name: '' }); fetchAdmins();
  }
  async function deleteAdmin(id, name) { if (!window.confirm(`删除 ${name}？`)) return; await supabase.from('admins').delete().eq('id', id); toast.success('已删除'); fetchAdmins(); }

  // ===== 未登录 =====
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
  const tabs = isSuper
    ? [['authors','👤 作者'],['guns','🔫 枪械'],['passwords','🔑 密码'],['data','📊 数据刷新'],['admins','🔒 管理员']]
    : [['guns','🔫 枪械管理']];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 className="page-title">管理后台</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {adminInfo?.display_name} · {isSuper ? '🔴 超级管理员' : '🟢 普通管理员'}
          </p>
        </div>
        <button className="btn btn-danger btn-small" onClick={() => { setIsAdmin(false); setAdminInfo(null); toast.success('已退出'); }}>退出</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => (<button key={k} className={`filter-chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>))}
      </div>

      {/* ===== 作者 ===== */}
      {tab === 'authors' && isSuper && (<>
        <div className="admin-section">
          <h3>➕ 添加作者</h3>
          <div className="form-row">
            <div className="form-group"><label>名称</label><input type="text" value={newAuthor.name} onChange={e => setNewAuthor({...newAuthor,name:e.target.value})} placeholder="聪聪" /></div>
            <div className="form-group"><label>Slug</label><input type="text" value={newAuthor.slug} onChange={e => setNewAuthor({...newAuthor,slug:e.target.value.replace(/\s/g,'')})} placeholder="congcong" /></div>
            <div className="form-group"><label>简介</label><input type="text" value={newAuthor.description} onChange={e => setNewAuthor({...newAuthor,description:e.target.value})} /></div>
            <div className="form-group"><label>头像</label><input type="file" accept="image/*" onChange={e => setNewAuthorAvatar(e.target.files[0]||null)} style={{padding:'7px 10px'}} /></div>
          </div>
          <button className="btn btn-primary" onClick={addAuthor} disabled={uploadingImage}>{uploadingImage?'上传中...':'添加'}</button>
        </div>
        <div className="admin-section">
          <h3>📋 作者列表 ({authors.length})</h3>
          {authors.map(a => (
            <div key={a.id} style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,padding:12,marginBottom:8}}>
              {editingAuthor?.id===a.id ? (
                <div>
                  <div className="form-row">
                    <div className="form-group"><label>名称</label><input type="text" value={editingAuthor.name} onChange={e=>setEditingAuthor({...editingAuthor,name:e.target.value})}/></div>
                    <div className="form-group"><label>Slug</label><input type="text" value={editingAuthor.slug} onChange={e=>setEditingAuthor({...editingAuthor,slug:e.target.value.replace(/\s/g,'')})}/></div>
                    <div className="form-group"><label>简介</label><input type="text" value={editingAuthor.description||''} onChange={e=>setEditingAuthor({...editingAuthor,description:e.target.value})}/></div>
                  </div>
                  <div style={{display:'flex',gap:6}}><button className="btn btn-primary btn-small" onClick={saveAuthorEdit}>保存</button><button className="btn btn-small" onClick={()=>setEditingAuthor(null)} style={{color:'var(--text-muted)',border:'1px solid var(--border)'}}>取消</button></div>
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {a.avatar_url?<img src={a.avatar_url} alt="" style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--accent)'}}/>:<div style={{width:36,height:36,borderRadius:'50%',background:'rgba(30,204,96,0.1)',border:'2px solid var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{a.name.charAt(0)}</div>}
                    <div><div style={{fontWeight:600,fontSize:14}}>{a.name}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>/{a.slug} · {guns.filter(g=>g.author_id===a.id).length}枪</div></div>
                  </div>
                  <div style={{display:'flex',gap:5}}>
                    <label className="btn btn-small" style={{cursor:'pointer',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>📷<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{if(e.target.files[0])updateAuthorAvatar(a.id,e.target.files[0])}}/></label>
                    <button className="btn btn-success btn-small" onClick={()=>setEditingAuthor({...a})}>✏️</button>
                    <button className="btn btn-danger btn-small" onClick={()=>deleteAuthor(a.id,a.name)}>删</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </>)}

      {/* ===== 枪械 ===== */}
      {tab === 'guns' && (<>
        {isSuper && (
          <div className="admin-section">
            <h3>👤 选择作者</h3>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{authors.map(a=>(<button key={a.id} className={`filter-chip ${selectedAuthorId===a.id?'active':''}`} onClick={()=>{setSelectedAuthorId(a.id);setSelectedGunId('')}}>{a.name} ({guns.filter(g=>g.author_id===a.id).length})</button>))}</div>
          </div>
        )}
        {selAuthor && (<>
          <div className="admin-section">
            <h3>➕ 给「{selAuthor.name}」添加枪械</h3>
            <div className="form-row">
              <div className="form-group" style={{ position: 'relative' }}>
                <label>枪械名称（输入搜索自动匹配图片）</label>
                <input type="text" value={newGunName} onChange={e => searchCatalog(e.target.value)} placeholder="输入枪名搜索..." onFocus={() => { if (catalogResults.length) setShowCatalog(true); }} />
                {/* 搜索结果下拉 */}
                {showCatalog && catalogResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 8,
                    maxHeight: 250, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    {catalogResults.map(item => (
                      <div key={item.object_id} onClick={() => selectFromCatalog(item)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(32,232,112,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {item.pic && <img src={item.pic} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, background: 'linear-gradient(135deg,#1a2a3a,#1e3040)', padding: 2 }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item.object_name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.second_class_cn}</div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--accent)' }}>选择</span>
                      </div>
                    ))}
                    <div onClick={() => setShowCatalog(false)} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>关闭</div>
                  </div>
                )}
              </div>
              <div className="form-group"><label>分类</label><select value={newGunCategory} onChange={e=>setNewGunCategory(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="form-group">
                <label>图片 {newGunImageUrl ? '✅ 已自动匹配' : '（手动上传）'}</label>
                {newGunImageUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={newGunImageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, background: 'linear-gradient(135deg,#1a2a3a,#1e3040)', border: '1px solid var(--accent)', padding: 2 }} />
                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>自动匹配</span>
                    <button onClick={() => setNewGunImageUrl('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>✕ 清除</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*" onChange={e=>setNewGunImage(e.target.files[0]||null)} style={{padding:'7px 10px'}}/>
                )}
              </div>
            </div>
            <button className="btn btn-primary" onClick={addGun} disabled={uploadingImage}>{uploadingImage?'上传中...':'添加'}</button>
          </div>
          <div className="admin-section">
            <h3>📋 {selAuthor.name} 的枪械 ({authorGuns.length})</h3>
            {authorGuns.map(gun=>(
              <div key={gun.id} className="admin-gun-item" style={selectedGunId===gun.id?{borderColor:'var(--accent-dim)'}:{}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                  {gun.image_url?<img src={gun.image_url} alt="" style={{width:36,height:36,objectFit:'contain',borderRadius:5,background:'linear-gradient(135deg,#1a2a3a,#1e3040)'}}/>:<span>🔫</span>}
                  <div style={{minWidth:0}}><div style={{fontWeight:600,fontSize:13}}>{gun.name}</div><div style={{fontSize:10,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6}}><select value={gun.category||'突击步枪'} onChange={e=>updateGunCategory(gun.id,e.target.value)} style={{padding:'1px 4px',fontSize:10,background:'var(--bg-primary)',color:'var(--accent)',border:'1px solid var(--border)',borderRadius:4}}>{CATS.map(c=><option key={c}>{c}</option>)}</select><span>· {gun.variants.length}配置</span></div></div>
                </div>
                <div style={{display:'flex',gap:5,flexShrink:0}}>
                  <label className="btn btn-small" style={{cursor:'pointer',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>📷<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{if(e.target.files[0])updateGunImage(gun.id,e.target.files[0])}}/></label>
                  <button className="btn btn-success btn-small" onClick={()=>setSelectedGunId(gun.id)}>管理</button>
                  <button className="btn btn-danger btn-small" onClick={()=>deleteGun(gun.id,gun.name)}>删</button>
                </div>
              </div>
            ))}
          </div>
          {selectedGun && (
            <div className="admin-section">
              <h3>🛠️ {selectedGun.name}</h3>
              <div style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,padding:16,marginBottom:16}}>
                <div style={{fontWeight:600,marginBottom:10,color:'var(--accent)',fontSize:13}}>添加改装码</div>
                <div className="form-row">
                  <div className="form-group"><label>段位</label><select value={variantForm.version} onChange={e=>setVariantForm({...variantForm,version:e.target.value})}>{['T0','T1','T2','T3','T4','狙击','连狙','手枪','弓弩'].map(t=><option key={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label>价格</label><input type="text" value={variantForm.price} onChange={e=>setVariantForm({...variantForm,price:e.target.value})} placeholder="85w"/></div>
                  <div className="form-group"><label>类型</label><input type="text" value={variantForm.mod_type} onChange={e=>setVariantForm({...variantForm,mod_type:e.target.value})} placeholder="满改"/></div>
                  <div className="form-group"><label>射程</label><input type="text" value={variantForm.effective_range} onChange={e=>setVariantForm({...variantForm,effective_range:e.target.value})} placeholder="52米"/></div>
                </div>
                <div className="form-group"><label>改枪码</label><input type="text" value={variantForm.code} onChange={e=>setVariantForm({...variantForm,code:e.target.value})} placeholder="完整改枪码"/></div>
                <button className="btn btn-primary" onClick={addVariant}>添加</button>
              </div>
              <div className="table-scroll">
                <table className="variants-table"><thead><tr><th>段位</th><th>价格</th><th>类型</th><th>改枪码</th><th>射程</th><th style={{width:110}}>操作</th></tr></thead>
                <tbody>{selectedGun.variants.map(v=>(
                  <tr key={v.id}>
                    {editingVariant?.id===v.id?(<>
                      <td><select value={editingVariant.version} onChange={e=>setEditingVariant({...editingVariant,version:e.target.value})} style={{width:60,padding:3,background:'var(--bg-primary)',color:'var(--text-primary)',border:'1px solid var(--border)',borderRadius:4,fontSize:11}}>{['T0','T1','T2','T3','狙击','连狙','手枪','弓弩'].map(t=><option key={t}>{t}</option>)}</select></td>
                      <td><input value={editingVariant.price} onChange={e=>setEditingVariant({...editingVariant,price:e.target.value})} style={{width:50,padding:3,background:'var(--bg-primary)',color:'var(--text-primary)',border:'1px solid var(--border)',borderRadius:4,fontSize:11}}/></td>
                      <td><input value={editingVariant.mod_type} onChange={e=>setEditingVariant({...editingVariant,mod_type:e.target.value})} style={{width:80,padding:3,background:'var(--bg-primary)',color:'var(--text-primary)',border:'1px solid var(--border)',borderRadius:4,fontSize:11}}/></td>
                      <td><input value={editingVariant.code} onChange={e=>setEditingVariant({...editingVariant,code:e.target.value})} style={{width:'100%',padding:3,background:'var(--bg-primary)',color:'var(--text-primary)',border:'1px solid var(--border)',borderRadius:4,fontFamily:'monospace',fontSize:10}}/></td>
                      <td><input value={editingVariant.effective_range} onChange={e=>setEditingVariant({...editingVariant,effective_range:e.target.value})} style={{width:50,padding:3,background:'var(--bg-primary)',color:'var(--text-primary)',border:'1px solid var(--border)',borderRadius:4,fontSize:11}}/></td>
                      <td><div style={{display:'flex',gap:3}}><button className="btn btn-success btn-small" onClick={updateVariant}>存</button><button className="btn btn-small" onClick={()=>setEditingVariant(null)} style={{color:'var(--text-muted)'}}>消</button></div></td>
                    </>):(<>
                      <td><span className={`version-badge version-${v.version.toLowerCase()}`}>{v.version}</span></td>
                      <td style={{fontWeight:600}}>{v.price}</td><td>{v.mod_type}</td>
                      <td style={{fontFamily:'monospace',fontSize:11,color:'var(--accent)',wordBreak:'break-all'}}>{v.code}</td>
                      <td>{v.effective_range&&<span className="range-badge">{v.effective_range}</span>}</td>
                      <td><div style={{display:'flex',gap:3}}><button className="btn btn-success btn-small" onClick={()=>setEditingVariant({...v})}>编</button><button className="btn btn-danger btn-small" onClick={()=>deleteVariant(v.id)}>删</button></div></td>
                    </>)}
                  </tr>
                ))}</tbody></table>
              </div>
            </div>
          )}
        </>)}
      </>)}

      {/* ===== 密码 ===== */}
      {tab === 'passwords' && isSuper && (<>
        <div className="admin-section">
          <h3>🔄 自动获取</h3>
          <button className="btn btn-primary" onClick={autoFetchPw} disabled={refreshing}>{refreshing?'获取中...':'🔄 立即获取'}</button>
        </div>
        <div className="admin-section">
          <h3>✏️ 手动输入</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:16}}>
            {PW_MAPS.map(map=>(
              <div key={map.id}><label style={{display:'block',fontSize:13,fontWeight:600,color:map.color,marginBottom:5}}>{map.icon} {map.name}</label>
              <input type="text" value={pwInputs[map.id]||''} onChange={e=>setPwInputs({...pwInputs,[map.id]:e.target.value})} placeholder="密码" maxLength={6} style={{width:'100%',padding:'12px 14px',background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)',fontSize:22,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:6,textAlign:'center',outline:'none'}}/></div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={manualSavePw}>保存</button>
        </div>
      </>)}

      {/* ===== 数据刷新 ===== */}
      {tab === 'data' && isSuper && (
        <div className="admin-section">
          <h3>📊 数据刷新</h3>
          <div style={{display:'grid',gap:10}}>
            {[
              { name: 'fetch-manufacturing', label: '💰 制造利润', desc: '每小时自动', state: mfgRefreshing, set: setMfgRefreshing },
              { name: 'fetch-prices', label: '📈 物品价格', desc: '每4小时自动', state: priceRefreshing, set: setPriceRefreshing },
              { name: 'fetch-loadouts', label: '🃏 卡战备', desc: '每小时自动', state: loadoutRefreshing, set: setLoadoutRefreshing },
              { name: 'fetch-gun-catalog', label: '🔫 枪械目录', desc: '手动刷新', state: catalogRefreshing, set: setCatalogRefreshing },
            ].map(item => (
              <div key={item.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:14,background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:10}}>
                <div><div style={{fontWeight:600}}>{item.label}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{item.desc}</div></div>
                <button className="btn btn-primary btn-small" onClick={() => refreshData(item.name, item.set)} disabled={item.state}>{item.state?'获取中...':'刷新'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 管理员 ===== */}
      {tab === 'admins' && isSuper && (<>
        <div className="admin-section">
          <h3>➕ 添加管理员</h3>
          <div className="form-row">
            <div className="form-group"><label>用户名</label><input type="text" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin,username:e.target.value})} placeholder="zhangsan" /></div>
            <div className="form-group"><label>密码</label><input type="text" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin,password:e.target.value})} placeholder="密码" /></div>
            <div className="form-group"><label>显示名</label><input type="text" value={newAdmin.display_name} onChange={e => setNewAdmin({...newAdmin,display_name:e.target.value})} placeholder="张三" /></div>
            <div className="form-group"><label>角色</label>
              <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin,role:e.target.value})}>
                <option value="admin">普通管理员（只管自己的枪）</option>
                <option value="super">超级管理员（管理所有）</option>
              </select>
            </div>
          </div>
          {newAdmin.role === 'admin' && (
            <div className="form-group" style={{marginBottom:12}}>
              <label>关联作者</label>
              <select value={newAdmin.author_id} onChange={e => setNewAdmin({...newAdmin,author_id:e.target.value})}>
                <option value="">-- 选择作者 --</option>
                {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-primary" onClick={addNewAdmin}>添加管理员</button>
        </div>
        <div className="admin-section">
          <h3>📋 管理员列表 ({allAdmins.length})</h3>
          {allAdmins.map(a => {
            const la = authors.find(au => au.id === a.author_id);
            return (
              <div key={a.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:12,background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,marginBottom:6,flexWrap:'wrap',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,background:a.role==='super'?'rgba(224,72,72,0.1)':'rgba(32,232,112,0.1)',border:`2px solid ${a.role==='super'?'#e04848':'#20e870'}`,color:a.role==='super'?'#e04848':'#20e870'}}>{a.role==='super'?'👑':'👤'}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{a.display_name||a.username}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>@{a.username} · {a.role==='super'?'🔴 超管':'🟢 普通'}{la&&` · ${la.name}`}</div>
                  </div>
                </div>
                {a.username !== 'admin' && <button className="btn btn-danger btn-small" onClick={()=>deleteAdmin(a.id,a.display_name||a.username)}>删除</button>}
              </div>
            );
          })}
        </div>
      </>)}
    </div>
  );
}

export default Admin;