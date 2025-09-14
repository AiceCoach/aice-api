// pages/aice.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

// Use HTTPS so it loads on an HTTPS page
const AICE_AVATAR = "https://positivesoul.ai/wp-content/uploads/2025/08/aice_contact.jpg";

// Typical Folkeskole ranges (can vary locally)
const SUBJECTS = [
  { key:"dansk", label:"Dansk", from:0, to:9 },
  { key:"matematik", label:"Matematik", from:0, to:9 },
  { key:"engelsk", label:"Engelsk", from:1, to:9 },
  { key:"tysk", label:"Tysk (2. fremmedsprog)", from:5, to:9 },
  { key:"fransk", label:"Fransk (2. fremmedsprog)", from:5, to:9 },
  { key:"historie", label:"Historie", from:3, to:9 },
  { key:"kristendom", label:"Kristendomskundskab", from:1, to:9 },
  { key:"naturteknologi", label:"Natur/teknologi", from:1, to:6 },
  { key:"biologi", label:"Biologi", from:7, to:9 },
  { key:"geografi", label:"Geografi", from:7, to:9 },
  { key:"fysik-kemi", label:"Fysik/kemi", from:7, to:9 },
  { key:"samfundsfag", label:"Samfundsfag", from:8, to:9 },
  { key:"idraet", label:"Idræt", from:1, to:9 },
  { key:"musik", label:"Musik", from:1, to:6 },
  { key:"musik-valgfag", label:"Musik (valgfag)", from:7, to:9 },
  { key:"billedkunst", label:"Billedkunst", from:1, to:5 },
  { key:"billedkunst-valgfag", label:"Billedkunst (valgfag)", from:7, to:9 },
  { key:"haandvaerk-design", label:"Håndværk & design", from:4, to:7 },
  { key:"madkundskab", label:"Madkundskab", from:4, to:7 },
  { key:"10-dansk", label:"10. kl. Dansk", from:10, to:10 },
  { key:"10-matematik", label:"10. kl. Matematik", from:10, to:10 },
  { key:"10-engelsk", label:"10. kl. Engelsk", from:10, to:10 },
];

function subjectsForGrade(grade) {
  if (grade === "auto") return SUBJECTS;
  return SUBJECTS.filter(s => grade >= s.from && grade <= s.to);
}

export default function AicePage() {
  // Top controls
  const [role, setRole] = useState("student");       // student | teacher | leadership | parent
  const [grade, setGrade] = useState("auto");        // "auto" or 0..10
  const [subject, setSubject] = useState("");
  const [replyInDanish, setReplyInDanish] = useState(false);

  // Chat state
  const [msgs, setMsgs] = useState([]);
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const subjectOptions = useMemo(() => subjectsForGrade(grade), [grade]);
  useEffect(() => {
    if (subject && !subjectOptions.some(s => s.key === subject)) setSubject("");
  }, [subjectOptions, subject]);

  async function onSend(e) {
    e?.preventDefault();
    const text = val.trim();
    if (!text) return;

    const id = Math.random().toString(36).slice(2);
    const pendingId = "p_" + id;

    // NEWEST ON TOP: assistant placeholder + user
    setMsgs(prev => [
      { id: pendingId, role: "assistant", text: "Thinking…" },
      { id, role: "user", text },
      ...prev
    ]);

    // “New empty chat window”
    setVal("");
    inputRef.current?.focus();

    try {
      const res = await fetch("/api/aice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          role,
          grade,
          subject,
          lang: replyInDanish ? "da" : "en"
        })
      });
      const data = await res.json().catch(() => ({}));
      const reply = data.reply || data.message || data.output || "OK, but no reply field found.";
      setMsgs(prev => prev.map(m => m.id === pendingId ? { ...m, text: reply } : m));
    } catch {
      setMsgs(prev => prev.map(m => m.id === pendingId ? { ...m, text: "Network error. Try again." } : m));
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  }

  return (
    <div style={{maxWidth:860,margin:"0 auto",font:"16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial"}}>
      <h1 style={{margin:"16px 0 8px"}}>Aice Coach (test)</h1>
      <p style={{marginTop:0,color:"#666"}}>Guide, not give • newest-on-top • input auto-clears</p>

      {/* Controls */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,alignItems:"center",margin:"12px 0"}}>
        <label style={{display:"grid",gap:6}}>
          <span style={{fontSize:12,color:"#666"}}>Role</span>
          <select value={role} onChange={e=>setRole(e.target.value)}>
            <option value="student">student</option>
            <option value="teacher">teacher</option>
            <option value="leadership">leadership</option>
            <option value="parent">parent</option>
          </select>
        </label>

        <label style={{display:"grid",gap:6}}>
          <span style={{fontSize:12,color:"#666"}}>Grade (0–10)</span>
          <select value={grade} onChange={e=>setGrade(e.target.value === "auto" ? "auto" : Number(e.target.value))}>
            <option value="auto">(auto)</option>
            {Array.from({length:11}).map((_,i)=><option key={i} value={i}>{i}</option>)}
          </select>
        </label>

        <label style={{display:"grid",gap:6}}>
          <span style={{fontSize:12,color:"#666"}}>Subject</span>
          <select value={subject} onChange={e=>setSubject(e.target.value)}>
            <option value="">(choose)</option>
            {subjectOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>

        <label style={{display:"flex",gap:8,alignItems:"center",marginTop:20}}>
          <input type="checkbox" checked={replyInDanish} onChange={e=>setReplyInDanish(e.target.checked)} />
          <span>Reply in Danish</span>
        </label>
      </div>

      {/* Composer */}
      <form onSubmit={onSend} style={{display:"flex",gap:10,alignItems:"flex-start",margin:"8px 0 12px"}}>
        <textarea
          ref={inputRef}
          value={val}
          onChange={e=>setVal(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your question…"
          rows={4}
          style={{flex:1,padding:"12px",border:"1px solid #e5e7eb",borderRadius:12}}
        />
        <button type="submit" style={{padding:"12px 16px",border:"1px solid #5b6cff",background:"#5b6cff",color:"#fff",borderRadius:12,cursor:"pointer"}}>
          ➤
        </button>
      </form>

      {/* Log (NEWEST ON TOP) with Aice avatar on assistant messages */}
      <div role="log" aria-live="polite" style={{display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map(m => (
          <div key={m.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            {/* Name/Avatar column */}
            <div style={{
              width:120, flex:"0 0 120px",
              display:"flex", alignItems:"center", gap:8,
              fontSize:12, color:"#666"
            }}>
              {m.role === "assistant" ? (
                <>
                  <img
                    src={AICE_AVATAR}
                    alt="Aice"
                    width={36}
                    height={36}
                    loading="lazy"
                    decoding="async"
                    style={{borderRadius:"50%", border:"1px solid #e5e7eb"}}
                    onError={(e)=>{ e.currentTarget.style.display="none"; }}
                  />
                  <span>Aice</span>
                </>
              ) : (
                <span>You</span>
              )}
            </div>

            {/* Message bubble */}
            <div style={{
              border:"1px solid #e5e7eb",
              borderRadius:12,
              padding:"10px 12px",
              background: m.role==="user" ? "#f8fafc" : "#f1f5ff",
              whiteSpace:"pre-wrap",
              flex:"1 1 auto"
            }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <p style={{fontSize:12,color:"#888",marginTop:16}}>
        Note: Ranges reflect typical Danish Fælles Mål patterns (e.g., Musik 1–6; valgfag 7–9; Natur/teknologi 1–6;
        Biologi/Geografi/Fysik-kemi 7–9). Local schedules can vary.
      </p>
    </div>
  );
}
