// src/components/ChatView.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, serverTimestamp, doc, updateDoc, deleteDoc,
  setDoc, getDoc,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useStore } from '../store'
import { fmtDay, slugify, fileSize } from '../utils'
import Message from './Message'

export default function ChatView({ channelPath, channelName, placeholder }) {
  const me = useStore(s => s.me)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [loading, setLoading]   = useState(true)
  const msgsRef  = useRef(null)
  const fileRef  = useRef(null)
  const inputRef = useRef(null)
  const typingRef = useRef(null)
  const typingUsers = useStore(s => s.typingUsers[channelPath] || [])
  const setTypingUsers = useStore(s => s.setTypingUsers)
  const clearUnread = useStore(s => s.clearUnread)

  // Real-time messages
  useEffect(() => {
    if (!channelPath) return
    setLoading(true)
    const q = query(
      collection(db, `${channelPath}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    )
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    clearUnread(channelPath)
    return () => unsub()
  }, [channelPath])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [messages])

  // Typing indicator
  const typingDocPath = `${channelPath}/typing/${me?.uid}`
  const updateTyping = useCallback(async (isTyping) => {
    if (!me || !channelPath) return
    try {
      await setDoc(doc(db, typingDocPath), { uid: me.uid, name: me.displayName, isTyping, updatedAt: serverTimestamp() })
    } catch {}
  }, [me, channelPath])

  // Listen to typing
  useEffect(() => {
    if (!channelPath) return
    const q = collection(db, `${channelPath}/typing`)
    const unsub = onSnapshot(q, snap => {
      const typing = snap.docs
        .map(d => d.data())
        .filter(d => d.isTyping && d.uid !== me?.uid)
        .map(d => d.name)
      setTypingUsers(channelPath, typing)
    })
    return () => unsub()
  }, [channelPath, me?.uid])

  const handleTyping = () => {
    updateTyping(true)
    clearTimeout(typingRef.current)
    typingRef.current = setTimeout(() => updateTyping(false), 2000)
  }

  // Send text message
  const send = async () => {
    const text = input.trim()
    if (!text || !me || !channelPath) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    updateTyping(false)
    await addDoc(collection(db, `${channelPath}/messages`), {
      text,
      uid: me.uid,
      displayName: me.displayName,
      createdAt: serverTimestamp(),
      reactions: [],
    })
  }

  // Upload file/image
  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file || !me) return
    e.target.value = ''

    setUploading(true)
    setUploadPct(0)

    const path = `uploads/${channelPath}/${Date.now()}_${file.name}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)

    task.on('state_changed',
      snap => setUploadPct(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      err  => { console.error(err); setUploading(false) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        await addDoc(collection(db, `${channelPath}/messages`), {
          text: '',
          fileURL: url,
          fileName: file.name,
          fileSize: fileSize(file.size),
          uid: me.uid,
          displayName: me.displayName,
          createdAt: serverTimestamp(),
          reactions: [],
        })
        setUploading(false)
      }
    )
  }

  // Group messages by day
  const grouped = []
  let lastDay = ''
  messages.forEach((msg, i) => {
    const day = fmtDay(msg.createdAt)
    if (day && day !== lastDay) {
      grouped.push({ type: 'sep', day })
      lastDay = day
    }
    grouped.push({ type: 'msg', msg, prev: messages[i - 1] || null })
  })

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'rgba(12,13,17,.7)'}}>
      {/* Messages */}
      <div ref={msgsRef} style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
        {loading && (
          <div style={{textAlign:'center',padding:'40px 0',color:'var(--dim)',fontSize:12}}>loading...</div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px',color:'var(--dim)'}}>
            <div style={{fontSize:36,marginBottom:10}}>💬</div>
            <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:4}}>#{channelName}</div>
            <div style={{fontSize:12}}>This is the beginning of the channel. Say something!</div>
          </div>
        )}
        {grouped.map((item, i) => {
          if (item.type === 'sep') return (
            <div key={i} style={{textAlign:'center',fontSize:10,color:'var(--dim)',padding:'14px 0',display:'flex',alignItems:'center',gap:10,margin:'0 14px'}}>
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
              {item.day}
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
            </div>
          )
          return <Message key={item.msg.id} msg={item.msg} prevMsg={item.prev} channelPath={channelPath} />
        })}
        <div style={{height:8}}/>
      </div>

      {/* Typing indicator */}
      <div style={{height:18,padding:'0 16px',fontSize:10.5,color:'var(--dim)',display:'flex',alignItems:'center',gap:5}}>
        {typingUsers.length > 0 && (
          <>
            <span style={{display:'inline-flex',gap:2}}>
              <span style={{width:4,height:4,borderRadius:'50%',background:'var(--accent)',display:'inline-block',animation:'td 1.2s infinite'}}/>
              <span style={{width:4,height:4,borderRadius:'50%',background:'var(--accent)',display:'inline-block',animation:'td 1.2s .2s infinite'}}/>
              <span style={{width:4,height:4,borderRadius:'50%',background:'var(--accent)',display:'inline-block',animation:'td 1.2s .4s infinite'}}/>
            </span>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </>
        )}
      </div>

      {/* Input */}
      <div style={{padding:'0 14px 12px',flexShrink:0}}>
        {uploading && (
          <div style={{marginBottom:6,padding:'6px 10px',background:'rgba(0,0,0,.4)',border:'1px solid var(--border2)',borderRadius:5,fontSize:11.5,color:'var(--dim)',display:'flex',alignItems:'center',gap:8}}>
            <div style={{flex:1,height:3,background:'var(--border)',borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${uploadPct}%`,background:'var(--accent)',transition:'width .2s',borderRadius:2}}/>
            </div>
            <span style={{color:'var(--accent)'}}>{uploadPct}%</span>
          </div>
        )}
        <div style={{background:'rgba(8,9,13,.9)',border:'1px solid var(--border2)',borderRadius:6,
          display:'flex',alignItems:'flex-end',gap:8,padding:'8px 10px',transition:'border-color .2s'}}
          onFocus={e=>e.currentTarget.style.borderColor='rgba(90,247,142,.3)'}
          onBlur={e=>e.currentTarget.style.borderColor='var(--border2)'}>
          <span style={{color:'var(--accent)',fontSize:11,paddingBottom:9,flexShrink:0}}>&gt;</span>
          <textarea ref={inputRef} rows={1}
            placeholder={placeholder || `Message #${channelName}`}
            value={input}
            style={{flex:1,fontSize:13,lineHeight:1.5,maxHeight:110,overflowY:'auto',color:'var(--text)',background:'none',border:'none',outline:'none',fontFamily:'var(--font)',resize:'none'}}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'
              handleTyping()
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          />
          <div style={{display:'flex',gap:5,alignItems:'center'}}>
            <button title="Attach file" onClick={() => fileRef.current?.click()}
              style={{fontSize:14,padding:'3px 5px',borderRadius:3,color:'var(--dim)',transition:'color .15s'}}>📎</button>
            <button
              style={{background:'rgba(90,247,142,.13)',border:'1px solid rgba(90,247,142,.25)',color:'var(--accent)',padding:'5px 10px',borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:'.04em',transition:'background .15s',fontFamily:'var(--font)',cursor:'pointer'}}
              onClick={send}>⏎ send</button>
          </div>
        </div>
        <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFile} />
      </div>

      <style>{`
        @keyframes td{0%,80%,100%{opacity:.2}40%{opacity:1}}
        @keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
        .msg-row:hover{background:rgba(255,255,255,.018)!important;}
      `}</style>
    </div>
  )
}
