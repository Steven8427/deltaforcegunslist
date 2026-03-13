import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const PW_MAPS = [
  { id: 1, name: '零号大坝', icon: '🏗️', color: '#20e870' },
  { id: 2, name: '长弓溪谷', icon: '🏔️', color: '#18a0d0' },
  { id: 3, name: '巴克什', icon: '🏜️', color: '#e0a030' },
  { id: 4, name: '航天基地', icon: '🚀', color: '#d050d0' },
  { id: 5, name: '潮汐监狱', icon: '⛓️', color: '#e06040' },
];

const API_CLASS_TO_CAT = {
  gunRifle: '突击步枪', gunSMG: '冲锋枪', gunShotgun: '霰弹枪',
  gunSniper: '狙击步枪', gunMP: '射手步枪', gunLMG: '机枪',
  gunPistol: '手枪', 'special ': '弓弩', gunBow: '弓弩',
};
const ALL_CATS = ["突击步枪","战斗步枪","射手步枪","冲锋枪","机枪","狙击步枪","连狙","霰弹枪","手枪","弓弩"];

function Admin({ isAdmin, setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('guns');
  const [adminInfo, setAdminInfo] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [guns, setGuns] = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [communityPlayers, setCommunityPlayers] = useState([]);
  const [communityGunStats, setCommunityGunStats] = useState({});

  const [newAuthor, setNewAuthor] = useState({ name: '', slug: '', description: '' });
  const [newAuthorAvatar, setNewAuthorAvatar] = useState(null);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedGunId, setSelectedGunId] = useState('');
  const [variantForm, setVariantForm] = useState({ version: 'T0', price: '', mod_type: '', code: '', effective_range: '' });
  const [editingVariant, setEditingVariant] = useState(null);

  // 超管专用：手动添加枪
  const [superGunName, setSuperGunName] = useState('');
  const [superGunCat, setSuperGunCat] = useState('突击步枪');
  const [superGunImage, setSuperGunImage] = useState(null);
  const [superGunImageUrl, setSuperGunImageUrl] = useState('');

  // 搜索添加枪械
  const [gunSearch, setGunSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState([]);
  const [showCatalog, setShowCatalog] = useState(false);

  const [pwInputs, setPwInputs] = useState({});
  const [currentPw, setCurrentPw] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dataRefresh, setDataRefresh] = useState({});
  const [profileEdit, setProfileEdit] = useState({ name: '', description: '' });
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'admin', author_id: '', display_name: '' });

  const isSuper = adminInfo?.role === 'super';

  const fetchAll = useCallback(async () => {
    const { data: a } = await supabase.from('authors').select('*').order('sort_order');
    const { data: g } = await supabase.from('guns').select('*').order('sort_order');
    const { data: v } = await supabase.from('gun_variants').select('*').order('sort_order');
    if (a) setAuthors(a);
    if (g && v) setGuns(g.map(gun => ({ ...gun, variants: (v || []).filter(x => x.gun_id === gun.id) })));
    if (adminInfo?.role === 'admin' && adminInfo?.author_id && a) {
      setSelectedAuthorId(adminInfo.author_id);
      const my = a.find(x => x.id === adminInfo.author_id);
      if (my) setProfileEdit({ name: my.name, description: my.description || '' });
    } else if (a?.length && !selectedAuthorId) setSelectedAuthorId(a[0].id);
  }, [adminInfo, selectedAuthorId]);

  const fetchPasswords = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    let { data } = await supabase.from('daily_passwords').select('*').eq('date', today).order('map_id');
    if (!data?.length) { const { data: l } = await supabase.from('daily_passwords').select('*').order('date', { ascending: false }).order('map_id').limit(10); data = l || []; }
    setCurrentPw(data); const inputs = {}; data.forEach(p => { inputs[p.map_id] = p.secret; }); setPwInputs(inputs);
  }, []);

  const fetchAdmins = useCallback(async () => { const { data } = await supabase.from('admins').select('*').order('created_at'); setAllAdmins(data || []); }, []);
  const fetchReviews = useCallback(async () => { const { data } = await supabase.from('profile_reviews').select('*').eq('status', 'pending').order('created_at'); setReviews(data || []); }, []);
  const fetchCommunity = useCallback(async () => {
    const { data: ps } = await supabase.from('players').select('*').order('created_at');
    setCommunityPlayers(ps || []);
    const { data: gd } = await supabase.from('guns').select('player_id, id');
    const { data: vd } = await supabase.from('gun_variants').select('gun_id');
    const gByP = {}; const vByG = {};
    (gd||[]).forEach(g => { if (!g.player_id) return; if (!gByP[g.player_id]) gByP[g.player_id]=[]; gByP[g.player_id].push(g.id); });
    (vd||[]).forEach(v => { vByG[v.gun_id]=(vByG[v.gun_id]||0)+1; });
    const st = {};
    Object.entries(gByP).forEach(([pid, gids]) => { st[pid] = { guns: gids.length, variants: gids.reduce((s,gid)=>s+(vByG[gid]||0),0) }; });
    setCommunityGunStats(st);
  }, []);

  useEffect(() => { if (isAdmin) { fetchAll(); fetchPasswords(); if (isSuper) { fetchAdmins(); fetchReviews(); fetchCommunity(); } } }, [isAdmin, fetchAll, fetchPasswords, fetchAdmins, fetchReviews, fetchCommunity, isSuper]);

  // 搜索枪械目录
  async function searchCatalog(query) {
    setGunSearch(query);
    if (query.length < 1) { setCatalogResults([]); setShowCatalog(false); return; }
    const { data } = await supabase.from('gun_catalog').select('*').ilike('object_name', `%${query}%`).eq('primary_class', 'gun').limit(10);
    setCatalogResults(data || []); setShowCatalog(true);
  }

  // 普通管理员：直接添加
  async function quickAddGun(item) {
    if (!selectedAuthorId) { toast.error('未关联作者'); return; }
    const suffixes = ['突击步枪','射手步枪','狙击步枪','冲锋枪','轻机枪','通用机枪','霰弹枪','紧凑突击步枪','战斗步枪'];
    let name = item.object_name;
    for (const s of suffixes) name = name.replace(s, '').trim();
    const cat = API_CLASS_TO_CAT[item.second_class] || '突击步枪';
    const mx = guns.reduce((m, g) => Math.max(m, g.sort_order || 0), 0);
    const { error } = await supabase.from('guns').insert({ name, category: cat, image_url: item.pic || null, author_id: selectedAuthorId, sort_order: mx + 1 });
    if (error) { toast.error('添加失败：' + error.message); return; }
    toast.success(`${name} 添加成功！`);
    setGunSearch(''); setCatalogResults([]); setShowCatalog(false); fetchAll();
  }

  // 超管搜索选择
  function superSelectFromCatalog(item) {
    const suffixes = ['突击步枪','射手步枪','狙击步枪','冲锋枪','轻机枪','通用机枪','霰弹枪','紧凑突击步枪','战斗步枪'];
    let name = item.object_name;
    for (const s of suffixes) name = name.replace(s, '').trim();
    setSuperGunName(name);
    setSuperGunImageUrl(item.pic || '');
    setSuperGunCat(API_CLASS_TO_CAT[item.second_class] || '突击步枪');
    setShowCatalog(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const { data, error } = await supabase.from('admins').select('*').eq('username', username).eq('password_hash', password).single();
    if (error || !data) { toast.error('用户名或密码错误'); return; }
    setAdminInfo({ id: data.id, role: data.role || 'admin', author_id: data.author_id, display_name: data.display_name || data.username });
    setIsAdmin(true); toast.success(`欢迎，${data.display_name || data.username}！`);
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const n = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const { error } = await supabase.storage.from('gun-images').upload(n, file);
    if (error) throw error;
    return supabase.storage.from('gun-images').getPublicUrl(n).data.publicUrl;
  }

  // 作者
  async function addAuthor() {
    if (!newAuthor.name.trim() || !newAuthor.slug.trim()) { toast.error('名称和slug必填'); return; }
    setUploadingImage(true); let url = null;
    try { if (newAuthorAvatar) url = await uploadImage(newAuthorAvatar); } catch { toast.error('失败'); setUploadingImage(false); return; }
    const mx = authors.reduce((m, a) => Math.max(m, a.sort_order || 0), 0);
    await supabase.from('authors').insert({ name: newAuthor.name.trim(), slug: newAuthor.slug.trim().toLowerCase(), description: newAuthor.description, avatar_url: url, sort_order: mx + 1 });
    toast.success('添加成功！'); setNewAuthor({ name: '', slug: '', description: '' }); setNewAuthorAvatar(null); setUploadingImage(false); fetchAll();
  }
  async function deleteAuthor(id, name) { if (!window.confirm(`删除 ${name}？`)) return; const ag = guns.filter(g => g.author_id === id); for (const g of ag) { await supabase.from('gun_variants').delete().eq('gun_id', g.id); await supabase.from('guns').delete().eq('id', g.id); } await supabase.from('authors').delete().eq('id', id); toast.success('已删除'); fetchAll(); }
  async function updateAuthorAvatar(id, file) { try { const url = await uploadImage(file); await supabase.from('authors').update({ avatar_url: url }).eq('id', id); toast.success('更新！'); fetchAll(); } catch { toast.error('失败'); } }
  async function saveAuthorEdit() { if (!editingAuthor?.name?.trim()) return; await supabase.from('authors').update({ name: editingAuthor.name.trim(), slug: editingAuthor.slug.trim().toLowerCase(), description: editingAuthor.description || '' }).eq('id', editingAuthor.id); toast.success('已更新！'); setEditingAuthor(null); fetchAll(); }

  // 枪械
  const authorGuns = guns.filter(g => g.author_id === selectedAuthorId);
  const selectedGun = guns.find(g => g.id === selectedGunId);
  async function superAddGun() {
    if (!selectedAuthorId || !superGunName.trim()) { toast.error('请先搜索选择枪械'); return; }
    setUploadingImage(true); let imageUrl = superGunImageUrl || null;
    try { if (superGunImage) imageUrl = await uploadImage(superGunImage); } catch { setUploadingImage(false); return; }
    const mx = guns.reduce((m, g) => Math.max(m, g.sort_order || 0), 0);
    await supabase.from('guns').insert({ name: superGunName.trim(), category: superGunCat, image_url: imageUrl, author_id: selectedAuthorId, sort_order: mx + 1 });
    toast.success('添加成功！'); setSuperGunName(''); setSuperGunImage(null); setSuperGunImageUrl(''); setUploadingImage(false); fetchAll();
  }
  async function deleteGun(id, name) { if (!window.confirm(`删除 ${name}？`)) return; await supabase.from('gun_variants').delete().eq('gun_id', id); await supabase.from('guns').delete().eq('id', id); toast.success('已删除'); if (selectedGunId === id) setSelectedGunId(''); fetchAll(); }
  async function updateGunImage(id, file) { try { const url = await uploadImage(file); await supabase.from('guns').update({ image_url: url }).eq('id', id); toast.success('更新！'); fetchAll(); } catch { toast.error('失败'); } }

  async function addVariant() {
    if (!selectedGunId || !variantForm.code.trim()) { toast.error('请填写改枪码'); return; }
    const gun = guns.find(g => g.id === selectedGunId);
    const mx = gun ? gun.variants.reduce((m, v) => Math.max(m, v.sort_order || 0), 0) : 0;
    await supabase.from('gun_variants').insert({ gun_id: selectedGunId, ...variantForm, sort_order: mx + 1 });
    toast.success('添加成功！'); setVariantForm({ version: 'T0', price: '', mod_type: '', code: '', effective_range: '' }); fetchAll();
  }
  async function deleteVariant(id) { if (!window.confirm('确定？')) return; await supabase.from('gun_variants').delete().eq('id', id); toast.success('已删除'); fetchAll(); }
  async function updateVariant() { if (!editingVariant) return; await supabase.from('gun_variants').update({ version: editingVariant.version, price: editingVariant.price, mod_type: editingVariant.mod_type, code: editingVariant.code, effective_range: editingVariant.effective_range }).eq('id', editingVariant.id); toast.success('更新！'); setEditingVariant(null); fetchAll(); }

  // 密码
  async function autoFetchPw() { setRefreshing(true); try { const r = await (await fetch('https://iugcmnqglxrcmdodugqk.supabase.co/functions/v1/fetch-passwords', { method: 'POST' })).json(); if (r.success) { toast.success('获取成功！'); await fetchPasswords(); } else toast.error('失败'); } catch { toast.error('失败'); } setRefreshing(false); }
  async function manualSavePw() { const entries = Object.entries(pwInputs).filter(([_, v]) => v?.trim()); if (!entries.length) return; const today = new Date().toISOString().split('T')[0]; for (const [id, s] of entries) { const map = PW_MAPS.find(m => m.id === parseInt(id)); if (map) await supabase.from('daily_passwords').upsert({ map_id: parseInt(id), map_name: map.name, secret: s.trim(), date: today, updated_at: new Date().toISOString() }, { onConflict: 'map_id,date' }); } toast.success('已保存！'); await fetchPasswords(); }

  const sf = 'https://iugcmnqglxrcmdodugqk.supabase.co/functions/v1/';
  async function refreshData(name) { setDataRefresh(p => ({...p,[name]:true})); try { const r = await (await fetch(sf+name)).json(); toast.success(r.success?'更新成功！':'失败'); } catch { toast.error('失败'); } setDataRefresh(p => ({...p,[name]:false})); }

  async function addNewAdmin() { if (!newAdmin.username.trim()||!newAdmin.password.trim()) { toast.error('必填'); return; } if (newAdmin.role==='admin'&&!newAdmin.author_id) { toast.error('关联作者'); return; } const { error } = await supabase.from('admins').insert({ username: newAdmin.username.trim(), password_hash: newAdmin.password, role: newAdmin.role, author_id: newAdmin.role==='admin'?newAdmin.author_id:null, display_name: newAdmin.display_name.trim()||newAdmin.username.trim() }); if (error) { toast.error(error.message); return; } toast.success('添加成功！'); setNewAdmin({ username:'',password:'',role:'admin',author_id:'',display_name:'' }); fetchAdmins(); }
  async function deleteAdmin(id, n) { if (!window.confirm(`删除 ${n}？`)) return; await supabase.from('admins').delete().eq('id', id); toast.success('已删除'); fetchAdmins(); }

  async function submitProfileEdit() { if (!profileEdit.name.trim()) return; setProfileSubmitting(true); let url = null; try { if (profileAvatar) url = await uploadImage(profileAvatar); } catch { setProfileSubmitting(false); return; } await supabase.from('profile_reviews').insert({ admin_id: adminInfo.id, author_id: adminInfo.author_id, new_name: profileEdit.name.trim(), new_avatar_url: url, new_description: profileEdit.description.trim(), status: 'pending' }); toast.success('已提交审核！'); setProfileAvatar(null); setProfileSubmitting(false); }

  async function reviewProfile(rid, approved) {
    if (approved) { const r = reviews.find(x => x.id === rid); if (r) { const u = {}; if (r.new_name) u.name = r.new_name; if (r.new_avatar_url) u.avatar_url = r.new_avatar_url; if (r.new_description !== null) u.description = r.new_description; if (Object.keys(u).length) await supabase.from('authors').update(u).eq('id', r.author_id); } }
    await supabase.from('profile_reviews').update({ status: approved?'approved':'rejected', reviewed_at: new Date().toISOString() }).eq('id', rid);
    toast.success(approved?'已通过！':'已拒绝'); fetchReviews(); fetchAll();
  }

  // 社区管理
  async function deletePlayer(pid, name) {
    const st = communityGunStats[pid] || { guns: 0, variants: 0 };
    if (!window.confirm(`⚠️ 确定要删除玩家「${name}」吗？\n\n将同时删除：\n• ${st.guns} 把枪械\n• ${st.variants} 个改枪码\n\n此操作不可撤销！`)) return;
    if (!window.confirm(`再次确认：删除「${name}」及其全部数据？`)) return;
    const { error } = await supabase.from('players').delete().eq('id', pid);
    if (error) { toast.error('删除失败：' + error.message); return; }
    toast.success(`✅ 玩家「${name}」及 ${st.guns} 把枪械、${st.variants} 个配置已删除`); fetchCommunity();
  }
  async function deletePlayerGuns(pid, name) {
    const st = communityGunStats[pid] || { guns: 0, variants: 0 };
    if (!window.confirm(`⚠️ 确定要清空「${name}」的所有枪械？\n\n将删除：\n• ${st.guns} 把枪械\n• ${st.variants} 个改枪码\n\n账号保留，只清空枪械数据。此操作不可撤销！`)) return;
    const { error } = await supabase.from('guns').delete().eq('player_id', pid);
    if (error) { toast.error('清空失败：' + error.message); return; }
    toast.success(`✅ 已清空「${name}」的 ${st.guns} 把枪械和 ${st.variants} 个配置`); fetchCommunity();
  }

  // 改装码表格
  function VariantTable({ gun }) {
    if (!gun) return null;
    return (
      <div className="admin-section">
        <h3>🛠️ {gun.name} 改装码</h3>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div className="form-row">
            <div className="form-group"><label>段位</label><select value={variantForm.version} onChange={e => setVariantForm({...variantForm,version:e.target.value})}>{['T0','T1','T2','T3','T4','狙击','连狙','手枪','弓弩'].map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label>价格</label><input type="text" value={variantForm.price} onChange={e => setVariantForm({...variantForm,price:e.target.value})} placeholder="85w" /></div>
            <div className="form-group"><label>类型</label><input type="text" value={variantForm.mod_type} onChange={e => setVariantForm({...variantForm,mod_type:e.target.value})} placeholder="满改" /></div>
            <div className="form-group"><label>射程</label><input type="text" value={variantForm.effective_range} onChange={e => setVariantForm({...variantForm,effective_range:e.target.value})} placeholder="52米" /></div>
          </div>
          <div className="form-group"><label>改枪码</label><input type="text" value={variantForm.code} onChange={e => setVariantForm({...variantForm,code:e.target.value})} placeholder="完整改枪码" /></div>
          <button className="btn btn-primary" onClick={addVariant}>添加改装码</button>
        </div>
        {gun.variants.length > 0 && (
          <div className="table-scroll">
            <table className="variants-table"><thead><tr><th>段位</th><th>价格</th><th>类型</th><th>改枪码</th><th>射程</th><th style={{width:100}}>操作</th></tr></thead>
            <tbody>{gun.variants.map(v => (
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
        )}
      </div>
    );
  }

  // 未登录
  if (!isAdmin) return (
    <div className="admin-login">
      <h2>⚙️ 管理员登录</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group"><label>用户名</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="用户名" /></div>
        <div className="form-group"><label>密码</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="密码" /></div>
        <button type="submit" className="btn btn-primary" style={{width:'100%',marginTop:8}}>登 录</button>
      </form>
    </div>
  );

  const selAuthor = authors.find(a => a.id === selectedAuthorId);
  const myAuthor = !isSuper && adminInfo?.author_id ? authors.find(a => a.id === adminInfo.author_id) : null;

  // ======================== 普通管理员 ========================
  if (!isSuper) return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* 顶部卡片 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(32,232,112,0.08), rgba(24,160,208,0.08))',
        border: '1px solid rgba(32,232,112,0.2)', borderRadius: 16,
        padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {myAuthor?.avatar_url ? <img src={myAuthor.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} />
          : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(32,232,112,0.1)', border: '3px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{myAuthor?.name?.charAt(0) || '?'}</div>}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{myAuthor?.name || adminInfo?.display_name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>🟢 管理员 · {authorGuns.length} 把枪 · {authorGuns.reduce((s,g) => s+g.variants.length, 0)} 个配置</div>
          </div>
        </div>
        <button className="btn btn-danger btn-small" onClick={() => { setIsAdmin(false); setAdminInfo(null); }}>退出</button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[['guns','🔫 我的枪械'],['profile','👤 修改资料']].map(([k,l]) => (
          <button key={k} className={`filter-chip ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* 修改资料 */}
      {tab === 'profile' && myAuthor && (
        <div className="admin-section">
          <h3>👤 修改资料（需审核）</h3>
          <div className="form-row">
            <div className="form-group"><label>昵称</label><input type="text" value={profileEdit.name} onChange={e=>setProfileEdit({...profileEdit,name:e.target.value})} /></div>
            <div className="form-group"><label>简介</label><input type="text" value={profileEdit.description} onChange={e=>setProfileEdit({...profileEdit,description:e.target.value})} /></div>
            <div className="form-group"><label>新头像</label><input type="file" accept="image/*" onChange={e=>setProfileAvatar(e.target.files[0]||null)} style={{padding:'7px 10px'}} /></div>
          </div>
          <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>提交后需超级管理员审核通过才会生效。</p>
          <button className="btn btn-primary" onClick={submitProfileEdit} disabled={profileSubmitting}>{profileSubmitting?'提交中...':'提交修改'}</button>
        </div>
      )}

      {/* 枪械管理 - 简化版 */}
      {tab === 'guns' && selAuthor && (<>
        {/* 搜索添加 */}
        <div className="admin-section">
          <h3>➕ 添加枪械</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>输入枪名搜索，点击即可添加（图片和分类自动匹配）</p>
          <div style={{ position: 'relative' }}>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input type="text" value={gunSearch} onChange={e => searchCatalog(e.target.value)}
                placeholder="输入枪名搜索，如 AK、M4、Vector..." onFocus={() => { if (catalogResults.length) setShowCatalog(true); }} />
            </div>
            {showCatalog && catalogResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 10,
                maxHeight: 300, overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}>
                {catalogResults.map(item => (
                  <div key={item.object_id} onClick={() => quickAddGun(item)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(32,232,112,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    {item.pic && <img src={item.pic} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: 'linear-gradient(135deg,#1a2a3a,#1e3040)', padding: 2 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.object_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.second_class_cn}</div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>+ 添加</span>
                  </div>
                ))}
                <div onClick={() => setShowCatalog(false)} style={{ padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>关闭</div>
              </div>
            )}
          </div>
        </div>

        {/* 我的枪械列表 */}
        <div className="admin-section">
          <h3>📋 我的枪械 ({authorGuns.length})</h3>
          {authorGuns.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>还没有枪械，在上方搜索添加</p>
          ) : authorGuns.map(gun => (
            <div key={gun.id} className="admin-gun-item" style={selectedGunId===gun.id ? { borderColor: 'var(--accent)', background: 'rgba(32,232,112,0.03)' } : {}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                {gun.image_url ? <img src={gun.image_url} alt="" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 8, background: 'linear-gradient(135deg,#1a2a3a,#1e3040)' }} /> : <span style={{fontSize:24}}>🔫</span>}
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>{gun.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{gun.category} · {gun.variants.length} 个配置</div></div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <button className="btn btn-success btn-small" onClick={() => setSelectedGunId(gun.id===selectedGunId?'':gun.id)}>{selectedGunId===gun.id?'收起':'管理'}</button>
                <button className="btn btn-danger btn-small" onClick={() => deleteGun(gun.id, gun.name)}>删</button>
              </div>
            </div>
          ))}
        </div>

        {selectedGun && <VariantTable gun={selectedGun} />}
      </>)}
    </div>
  );

  // ======================== 超级管理员 ========================
  const tabs = [['authors','👤 作者'],['guns','🔫 枪械'],['passwords','🔑 密码'],['data','📊 数据'],['admins','🔒 管理员'],['community','🌐 社区']];
  if (reviews.length > 0) tabs.push(['reviews',`📝 审核 (${reviews.length})`]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div><h1 className="page-title">管理后台</h1><p style={{fontSize:12,color:'var(--text-muted)'}}>{adminInfo?.display_name} · 🔴 超级管理员</p></div>
        <button className="btn btn-danger btn-small" onClick={() => { setIsAdmin(false); setAdminInfo(null); }}>退出</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(([k,l]) => (<button key={k} className={`filter-chip ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>))}
      </div>

      {/* 作者 */}
      {tab==='authors'&&(<>
        <div className="admin-section">
          <h3>➕ 添加作者</h3>
          <div className="form-row">
            <div className="form-group"><label>名称</label><input type="text" value={newAuthor.name} onChange={e=>setNewAuthor({...newAuthor,name:e.target.value})} placeholder="聪聪" /></div>
            <div className="form-group"><label>Slug</label><input type="text" value={newAuthor.slug} onChange={e=>setNewAuthor({...newAuthor,slug:e.target.value.replace(/\s/g,'')})} placeholder="congcong" /></div>
            <div className="form-group"><label>简介</label><input type="text" value={newAuthor.description} onChange={e=>setNewAuthor({...newAuthor,description:e.target.value})} /></div>
            <div className="form-group"><label>头像</label><input type="file" accept="image/*" onChange={e=>setNewAuthorAvatar(e.target.files[0]||null)} style={{padding:'7px 10px'}} /></div>
          </div>
          <button className="btn btn-primary" onClick={addAuthor} disabled={uploadingImage}>{uploadingImage?'上传中...':'添加'}</button>
        </div>
        <div className="admin-section">
          <h3>📋 作者列表 ({authors.length})</h3>
          {authors.map(a=>(
            <div key={a.id} style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,padding:12,marginBottom:8}}>
              {editingAuthor?.id===a.id?(
                <div>
                  <div className="form-row">
                    <div className="form-group"><label>名称</label><input type="text" value={editingAuthor.name} onChange={e=>setEditingAuthor({...editingAuthor,name:e.target.value})}/></div>
                    <div className="form-group"><label>Slug</label><input type="text" value={editingAuthor.slug} onChange={e=>setEditingAuthor({...editingAuthor,slug:e.target.value.replace(/\s/g,'')})}/></div>
                    <div className="form-group"><label>简介</label><input type="text" value={editingAuthor.description||''} onChange={e=>setEditingAuthor({...editingAuthor,description:e.target.value})}/></div>
                  </div>
                  <div style={{display:'flex',gap:6}}><button className="btn btn-primary btn-small" onClick={saveAuthorEdit}>保存</button><button className="btn btn-small" onClick={()=>setEditingAuthor(null)} style={{color:'var(--text-muted)',border:'1px solid var(--border)'}}>取消</button></div>
                </div>
              ):(
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {a.avatar_url?<img src={a.avatar_url} alt="" style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--accent)'}}/>:<div style={{width:36,height:36,borderRadius:'50%',background:'rgba(30,204,96,0.1)',border:'2px solid var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{a.name.charAt(0)}</div>}
                    <div><div style={{fontWeight:600}}>{a.name}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>/{a.slug} · {guns.filter(g=>g.author_id===a.id).length}枪</div></div>
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

      {/* 枪械 - 超管完整版 */}
      {tab==='guns'&&(<>
        <div className="admin-section">
          <h3>👤 选择作者</h3>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{authors.map(a=>(<button key={a.id} className={`filter-chip ${selectedAuthorId===a.id?'active':''}`} onClick={()=>{setSelectedAuthorId(a.id);setSelectedGunId('')}}>{a.name} ({guns.filter(g=>g.author_id===a.id).length})</button>))}</div>
        </div>
        {selAuthor&&(<>
          <div className="admin-section">
            <h3>➕ 给「{selAuthor.name}」添加枪械</h3>
            <div className="form-row">
              <div className="form-group" style={{position:'relative'}}>
                <label>搜索枪械</label>
                <input type="text" value={superGunName} onChange={e=>{setSuperGunName(e.target.value);searchCatalog(e.target.value)}} placeholder="输入枪名搜索..." onFocus={()=>{if(catalogResults.length) setShowCatalog(true)}}/>
                {showCatalog&&catalogResults.length>0&&(
                  <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'var(--bg-card)',border:'1px solid var(--accent)',borderRadius:8,maxHeight:250,overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
                    {catalogResults.map(item=>(
                      <div key={item.object_id} onClick={()=>superSelectFromCatalog(item)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',cursor:'pointer',borderBottom:'1px solid var(--border)'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(32,232,112,0.06)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        {item.pic&&<img src={item.pic} alt="" style={{width:36,height:36,objectFit:'contain',borderRadius:6,background:'linear-gradient(135deg,#1a2a3a,#1e3040)',padding:2}}/>}
                        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{item.object_name}</div><div style={{fontSize:10,color:'var(--text-muted)'}}>{item.second_class_cn}</div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group"><label>分类</label><select value={superGunCat} onChange={e=>setSuperGunCat(e.target.value)}>{ALL_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="form-group"><label>图片</label>{superGunImageUrl?(<div style={{display:'flex',alignItems:'center',gap:8}}><img src={superGunImageUrl} alt="" style={{width:40,height:40,objectFit:'contain',borderRadius:6,background:'linear-gradient(135deg,#1a2a3a,#1e3040)',border:'1px solid var(--accent)',padding:2}}/><span style={{fontSize:12,color:'var(--accent)'}}>✅</span><button onClick={()=>setSuperGunImageUrl('')} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}>✕</button></div>):<input type="file" accept="image/*" onChange={e=>setSuperGunImage(e.target.files[0]||null)} style={{padding:'7px 10px'}}/>}</div>
            </div>
            <button className="btn btn-primary" onClick={superAddGun} disabled={uploadingImage}>{uploadingImage?'上传中...':'添加'}</button>
          </div>
          <div className="admin-section">
            <h3>📋 {selAuthor.name} 的枪械 ({authorGuns.length})</h3>
            {authorGuns.map(gun=>(
              <div key={gun.id} className="admin-gun-item" style={selectedGunId===gun.id?{borderColor:'var(--accent-dim)'}:{}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                  {gun.image_url?<img src={gun.image_url} alt="" style={{width:36,height:36,objectFit:'contain',borderRadius:5,background:'linear-gradient(135deg,#1a2a3a,#1e3040)'}}/>:<span>🔫</span>}
                  <div><div style={{fontWeight:600,fontSize:13}}>{gun.name}</div><div style={{fontSize:10,color:'var(--text-muted)'}}>{gun.category} · {gun.variants.length}配置</div></div>
                </div>
                <div style={{display:'flex',gap:5,flexShrink:0}}>
                  <label className="btn btn-small" style={{cursor:'pointer',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>📷<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{if(e.target.files[0])updateGunImage(gun.id,e.target.files[0])}}/></label>
                  <button className="btn btn-success btn-small" onClick={()=>setSelectedGunId(gun.id)}>管理</button>
                  <button className="btn btn-danger btn-small" onClick={()=>deleteGun(gun.id,gun.name)}>删</button>
                </div>
              </div>
            ))}
          </div>
          {selectedGun && <VariantTable gun={selectedGun} />}
        </>)}
      </>)}

      {/* 密码 */}
      {tab==='passwords'&&(<>
        <div className="admin-section">
          <h3>🔄 自动获取</h3>
          <button className="btn btn-primary" onClick={autoFetchPw} disabled={refreshing}>{refreshing?'获取中...':'🔄 立即获取'}</button>
        </div>
        <div className="admin-section">
          <h3>✏️ 手动输入</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:16}}>
            {PW_MAPS.map(m=>(<div key={m.id}><label style={{display:'block',fontSize:13,fontWeight:600,color:m.color,marginBottom:5}}>{m.icon} {m.name}</label><input type="text" value={pwInputs[m.id]||''} onChange={e=>setPwInputs({...pwInputs,[m.id]:e.target.value})} placeholder="密码" maxLength={6} style={{width:'100%',padding:'12px 14px',background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)',fontSize:22,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:6,textAlign:'center',outline:'none'}}/></div>))}
          </div>
          <button className="btn btn-primary" onClick={manualSavePw}>保存</button>
        </div>
      </>)}

      {/* 数据刷新 */}
      {tab==='data'&&(
        <div className="admin-section">
          <h3>📊 数据刷新</h3>
          <div style={{display:'grid',gap:10}}>
            {[{n:'fetch-manufacturing',l:'💰 制造利润',d:'每小时'},{n:'fetch-prices',l:'📈 物品价格',d:'每4小时'},{n:'fetch-loadouts',l:'🃏 卡战备',d:'每小时'},{n:'fetch-gun-catalog',l:'🔫 枪械目录',d:'手动'},{n:'fetch-official-codes',l:'🔥 官方改枪码',d:'每6小时'}].map(i=>(
              <div key={i.n} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:14,background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:10}}>
                <div><div style={{fontWeight:600}}>{i.l}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{i.d}</div></div>
                <button className="btn btn-primary btn-small" onClick={()=>refreshData(i.n)} disabled={dataRefresh[i.n]}>{dataRefresh[i.n]?'获取中...':'刷新'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 管理员 */}
      {tab==='admins'&&(<>
        <div className="admin-section">
          <h3>➕ 添加管理员</h3>
          <div className="form-row">
            <div className="form-group"><label>用户名</label><input type="text" value={newAdmin.username} onChange={e=>setNewAdmin({...newAdmin,username:e.target.value})}/></div>
            <div className="form-group"><label>密码</label><input type="text" value={newAdmin.password} onChange={e=>setNewAdmin({...newAdmin,password:e.target.value})}/></div>
            <div className="form-group"><label>显示名</label><input type="text" value={newAdmin.display_name} onChange={e=>setNewAdmin({...newAdmin,display_name:e.target.value})}/></div>
            <div className="form-group"><label>角色</label><select value={newAdmin.role} onChange={e=>setNewAdmin({...newAdmin,role:e.target.value})}><option value="admin">普通</option><option value="super">超管</option></select></div>
          </div>
          {newAdmin.role==='admin'&&(<div className="form-group" style={{marginBottom:12}}><label>关联作者</label><select value={newAdmin.author_id} onChange={e=>setNewAdmin({...newAdmin,author_id:e.target.value})}><option value="">-- 选择 --</option>{authors.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>)}
          <button className="btn btn-primary" onClick={addNewAdmin}>添加</button>
        </div>
        <div className="admin-section">
          <h3>📋 管理员列表 ({allAdmins.length})</h3>
          {allAdmins.map(a=>{const la=authors.find(x=>x.id===a.author_id);return(
            <div key={a.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:12,background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,marginBottom:6,flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,background:a.role==='super'?'rgba(224,72,72,0.1)':'rgba(32,232,112,0.1)',border:`2px solid ${a.role==='super'?'#e04848':'#20e870'}`,color:a.role==='super'?'#e04848':'#20e870'}}>{a.role==='super'?'👑':'👤'}</div>
                <div><div style={{fontWeight:600}}>{a.display_name||a.username}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>@{a.username} · {a.role==='super'?'超管':'普通'}{la&&` · ${la.name}`}</div></div>
              </div>
              {a.username!=='stevenruan'&&<button className="btn btn-danger btn-small" onClick={()=>deleteAdmin(a.id,a.display_name||a.username)}>删除</button>}
            </div>
          );})}
        </div>
      </>)}

      {/* 社区管理 */}
      {tab==='community'&&(<>
        <div className="admin-section">
          <h3>🌐 社区玩家管理 ({communityPlayers.length})</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:14}}>管理所有注册玩家和他们的改枪码数据</p>
          <div style={{display:'grid',gap:8}}>
            {communityPlayers.map(p=>{
              const st=communityGunStats[p.id]||{guns:0,variants:0};
              return(
                <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:10,flexWrap:'wrap',gap:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                    {p.avatar_url?<img src={p.avatar_url} alt="" style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--border)',flexShrink:0}}/>
                    :<div style={{width:38,height:38,borderRadius:'50%',background:'rgba(32,232,112,0.08)',border:'2px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>{(p.nickname||p.username||'?').charAt(0).toUpperCase()}</div>}
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:14}}>{p.nickname||p.username}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>
                        @{p.username} · {st.guns}把枪 · {st.variants}配置
                        {p.description&&` · ${p.description}`}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    {st.variants>0&&<button className="btn btn-small" style={{color:'#e0a030',border:'1px solid rgba(224,160,48,0.25)'}} onClick={()=>deletePlayerGuns(p.id,p.nickname||p.username)}>清空枪械</button>}
                    <button className="btn btn-danger btn-small" onClick={()=>deletePlayer(p.id,p.nickname||p.username)}>删除账号</button>
                  </div>
                </div>
              );
            })}
            {communityPlayers.length===0&&<p style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:20}}>暂无注册玩家</p>}
          </div>
        </div>
      </>)}

      {/* 审核 */}
      {tab==='reviews'&&(<>
        <div className="admin-section">
          <h3>📝 待审核 ({reviews.length})</h3>
          {reviews.map(r=>{const au=authors.find(a=>a.id===r.author_id);return(
            <div key={r.id} style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:10,padding:16,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                {r.new_avatar_url&&<img src={r.new_avatar_url} alt="" style={{width:48,height:48,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--accent)'}}/>}
                <div>
                  <div style={{fontWeight:600,fontSize:15}}>{au?.name||'?'} → <span style={{color:'var(--accent)'}}>{r.new_name}</span></div>
                  {r.new_description&&<div style={{fontSize:12,color:'var(--text-muted)'}}>简介：{r.new_description}</div>}
                </div>
              </div>
              <div style={{display:'flex',gap:8}}><button className="btn btn-success btn-small" onClick={()=>reviewProfile(r.id,true)}>✅ 通过</button><button className="btn btn-danger btn-small" onClick={()=>reviewProfile(r.id,false)}>❌ 拒绝</button></div>
            </div>
          );})}
        </div>
      </>)}
    </div>
  );
}

export default Admin;