// src/pages/Auth.jsx
import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

const s = {
  wrap: {
    height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 30% 70%, rgba(20,50,40,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(15,30,60,0.4) 0%, transparent 60%), var(--bg0)',
  },
  card: {
    width: 400, background: 'rgba(18,19,26,0.95)', border: '1px solid var(--border2)',
    borderRadius: 10, padding: '32px 28px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
    animation: 'slideUp .2s ease',
  },
  logo: { fontSize: 32, textAlign: 'center', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: 700, color: 'var(--accent)', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 11.5, color: 'var(--dim)', textAlign: 'center', marginBottom: 24 },
  field: { marginBottom: 14 },
  label: { fontSize: 10.5, color: 'var(--dim)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 5 },
  input: {
    width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border2)',
    borderRadius: 5, padding: '9px 11px', fontSize: 13, color: 'var(--text)',
    transition: 'border-color .2s', fontFamily: 'var(--font)',
  },
  btnPrimary: {
    width: '100%', padding: '10px', background: 'rgba(90,247,142,0.15)',
    border: '1px solid rgba(90,247,142,0.35)', color: 'var(--accent)',
    borderRadius: 5, fontSize: 13, fontWeight: 700, letterSpacing: '.04em',
    transition: 'background .15s', marginTop: 6, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  switch: { textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--dim)' },
  switchBtn: { color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12 },
  err: { color: 'var(--pink)', fontSize: 11.5, marginTop: 8, textAlign: 'center' },
  spinner: { textAlign: 'center', padding: '8px 0', color: 'var(--accent)', fontSize: 12 },
}

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [err, setErr]   = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    setErr(''); setLoading(true)
    try {
      if (mode === 'register') {
        if (!form.displayName.trim()) { setErr('Display name required.'); setLoading(false); return }
        const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password)
        await updateProfile(user, { displayName: form.displayName.trim() })
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: form.displayName.trim(),
          email: form.email,
          status: 'online',
          createdAt: serverTimestamp(),
        })
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password)
      }
    } catch (e) {
      const msgs = {
        'auth/email-already-in-use': 'Email already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-credential': 'Wrong email or password.',
        'auth/user-not-found': 'No account found.',
      }
      setErr(msgs[e.code] || e.message)
    }
    setLoading(false)
  }

  const onKey = (e) => { if (e.key === 'Enter') submit() }

  return (
    <div style={s.wrap}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
      <div style={s.card}>
        <div style={s.logo}>🐧</div>
        <div style={s.title}>ArchCord</div>
        <div style={s.sub}>{mode === 'login' ? 'Welcome back · $ login' : 'Create your account · $ register'}</div>

        {mode === 'register' && (
          <div style={s.field}>
            <label style={s.label}>Display Name</label>
            <input style={s.input} placeholder="e.g. John Doe" value={form.displayName}
              onChange={e => update('displayName', e.target.value)} onKeyDown={onKey} />
          </div>
        )}
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="you@example.com" value={form.email}
            onChange={e => update('email', e.target.value)} onKeyDown={onKey} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" placeholder="••••••••" value={form.password}
            onChange={e => update('password', e.target.value)} onKeyDown={onKey} />
        </div>

        {err && <div style={s.err}>{err}</div>}
        {loading
          ? <div style={s.spinner}>authenticating...</div>
          : <button style={s.btnPrimary} onClick={submit}>{mode === 'login' ? '⏎ Login' : '⏎ Create Account'}</button>
        }
        <div style={s.switch}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button style={s.switchBtn} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}>
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
