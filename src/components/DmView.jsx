// src/components/DmView.jsx
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { hashColor, initials } from '../utils'
import ChatView from './ChatView'

// DM channel path = sorted UIDs joined by _
const dmPath = (uid1, uid2) => {
  const sorted = [uid1, uid2].sort()
  return `dms/${sorted[0]}_${sorted[1]}`
}

export default function DmView() {
  const me       = useStore(s => s.me)
  const activeDm = useStore(s => s.activeDm)
  const setActiveDm = useStore(s => s.setActiveDm)
  const [allUsers, setAllUsers] = useState([])
  const [search, setSearch] = useState('')

  // Load all users for DM list
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.uid !== me?.uid))
    })
    return () => unsub()
  }, [me?.uid])

  const filtered = allUsers.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  )

  const path = activeDm ? dmPath(me.uid, activeDm.uid) : null

  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      {/* DM user list */}
      <div style={{width:210,background:'rgba(10,11,15,.9)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'11px 12px 9px',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontSize:12.5,fontWeight:700,color:'var(--blue)',marginBottom:8}}>✉️ Direct Messages</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Find a user..."
            style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid var(--border2)',borderRadius:4,padding:'6px 9px',fontSize:12,color:'var(--text)',fontFamily:'var(--font)'}} />
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'6px 5px'}}>
          {filtered.length === 0 && (
            <div style={{padding:'12px 7px',fontSize:11,color:'var(--dim)'}}>No users found.</div>
          )}
          {filtered.map(user => {
            const active = activeDm?.uid === user.uid
            return (
              <div key={user.uid} onClick={() => setActiveDm(user)}
                style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:5,cursor:'pointer',marginBottom:2,
                  background: active ? 'rgba(87,199,255,.1)' : 'none',
                  border: `1px solid ${active ? 'rgba(87,199,255,.2)' : 'transparent'}`,
                  transition:'all .1s'}}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.background='rgba(255,255,255,.05)'}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.background='none'}}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:hashColor(user.displayName),display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#000',flexShrink:0,position:'relative'}}>
                  {initials(user.displayName)}
                  <div style={{position:'absolute',bottom:-1,right:-1,width:8,height:8,borderRadius:'50%',border:'2px solid rgba(10,11,15,.9)',background: user.status==='online' ? 'var(--accent)' : '#555'}}/>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,color: active ? 'var(--blue)' : 'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user.displayName}</div>
                  <div style={{fontSize:9.5,color:'var(--dim)'}}>{user.status==='online'?'● online':'○ offline'}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat area */}
      {activeDm ? (
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Header */}
          <div style={{height:40,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',padding:'0 14px',gap:9,flexShrink:0,background:'rgba(9,10,14,.6)'}}>
            <div style={{width:26,height:26,borderRadius:'50%',background:hashColor(activeDm.displayName),display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#000'}}>
              {initials(activeDm.displayName)}
            </div>
            <span style={{fontSize:13,fontWeight:600}}>{activeDm.displayName}</span>
            <span style={{fontSize:10.5,color:'var(--dim)',marginLeft:4}}>Direct Message</span>
          </div>
          <ChatView
            channelPath={path}
            channelName={activeDm.displayName}
            placeholder={`Message ${activeDm.displayName}`}
          />
        </div>
      ) : (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,color:'var(--dim)'}}>
          <div style={{fontSize:36}}>✉️</div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Direct Messages</div>
          <div style={{fontSize:12}}>Select a user on the left to start chatting.</div>
        </div>
      )}
    </div>
  )
}
