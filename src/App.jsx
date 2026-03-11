import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Admin from './pages/Admin';
import ComingSoon from './pages/ComingSoon';

function App() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/codes', icon: '🔫', label: '烽火地带改枪码' },
    { path: '/streamers', icon: '🎙️', label: '主播同款改枪码' },
    { path: '/daily', icon: '🔑', label: '每日密码' },
    { path: '/map', icon: '🗺️', label: '官方地图工具' },
    { path: '/profit', icon: '💰', label: '特勤处制造利润' },
    { path: '/cards', icon: '🃏', label: '卡战备系统' },
    { path: '/prices', icon: '📈', label: '价格走势图' },
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

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
            <img src="/logo.png" alt="logo" className="sidebar-logo-img" onError={e => { e.target.style.display = 'none'; }} />
            <span className="sidebar-logo-text">改枪码大全</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="main-wrapper">
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
            <Route path="/daily" element={<ComingSoon title="每日密码" icon="🔑" />} />
            <Route path="/map" element={<ComingSoon title="官方地图工具" icon="🗺️" />} />
            <Route path="/profit" element={<ComingSoon title="特勤处制造利润" icon="💰" />} />
            <Route path="/cards" element={<ComingSoon title="卡战备系统" icon="🃏" />} />
            <Route path="/prices" element={<ComingSoon title="价格走势图" icon="📈" />} />
            <Route path="/admin" element={<Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin} />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;