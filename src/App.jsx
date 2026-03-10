// src/App.jsx
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { useStore } from './store'
import Auth from './pages/Auth'
import ServerSidebar from './components/ServerSidebar'
import ChannelSidebar from './components/ChannelSidebar'
import MembersSidebar from './components/MembersSidebar'
import ChatView from './components/ChatView'
import DmView from './components/DmView'

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const me            = useStore(s => s.me)
  const setMe         = useStore(s => s.setMe)
  const activeServer  = useStore(s => s.activeServer)
  const activeChannel = useStore(s => s.activeChannel)
  const activeDm      = useStore(s => s.activeDm)
  const setActiveDm   = useStore(s => s.setActiveDm)
  const setActiveChannel = useStore(s => s.setActiveChannel)
  const [clock, setClock] = useState('')
  const [showMembers, setShowMembers] = useState(true)

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      setClock(`${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`)
    }
    tick()
    const t = setInterval(tick, 15000)
    return () => clearInterval(t)
  }, [])

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user profile from Firestore
        const userUnsub = onSnapshot(doc(db, 'users', user.uid), snap => {
          if (snap.exists()) {
            setMe({ uid: user.uid, displayName: user.displayName, email: user.email, ...snap.data() })
          } else {
            setMe({ uid: user.uid, displayName: user.displayName, email: user.email })
          }
        })
        // Mark online
        try {
          await updateDoc(doc(db, 'users', user.uid), { status: 'online', lastSeen: serverTimestamp() })
        } catch {}
        setAuthReady(true)
        return () => userUnsub()
      } else {
        setMe(null)
        setAuthReady(true)
      }
    })

    // Mark offline on close
    const handleUnload = async () => {
      if (auth.currentUser) {
        try { await updateDoc(doc(db, 'users', auth.currentUser.uid), { status: 'offline', lastSeen: serverTimestamp() }) } catch {}
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => { unsub(); window.removeEventListener('beforeunload', handleUnload) }
  }, [])

  if (!authReady) {
    return (
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg0)',color:'var(--accent)',fontSize:13}}>
        initializing archcord...
      </div>
    )
  }

  if (!me) return <Auth />

  const channelPath = activeServer && activeChannel
    ? `servers/${activeServer.id}/channels/${activeChannel.id}`
    : null

  return (
    <div style={{display:'flex',height:'100vh',flexDirection:'column'}}>
      {/* Titlebar */}
      <div style={{height:30,background:'rgba(6,7,10,.98)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',padding:'0 12px',gap:8,flexShrink:0,userSelect:'none'}}>
        <div style={{display:'flex',gap:5}}>
          <div style={{width:11,height:11,borderRadius:'50%',background:'#ff5f57',cursor:'pointer'}} title="logout" />
          <div style={{width:11,height:11,borderRadius:'50%',background:'#ffbd2e'}} />
          <div style={{width:11,height:11,borderRadius:'50%',background:'#28c840'}} />
        </div>
        <div style={{flex:1,textAlign:'center',fontSize:11,color:'var(--dim)',letterSpacing:'.03em'}}>
          — : <span style={{color:'var(--accent)'}}>ArchCord</span> – Konsole
        </div>
        <div style={{fontSize:10.5,color:'var(--accent)',fontWeight:500}}>{clock}</div>
      </div>

      {/* App body */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <ServerSidebar />

        {activeDm ? (
          <>
            <ChannelSidebar onDmClick={()=>{ setActiveDm(null); setActiveChannel(null) }} />
            <DmView />
          </>
        ) : (
          <>
            <ChannelSidebar onDmClick={()=>{ setActiveDm(null); setActiveChannel(null) }} />

            {/* Main area */}
            <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
              {/* Chat header */}
              {activeChannel && (
                <div style={{height:40,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',padding:'0 14px',gap:10,flexShrink:0,background:'rgba(9,10,14,.6)'}}>
                  <div style={{fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
                    <span style={{color:'var(--accent)'}}>#</span>
                    {activeChannel.name}
                    <span style={{fontSize:11,color:'var(--dim)',marginLeft:6,paddingLeft:8,borderLeft:'1px solid var(--border2)'}}>
                      {activeServer?.name}
                    </span>
                  </div>
                  <div style={{marginLeft:'auto',display:'flex',gap:4}}>
                    <button onClick={()=>setShowMembers(p=>!p)}
                      style={{fontSize:11,padding:'4px 8px',borderRadius:4,color:'var(--dim)',display:'flex',alignItems:'center',gap:4,transition:'color .1s,background .1s'}}
                      onMouseEnter={e=>{e.currentTarget.style.color='var(--blue)';e.currentTarget.style.background='rgba(87,199,255,.08)'}}
                      onMouseLeave={e=>{e.currentTarget.style.color='var(--dim)';e.currentTarget.style.background='none'}}>
                      👥 members
                    </button>
                  </div>
                </div>
              )}

              {channelPath ? (
                <ChatView
                  key={channelPath}
                  channelPath={channelPath}
                  channelName={activeChannel?.name}
                />
              ) : (
                <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,color:'var(--dim)'}}>
                  <div style={{fontSize:40}}>{activeServer?.emoji || '🐧'}</div>
                  <div style={{fontSize:15,fontWeight:600,color:'var(--text)'}}>{activeServer?.name || 'Welcome to ArchCord'}</div>
                  <div style={{fontSize:12}}>Select a channel to start chatting.</div>
                </div>
              )}
            </div>

            {showMembers && <MembersSidebar />}
          </>
        )}
      </div>
    </div>
  )
}
