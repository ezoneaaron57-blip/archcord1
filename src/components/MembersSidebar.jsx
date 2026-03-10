// src/components/MembersSidebar.jsx
import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { hashColor, initials } from '../utils'

export default function MembersSidebar() {
  const me           = useStore(s => s.me)
  const activeServer = useStore(s => s.activeServer)
  const [members, setMembers] = useState([])
  const setActiveDm  = useStore(s => s.setActiveDm)
  const setActiveChannel = useStore(s => s.setActiveChannel)

  useEffect(() => {
    if (!activeServer) return
    // Listen to server doc to get member UIDs
    const unsub = onSnapshot(doc(db, 'servers', activeServer.id), async snap => {
      const data = snap.data()
      const uids = data?.members || []
      // Fetch user profiles
      const profiles = await Promise.all(uids.map(uid =>
        getDoc(doc(db, 'users', uid)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)
      ))
      setMembers(profiles.filter(Boolean))
    })
    return () => unsub()
  }, [activeServer?.id])

  const online  = members.filter(m => m.status === 'online')
  const offline = members.filter(m => m.status !== 'online')

  const openDm = (user) => {
    if (user.uid === me?.uid) return
    setActiveDm(user)
    setActiveChannel(null)
  }

  const MemberRow = ({ user }) => {
    const isMe = user.uid === me?.uid
    const online = user.status === 'online'
    return (
      <div onClick={() => openDm(user)}
        style={{display:'flex',alignItems:'center',gap:7,padding:'4px 7px',borderRadius:4,cursor: isMe ? 'default' : 'pointer',transition:'background .1s',marginBottom:1}}
        onMouseEnter={e=>{if(!isMe)e.currentTarget.style.background='rgba(255,255,255,.05)'}}
        onMouseLeave={e=>{e.currentTarget.style.background='none'}}>
        <div style={{width:26,height:26,borderRadius:'50%',background:hashColor(user.displayName),display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#000',flexShrink:0,position:'relative'}}>
          {initials(user.displayName)}
          <div style={{position:'absolute',bottom:-1,right:-1,width:7,height:7,borderRadius:'50%',border:'2px solid rgba(9,10,14,.85)',background: online ? 'var(--accent)' : '#555'}}/>
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:11.5,color: online ? 'var(--text)' : 'var(--dim)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {user.displayName}{isMe ? ' (you)' : ''}
          </div>
          {user.uid === activeServer?.ownerId && (
            <div style={{fontSize:9,color:'var(--yellow)'}}>owner</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{width:186,background:'rgba(9,10,14,.8)',borderLeft:'1px solid var(--border)',padding:'10px 7px',overflowY:'auto',flexShrink:0}}>
      {online.length > 0 && (
        <>
          <div style={{fontSize:9.5,color:'var(--dim)',letterSpacing:'.1em',textTransform:'uppercase',padding:'6px 7px 4px',marginBottom:2}}>
            Online — {online.length}
          </div>
          {online.map(u => <MemberRow key={u.uid} user={u} />)}
        </>
      )}
      {offline.length > 0 && (
        <>
          <div style={{fontSize:9.5,color:'var(--dim)',letterSpacing:'.1em',textTransform:'uppercase',padding:'10px 7px 4px',marginBottom:2}}>
            Offline — {offline.length}
          </div>
          {offline.map(u => <MemberRow key={u.uid} user={u} />)}
        </>
      )}
      {members.length === 0 && (
        <div style={{padding:'12px 7px',fontSize:11,color:'var(--dim)'}}>No members yet.</div>
      )}
    </div>
  )
}
