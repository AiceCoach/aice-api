// pages/coach.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

// Images (HTTPS so they load on an HTTPS page)
const VER = "20251121"; // cache-busting
const COACH_AVATAR = `https://positivesoul.ai/wp-content/uploads/2025/09/positivesoul_ai_avatar.png?v=${VER}`;
const COACH_HERO   = `https://positivesoul.ai/wp-content/uploads/2025/09/positivesoul_ai_logo.png?v=${VER}`;

// Brand-safe text colors
const TEXT_DIM  = "#475569";
const TEXT_NOTE = "#64748b";

// Taglines
const TAGLINE_EN = "AI that guides — not gives.";
const TAGLINE_DA = "AI der guider — ikke giver.";

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

export default function PositiveSoulCoachPage() {
  const [role, setRole] = useState("student");
  const [grade, setGrade] = useState("auto");
  const [subject, setSubject] = useState("");
  const [replyInDanish, setReplyInDanish] = useState(false);

  const [msgs, setMsgs] = useState([]);
  const [val, setVal] = useState("");

  const viewportRef = useRef(null);
  const inputRef = useRef(null);
  const footerRef = useRef(null);

  const [composerH, setComposerH] = useState(132);
  const isEmpty = msgs.length === 0;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" && localStorage.getItem("ps_subject");
      setSubject(saved || "engelsk");
    } catch {}
  }, []);

  const subjectOptions = useMemo(() => subjectsForGrade(grade), [grade]);

  useEffect(() => {
    if (subject && !subjectOptions.some(s => s.key === subject)) setSubject("");
  }, [subjectOptions, subject]);

  function scrollBottom(behavior = "smooth") {
    const el = viewportRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior }));
  }

  useEffect(() => { if (!isEmpty) scrollBottom("smooth"); }, [msgs.length, composerH, isEmpty]);

  useEffect(() => {
    const el = footerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box?.height) setComposerH(Math.ceil(box.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function onSend(e) {
    e?.preventDefault();
    const text = val.trim();
    if (!text) return;

    const id = Math.random().toString(36).slice(2);
    const pendingId = "p_" + id;

    setMsgs(prev => [...prev, { id, role: "user", text }]);
    setVal("");
    inputRef.current?.focus();
    scrollBottom("smooth");

    const history = [...msgs, { id, role: "user", text }]
      .slice(-8)
      .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));

    setMsgs(prev => [...prev, { id: pendingId, role: "assistant", text: "Thinking…" }]);
    scrollBottom("smooth");

    try {
      const messageForApi = replyInDanish ? `Svar på dansk.\n\n${text}` : text;

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageForApi,
          role,
          grade,
          subject: subject || "engelsk",
          language: replyInDanish ? "da" : "en",
          history
        })
      });

      const data = await res.json().catch(() => ({}));
      const reply = data.reply || data.message || data.output || "OK, but no reply field found.";
      setMsgs(prev => prev.map(m => (m.id === pendingId ? { ...m, text: reply } : m)));

      try { window.parent?.postMessage("coach-new-answer", "*"); } catch {}
      scrollBottom("smooth");
    } catch {
      setMsgs(prev => prev.map(m => (m.id === pendingId ? { ...m, text: "Network error. Try again." } : m)));
      try { window.parent?.postMessage("coach-new-answer", "*"); } catch {}
      scrollBottom("smooth");
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  }

  // ---------- UI ----------
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff", font: "16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial" }}>
      <div style={{ width: "100%", maxWidth: 860, margin: "0 auto", padding: "0 0 8px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:16, alignItems:"center", margin:"12px 0 8px" }}>
          <img src={COACH_HERO} alt="positiveSOUL AI Coach" style={{ width:"min(160px, 22vw)", height:"auto", objectFit:"contain", filter:"drop-shadow(0 8px 20px rgba(0,0,0,0.18))" }}/>
          <div>
            <h1 style={{ margin:"4px 0 6px" }}>positiveSOUL AI Coach</h1>
            <p style={{ margin:0, color:TEXT_DIM }}>{replyInDanish ? TAGLINE_DA : TAGLINE_EN}</p>
          </div>
        </div>

        {/* Role and subject selectors */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,alignItems:"center",margin:"8px 0 0"}}>
          <label style={{display:"grid",gap:6}}>
            <span style={{fontSize:12,color:TEXT_DIM}}>Role</span>
            <select value={role} onChange={e=>setRole(e.target.value)}>
              <option value="student">student</option>
              <option value="teacher">teacher</option>
              <option value="leadership">leadership</option>
              <option value="parent">parent</option>
            </select>
          </label>

          <label style={{display:"grid",gap:6}}>
            <span style={{fontSize:12,color:TEXT_DIM}}>Grade (0–10)</span>
            <select value={grade} onChange={e=>setGrade(e.target.value === "auto" ? "auto" : Number(e.target.value))}>
              <option value="auto">(auto)</option>
              {Array.from({length:11}).map((_,i)=><option key={i} value={i}>{i}</option>)}
            </select>
          </label>

          <label style={{display:"grid",gap:6}}>
            <span style={{fontSize:12,color:TEXT_DIM}}>Subject</span>
            <select value={subject} onChange={e=>{
              const s = e.target.value;
              setSubject(s);
              try { localStorage.setItem("ps_subject", s); } catch {}
            }}>
              <option value="">(choose)</option>
              {subjectOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>

          <label style={{display:"flex",gap:8,alignItems:"center",marginTop:20,color:TEXT_DIM}}>
            <input type="checkbox" checked={replyInDanish} onChange={e=>setReplyInDanish(e.target.checked)} />
            <span>Reply in Danish</span>
          </label>
        </div>
      </div>

      {/* Chat & composer code unchanged except label replacements */}
      {/* ...same layout structure... */}

      <div style={{maxWidth:860, margin:"0 auto", padding:"0 0 10px"}}>
        <div style={{fontSize:12,color:TEXT_NOTE}}>positiveSOUL AI Coach will guide — not give.</div>
      </div>
    </div>
  );
}
