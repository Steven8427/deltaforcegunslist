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
  const [pwInputs, setPwInputs] = useState({});
  const [currentPw, setCurrentPw] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mfgItems, setMfgItems] = useState([]);
  const [mfgRefreshing, setMfgRefreshing] = useState(false);
  const [priceRefreshing, setPriceRefreshing] = useState(false);
  const [priceCount, setPriceCount] = useState(0);

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

  const fetchPasswords = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    let { data } = await supabase.from('daily_passwords').select('*').eq('date', today).order('map_id');
    if (!data || data.length === 0) {
      const { data: latest } = await supabase.from('daily_passwords').select('*').order('date', { ascending: false }).order('map_id').limit(10);
      data = latest || [];
    }
    setCurrentPw(data);
    const inputs = {};
    data.forEach(p => { inputs[p.map_id] = p.secret; });
    setPwInputs(inputs);
  }, []);

  const fetchMfg = useCallback(async () => {
    const { data } = await supabase.from('manufacturing_items').select('*').order('profit_per_hour', { ascending: false });
    setMfgItems(data || []);
  }, []);

  const fetchPriceCount = useCallback(async () => {
    const { count } = await supabase.from('price_history').select('*', { count: 'exact', head: true });
    setPriceCount(count || 0);
  }, []);

  useEffect(() => { if (isAdmin) { fetchAll(); fetchPasswords(); fetchMfg(); fetchPriceCount(); } }, [isAdmin, fetchAll, fetchPasswords, fetchMfg, fetchPriceCount]);

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

  // ===== 作者 =====
  async function addAuthor() {
    if (!newAuthor.name.trim() || !newAuthor.slug.trim()) { toast.error('名称和slug必填'); return; }
    setUploadingImage(true); let avatarUrl = null;
    try { if (newAuthorAvatar) avatarUrl = await uploadImage(newAuthorAvatar); } catch { toast.error('头像上传失败'); setUploadingImage(false); return; }
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
    if (!editingAuthor?.name?.trim() || !editingAuthor?.slug?.trim()) { toast.error('不能为空'); return; }
    await supabase.from('authors').update({ name: editingAuthor.name.trim(), slug: editingAuthor.slug.trim().toLowerCase(), description: editingAuthor.description || '' }).eq('id', editingAuthor.id);
    toast.success('已更新！'); setEditingAuthor(null); fetchAll();
  }

  // ===== 枪械 =====
  const authorGuns = guns.filter(g => g.author_id === selectedAuthorId);
  const selectedGun = guns.find(g => g.id === selectedGunId);
  async function addGun() {
    if (!selectedAuthorId || !newGunName.trim()) { toast.error('填完整'); return; }
    setUploadingImage(true); let imageUrl = null;
    try { if (newGunImage) imageUrl = await uploadImage(newGunImage); } catch { toast.error('失败'); setUploadingImage(false); return; }
    const mx = guns.reduce((m, g) => Math.max(m, g.sort_order || 0), 0);
    await supabase.from('guns').insert({ name: newGunName.trim(), category: newGunCategory, image_url: imageUrl, author_id: selectedAuthorId, sort_order: mx + 1 });
    toast.success('添加成功！'); setNewGunName(''); setNewGunImage(null); setUploadingImage(false); fetchAll();
  }
  async function deleteGun(id, name) { if (!window.confirm(`删除 ${name}？`)) return; await supabase.from('guns').delete().eq('id', id); toast.success('已删除'); if (selectedGunId === id) setSelectedGunId(''); fetchAll(); }
  async function updateGunImage(id, file) { try { const url = await uploadImage(file); await supabase.from('guns').update({ image_url: url }).eq('id', id); toast.success('更新！'); fetchAll(); } catch { toast.error('失败'); } }
  async function updateGunCategory(id, cat) { await supabase.from('guns').update({ category: cat }).eq('id', id); fetchAll(); }

  // ===== 改装码 =====
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

  // ===== 每日密码 =====
  async function autoFetchPw() {
    setRefreshing(true);
    try { const r = await (await fetch('https://iugcmnqglxrcmdodugqk.supabase.co/functions/v1/fetch-passwords', { method: 'POST' })).json(); if (r.success) { toast.success(`获取成功！${r.count}个密码`); await fetchPasswords(); } else toast.error('失败'); } catch { toast.error('请求失败'); }
    setRefreshing(false);
  }
  async function manualSavePw() {
    const entries = Object.entries(pwInputs).filter(([_, v]) => v && v.trim());
    if (!entries.length) { toast.error('至少输入一个'); return; }
    const today = new Date().toISOString().split('T')[0]; let count = 0;
    for (const [id, secret] of entries) { const map = PW_MAPS.find(m => m.id === parseInt(id)); if (!map) continue; const { error } = await supabase.from('daily_passwords').upsert({ map_id: parseInt(id), map_name: map.name, secret: secret.trim(), date: today, updated_at: new Date().toISOString() }, { onConflict: 'map_id,date' }); if (!error) count++; }
    toast.success(`更新 ${count} 个密码！`); await fetchPasswords();
  }

  // ===== 制造利润 =====
  async function autoFetchMfg() {
    setMfgRefreshing(true);
    try { const r = await (await fetch('https://iugcmnqglxrcmdodugqk.supabase.co/functions/v1/fetch-manufacturing', { method: 'POST' })).json(); if (r.success) { toast.success(`获取成功！${r.count}个方案`); await fetchMfg(); } else toast.error('失败'); } catch { toast.error('请求失败'); }
    setMfgRefreshing(false);
  }

  // ===== 价格 =====
  async function autoFetchPrices() {
    setPriceRefreshing(true);
    try { const r = await (await fetch('https://iugcmnqglxrcmdodugqk.supabase.co/functions/v1/fetch-prices')).json(); if (r.success) { toast.success(`获取成功！${r.count}个物品价格`); await fetchPriceCount(); } else toast.error('失败：' + (r.message || '')); } catch { toast.error('请求失败'); }
    setPriceRefreshing(false);
  }

  function formatPrice(n) { if (!n && n !== 0) return '-'; if (n >= 10000) return (n / 10000).toFixed(1) + 'w'; return n.toLocaleString(); }

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

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[['authors','👤 作者'],['guns','🔫 枪械'],['passwords','🔑 密码'],['manufacturing','💰 制造'],['prices','📈 价格']].map(([k,l]) => (
          <button key={k} className={`filter-chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ===== 作者 ===== */}
      {tab === 'authors' && (<>
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
        <div className="admin-section">
          <h3>👤 选择作者</h3>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{authors.map(a=>(<button key={a.id} className={`filter-chip ${selectedAuthorId===a.id?'active':''}`} onClick={()=>{setSelectedAuthorId(a.id);setSelectedGunId('')}}>{a.name} ({guns.filter(g=>g.author_id===a.id).length})</button>))}</div>
        </div>
        {selAuthor && (<>
          <div className="admin-section">
            <h3>➕ 给「{selAuthor.name}」添加枪械</h3>
            <div className="form-row">
              <div className="form-group"><label>名称</label><input type="text" value={newGunName} onChange={e=>setNewGunName(e.target.value)} placeholder="AK-47"/></div>
              <div className="form-group"><label>分类</label><select value={newGunCategory} onChange={e=>setNewGunCategory(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="form-group"><label>图片</label><input type="file" accept="image/*" onChange={e=>setNewGunImage(e.target.files[0]||null)} style={{padding:'7px 10px'}}/></div>
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

      {/* ===== 每日密码 ===== */}
      {tab === 'passwords' && (<>
        <div className="admin-section">
          <h3>🔄 自动获取</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>每天00:05自动执行。</p>
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
        <div className="admin-section">
          <h3>📋 当前密码</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
            {currentPw.map(pw=>{const map=PW_MAPS.find(m=>m.name===pw.map_name)||{icon:'🗺️',color:'#20e870'};return(<div key={pw.id} style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:10,padding:14,textAlign:'center'}}><div style={{fontSize:20,marginBottom:4}}>{map.icon}</div><div style={{fontSize:12,color:'var(--text-muted)',marginBottom:6}}>{pw.map_name}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:24,fontWeight:900,color:map.color,letterSpacing:4}}>{pw.secret}</div></div>);})}
          </div>
        </div>
      </>)}

      {/* ===== 制造利润 ===== */}
      {tab === 'manufacturing' && (<>
        <div className="admin-section">
          <h3>🔄 获取制造数据</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>从腾讯API获取特勤处制造利润推荐。</p>
          <button className="btn btn-primary" onClick={autoFetchMfg} disabled={mfgRefreshing}>{mfgRefreshing?'获取中...':'🔄 立即获取'}</button>
        </div>
        <div className="admin-section">
          <h3>📋 制造数据 ({mfgItems.length})</h3>
          {mfgItems.length===0?<p style={{color:'var(--text-muted)',fontSize:13}}>暂无数据</p>:(
            <div style={{display:'grid',gap:6}}>{mfgItems.slice(0,20).map(item=>(
              <div key={item.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,gap:8}}>
                <div style={{fontSize:13,fontWeight:600}}>{item.item_name}{item.per_count>1&&` ×${item.per_count}`}</div>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>{item.place_name}</span>
                  <span style={{fontSize:13,fontWeight:700,color:item.profit>0?'#20e870':'#e04848'}}>{item.profit>0?'+':''}{formatPrice(item.profit)}</span>
                </div>
              </div>
            ))}</div>
          )}
          {mfgItems.length>20&&<p style={{fontSize:12,color:'var(--text-muted)',marginTop:8}}>仅显示前20条，共{mfgItems.length}条</p>}
        </div>
      </>)}

      {/* ===== 价格 ===== */}
      {tab === 'prices' && (<>
        <div className="admin-section">
          <h3>📈 价格数据管理</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>
            从腾讯API获取所有物品的当前均价，每天自动记录。积累多天数据后即可展示走势图。
            <br/>当前已记录 <strong style={{color:'var(--accent)'}}>{priceCount}</strong> 条价格数据。
            系统每天00:10自动获取。
          </p>
          <button className="btn btn-primary" onClick={autoFetchPrices} disabled={priceRefreshing}>
            {priceRefreshing?'获取中...':'📈 立即获取今日价格'}
          </button>
        </div>
      </>)}
    </div>
  );
}

export default Admin;