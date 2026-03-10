// src/components/ServerSidebar.jsx
import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { hashColor } from '../utils'

const SERVER_EMOJIS = ['🏠','🎮','📚','🎵','💼','🌍','🎨','⚽','🍕','🐧','🔥','💻']

export default function ServerSidebar() {
  const me            = useStore(s => s.me)
  const servers       = useStore(s => s.servers)
  const setServers    = useStore(s => s.setServers)
  const activeServer  = useStore(s => s.activeServer)
  const setActiveServer = useStore(s => s.setActiveServer)
  const setChannels   = useStore(s => s.setChannels)
  const setActiveChannel = useStore(s => s.setActiveChannel)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '🐧' })
  const [loading, setLoading] = useState(false)

  // Listen to servers where user is a member
  useEffect(() => {
    if (!me) return
    const unsub = onSnapshot(collection(db, 'servers'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const mine = all.filter(s => s.members?.includes(me.uid))
      setServers(mine)
      if (!activeServer && mine.length > 0) {
        setActiveServer(mine[0])
      }
    })
    return () => unsub()
  }, [me?.uid])

  const createServer = async () => {
    if (!form.name.trim() || !me) return
    setLoading(true)
    try {
      const serverRef = await addDoc(collection(db, 'servers'), {
        name: form.name.trim(),
        emoji: form.emoji,
        ownerId: me.uid,
        members: [me.uid],
        createdAt: serverTimestamp(),
      })
      // Create default channels
      const defs = [
        { name: 'general', type: 'text', position: 0 },
        { name: 'random',  type: 'text', position: 1 },
        { name: 'media',   type: 'text', position: 2 },
      ]
      for (const ch of defs) {
        await addDoc(collection(db, `servers/${serverRef.id}/channels`), { ...ch, createdAt: serverTimestamp() })
      }
      setShowCreate(false)
      setForm({ name: '', emoji: '🐧' })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const joinServer = async (server) => {
    if (!me || server.members?.includes(me.uid)) return
    await setDoc(doc(db, 'servers', server.id), { members: [...(server.members||[]), me.uid] }, { merge: true })
  }

  return (
    <>
      {showCreate && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{width:360,background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:10,padding:'28px 24px',animation:'slideUp .18s ease'}}>
            <div style={{fontSize:15,fontWeight:700,color:'var(--accent)',marginBottom:4}}>Create a Server</div>
            <div style={{fontSize:11.5,color:'var(--dim)',marginBottom:20}}>Your personal space for family, friends, or school.</div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:10.5,color:'var(--dim)',letterSpacing:'.08em',textTransform:'uppercase',display:'block',marginBottom:5}}>Emoji</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {SERVER_EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(p=>({...p,emoji:e}))}
                    style={{fontSize:20,padding:'6px',borderRadius:6,background: form.emoji===e ? 'rgba(90,247,142,.15)' : 'rgba(255,255,255,.05)',
                      border: `1px solid ${form.emoji===e ? 'rgba(90,247,142,.4)' : 'var(--border)'}`,transition:'all .1s'}}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:10.5,color:'var(--dim)',letterSpacing:'.08em',textTransform:'uppercase',display:'block',marginBottom:5}}>Server Name</label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="My Awesome Server"
                onKeyDown={e=>e.key==='Enter'&&createServer()}
                style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid var(--border2)',borderRadius:5,padding:'9px 11px',fontSize:13,color:'var(--text)',fontFamily:'var(--font)'}} />
            </div>

            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button onClick={createServer} disabled={loading}
                style={{flex:1,padding:9,background:'rgba(90,247,142,.15)',border:'1px solid rgba(90,247,142,.35)',color:'var(--accent)',borderRadius:5,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)'}}>
                {loading ? 'Creating...' : '⏎ Create Server'}
              </button>
              <button onClick={()=>setShowCreate(false)}
                style={{flex:1,padding:9,background:'rgba(255,255,255,.06)',border:'1px solid var(--border2)',color:'var(--dim)',borderRadius:5,fontSize:13,cursor:'pointer',fontFamily:'var(--font)'}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{width:56,background:'var(--bg0)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 0',gap:5,flexShrink:0,overflowY:'auto'}}>
        {servers.map(server => {
          const active = activeServer?.id === server.id
          return (
            <div key={server.id}
              title={server.name}
              onClick={() => { setActiveServer(server); setActiveChannel(null) }}
              style={{width:38,height:38,borderRadius: active ? 12 : '50%',display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:18,cursor:'pointer',transition:'border-radius .2s,background .15s',position:'relative',flexShrink:0,
                background: active ? `${hashColor(server.name)}22` : 'rgba(255,255,255,.07)',
                border: `1px solid ${active ? hashColor(server.name)+'44' : 'transparent'}`}}>
              {active && <div style={{position:'absolute',left:-8,top:'50%',transform:'translateY(-50%)',width:3,height:18,background:hashColor(server.name),borderRadius:'0 2px 2px 0'}}/>}
              {server.emoji}
            </div>
          )
        })}

        <div style={{width:26,height:1,background:'var(--border)',flexShrink:0,margin:'2px 0'}}/>

        <div title="Create Server" onClick={() => setShowCreate(true)}
          style={{width:38,height:38,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:20,cursor:'pointer',border:'1px dashed rgba(255,255,255,.15)',color:'var(--accent)',
            transition:'border-radius .2s,background .15s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderRadius='12px';e.currentTarget.style.background='rgba(90,247,142,.1)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderRadius='50%';e.currentTarget.style.background='none'}}>
          +
        </div>
      </div>

      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
    </>
  )
}
