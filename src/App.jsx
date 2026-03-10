import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Admin from './pages/Admin';

function App() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  // 判断是否在作者页面
  const isAuthorPage = location.pathname.startsWith('/author/');

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'toast-success',
          duration: 2000,
          style: {
            background: '#131b1f',
            color: '#e0f0e8',
            border: '1px solid #1e2e28',
          },
        }}
      />

      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="logo">
            <img src="/logo.png" alt="logo" className="logo-img" onError={e => { e.target.style.display = 'none'; }} />
            有力气的改枪码
          </Link>
          <nav className="nav-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              🏠 首页
            </Link>
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
              ⚙️ 管理
            </Link>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/author/:slug" element={<Home />} />
          <Route path="/admin" element={<Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin} />} />
        </Routes>
      </main>
    </>
  );
}

export default App;