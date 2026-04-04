import { useState, useRef, useEffect } from "react";

const ADMIN_USER = "admin";
const ADMIN_PASS = "forge2024";
const MODEL = "claude-sonnet-4-20250514";

const FORGE_SYSTEM = `You are Forge, a world-class AI software engineer inside a browser IDE. You can build ANYTHING a developer can build.

WHAT YOU CAN BUILD:
• Full-stack web apps (React, Vue, Svelte, Vanilla JS)
• Landing pages, portfolios, SaaS homepages
• Dashboards with charts, tables, analytics
• Games (snake, tetris, chess, card games, platformers)
• Tools (calculators, converters, timers, generators)
• E-commerce UIs, admin panels, CRMs, kanban boards
• APIs and backend logic, CLI tools and scripts
• Auth UIs, data visualizations, chat interfaces
• Chrome extensions, README files, documentation
• Algorithms, data structures, unit tests, SQL, CSS animations
• Anything else — just ask

OUTPUT RULES:
1. COMPLETE CODE ONLY — no placeholders, no truncation
2. Single self-contained file unless specified
3. HTML/JS: one .html file with inline style + script
4. React: one JSX component, default export, hooks only
5. Beautiful code and gorgeous styling always
6. Dark themes by default
7. After code block: 1-2 sentences on what you built

FORMAT: use correct fence (html, jsx, js, python, css, sql, bash)

CONVERSATION:
• EDIT/FIX: output FULL updated file
• ADD feature: integrate into full existing code
• HOW question: explain then offer to build
• Ambiguous: make best assumption and build it`;

const STARTER = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Forge App</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      min-height:100vh; display:flex;
      align-items:center; justify-content:center;
      background:#0d0d0d; font-family:'Courier New',monospace; color:#e0e0e0;
    }
    .card { text-align:center; padding:48px; border:1px solid #1e1e2e; background:rgba(124,109,250,0.05); }
    h1 { font-size:2rem; color:#7c6dfa; margin-bottom:12px; }
    p { color:#555; line-height:1.6; }
    .hint { margin-top:20px; font-size:.8rem; color:#333; border-top:1px solid #1e1e2e; padding-top:16px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:48px;margin-bottom:16px">⚡</div>
    <h1>Forge IDE</h1>
    <p>Your AI coding partner is ready.<br/>Describe what you want to build.</p>
    <div class="hint">Try: "Build a todo app" · "Make a snake game" · "Create a landing page"</div>
  </div>
</body>
</html>`;

const extractCode = (t) => { const m = t.match(/```(?:[a-z]*)?\n([\s\S]*?)```/i); return m ? m[1].trim() : null; };
const extractLang = (t) => { const m = t.match(/```([a-z]*)/i); return m && m[1] ? m[1] : "html"; };
const fileIcon = (n="") => {
  if (n.endsWith(".html")) return "🌐";
  if (n.endsWith(".css")) return "🎨";
  if (n.endsWith(".jsx")||n.endsWith(".tsx")) return "⚛";
  if (n.endsWith(".js")||n.endsWith(".ts")) return "📜";
  if (n.endsWith(".py")) return "🐍";
  if (n.endsWith(".md")) return "📝";
  return "📄";
};
const EXT = { html:"index.html", jsx:"App.jsx", js:"app.js", css:"style.css", python:"main.py", py:"main.py", sql:"query.sql", bash:"script.sh", sh:"script.sh" };
const QUICK = ["Snake game","Todo app","Calculator","Landing page","Kanban board","Login UI","Dashboard","Chat UI","Pomodoro","Color tool"];
const AQUICK = ["Review files for bugs","Suggest 5 new features","How does send work?","Improve performance","Add syntax highlighting"];

const C = {
  bg:"#0b0b0f", sidebar:"#0e0e16", panel:"#111118", border:"#1c1c2e",
  accent:"#7c6dfa", accentDim:"#7c6dfa18", green:"#4ade80",
  text:"#c8c8e0", muted:"#44445a", chatBg:"#0d0d16", inputBg:"#13131f", red:"#f87171",
};

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [lu, setLu] = useState(""); const [lp, setLp] = useState(""); const [le, setLe] = useState("");
  const [view, setView] = useState("ide");
  const [adminTab, setAdminTab] = useState("dashboard");
  const [paneMode, setPaneMode] = useState("split");
  const [files, setFiles] = useState([{ id:1, name:"index.html", content:STARTER }]);
  const [activeId, setActiveId] = useState(1);
  const [msgs, setMsgs] = useState([{ role:"assistant", content:"Hey! I'm Forge ⚡\n\nI can build anything — games, apps, dashboards, landing pages, tools, APIs, scripts.\n\nDescribe what you want or tap a quick prompt below." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminMsgs, setAdminMsgs] = useState([{ role:"assistant", content:"Hello Admin 👋\n\nI'm Claude Sonnet 4 with full context of your IDE — all files, history, and usage stats.\n\nI can:\n• Review or debug any file\n• Design new Forge features\n• Answer any engineering question\n• Analyse your generation history\n\nWhat do you need?" }]);
  const [adminInput, setAdminInput] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [tokens, setTokens] = useState(0);
  const [calls, setCalls] = useState(0);

  const chatEnd = useRef(null);
  const adminEnd = useRef(null);
  const inputRef = useRef(null);
  const adminRef = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, loading]);
  useEffect(() => { adminEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [adminMsgs, adminLoading]);

  const af = files.find(f => f.id === activeId) || files[0];
  const updateContent = (c) => setFiles(fs => fs.map(f => f.id===activeId ? {...f,content:c} : f));

  const addFile = () => {
    const name = prompt("File name:");
    if (!name) return;
    const id = Date.now();
    setFiles(fs => [...fs, {id, name, content:""}]);
    setActiveId(id);
  };

  const deleteFile = (id) => {
    if (files.length===1) return;
    const rest = files.filter(f => f.id!==id);
    setFiles(rest);
    setActiveId(rest[0].id);
  };

  const callAPI = async (system, messages) => {
    const r = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ model:MODEL, max_tokens:1000, system, messages }),
    });
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  };

  const send = async () => {
    const p = input.trim();
    if (!p || loading) return;
    setInput("");
    setMsgs(m => [...m, {role:"user", content:p}]);
    setLoading(true);
    const apiMsgs = [...msgs.map(m => ({role:m.role,content:m.content})), {role:"user", content:`${p}\n\nCurrent file: ${af.name}\n\`\`\`\n${af.content.slice(0,1200)}\n\`\`\``}];
    try {
      const data = await callAPI(FORGE_SYSTEM, apiMsgs);
      const reply = data.content?.map(b => b.text||"").join("") || "No response.";
      const code = extractCode(reply);
      const lang = extractLang(reply);
      setMsgs(m => [...m, {role:"assistant", content:reply, hasCode:!!code}]);
      setCalls(c => c+1);
      const tok = (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0);
      setTokens(t => t+tok);
      if (code) {
        const sn = EXT[lang]||`output.${lang}`;
        const same = af.name.endsWith(`.${lang}`)||(lang==="html"&&af.name.endsWith(".html"))||(lang==="jsx"&&af.name.endsWith(".jsx"));
        if (same) { updateContent(code); }
        else {
          const ex = files.find(f => f.name===sn);
          if (ex) { setFiles(fs => fs.map(f => f.id===ex.id ? {...f,content:code} : f)); setActiveId(ex.id); }
          else { const id=Date.now(); setFiles(fs => [...fs,{id,name:sn,content:code}]); setActiveId(id); }
        }
        setHistory(h => [{id:Date.now(),prompt:p,file:af.name,time:new Date().toLocaleTimeString(),tok},...h].slice(0,100));
      }
    } catch(e) { setMsgs(m => [...m, {role:"assistant",content:`⚠️ ${e.message}`}]); }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendAdmin = async () => {
    const p = adminInput.trim();
    if (!p || adminLoading) return;
    setAdminInput("");
    setAdminMsgs(m => [...m, {role:"user",content:p}]);
    setAdminLoading(true);
    const fc = files.map(f => `FILE: ${f.name}\n\`\`\`\n${f.content.slice(0,600)}\n\`\`\``).join("\n\n");
    const sys = `You are Claude Sonnet 4 in the private admin panel of Forge IDE. Admin-only. No restrictions.\n\nLIVE STATE:\nFiles: ${files.length} | Calls: ${calls} | Tokens: ${tokens} | Generations: ${history.length}\n\nFILES:\n${fc}\n\nRECENT:\n${history.slice(0,3).map(h=>`• [${h.time}] "${h.prompt}" → ${h.file}`).join("\n")||"None"}\n\nBe direct and expert-level.`;
    const apiMsgs = [...adminMsgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:p}];
    try {
      const data = await callAPI(sys, apiMsgs);
      const reply = data.content?.map(b=>b.text||"").join("")||"No response.";
      setAdminMsgs(m => [...m,{role:"assistant",content:reply}]);
      setCalls(c=>c+1); setTokens(t=>t+(data.usage?.input_tokens||0)+(data.usage?.output_tokens||0));
    } catch(e) { setAdminMsgs(m => [...m,{role:"assistant",content:`⚠️ ${e.message}`}]); }
    setAdminLoading(false);
    setTimeout(() => adminRef.current?.focus(), 100);
  };

  const handleKey = (e) => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); send(); } };
  const handleAdminKey = (e) => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendAdmin(); } };

  const previewSrc = (() => {
    const {name,content} = af;
    if (name.endsWith(".html")) return `data:text/html;charset=utf-8,${encodeURIComponent(content)}`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(`<html><body style="background:#0d0d0d;color:#888;font-family:'Courier New',monospace;padding:24px"><div style="color:#7c6dfa;margin-bottom:12px">⚡ ${name}</div><pre style="color:#a0a0c0;font-size:13px;line-height:1.6;white-space:pre-wrap">${content.replace(/</g,"&lt;")}</pre></body></html>`)}`;
  })();

  // ── LOGIN ──────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>
      <div style={{width:360}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>⚡</div>
          <div style={{fontSize:28,fontWeight:900,color:C.accent,letterSpacing:-1}}>FORGE IDE</div>
          <div style={{fontSize:11,color:C.muted,letterSpacing:4,marginTop:6}}>AI-POWERED CODE STUDIO</div>
        </div>
        <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:"32px 28px"}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:4,marginBottom:24}}>SIGN IN</div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:6,letterSpacing:2}}>USERNAME</div>
            <input value={lu} onChange={e=>setLu(e.target.value)} onKeyDown={e=>e.key==="Enter"&&inputRef.current?.focus()}
              style={{width:"100%",boxSizing:"border-box",background:C.bg,border:`1px solid ${C.border}`,color:C.text,padding:"11px 14px",fontFamily:"monospace",fontSize:14,outline:"none"}} />
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:6,letterSpacing:2}}>PASSWORD</div>
            <input ref={inputRef} type="password" value={lp} onChange={e=>setLp(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"){ if(lu===ADMIN_USER&&lp===ADMIN_PASS){setAuthed(true);setLe("");}else setLe("Invalid credentials"); }}}
              style={{width:"100%",boxSizing:"border-box",background:C.bg,border:`1px solid ${C.border}`,color:C.text,padding:"11px 14px",fontFamily:"monospace",fontSize:14,outline:"none"}} />
          </div>
          {le && <div style={{color:C.red,fontSize:12,marginBottom:12}}>{le}</div>}
          <button onClick={()=>{ if(lu===ADMIN_USER&&lp===ADMIN_PASS){setAuthed(true);setLe("");}else setLe("Invalid credentials"); }}
            style={{width:"100%",background:C.accent,border:"none",color:"#fff",padding:"13px",fontFamily:"monospace",fontSize:14,fontWeight:900,cursor:"pointer",letterSpacing:2}}>
            LOGIN →
          </button>
          <div style={{marginTop:18,padding:"12px",background:C.accentDim,border:`1px solid ${C.border}`,fontSize:11,color:C.muted,textAlign:"center",lineHeight:1.8}}>
            admin / forge2024
          </div>
        </div>
      </div>
    </div>
  );

  // ── ADMIN ──────────────────────────────────────────────────────
  if (view==="admin") return (
    <div style={{height:"100vh",background:C.bg,fontFamily:"monospace",color:C.text,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{height:50,background:C.sidebar,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 20px",gap:16,flexShrink:0}}>
        <span style={{color:C.accent,fontWeight:900,fontSize:18}}>⚡ FORGE</span>
        <span style={{color:C.muted,fontSize:11,letterSpacing:2}}>/ ADMIN</span>
        <div style={{flex:1}}/>
        <button onClick={()=>setView("ide")} style={{background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,padding:"6px 16px",fontFamily:"monospace",fontSize:11,cursor:"pointer"}}>← IDE</button>
        <button onClick={()=>setAuthed(false)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"6px 12px",fontFamily:"monospace",fontSize:11,cursor:"pointer"}}>LOG OUT</button>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Admin sidebar */}
        <div style={{width:200,background:C.sidebar,borderRight:`1px solid ${C.border}`,padding:"16px 10px",flexShrink:0}}>
          {[{id:"dashboard",label:"📊 Dashboard"},{id:"claude",label:"🤖 Claude AI",badge:true},{id:"history",label:"📋 History"},{id:"files",label:"📁 Files"},{id:"settings",label:"⚙️ Settings"}].map(t=>(
            <div key={t.id} onClick={()=>setAdminTab(t.id)} style={{padding:"10px 12px",marginBottom:3,cursor:"pointer",background:adminTab===t.id?(t.id==="claude"?"#0d1a0d":C.accentDim):"transparent",border:`1px solid ${adminTab===t.id?(t.id==="claude"?C.green:C.accent):"transparent"}`,color:adminTab===t.id?(t.id==="claude"?C.green:C.accent):C.muted,fontSize:12,display:"flex",alignItems:"center",gap:6}}>
              {t.label}
              {t.badge&&<span style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:C.green,boxShadow:`0 0 4px ${C.green}`,flexShrink:0}}/>}
            </div>
          ))}
        </div>

        {/* Admin content */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>

          {/* DASHBOARD */}
          {adminTab==="dashboard"&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.accent,marginBottom:24}}>Dashboard</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:28}}>
                {[["⚡","API Calls",calls],["🧠","Tokens",tokens.toLocaleString()],["📄","Files",files.length],["🔨","Generations",history.length]].map(([icon,label,val])=>(
                  <div key={label} style={{background:C.panel,border:`1px solid ${C.border}`,padding:"18px 16px"}}>
                    <div style={{fontSize:24,marginBottom:8}}>{icon}</div>
                    <div style={{fontSize:26,fontWeight:900,color:C.accent}}>{val}</div>
                    <div style={{fontSize:10,color:C.muted,letterSpacing:2,marginTop:4}}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:20}}>
                <div style={{fontSize:10,color:C.muted,letterSpacing:3,marginBottom:14}}>RECENT GENERATIONS</div>
                {history.slice(0,8).map(h=>(
                  <div key={h.id} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{color:C.accent}}>{h.file}</span>
                      <span style={{color:C.muted}}>{h.time}</span>
                    </div>
                    <div style={{color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.prompt}</div>
                  </div>
                ))}
                {history.length===0&&<div style={{color:C.muted}}>No generations yet.</div>}
              </div>
            </div>
          )}

          {/* CLAUDE ADMIN AI */}
          {adminTab==="claude"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#080e08"}}>
              <div style={{background:"#080e08",borderBottom:"1px solid #1a2a1a",padding:"12px 24px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`}}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.green}}>Claude Sonnet 4 — Admin AI</div>
                  <div style={{fontSize:10,color:"#2a5a2a",letterSpacing:2}}>PRIVATE · ADMIN ONLY · FULL IDE CONTEXT</div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"16px 24px",display:"flex",flexDirection:"column",gap:12}}>
                {adminMsgs.map((msg,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
                    {msg.role==="assistant"&&<div style={{fontSize:9,color:"#1a4a1a",letterSpacing:2,marginBottom:3}}>CLAUDE SONNET 4</div>}
                    <div style={{maxWidth:"85%",background:msg.role==="user"?"#0d2a0d":"#0a1a0a",border:`1px solid ${msg.role==="user"?C.green+"50":"#1a3a1a"}`,padding:"10px 14px",fontSize:13,lineHeight:1.7,color:msg.role==="user"?C.green:"#8aaa8a",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {adminLoading&&(
                  <div style={{alignSelf:"flex-start"}}>
                    <div style={{fontSize:9,color:"#1a4a1a",letterSpacing:2,marginBottom:3}}>CLAUDE SONNET 4</div>
                    <div style={{background:"#0a1a0a",border:"1px solid #1a3a1a",padding:"10px 16px",display:"flex",gap:5,alignItems:"center"}}>
                      {[0,1,2].map(d=><div key={d} style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:`bounce 1s ${d*0.2}s infinite`}}/>)}
                      <span style={{fontSize:11,color:"#2a5a2a",marginLeft:8}}>Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={adminEnd}/>
              </div>
              {/* Quick prompts */}
              <div style={{background:"#080e08",padding:"8px 24px 0",borderTop:"1px solid #0f1f0f"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {AQUICK.map(p=>(
                    <button key={p} onClick={()=>{setAdminInput(p);adminRef.current?.focus();}}
                      style={{background:"transparent",border:"1px solid #1a3a1a",color:"#2a5a2a",padding:"3px 10px",fontFamily:"monospace",fontSize:9,cursor:"pointer"}}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {/* Admin input */}
              <div style={{padding:"12px 24px 16px",background:"#080e08",flexShrink:0}}>
                <div style={{background:"#0a150a",border:`2px solid ${adminInput.trim()?C.green:"#1a3a1a"}`,transition:"border-color 0.2s"}}>
                  <textarea ref={adminRef} value={adminInput} onChange={e=>setAdminInput(e.target.value)} onKeyDown={handleAdminKey}
                    placeholder="Ask Claude anything about your IDE, code, or features..."
                    rows={3}
                    style={{width:"100%",boxSizing:"border-box",background:"transparent",border:"none",outline:"none",color:C.green,fontFamily:"monospace",fontSize:13,padding:"12px 14px 8px",resize:"none",lineHeight:1.55,display:"block"}}
                  />
                  <div style={{display:"flex",alignItems:"center",padding:"8px 12px",borderTop:"1px solid #1a3a1a",gap:10}}>
                    <span style={{fontSize:9,color:"#1a3a1a",flex:1}}>⏎ send · ⇧⏎ newline</span>
                    <button onClick={sendAdmin} disabled={adminLoading||!adminInput.trim()}
                      style={{background:adminInput.trim()&&!adminLoading?C.green:"#0a150a",border:`2px solid ${adminInput.trim()&&!adminLoading?C.green:"#1a3a1a"}`,color:adminInput.trim()&&!adminLoading?"#000":"#1a4a1a",padding:"10px 24px",fontFamily:"monospace",fontSize:13,fontWeight:900,cursor:adminLoading||!adminInput.trim()?"not-allowed":"pointer",letterSpacing:2,display:"flex",alignItems:"center",gap:8,minWidth:130,justifyContent:"center",transition:"all 0.15s"}}>
                      {adminLoading?<><span>⏳</span> THINKING</>:<><span>🤖</span> ASK CLAUDE</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {adminTab==="history"&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.accent,marginBottom:24}}>Generation History</div>
              {history.length===0&&<div style={{color:C.muted}}>No generations yet. Start building!</div>}
              {history.map(h=>(
                <div key={h.id} style={{background:C.panel,border:`1px solid ${C.border}`,padding:"14px 18px",marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{color:C.accent,fontSize:12}}>{fileIcon(h.file)} {h.file}</span>
                    <span style={{color:C.muted,fontSize:11}}>{h.time}</span>
                  </div>
                  <div style={{fontSize:13,color:C.text}}>{h.prompt}</div>
                </div>
              ))}
            </div>
          )}

          {/* FILES */}
          {adminTab==="files"&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.accent,marginBottom:24}}>Files</div>
              {files.map(f=>(
                <div key={f.id} style={{background:C.panel,border:`1px solid ${C.border}`,padding:"14px 18px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{color:C.accent,fontSize:14,marginBottom:3}}>{fileIcon(f.name)} {f.name}</div>
                    <div style={{color:C.muted,fontSize:11}}>{f.content.split("\n").length} lines · {f.content.length} chars</div>
                  </div>
                  <button onClick={()=>{setActiveId(f.id);setView("ide");}} style={{background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,padding:"5px 14px",fontFamily:"monospace",fontSize:11,cursor:"pointer"}}>OPEN</button>
                </div>
              ))}
            </div>
          )}

          {/* SETTINGS */}
          {adminTab==="settings"&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.accent,marginBottom:24}}>Settings</div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:20}}>
                {[["Model",MODEL],["Admin User",ADMIN_USER],["API Route","/api/chat"],["Max Tokens","1000"],["Version","Forge v2"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:13,color:C.muted}}>{k}</span>
                    <span style={{fontSize:13,color:C.accent}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── MAIN IDE ───────────────────────────────────────────────────
  return (
    <div style={{height:"100vh",background:C.bg,fontFamily:"monospace",color:C.text,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* TOP BAR */}
      <div style={{height:46,background:C.sidebar,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 14px",gap:10,flexShrink:0}}>
        <span style={{fontSize:20}}>⚡</span>
        <span style={{fontWeight:900,fontSize:16,color:C.accent}}>FORGE</span>
        <span style={{fontSize:9,color:C.muted,letterSpacing:3}}>IDE</span>
        <div style={{width:1,height:20,background:C.border,margin:"0 4px"}}/>
        <div style={{display:"flex",gap:2}}>
          {[["split","⬛ Split"],["code","📄 Code"],["preview","👁 Preview"]].map(([m,label])=>(
            <button key={m} onClick={()=>setPaneMode(m)} style={{background:paneMode===m?C.accentDim:"transparent",border:`1px solid ${paneMode===m?C.accent:C.border}`,color:paneMode===m?C.accent:C.muted,padding:"4px 10px",cursor:"pointer",fontFamily:"monospace",fontSize:10}}>{label}</button>
          ))}
        </div>
        <div style={{flex:1}}/>
        <button onClick={()=>setView("admin")} style={{background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,padding:"5px 12px",fontFamily:"monospace",fontSize:10,cursor:"pointer",fontWeight:700}}>⚙ ADMIN</button>
        <button onClick={()=>setAuthed(false)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"5px 10px",fontFamily:"monospace",fontSize:10,cursor:"pointer"}}>LOG OUT</button>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        {/* FILE TREE */}
        <div style={{width:180,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:9,color:C.muted,letterSpacing:3}}>EXPLORER</span>
            <button onClick={addFile} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontSize:20,lineHeight:1,padding:0}}>+</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
            {files.map(f=>(
              <div key={f.id} onClick={()=>setActiveId(f.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px 6px 12px",cursor:"pointer",background:activeId===f.id?C.accentDim:"transparent",borderLeft:`2px solid ${activeId===f.id?C.accent:"transparent"}`}}>
                <span style={{fontSize:12,color:activeId===f.id?C.accent:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                  <span>{fileIcon(f.name)}</span><span>{f.name}</span>
                </span>
                {files.length>1&&<span onClick={e=>{e.stopPropagation();deleteFile(f.id);}} style={{color:"#2a2a40",fontSize:16,cursor:"pointer",flexShrink:0}}>×</span>}
              </div>
            ))}
          </div>
        </div>

        {/* EDITOR + PREVIEW */}
        <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
          {paneMode!=="preview"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.border}`,overflow:"hidden",minHeight:0}}>
              <div style={{height:34,background:C.panel,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 16px",flexShrink:0}}>
                <span style={{fontSize:12,color:C.accent}}>{fileIcon(af.name)} {af.name}</span>
                <span style={{marginLeft:"auto",fontSize:10,color:C.muted}}>{af.content.split("\n").length} lines</span>
              </div>
              <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
                <div style={{width:40,background:C.sidebar,borderRight:`1px solid ${C.border}`,padding:"14px 6px 14px 0",overflowY:"hidden",flexShrink:0,textAlign:"right",fontSize:11,lineHeight:"1.65em",color:"#25253a",userSelect:"none"}}>
                  {af.content.split("\n").map((_,i)=><div key={i}>{i+1}</div>)}
                </div>
                <textarea value={af.content} onChange={e=>updateContent(e.target.value)} spellCheck={false}
                  style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#b0b0d0",fontFamily:"monospace",fontSize:13,lineHeight:"1.65em",padding:"14px",resize:"none",caretColor:C.accent,overflowY:"auto"}}
                />
              </div>
            </div>
          )}
          {paneMode!=="code"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
              <div style={{height:34,background:C.panel,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 16px",gap:8,flexShrink:0}}>
                <div style={{display:"flex",gap:5}}>{["#ff5f57","#ffbd2e","#28c840"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}</div>
                <span style={{fontSize:10,color:C.muted,marginLeft:6,letterSpacing:2}}>LIVE PREVIEW</span>
              </div>
              <iframe key={af.content.slice(0,80)} src={previewSrc} style={{flex:1,border:"none",background:"#0d0d0d"}} sandbox="allow-scripts allow-forms allow-modals" title="preview"/>
            </div>
          )}
        </div>

        {/* CHAT PANEL */}
        <div style={{width:340,background:C.chatBg,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,minHeight:0}}>
          <div style={{height:46,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 16px",gap:10,flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`}}/>
            <span style={{fontSize:10,color:C.muted,letterSpacing:3}}>FORGE AI</span>
            <span style={{marginLeft:"auto",fontSize:9,color:"#1e1e35"}}>SONNET 4</span>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
            {msgs.map((msg,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"90%",background:msg.role==="user"?C.accent:C.panel,border:`1px solid ${msg.role==="user"?C.accent:C.border}`,padding:"10px 13px",fontSize:13,lineHeight:1.6,color:msg.role==="user"?"#fff":C.text}}>
                  <span style={{whiteSpace:"pre-wrap"}}>{msg.content.replace(/```[\s\S]*?```/g,"").replace(/\*\*(.*?)\*\*/g,"$1").trim()}</span>
                  {msg.hasCode&&<div style={{marginTop:8,padding:"5px 10px",background:"#0a1a0a",border:"1px solid #1a3a1a",color:C.green,fontSize:11}}>✓ Code applied to editor</div>}
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{alignSelf:"flex-start"}}>
                <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",gap:5,alignItems:"center"}}>
                  {[0,1,2].map(d=><div key={d} style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:`bounce 1s ${d*0.2}s infinite`}}/>)}
                  <span style={{fontSize:11,color:C.muted,marginLeft:6}}>Building...</span>
                </div>
              </div>
            )}
            <div ref={chatEnd}/>
          </div>

          {/* CHAT INPUT */}
          <div style={{padding:"10px 12px 14px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
              {QUICK.map(p=>(
                <button key={p} onClick={()=>{setInput(`Build a ${p} with dark theme`);inputRef.current?.focus();}}
                  style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"3px 8px",fontFamily:"monospace",fontSize:9,cursor:"pointer"}}>
                  {p}
                </button>
              ))}
            </div>
            <div style={{background:C.inputBg,border:`2px solid ${input.trim()?C.accent:C.border}`,transition:"border-color 0.2s"}}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe what to build, fix, or ask..."
                rows={3}
                style={{width:"100%",boxSizing:"border-box",background:"transparent",border:"none",outline:"none",color:C.text,fontFamily:"monospace",fontSize:13,padding:"12px 13px 8px",resize:"none",lineHeight:1.55,display:"block"}}
              />
              <div style={{display:"flex",alignItems:"center",padding:"8px 10px",borderTop:`1px solid ${C.border}`,gap:10}}>
                <span style={{fontSize:9,color:C.muted,flex:1}}>⏎ send · ⇧⏎ newline</span>
                <button onClick={send} disabled={loading||!input.trim()}
                  style={{background:loading?"#0f0f20":input.trim()?C.accent:"#1a1a28",border:`2px solid ${loading?C.border:input.trim()?C.accent:C.border}`,color:loading?C.muted:input.trim()?"#fff":C.muted,padding:"10px 22px",fontFamily:"monospace",fontSize:14,fontWeight:900,cursor:loading||!input.trim()?"not-allowed":"pointer",letterSpacing:2,display:"flex",alignItems:"center",gap:8,minWidth:110,justifyContent:"center",transition:"all 0.15s"}}>
                  {loading?<><span style={{fontSize:13}}>⏳</span> BUILDING</>:<><span style={{fontSize:16}}>⚡</span> SEND</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-5px);opacity:1}}
        *{scrollbar-width:thin;scrollbar-color:#1c1c2e transparent}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#1c1c2e;border-radius:2px}
        textarea::placeholder{color:#2a2a40}
      `}</style>
    </div>
  );
}
