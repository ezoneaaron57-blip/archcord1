// src/components/ChannelSidebar.jsx
import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, serverTimestamp,
  query, orderBy, doc, updateDoc
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { useStore } from '../store'
import { hashColor, initials } from '../utils'

export default function ChannelSidebar({ onDmClick }) {
  const me             = useStore(s => s.me)
  const activeServer   = useStore(s => s.activeServer)
  const channels       = useStore(s => s.channels)
  const setChannels    = useStore(s => s.setChannels)
  const activeChannel  = useStore(s => s.activeChannel)
  const setActiveChannel = useStore(s => s.setActiveChannel)
  const activeDm       = useStore(s => s.activeDm)
  const unread         = useStore(s => s.unread)
  const [addingCh, setAddingCh] = useState(false)
  const [newChName, setNewChName] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteId, setInviteId] = useState('')

  // Listen to channels for active server
  useEffect(() => {
    if (!activeServer) return
    const q = query(
      collection(db, `servers/${activeServer.id}/channels`),
      orderBy('position', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      const chs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setChannels(chs)
      if (!activeChannel && chs.length > 0) setActiveChannel(chs[0])
    })
    return () => unsub()
  }, [activeServer?.id])

  const addChannel = async () => {
    if (!newChName.trim() || !activeServer) return
    const name = newChName.trim().toLowerCase().replace(/\s+/g, '-')
    await addDoc(collection(db, `servers/${activeServer.id}/channels`), {
      name, type: 'text', position: channels.length, createdAt: serverTimestamp()
    })
    setNewChName(''); setAddingCh(false)
  }

  const copyServerId = () => {
    if (activeServer) {
      navigator.clipboard.writeText(activeServer.id)
      setInviteId(activeServer.id)
    }
  }

  return (
    <div style={{width:210,background:'rgba(10,11,15,.9)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0}}>
      {/* Header */}
      <div style={{padding:'11px 12px 9px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:12.5,fontWeight:700,letterSpacing:'.04em',color: activeServer ? hashColor(activeServer.name) : 'var(--accent)',display:'flex',alignItems:'center',gap:6}}>
          {activeServer?.emoji} {activeServer?.name || 'ArchCord'}
        </div>
        <button onClick={()=>setShowInvite(p=>!p)} title="Invite / Server ID"
          style={{fontSize:13,padding:'3px',borderRadius:3,color:'var(--dim)',transition:'color .1s'}}>⚙</button>
      </div>

      {showInvite && (
        <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'rgba(0,0,0,.3)'}}>
          <div style={{fontSize:10.5,color:'var(--dim)',marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Invite friends</div>
          <div style={{fontSize:11,color:'var(--text)',marginBottom:6}}>Share this Server ID:</div>
          <div style={{display:'flex',gap:4}}>
            <input readOnly value={activeServer?.id || ''} style={{flex:1,background:'rgba(0,0,0,.4)',border:'1px solid var(--border2)',borderRadius:4,padding:'5px 7px',fontSize:10.5,color:'var(--blue)',fontFamily:'var(--font)'}}/>
            <button onClick={copyServerId}
              style={{padding:'5px 8px',background:'rgba(87,199,255,.12)',border:'1px solid rgba(87,199,255,.25)',color:'var(--blue)',borderRadius:4,fontSize:11,cursor:'pointer',fontFamily:'var(--font)'}}>copy</button>
          </div>
          <div style={{fontSize:10,color:'var(--dim)',marginTop:5}}>Friends paste this ID to join — feature coming soon.</div>
        </div>
      )}

      {/* DMs quick link */}
      <div style={{padding:'6px 5px 2px'}}>
        <div style={{fontSize:9.5,color:'var(--dim)',letterSpacing:'.1em',textTransform:'uppercase',padding:'6px 7px 3px'}}>Direct Messages</div>
        <div onClick={onDmClick}
          style={{display:'flex',alignItems:'center',gap:6,padding:'5px 7px',borderRadius:4,cursor:'pointer',
            color: activeDm ? 'var(--text)' : 'var(--dim)',
            background: activeDm ? 'rgba(255,255,255,.09)' : 'none',
            transition:'background .1s,color .1s',fontSize:12}}
          onMouseEnter={e=>{if(!activeDm){e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='var(--text)'}}}
          onMouseLeave={e=>{if(!activeDm){e.currentTarget.style.background='none';e.currentTarget.style.color='var(--dim)'}}}>
          <span style={{fontSize:13}}>✉️</span>
          <span>Messages</span>
        </div>
      </div>

      {/* Channels */}
      <div style={{flex:1,overflowY:'auto',padding:'4px 5px'}}>
        <div style={{fontSize:9.5,color:'var(--dim)',letterSpacing:'.1em',textTransform:'uppercase',padding:'8px 7px 3px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>▾ channels</span>
          {activeServer?.ownerId === me?.uid && (
            <button onClick={()=>setAddingCh(p=>!p)}
              style={{fontSize:14,color:'var(--dim)',padding:'0 2px',transition:'color .1s'}}
              onMouseEnter={e=>e.target.style.color='var(--accent)'}
              onMouseLeave={e=>e.target.style.color='var(--dim)'}>+</button>
          )}
        </div>

        {channels.map(ch => {
          const active = activeChannel?.id === ch.id
          const unreadCount = unread[`servers/${activeServer?.id}/channels/${ch.id}`] || 0
          return (
            <div key={ch.id}
              onClick={() => { setActiveChannel(ch); useStore.setState({activeDm:null}) }}
              style={{display:'flex',alignItems:'center',gap:6,padding:'5px 7px',borderRadius:4,cursor:'pointer',
                color: active ? 'var(--text)' : 'var(--dim)',
                background: active ? 'rgba(255,255,255,.09)' : 'none',
                transition:'background .1s,color .1s',fontSize:12,marginBottom:1}}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='var(--text)'}}}
              onMouseLeave={e=>{if(!active){e.currentTarget.style.background='none';e.currentTarget.style.color='var(--dim)'}}}>
              <span style={{width:13,textAlign:'center',color: active ? 'var(--accent)' : 'inherit'}}>#</span>
              <span style={{flex:1}}>{ch.name}</span>
              {unreadCount > 0 && !active && (
                <span style={{background:'var(--pink)',color:'#000',fontSize:9,padding:'1px 5px',borderRadius:8,fontWeight:700}}>
                  {Math.min(unreadCount, 99)}
                </span>
              )}
            </div>
          )
        })}

        {addingCh && (
          <div style={{padding:'4px 5px'}}>
            <input autoFocus value={newChName} onChange={e=>setNewChName(e.target.value)}
              placeholder="channel-name"
              onKeyDown={e=>{if(e.key==='Enter')addChannel();if(e.key==='Escape')setAddingCh(false)}}
              style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid rgba(90,247,142,.35)',borderRadius:4,padding:'5px 8px',fontSize:12,color:'var(--text)',fontFamily:'var(--font)'}} />
          </div>
        )}
      </div>

      {/* User panel */}
      <div style={{padding:'8px 9px',borderTop:'1px solid var(--border)',background:'rgba(6,7,10,.7)',display:'flex',alignItems:'center',gap:7}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:hashColor(me?.displayName||''),display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#000',flexShrink:0,position:'relative'}}>
          {initials(me?.displayName||'')}
          <div style={{position:'absolute',bottom:-1,right:-1,width:8,height:8,borderRadius:'50%',border:'2px solid rgba(6,7,10,.9)',background:'var(--accent)'}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11.5,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{me?.displayName}</div>
          <div style={{fontSize:9.5,color:'var(--accent)'}}>● online</div>
        </div>
        <button title="Logout" onClick={()=>signOut(auth)}
          style={{fontSize:12,padding:'3px',borderRadius:3,color:'var(--dim)',transition:'color .1s'}}
          onMouseEnter={e=>e.target.style.color='var(--red)'}
          onMouseLeave={e=>e.target.style.color='var(--dim)'}>⏏</button>
      </div>
    </div>
  )
}
