// pages/aice.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

// Images (HTTPS so they load on an HTTPS page)
const VER = "20250915"; // cache-busting
const AICE_AVATAR = `https://positivesoul.ai/wp-content/uploads/2025/09/aice-svar.png?v=${VER}`;
const AICE_HERO   = `https://positivesoul.ai/wp-content/uploads/2025/09/aice-letter.png?v=${VER}`;

// Brand-safe text colors
const TEXT_DIM  = "#475569"; // labels, small text
const TEXT_NOTE = "#64748b"; // footnotes / helper text

// Taglines
const TAGLINE_EN = "Guides, not gives.";
const TAGLINE_DA = "Tænk selv – med støtte.";

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
  const [role, setRole] = useState("student");
  const [grade, setGrade] = useState("auto");
  const [subject, setSubject] = useState("");
  const [replyInDanish, setReplyInDanish] = useState(false);

  // Chat state (oldest → newest)
  const [msgs, setMsgs] = useState([]);
  const [val, setVal] = useState("");

  // Refs
  const viewportRef = useRef(null);  // scroller
  const inputRef = useRef(null);
  const footerRef = useRef(null);

  // Measured composer height (for padding bottom of the scroller)
  const [composerH, setComposerH] = useState(132);

  // Is conversation empty?
  const isEmpty = msgs.length === 0;

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Remember last chosen subject; default to English
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" && localStorage.getItem("aice_subject");
      setSubject(saved || "engelsk");
    } catch {}
  }, []);

  const subjectOptions = useMemo(() => subjectsForGrade(grade), [grade]);

  // If grade change invalidates current subject, clear it
  useEffect(() => {
    if (subject && !subjectOptions.some(s => s.key === subject)) setSubject("");
  }, [subjectOptions, subject]);

  // Smooth-scroll helper
  function scrollBottom(behavior = "smooth") {
    const el = viewportRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  }

  // Auto-scroll on new messages / composer resize (only when in chat state)
  useEffect(() => {
    if (!isEmpty) scrollBottom("smooth");
  }, [msgs.length, composerH, isEmpty]);

  // Watch composer size so chat body reserves space underneath
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

    // Append user message
    setMsgs(prev => [...prev, { id, role: "user", text }]);
    setVal("");
    inputRef.current?.focus();
    scrollBottom("smooth");

    // Short chronological history
    const history = [...msgs, { id, role: "user", text }]
      .slice(-8)
      .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));

    // Assistant placeholder
    setMsgs(prev => [...prev, { id: pendingId, role: "assistant", text: "Thinking…" }]);
    scrollBottom("smooth");

    try {
      const messageForApi = replyInDanish ? `Svar på dansk.\n\n${text}` : text;

      const res = await fetch("/api/aice", {
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

      // ✅ Nudge the parent page to bring the iframe back into view (WordPress listener will catch this)
      try { window.parent?.postMessage("aice-new-answer", "*"); } catch {}
      scrollBottom("smooth");
    } catch {
      setMsgs(prev => prev.map(m => (m.id === pendingId ? { ...m, text: "Network error. Try again." } : m)));
      try { window.parent?.postMessage("aice-new-answer", "*"); } catch {}
      scrollBottom("smooth");
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  }

  // ---------- UI ----------
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        font: "16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial",
      }}
    >
      {/* Header / hero kept snug so it’s visible on arrival */}
      <div style={{ width: "100%", maxWidth: 860, margin: "0 auto", padding: "0 0 8px" }}>
        <div
          style={{
            display:"grid",
            gridTemplateColumns:"auto 1fr",
            gap:16,
            alignItems:"center",
            margin:"12px 0 8px"
          }}
        >
          <img
            src={AICE_HERO}
            alt="Aice standing"
            style={{
              width:"min(160px, 22vw)",
              height:"auto",
              objectFit:"contain",
              filter:"drop-shadow(0 8px 20px rgba(0,0,0,0.18))"
            }}
          />
          <div>
            <h1 style={{ margin:"4px 0 6px" }}>Aice AI Coach</h1>
            <p style={{ margin:0, color:TEXT_DIM }}>
              {replyInDanish ? TAGLINE_DA : TAGLINE_EN}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,alignItems:"center",margin:"8px 0 0"}}>
          <label style={{display:"grid",gap:6}}>
            <span style={{fontSize:12,color:TEXT_DIM}}>Role</span>
            <select value={role} onChange={e=>setRole(e.target.value)} aria-label="Role">
              <option value="student">student</option>
              <option value="teacher">teacher</option>
              <option value="leadership">leadership</option>
              <option value="parent">parent</option>
            </select>
          </label>

          <label style={{display:"grid",gap:6}}>
            <span style={{fontSize:12,color:TEXT_DIM}}>Grade (0–10)</span>
            <select
              value={grade}
              onChange={e=>setGrade(e.target.value === "auto" ? "auto" : Number(e.target.value))}
              aria-label="Grade"
            >
              <option value="auto">(auto)</option>
              {Array.from({length:11}).map((_,i)=><option key={i} value={i}>{i}</option>)}
            </select>
          </label>

          <label style={{display:"grid",gap:6}}>
            <span style={{fontSize:12,color:TEXT_DIM}}>Subject</span>
            <select
              value={subject}
              onChange={e=>{
                const s = e.target.value;
                setSubject(s);
                try { localStorage.setItem("aice_subject", s); } catch {}
              }}
              aria-label="Subject"
            >
              <option value="">(choose)</option>
              {subjectOptions.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>

          <label style={{display:"flex",gap:8,alignItems:"center",marginTop:20,color:TEXT_DIM}}>
            <input
              type="checkbox"
              checked={replyInDanish}
              onChange={e=>setReplyInDanish(e.target.checked)}
              aria-label="Reply in Danish"
            />
            <span>Reply in Danish</span>
          </label>
        </div>
      </div>

      {/* LANDING (no messages): center the first prompt like ChatGPT */}
      {isEmpty && (
        <section
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 0",
          }}
        >
          <form
            onSubmit={onSend}
            style={{width:"100%", maxWidth:860, display:"flex", gap:10, alignItems:"flex-start"}}
          >
            <textarea
              ref={inputRef}
              value={val}
              onChange={e=>setVal(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your question…"
              rows={3}
              /* ✅ Bigger, readable font + visible focus ring */
              style={{
                flex:1,
                padding:"12px",
                border:"1px solid #e5e7eb",
                borderRadius:12,
                fontSize:"16px",
                lineHeight:"1.4",
                outlineOffset:"2px"
              }}
              aria-label="Message"
            />
            <button
              type="submit"
              style={{padding:"12px 16px",border:"1px solid #5b6cff",background:"#5b6cff",color:"#fff",borderRadius:12,cursor:"pointer"}}
              aria-label="Send"
            >
              ➤
            </button>
          </form>
        </section>
      )}

      {/* CHAT (after first send): scrollable thread with composer docked to bottom */}
      {!isEmpty && (
        <>
          <main
            ref={viewportRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              width: "100%",
              scrollbarGutter: "stable both-edges",
              paddingRight: 10,
              paddingBottom: `${composerH + 12}px`,
              overscrollBehavior: "contain",
            }}
          >
            <div style={{maxWidth:860, margin:"0 auto", padding:"0 0 12px"}}>
              <div role="log" aria-live="polite" style={{display:"flex",flexDirection:"column",gap:10}}>
                {msgs.map(m => (
                  <div key={m.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{ width:120, flex:"0 0 120px", display:"flex", alignItems:"center", gap:8, fontSize:12, color:TEXT_DIM }}>
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
            </div>
          </main>

          <footer
            ref={footerRef}
            style={{
              position: "fixed",
              left: 0, right: 0, bottom: 0,
              zIndex: 40,
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(6px)",
              borderTop: "1px solid #e5e7eb",
              width: "100%",
            }}
          >
            <form
              onSubmit={onSend}
              /* ✅ Ensure the focus outline isn’t clipped anywhere */
              style={{maxWidth:860, margin:"10px auto 6px", display:"flex", gap:10, alignItems:"flex-start", overflow:"visible"}}
            >
              <textarea
                ref={inputRef}
                value={val}
                onChange={e=>setVal(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type your question…"
                rows={3}
                /* ✅ Bigger, readable font + visible focus ring */
                style={{
                  flex:1,
                  padding:"12px",
                  border:"1px solid #e5e7eb",
                  borderRadius:12,
                  fontSize:"16px",
                  lineHeight:"1.4",
                  outlineOffset:"2px"
                }}
                aria-label="Message"
              />
              <button
                type="submit"
                style={{padding:"12px 16px",border:"1px solid #5b6cff",background:"#5b6cff",color:"#fff",borderRadius:12,cursor:"pointer"}}
                aria-label="Send"
              >
                ➤
              </button>
            </form>
            <div style={{maxWidth:860, margin:"0 auto", padding:"0 0 10px"}}>
              <div style={{fontSize:12,color:TEXT_NOTE}}>Aice will guide — not give.</div>
            </div>
          </footer>
        </>
      )}

      {/* Footnote */}
      <div style={{maxWidth:860, margin:"8px auto 16px"}}>
        <p style={{fontSize:12,color:TEXT_NOTE,margin:0}}>
          Note: Ranges reflect typical Danish Fælles Mål patterns (e.g., Musik 1–6; valgfag 7–9; Natur/teknologi 1–6;
          Biologi/Geografi/Fysik-kemi 7–9). Local schedules can vary.
        </p>
      </div>
    </div>
  );
}
