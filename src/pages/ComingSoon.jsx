import React from 'react';

function ComingSoon({ title, icon }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '50vh', textAlign: 'center', padding: 40,
    }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>{icon}</div>
      <h1 style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 900,
        background: 'linear-gradient(135deg, #20e870, #18a0d0)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 12,
      }}>
        {title}
      </h1>
      <p style={{ color: '#506878', fontSize: 15, marginBottom: 8 }}>
        功能开发中，敬请期待...
      </p>
      <div style={{
        width: 60, height: 3, borderRadius: 2, marginTop: 16,
        background: 'linear-gradient(90deg, #20e870, #18a0d0)',
      }} />
    </div>
  );
}

export default ComingSoon;
