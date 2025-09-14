// pages/aice.tsx
import React, {useEffect, useMemo, useRef, useState} from "react";

// ----- SUBJECT MAP (typical Folkeskole ranges; schools can vary slightly) -----
type Subj = { key:string; label:string; from:number; to:number; note?:string; valgfag?:boolean };
const SUBJECTS: Subj[] = [
  { key:"dansk", label:"Dansk", from:0, to:9 },
  { key:"matematik", label:"Matematik", from:0, to:9 },
  { key:"engelsk", label:"Engelsk", from:1, to:9 },
  { key:"tysk", label:"Tysk (2. fremmedsprog)", from:5, to:9 },
  { key:"fransk", label:"Fransk (2. fremmedsprog)", from:5, to:9 },
  { key:"historie", label:"Historie", from:3, to:9 },
  { key:"kristendom", label:"Kristendomskundskab", from:1, to:9, note:"Kan være anderledes i 7. kl. pga. konfirmation (lokal variation)." },
  { key:"naturteknologi", label:"Natur/teknologi", from:1, to:6 },
  { key:"biologi", label:"Biologi", from:7, to:9 },
  { key:"geografi", label:"Geografi", from:7, to:9 },
  { key:"fysik-kemi", label:"Fysik/kemi", from:7, to:9 },
  { key:"samfundsfag", label:"Samfundsfag", from:8, to:9 },
  { key:"idraet", label:"Idræt", from:1, to:9 },
  { key:"musik", label:"Musik", from:1, to:6 },
  { key:"musik-valgfag", label:"Musik (valgfag)", from:7, to:9, valgfag:true },
  { key:"billedkunst", label:"Billedkunst", from:1, to:5 },
  { key:"billedkunst-valgfag", label:"Billedkunst (valgfag)", from:7, to:9, valgfag:true },
  { key:"haandvaerk-design", label:"Håndværk & design", from:4, to:7 },
  { key:"madkundskab", label:"Madkundskab", from:4, to:7 },
  // 10. klasse (typisk)
  { key:"10-dansk", label:"10. kl. Dansk", from:10, to:10 },
  { key:"10-matematik", label:"10. kl. Matematik", from:10, to:10 },
  { key:"10-engelsk", label:"10. kl. Engelsk", from:10, to:10 },
];

type Msg = { id:string; role:"user"|"assistant"; text:string };

// Utility: which subjects are offered for a given grade?
function subjectsForGrade(grade:number | "auto"){
  if(grade === "auto") return SUBJECTS;
  return SUBJECTS.filter(s => grade >= s.from && grade <= s.to);
}

export default function AiceCoach(){
  // UI state
  const [role, setRole] = useState<"student"|"teacher"|"leadership"|"parent">("student");
  const [grade, setGrade] = useState<number | "auto">("auto"); // 0–10 or "auto"
  const [subject, setSubject] = useState<string>("");
  const [replyInDanish, setReplyInDanish] = useState<boolean>(false);

  // Chat state
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLTextAreaElement|null>(null);

  // Focus on load
  useEffect(()=>{ inputRef.current?.focus(); },[]);

  // Keep subject list in sync with grade
  const subjectOptions = useMemo(()=> subjectsForGrade(grade), [grade]);
  useEffect(()=>{
    if(subject && !subjectOptions.some(s => s.key === subject)){
      setSubject(""); // reset if current subject no longer valid
    }
  }, [subjectOptions, subject]);

  // Send
  async function onSend(e?: React.FormEvent){
    e?.preventDefault();
    const text = val.trim();
    if(!text) return;

    const id = Math.random().toString(36).slice(2);
    const pendingId = "p_"+id;

    // NEWEST ON TOP: assistant placeholder + user → prepend
    setMsgs(prev => [
      { id: pendingId, role:"assistant", text:"Thinking…" },
      { id, role:"user", text },
      ...prev
    ]);

    // “New empty chat window”
    setVal("");
    inputRef.current?.focus();

    try{
      const res = await fetch("/api/aice", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          message: text,
          role,
          grade,
          subject,
          lang: replyInDanish ? "da" : "en"
        })
      });
      const data = await res.json().catch(()=> ({}));
      const reply = data.reply || data.message || data.output || "OK, but no reply field found.";

      setMsgs(prev => prev.map(m => m.id === pendingId ? { ...m, text: reply } : m));
    }catch{
      setMsgs(prev => prev.map(m => m.id === pendingId ? { ...m, text: "Network error. Try again." } : m));
    }
  }

  // Enter to send (Shift+Enter = newline)
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>){
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div style={{maxWidth:860,margin:"0 auto",font:"16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial"}}>
      <h1 style={{margin:"16px 0 8px"}}>Aice Coach (test)</h1>
      <p style={{marginTop:0,color:"#666"}}>Guide, not give • newest-on-top • input auto-clears</p>

      {/* Controls */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,alignItems:"center",margin:"12px 0"}}>
        <label style={{display:"grid",gap:6}}>
          <span style={{fontSize:12,color:"#666"}}>Role</span>
          <select value={role} onChange={e=>setRole(e.target.value as any)}>
            <option value="student">student</option>
            <option value="teacher">teacher</option>
            <option value="leadership">leadership</option>
            <option value="parent">parent</option>
          </select>
        </label>

        <label style={{display:"grid",gap:6}}>
          <span style={{fontSize:12,color:"#666"}}>Grade (0–10)</span>
          <select value={grade} onChange={e=>{
            const v = e.target.value;
            setGrade(v==="auto" ? "auto" : Number(v));
          }}>
            <option value="auto">(auto)</option>
            {Array.from({length:11}).map((_,i)=>(
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </label>

        <label style={{display:"grid",gap:6}}>
          <span style={{fontSize:12,color:"#666"}}>Subject</span>
          <select value={subject} onChange={e=>setSubject(e.target.value)}>
            <option value="">(choose)</option>
            {subjectOptions.map(s=>(
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
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
          style={{flex:1, padding:"12px", border:"1px solid #e5e7eb", borderRadius:12}}
        />
        <button type="submit" style={{padding:"12px 16px",border:"1px solid #5b6cff",background:"#5b6cff",color:"#fff",borderRadius:12,cursor:"pointer"}}>
          ➤
        </button>
      </form>

      {/* Log (NEWEST ON TOP) */}
      <div role="log" aria-live="polite" style={{display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{width:64,flex:"0 0 64px",fontSize:12,color:"#666"}}>{m.role==="user"?"You":"Aice"}</div>
            <div style={{border:"1px solid #e5e7eb",borderRadius:12,padding:"10px 12px",background:m.role==="user"?"#f8fafc":"#f1f5ff",whiteSpace:"pre-wrap"}}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <p style={{fontSize:12,color:"#888",marginTop:16}}>
        Note: Subject ranges are the typical Danish *Fælles Mål* pattern (e.g., Musik 1–6; valgfag 7–9; 
        Natur/teknologi 1–6; Biologi/Geografi/Fysik-kemi 7–9; 2. fremmedsprog from 5th). Local schedules can vary.
      </p>
    </div>
  );
}
