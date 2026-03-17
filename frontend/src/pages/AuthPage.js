import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { signup, login } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'signup') {
        if (!form.name) { setError('Please enter your name.'); setLoading(false); return; }
        await signup(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', fontFamily:'var(--font-b)',
    }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontFamily:'var(--font-d)', fontSize:'2.4rem', fontWeight:600, color:'var(--text)', letterSpacing:'-0.02em' }}>HeartBound IQ</span>
          </div>
          <p style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.12em' }}>Multi Agentic AI Wedding Planner</p>
        </div>

        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'var(--r-lg)', padding:'32px 28px',
        }}>
          <div style={{ display:'flex', gap:6, marginBottom:28, background:'var(--bg-elev)', borderRadius:'var(--r-sm)', padding:4 }}>
            {['login','signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex:1, height:36, borderRadius:'calc(var(--r-sm) - 2px)',
                  border:'none', fontSize:13, fontWeight:500, cursor:'pointer',
                  fontFamily:'var(--font-b)', transition:'all 0.15s',
                  background: mode===m ? 'var(--rose)' : 'transparent',
                  color:      mode===m ? 'white'       : 'var(--text2)',
                }}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:11, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6, fontWeight:500 }}>
                  Your name
                </label>
                <input
                  style={{ width:'100%', height:44, background:'var(--bg-input)', border:'1px solid var(--border-mid)', borderRadius:'var(--r-sm)', padding:'0 14px', fontSize:14, color:'var(--text)', outline:'none', fontFamily:'var(--font-b)' }}
                  type="text" placeholder="e.g. Priya Sharma"
                  value={form.name} onChange={setF('name')} required
                  onFocus={e => e.target.style.borderColor='var(--rose)'}
                  onBlur={e  => e.target.style.borderColor='var(--border-mid)'}
                />
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6, fontWeight:500 }}>
                Email address
              </label>
              <input
                style={{ width:'100%', height:44, background:'var(--bg-input)', border:'1px solid var(--border-mid)', borderRadius:'var(--r-sm)', padding:'0 14px', fontSize:14, color:'var(--text)', outline:'none', fontFamily:'var(--font-b)' }}
                type="email" placeholder="you@example.com"
                value={form.email} onChange={setF('email')} required
                onFocus={e => e.target.style.borderColor='var(--rose)'}
                onBlur={e  => e.target.style.borderColor='var(--border-mid)'}
              />
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6, fontWeight:500 }}>
                Password
              </label>
              <input
                style={{ width:'100%', height:44, background:'var(--bg-input)', border:'1px solid var(--border-mid)', borderRadius:'var(--r-sm)', padding:'0 14px', fontSize:14, color:'var(--text)', outline:'none', fontFamily:'var(--font-b)' }}
                type="password" placeholder={mode==='signup'?'At least 6 characters':'Your password'}
                value={form.password} onChange={setF('password')} required
                onFocus={e => e.target.style.borderColor='var(--rose)'}
                onBlur={e  => e.target.style.borderColor='var(--border-mid)'}
              />
            </div>

            {error && (
              <div style={{ background:'var(--red-dim)', border:'1px solid rgba(240,96,96,0.3)', borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:13, color:'var(--red)', marginBottom:16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width:'100%', height:48, background: loading ? 'var(--rose-dark)' : 'var(--rose)',
                color:'white', border:'none', borderRadius:'var(--r-sm)',
                fontSize:15, fontWeight:500, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:'var(--font-b)', transition:'background 0.15s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              {loading ? (
                <>
                  <span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
                  {mode==='login' ? 'Logging in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'login' ? 'Log In to HeartBound IQ' : 'Create My Account'
              )}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:13, color:'var(--text3)', marginTop:20 }}>
            {mode==='login' ? "Don't have an account " : 'Already have an account '}
            <button onClick={() => { setMode(mode==='login'?'signup':'login'); setError(''); }}
              style={{ background:'none', border:'none', color:'var(--rose)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-b)', textDecoration:'underline', textUnderlineOffset:2 }}>
              {mode==='login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--text3)', marginTop:24 }}>
          Your wedding data is stored securely and privately.
        </p>
      </div>
    </div>
  );
}
