// src/components/Message.jsx
import { useState, useRef } from 'react'
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { hashColor, initials, fmtTime, fmtFull, isImageFile } from '../utils'

const EMOJI_LIST = ['👍','❤️','😂','🔥','😮','😢','🎉','💯','👀','✅']

export default function Message({ msg, channelPath, prevMsg }) {
  const me = useStore(s => s.me)
  const [showPicker, setShowPicker] = useState(false)
  const [showMenu, setShowMenu]     = useState(false)
  const [imgFull, setImgFull]       = useState(false)
  const isMe = msg.uid === me?.uid
  const color = hashColor(msg.displayName)

  // Group consecutive messages from same user (within 5 min)
  const grouped = prevMsg &&
    prevMsg.uid === msg.uid &&
    msg.createdAt && prevMsg.createdAt &&
    (msg.createdAt?.toDate?.()?.getTime?.() - prevMsg.createdAt?.toDate?.()?.getTime?.()) < 5 * 60 * 1000

  const react = async (emoji) => {
    const msgRef = doc(db, `${channelPath}/messages`, msg.id)
    const entry  = `${emoji}:${me.uid}`
    const already = (msg.reactions || []).includes(entry)
    await updateDoc(msgRef, { reactions: already ? arrayRemove(entry) : arrayUnion(entry) })
    setShowPicker(false)
  }

  const deleteMsg = async () => {
    if (!isMe) return
    await deleteDoc(doc(db, `${channelPath}/messages`, msg.id))
  }

  // Parse reactions: "👍:uid1" → group by emoji
  const reactionMap = {}
  ;(msg.reactions || []).forEach(r => {
    const [emoji, uid] = r.split(':')
    if (!reactionMap[emoji]) reactionMap[emoji] = []
    reactionMap[emoji].push(uid)
  })

  const renderContent = (text = '') => {
    // Basic markdown: **bold**, `code`, *italic*, URLs
    const parts = []
    let remaining = text
    const patterns = [
      { re: /\*\*(.+?)\*\*/g,  render: (m,i) => <strong key={i}>{m[1]}</strong> },
      { re: /`(.+?)`/g,        render: (m,i) => <code key={i} style={{background:'rgba(0,0,0,.5)',border:'1px solid var(--border2)',padding:'1px 5px',borderRadius:3,fontSize:'11.5px',color:'var(--accent)'}}>{m[1]}</code> },
      { re: /\*(.+?)\*/g,      render: (m,i) => <em key={i}>{m[1]}</em> },
      { re: /(https?:\/\/[^\s]+)/g, render: (m,i) => <a key={i} href={m[1]} target="_blank" rel="noreferrer">{m[1]}</a> },
    ]
    // Simple line-by-line render
    return text.split('\n').map((line, li) => (
      <span key={li}>
        {li > 0 && <br />}
        {line}
      </span>
    ))
  }

  return (
    <>
      {imgFull && msg.fileURL && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,cursor:'zoom-out'}}
          onClick={()=>setImgFull(false)}>
          <img src={msg.fileURL} alt="" style={{maxWidth:'90vw',maxHeight:'90vh',borderRadius:6,border:'1px solid var(--border2)'}} />
        </div>
      )}

      <div
        className="msg-row"
        style={{display:'flex',gap:10,padding:grouped?'1px 14px':'8px 14px 1px',borderRadius:4,position:'relative'}}
        onMouseEnter={e=>e.currentTarget.querySelector('.msg-actions')?.style&&(e.currentTarget.querySelector('.msg-actions').style.opacity='1')}
        onMouseLeave={e=>e.currentTarget.querySelector('.msg-actions')?.style&&(e.currentTarget.querySelector('.msg-actions').style.opacity='0')}
      >
        {/* Avatar or spacer */}
        <div style={{width:34,flexShrink:0,paddingTop:grouped?0:2}}>
          {!grouped && (
            <div style={{width:34,height:34,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#000'}}>
              {initials(msg.displayName)}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{flex:1,minWidth:0}}>
          {!grouped && (
            <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:3}}>
              <span style={{fontSize:13,fontWeight:600,color}}>{msg.displayName}</span>
              <span style={{fontSize:10,color:'var(--dim)'}} title={fmtFull(msg.createdAt)}>{fmtTime(msg.createdAt)}</span>
              {isMe && <span style={{fontSize:9,color:'var(--dim2)'}}>you</span>}
            </div>
          )}

          {msg.text && (
            <div style={{fontSize:13,color:'var(--text)',lineHeight:1.55,wordBreak:'break-word'}}>
              {renderContent(msg.text)}
            </div>
          )}

          {/* Image */}
          {msg.fileURL && isImageFile(msg.fileName || '') && (
            <img src={msg.fileURL} alt={msg.fileName} onClick={()=>setImgFull(true)}
              style={{maxWidth:320,maxHeight:220,borderRadius:6,marginTop:6,border:'1px solid var(--border)',cursor:'zoom-in',display:'block'}} />
          )}

          {/* Non-image file */}
          {msg.fileURL && !isImageFile(msg.fileName || '') && (
            <a href={msg.fileURL} target="_blank" rel="noreferrer" download={msg.fileName}
              style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:6,padding:'8px 12px',background:'rgba(0,0,0,.35)',border:'1px solid var(--border2)',borderRadius:5,fontSize:12,color:'var(--text)',textDecoration:'none'}}>
              <span>📄</span>
              <span style={{color:'var(--blue)'}}>{msg.fileName}</span>
              {msg.fileSize && <span style={{color:'var(--dim)',fontSize:11}}>({msg.fileSize})</span>}
            </a>
          )}

          {/* Reactions */}
          {Object.keys(reactionMap).length > 0 && (
            <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
              {Object.entries(reactionMap).map(([emoji, uids]) => (
                <button key={emoji} onClick={()=>react(emoji)}
                  style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 7px',borderRadius:10,
                    background: uids.includes(me?.uid) ? 'rgba(90,247,142,.12)' : 'rgba(255,255,255,.06)',
                    border: `1px solid ${uids.includes(me?.uid) ? 'rgba(90,247,142,.3)' : 'var(--border)'}`,
                    fontSize:11,cursor:'pointer',transition:'background .1s',color:'var(--text)'}}>
                  {emoji} <span style={{fontSize:10,color:'var(--dim)'}}>{uids.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover actions */}
        <div className="msg-actions" style={{position:'absolute',right:14,top:-14,opacity:0,transition:'opacity .15s',
          display:'flex',gap:2,background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:5,padding:'3px 4px'}}>
          <button onClick={()=>setShowPicker(p=>!p)} title="React"
            style={{fontSize:12,padding:'3px 5px',borderRadius:3,color:'var(--dim)'}}>
            😄
          </button>
          {isMe && (
            <button onClick={deleteMsg} title="Delete message"
              style={{fontSize:11,padding:'3px 5px',borderRadius:3,color:'var(--dim)'}}>
              🗑
            </button>
          )}
          {showPicker && (
            <div style={{position:'absolute',bottom:'100%',right:0,background:'var(--bg3)',border:'1px solid var(--border2)',
              borderRadius:6,padding:6,display:'flex',gap:3,zIndex:99,flexWrap:'wrap',width:200,
              animation:'popIn .12s ease'}}>
              {EMOJI_LIST.map(em => (
                <button key={em} onClick={()=>react(em)}
                  style={{fontSize:18,padding:'4px',borderRadius:4,transition:'background .1s',color:'inherit'}}>
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
