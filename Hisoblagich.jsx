import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULTS = [
  { id:1, nom:"SubhanAllah",     arab:"سُبْحَانَ اللَّهِ",     maqsad:33,  rang:"#4ade80", emoji:"🌿" },
  { id:2, nom:"Alhamdulillah",   arab:"الْحَمْدُ لِلَّهِ",    maqsad:33,  rang:"#818cf8", emoji:"🌙" },
  { id:3, nom:"Allahu Akbar",    arab:"اللَّهُ أَكْبَرُ",     maqsad:34,  rang:"#fb923c", emoji:"✨" },
  { id:4, nom:"Astaghfirullah",  arab:"أَسْتَغْفِرُ اللَّهَ", maqsad:100, rang:"#c084fc", emoji:"🤲" },
  { id:5, nom:"Sport mashqlari", arab:"",                       maqsad:20,  rang:"#f87171", emoji:"💪" },
  { id:6, nom:"Suv ichish",      arab:"",                       maqsad:8,   rang:"#38bdf8", emoji:"💧" },
];
const COLORS  = ["#4ade80","#818cf8","#fb923c","#c084fc","#f87171","#38bdf8","#7c6aff","#a3e635","#e879f9","#34d399","#fbbf24","#f472b6"];
const EMOJIS  = ["🌿","🌙","✨","🤲","💪","💧","📿","🎯","❤️","🌸","⭐","🔢","📊","🏆","🎵","📖","🧘","🏃","☕","🍎"];
const TARGETS = [5,7,10,20,33,34,99,100,200,500];
const CIRC    = 2 * Math.PI * 85;

/* ── tiny helpers ───────────────────────────────────────────────── */
const px = v => `${v}px`;
const mix = (c, a) => `color-mix(in srgb,${c} ${a}%,transparent)`;

/* ── storage hook ───────────────────────────────────────────────── */
function useStore(key, init) {
  const [val, setVal] = useState(init);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      try {
        const r = await window.storage.get(key);
        if (r) setVal(JSON.parse(r.value));
      } catch {}
    })();
  }, [key]);

  const persist = useCallback(async (next) => {
    setVal(next);
    try { await window.storage.set(key, JSON.stringify(next)); } catch {}
  }, [key]);

  return [val, persist];
}

/* ══════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [counters, setCounters] = useStore("hcnt_list",   DEFAULTS);
  const [scores,   setScores]   = useStore("hcnt_scores", {});
  const [totals,   setTotals]   = useStore("hcnt_totals", {});

  const [screen,   setScreen]   = useState("home"); // home | count | edit
  const [activeId, setActiveId] = useState(null);
  const [editMode, setEditMode] = useState("new");
  const [editObj,  setEditObj]  = useState({});
  const [ripples,  setRipples]  = useState([]);
  const [pressed,  setPressed]  = useState(false);
  const [toast,    setToast]    = useState("");
  const [toastVis, setToastVis] = useState(false);
  const toastRef = useRef();
  const nextId   = useRef(null);

  useEffect(() => {
    if (nextId.current === null)
      nextId.current = counters.length ? Math.max(...counters.map(c=>c.id))+1 : 7;
  }, [counters]);

  const active = counters.find(c => c.id === activeId);
  const score  = scores[activeId] ?? 0;
  const total  = totals[activeId] ?? 0;
  const done   = active ? score >= active.maqsad : false;
  const prog   = active ? Math.min(score / active.maqsad, 1) : 0;

  /* toast */
  const showToast = useCallback((msg) => {
    setToast(msg); setToastVis(true);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastVis(false), 2200);
  }, []);

  /* tap */
  const tap = useCallback((e) => {
    if (done || !active) return;
    const ns = (scores[activeId] ?? 0) + 1;
    const nt = (totals[activeId] ?? 0) + 1;
    setScores({ ...scores, [activeId]: ns });
    setTotals({ ...totals, [activeId]: nt });

    setPressed(true);
    setTimeout(() => setPressed(false), 130);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 650);
  }, [done, active, scores, totals, activeId, setScores, setTotals]);

  /* keyboard */
  useEffect(() => {
    if (screen !== "count") return;
    const h = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        tap({ currentTarget: { getBoundingClientRect: () => ({left:0,top:0}) }, clientX:0, clientY:0 });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [screen, tap]);

  const openCounter = (id) => { setActiveId(id); setRipples([]); setScreen("count"); };
  const resetActive = () => setScores({ ...scores, [activeId]: 0 });
  const resetCard   = (id) => { setScores({ ...scores, [id]: 0 }); showToast("↺ Nolga qaytarildi"); };
  const deleteCard  = (id) => {
    const nc = counters.filter(c => c.id !== id);
    const ns = { ...scores }; delete ns[id];
    const nt = { ...totals }; delete nt[id];
    setCounters(nc); setScores(ns); setTotals(nt);
  };

  const startNew = () => {
    const obj = { id: nextId.current++, nom:"", arab:"", maqsad:33, rang:COLORS[0], emoji:"🎯" };
    setEditObj(obj); setEditMode("new"); setScreen("edit");
  };
  const startEdit = (c) => { setEditObj({...c}); setEditMode("edit"); setScreen("edit"); };
  const saveEdit = () => {
    if (!editObj.nom.trim()) return;
    if (editMode === "new") {
      setCounters([...counters, editObj]);
      showToast(editObj.emoji + " " + editObj.nom + " qo'shildi");
    } else {
      setCounters(counters.map(c => c.id === editObj.id ? editObj : c));
      showToast("Saqlandi ✓");
    }
    setScreen("home");
  };

  const jamisi = Object.values(totals).reduce((a,b)=>a+b, 0);

  /* ── CSS-in-JS tokens ── */
  const T = {
    bg:     "#07070d",
    card:   "#111118",
    border: "rgba(255,255,255,.06)",
    text:   "#f0eeff",
    muted:  "#6b6b8a",
    dim:    "#4a4a6a",
  };

  const S = {
    app: {
      minHeight:"100vh", background:T.bg, color:T.text,
      fontFamily:"'Inter',system-ui,sans-serif",
      display:"flex", flexDirection:"column",
      maxWidth:430, margin:"0 auto",
    },
    topbar: {
      display:"flex", alignItems:"center", gap:12,
      padding:"16px 18px 14px",
      borderBottom:`1px solid ${T.border}`,
      flexShrink:0,
    },
    iconBtn: {
      width:38, height:38, borderRadius:12, border:"none",
      background:"rgba(255,255,255,.06)", color:"#c4c0e8",
      fontSize:17, cursor:"pointer", display:"flex",
      alignItems:"center", justifyContent:"center",
      flexShrink:0, transition:"background .15s",
    },
    fab: {
      position:"fixed", bottom:28,
      right:"max(18px, calc(50% - 197px))",
      width:52, height:52, borderRadius:16, border:"none",
      background:"linear-gradient(135deg,#7c6aff,#a78bfa)",
      color:"#fff", fontSize:26, cursor:"pointer",
      boxShadow:"0 8px 24px rgba(124,106,255,.5)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:50,
    },
  };

  /* ════════════════════════════════════════════════════════════════
     HOME
  ════════════════════════════════════════════════════════════════ */
  if (screen === "home") return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Naskh+Arabic:wght@400;600&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
        @keyframes rpl{to{transform:scale(4);opacity:0}}
      `}</style>

      {/* header */}
      <div style={S.topbar}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-.3px" }}>Hisoblagich 📿</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
            {jamisi > 0 ? `Jami ${jamisi} marta` : "Biron narsani boshlang"}
          </div>
        </div>
      </div>

      {/* list */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 90px" }}>
        {counters.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 30px", gap:12, color:T.dim, textAlign:"center" }}>
            <div style={{ fontSize:52, opacity:.5 }}>🎯</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#5a5a7a" }}>Hozircha hech narsa yo'q</div>
            <div style={{ fontSize:13 }}>+ tugmasini bosib hisoblagich yarating</div>
          </div>
        ) : counters.map(c => {
          const sc  = scores[c.id] ?? 0;
          const pct = Math.min(sc / c.maqsad, 1) * 100;
          const isDone = sc >= c.maqsad;
          return (
            <div key={c.id} onClick={() => openCounter(c.id)}
              style={{
                background: T.card, borderRadius:20, padding:"16px 16px 13px",
                marginBottom:10, border:`1.5px solid ${isDone ? c.rang : T.border}`,
                cursor:"pointer", position:"relative", overflow:"hidden",
                boxShadow: isDone ? `0 0 20px ${mix(c.rang,20)}` : "none",
                animation:"fadeUp .2s ease",
              }}
            >
              {/* progress bg */}
              <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${pct}%`, background:mix(c.rang,9), borderRadius:20, pointerEvents:"none", transition:"width .5s" }} />

              <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
                <div style={{ width:48, height:48, borderRadius:14, background:mix(c.rang,18), display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{c.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.nom}</div>
                  {c.arab && <div style={{ fontFamily:"'Noto Naskh Arabic',serif", fontSize:15, color:"#8884aa", direction:"rtl", marginTop:2 }}>{c.arab}</div>}
                  <div style={{ marginTop:8, height:4, borderRadius:4, background:"rgba(255,255,255,.07)" }}>
                    <div style={{ height:4, borderRadius:4, width:`${pct}%`, background:c.rang, transition:"width .5s" }} />
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:26, fontWeight:900, color:c.rang, lineHeight:1 }}>{sc}</div>
                  <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>/ {c.maqsad}</div>
                </div>
              </div>

              {/* actions */}
              <div onClick={e=>e.stopPropagation()} style={{ display:"flex", gap:6, marginTop:11, justifyContent:"flex-end", position:"relative" }}>
                {[
                  ["✏️ Tahrir", () => startEdit(c), false],
                  ["↺", () => resetCard(c.id), false],
                  ["🗑", () => deleteCard(c.id), true],
                ].map(([label, fn, danger]) => (
                  <button key={label} onClick={fn} style={{
                    padding:"4px 11px", borderRadius:8, border:"none",
                    background: danger ? "rgba(239,68,68,.1)" : "rgba(255,255,255,.06)",
                    color: danger ? "#f87171" : "#8884aa",
                    fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                  }}>{label}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button style={S.fab} onClick={startNew}>+</button>

      {/* toast */}
      <div style={{
        position:"fixed", bottom:88, left:"50%",
        transform:`translateX(-50%) translateY(${toastVis?0:10}px)`,
        opacity: toastVis ? 1 : 0, transition:"opacity .2s,transform .2s",
        background:"#1e1b2e", border:"1px solid rgba(255,255,255,.1)",
        color:"#d0ccff", borderRadius:12, padding:"10px 20px",
        fontSize:13, fontWeight:600, whiteSpace:"nowrap", zIndex:99, pointerEvents:"none",
      }}>{toast}</div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════
     COUNT
  ════════════════════════════════════════════════════════════════ */
  if (screen === "count" && active) return (
    <div style={{ ...S.app, background:`radial-gradient(ellipse at 50% -5%, ${mix(active.rang, 14)}, ${T.bg} 60%)` }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Naskh+Arabic:wght@400;600&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0}
        @keyframes popIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
        @keyframes rpl{to{transform:scale(4);opacity:0}}
      `}</style>

      {/* topbar */}
      <div style={S.topbar}>
        <button style={S.iconBtn} onClick={() => setScreen("home")}>←</button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:16, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{active.emoji} {active.nom}</div>
          {active.arab && <div style={{ fontFamily:"'Noto Naskh Arabic',serif", fontSize:14, color:"#8884aa", direction:"rtl", marginTop:1 }}>{active.arab}</div>}
        </div>
        <button style={S.iconBtn} onClick={resetActive}>↺</button>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 20px 0" }}>

        {/* ring */}
        <div style={{ position:"relative", marginTop:14 }}>
          <svg width={200} height={200} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={100} cy={100} r={85} fill="none" stroke="#1a1828" strokeWidth={11}/>
            <circle cx={100} cy={100} r={85} fill="none"
              stroke={done ? "#fbbf24" : active.rang} strokeWidth={11} strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - prog)}
              style={{ transition:"stroke-dashoffset .35s cubic-bezier(.4,0,.2,1), stroke .3s" }}
            />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:48, fontWeight:900, color: done?"#fbbf24":active.rang, lineHeight:1, letterSpacing:-2 }}>{score}</span>
            <span style={{ fontSize:13, color:T.dim, marginTop:4, fontWeight:500 }}>/ {active.maqsad}</span>
          </div>
        </div>

        {/* stats */}
        <div style={{ display:"flex", width:"100%", marginTop:18, background:T.card, borderRadius:16, overflow:"hidden", border:`1px solid ${T.border}` }}>
          {[["Davr", score], ["Jami", total], ["Qoldi", Math.max(active.maqsad - score, 0)]].map(([label, val], i) => (
            <div key={label} style={{ flex:1, padding:"12px 0", textAlign:"center", borderLeft: i>0?`1px solid ${T.border}`:"none" }}>
              <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:.8, fontWeight:600 }}>{label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#c4c0e8", marginTop:3 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* done banner */}
        {done && (
          <div style={{ marginTop:16, width:"100%", background:mix("#fbbf24",10), border:"1.5px solid #fbbf24", borderRadius:16, padding:"14px 20px", textAlign:"center", animation:"popIn .3s cubic-bezier(.34,1.56,.64,1)" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fbbf24" }}>🏆 Maqsadga yetdingiz!</div>
            <button onClick={resetActive} style={{ marginTop:10, background:"#fbbf24", border:"none", borderRadius:10, padding:"8px 24px", fontWeight:800, fontSize:14, cursor:"pointer", color:T.bg, fontFamily:"inherit" }}>Yana boshlash</button>
          </div>
        )}

        {/* ORB */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", width:"100%" }}>
          <button
            onPointerDown={tap}
            disabled={done}
            style={{
              width:220, height:220, borderRadius:"50%", border:"none",
              background:`radial-gradient(circle at 38% 36%, ${mix(active.rang, 28)}, ${T.bg})`,
              outline:`2.5px solid ${mix(active.rang, 55)}`,
              boxShadow: pressed
                ? `0 0 0 28px ${mix(active.rang,12)}, 0 4px 16px rgba(0,0,0,.4)`
                : `0 0 0 0 transparent, 0 16px 48px rgba(0,0,0,.5)`,
              cursor: done ? "default" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:80, fontWeight:900,
              color: done ? "#fbbf24" : active.rang,
              position:"relative", overflow:"hidden",
              transform: pressed ? "scale(.93)" : "scale(1)",
              transition:"transform .12s, box-shadow .15s",
              touchAction:"manipulation", userSelect:"none",
              fontFamily:"inherit",
            }}
          >
            {ripples.map(rp => (
              <span key={rp.id} style={{
                position:"absolute", borderRadius:"50%",
                width:120, height:120,
                left: rp.x - 60, top: rp.y - 60,
                background: mix(active.rang, 30),
                animation:"rpl .6s ease-out forwards",
                pointerEvents:"none",
              }}/>
            ))}
            <span style={{ position:"relative", zIndex:1, lineHeight:1 }}>{score}</span>
          </button>
        </div>

        <div style={{ paddingBottom:24, fontSize:11, color:"#3a3a5a", letterSpacing:.3 }}>
          Bosing &nbsp;·&nbsp; yoki <kbd style={{ background:"rgba(255,255,255,.07)", padding:"1px 6px", borderRadius:5, fontSize:10 }}>Space</kbd>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════
     EDIT / NEW
  ════════════════════════════════════════════════════════════════ */
  if (screen === "edit") {
    const c = editObj;
    const setC = (patch) => setEditObj(o => ({ ...o, ...patch }));

    return (
      <div style={S.app}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Naskh+Arabic:wght@400;600&display=swap');
          *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
          ::-webkit-scrollbar{width:0}
          input:focus{border-color:${c.rang} !important}
        `}</style>

        <div style={S.topbar}>
          <button style={S.iconBtn} onClick={() => setScreen("home")}>←</button>
          <div style={{ fontWeight:800, fontSize:17, flex:1 }}>{editMode==="new" ? "Yangi hisoblagich" : "Tahrirlash"}</div>
          <div style={{ width:38 }}/>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"18px 18px 10px", display:"flex", flexDirection:"column", gap:20 }}>
          {/* preview */}
          <div style={{ background:T.card, borderRadius:18, padding:"16px 18px", display:"flex", alignItems:"center", gap:14, border:`2px solid ${c.rang}`, transition:"border-color .2s" }}>
            <div style={{ width:52, height:52, borderRadius:14, background:mix(c.rang,18), display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>{c.emoji}</div>
            <div>
              <div style={{ fontSize:17, fontWeight:800 }}>{c.nom || "Nom kiriting"}</div>
              <div style={{ fontSize:13, color:T.muted, marginTop:2 }}>Maqsad: {c.maqsad}</div>
            </div>
          </div>

          {/* name */}
          <div>
            <div style={fieldLbl}>Nomi *</div>
            <input value={c.nom} onChange={e=>setC({nom:e.target.value})} placeholder="Masalan: Suv ichish"
              style={inputSt(T)} />
          </div>

          {/* arabic */}
          <div>
            <div style={fieldLbl}>Arabcha matn (ixtiyoriy)</div>
            <input value={c.arab} onChange={e=>setC({arab:e.target.value})} placeholder="سُبْحَانَ اللَّهِ"
              style={{ ...inputSt(T), direction:"rtl", fontFamily:"'Noto Naskh Arabic',serif", fontSize:18 }} />
          </div>

          {/* target */}
          <div>
            <div style={fieldLbl}>Maqsad: {c.maqsad}</div>
            <input type="range" min={1} max={1000} value={c.maqsad} onChange={e=>setC({maqsad:+e.target.value})}
              style={{ width:"100%", accentColor:c.rang, cursor:"pointer" }} />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
              {TARGETS.map(n => (
                <button key={n} onClick={()=>setC({maqsad:n})} style={{
                  padding:"5px 14px", borderRadius:9, border:"none", fontFamily:"inherit",
                  background: c.maqsad===n ? c.rang : "rgba(255,255,255,.07)",
                  color: c.maqsad===n ? T.bg : "#8884aa",
                  fontSize:13, fontWeight:700, cursor:"pointer",
                }}>{n}</button>
              ))}
            </div>
          </div>

          {/* color */}
          <div>
            <div style={fieldLbl}>Rang</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {COLORS.map(clr => (
                <div key={clr} onClick={()=>setC({rang:clr})} style={{
                  width:32, height:32, borderRadius:"50%", background:clr,
                  border:`3px solid ${c.rang===clr?"#fff":"transparent"}`,
                  cursor:"pointer", transform: c.rang===clr?"scale(1.1)":"scale(1)",
                  transition:"transform .15s, border-color .15s",
                }}/>
              ))}
            </div>
          </div>

          {/* emoji */}
          <div>
            <div style={fieldLbl}>Ikon</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {EMOJIS.map(em => (
                <button key={em} onClick={()=>setC({emoji:em})} style={{
                  width:40, height:40, borderRadius:11,
                  border:`2px solid ${c.emoji===em ? c.rang : "transparent"}`,
                  background: c.emoji===em ? mix(c.rang,18) : "rgba(255,255,255,.06)",
                  fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                }}>{em}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding:"16px 18px", borderTop:`1px solid ${T.border}` }}>
          <button onClick={saveEdit} disabled={!c.nom.trim()} style={{
            width:"100%", padding:15, borderRadius:15, border:"none",
            background: c.nom.trim() ? c.rang : T.card,
            color: c.nom.trim() ? T.bg : T.dim,
            fontWeight:800, fontSize:16, cursor: c.nom.trim()?"pointer":"not-allowed",
            fontFamily:"inherit", transition:"background .2s, color .2s",
            opacity: c.nom.trim() ? 1 : .5,
          }}>
            {editMode==="new" ? "Qo'shish" : "Saqlash"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

const fieldLbl = { fontSize:11, fontWeight:700, color:"#5a5a7a", textTransform:"uppercase", letterSpacing:.8, marginBottom:8 };
const inputSt  = (T) => ({
  width:"100%", background:T.card, border:"1.5px solid rgba(255,255,255,.08)",
  borderRadius:13, padding:"13px 15px", color:T.text, fontSize:16,
  outline:"none", fontFamily:"'Inter',sans-serif", transition:"border-color .2s",
});
