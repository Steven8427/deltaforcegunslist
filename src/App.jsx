import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Admin from './pages/Admin';
import ComingSoon from './pages/ComingSoon';
import DailyPassword from './pages/DailyPassword';
import Manufacturing from './pages/Manufacturing';
import PriceTrend from './pages/PriceTrend';
import MapTool from './pages/MapTool';
import Loadout from './pages/Loadout';

function App() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/codes', icon: '🔫', label: '烽火地带改枪码' },
    { path: '/streamers', icon: '🎙️', label: '主播同款改枪码' },
    { path: '/daily', icon: '🔑', label: '每日密码' },
    { path: '/profit', icon: '💰', label: '特勤处制造利润' },
    { path: '/prices', icon: '📈', label: '价格走势图' },
    { path: '/cards', icon: '🃏', label: '卡战备系统' },
    { path: '/map', icon: '🗺️', label: '官方地图工具' },
    { path: '/admin', icon: '⚙️', label: '管理后台' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/codes') return location.pathname === '/codes' || location.pathname.startsWith('/author/');
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 2000, style: { background: '#0c1a2a', color: '#d0e8f0', border: '1px solid #1a3048' } }} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
            <img src="/logo.png" alt="logo" className="sidebar-logo-img" onError={e => { e.target.style.display = 'none'; }} />
            {!sidebarCollapsed && <span className="sidebar-logo-text">改枪码大全</span>}
          </Link>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? item.label : ''}>
              <span className="sidebar-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      </aside>
      <div className={`main-wrapper ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span></span><span></span><span></span>
          </button>
          <Link to="/" className="topbar-logo">
            <img src="/logo.png" alt="" style={{ height: 26, width: 26, objectFit: 'contain', borderRadius: 4 }} onError={e => { e.target.style.display = 'none'; }} />
            <span>有力气的改枪码</span>
          </Link>
          <div style={{ width: 36 }}></div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/codes" element={<Landing />} />
            <Route path="/streamers" element={<Landing />} />
            <Route path="/author/:slug" element={<Home />} />
            <Route path="/daily" element={<DailyPassword />} />
            <Route path="/profit" element={<Manufacturing />} />
            <Route path="/prices" element={<PriceTrend />} />
            <Route path="/cards" element={<Loadout />} />
            <Route path="/map" element={<MapTool />} />
            <Route path="/admin" element={<Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin} />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;