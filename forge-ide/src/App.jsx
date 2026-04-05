import { useState, useRef, useEffect } from "react";

const ADMIN_USER = "admin";
const ADMIN_PASS = "forge2024";
const MODEL = "claude-sonnet-4-20250514";

const FORGE_SYSTEM = `You are Forge, a world-class AI software engineer. You can build ANYTHING.

WHAT YOU CAN BUILD:
• Games (snake, tetris, chess, platformers, shooters)
• Web apps, landing pages, dashboards, tools
• Calculators, timers, converters, generators
• Anything else — just ask

OUTPUT RULES:
1. ALWAYS output COMPLETE working code — no placeholders ever
2. ALWAYS use HTML format with inline CSS and JS in one file
3. Make it beautiful — dark themes, smooth animations
4. After the code block write 1 sentence about what you built

FORMAT — always use exactly:
\`\`\`html
YOUR COMPLETE HTML CODE HERE
\`\`\`

CONVERSATION:
• EDIT/FIX: output the FULL updated file
• ADD feature: integrate into full existing code
• Questions: answer directly without code`;

const STARTER = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Forge IDE</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      min-height:100vh; display:flex; align-items:center; justify-content:center;
      background:linear-gradient(135deg,#0d0d0d,#0a0a14);
      font-family:'Courier New',monospace; color:#e0e0e0;
    }
    .card { text-align:center; padding:48px; border:1px solid #1e1e2e; background:rgba(124,109,250,0.05); max-width:500px; }
    h1 { font-size:2rem; color:#7c6dfa; margin-bottom:12px; }
    p { color:#555; line-height:1.7; }
    .hint { margin-top:20px; font-size:.8rem; color:#333; border-top:1px solid #1e1e2e; padding-top:16px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:48px;margin-bottom:16px">⚡</div>
    <h1>Forge IDE</h1>
    <p>Your AI coding partner is ready.<br/>Type what you want to build in the chat on the right!</p>
    <div class="hint">Try: "Build a snake game" · "Make a todo app" · "Create a calculator"</div>
  </div>
</body>
</html>`;

const extractCode = (t) => {
  const m = t.match(/```(?:html|jsx?|[a-z]*)?\n([\s\S]*?)```/i);
  return m ? m[1].trim() : null;
};

const QUICK = ["Snake game","Todo app","Calculator","Tetris","Landing page","Dashboard","Pomodoro timer","Kanban board"];
const AQUICK = ["Review my code for bugs","Suggest new features","How can I improve this?","Add a dark mode toggle"];

const C = {
  bg:"#0b0b0f", sidebar:"#0e0e16", panel:"#111118", border:"#1c1c2e",
  accent:"#7c6dfa", accentDim:"#7c6dfa18", green:"#4ade80",
  text:"#c8c8e0", muted:"#44445a", chatBg:"#0d0d16", inputBg:"#13131f", red:"#f87171",
};

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [lu, setLu] = useState("");
  const [lp, setLp] = useState("");
  const [le, setLe] = useState("");
  const [view, setView] = useState("ide");
  const [adminTab, setAdminTab] = useState("dashboard");
  const [previewContent, setPreviewContent] = useState(STARTER);
  const [msgs, setMsgs] = useState([
    { role:"assistant", content:"Hey! I'm Forge ⚡\n\nI can build anything — games, apps, tools, dashboards.\n\nTap a quick prompt or describe what you want to build!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminMsgs, setAdminMsgs] = useState([
    { role:"assistant", content:"Hello Admin 👋\n\nI'm Claude Sonnet 4 with full context of your IDE.\n\nI can review your code, suggest features, or answer any dev question.\n\nWhat do you need?" }
  ]);
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
    const apiMsgs = [
      ...msgs.map(m => ({role:m.role, content:m.content})),
      { role:"user", content:`${p}\n\nCurrent code preview:\n${previewContent.slice(0,600)}` }
    ];
    try {
      const data = await callAPI(FORGE_SYSTEM, apiMsgs);
      const reply = data.content?.map(b => b.text||"").join("") || "No response.";
      const code = extractCode(reply);
      setMsgs(m => [...m, {role:"assistant", content:reply, hasCode:!!code}]);
      setCalls(c => c+1);
      const tok = (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0);
      setTokens(t => t+tok);
      if (code) {
        setPreviewContent(code);
        setHistory(h => [{id:Date.now(), prompt:p, time:new Date().toLocaleTimeString(), tok}, ...h].slice(0,100));
      }
    } catch(e) {
      setMsgs(m => [...m, {role:"assistant", content:`⚠️ Error: ${e.message}`}]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendAdmin = async () => {
    const p = adminInput.trim();
    if (!p || adminLoading) return;
    setAdminInput("");
    setAdminMsgs(m => [...m, {role:"user", content:p}]);
    setAdminLoading(true);
    const sys = `You are Claude Sonnet 4 in the private admin panel of Forge IDE.\n\nLIVE STATE: API Calls: ${calls} | Tokens: ${tokens} | Builds: ${history.length}\n\nCURRENT CODE:\n${previewContent.slice(0,500)}\n\nBe direct and expert-level.`;
    const apiMsgs = [...adminMsgs.map(m=>({role:m.role,content:m.content})), {role:"user",content:p}];
    try {
      const data = await callAPI(sys, apiMsgs);
      const reply = data.content?.map(b=>b.text||"").join("")||"No response.";
      setAdminMsgs(m => [...m, {role:"assistant", content:reply}]);
      setCalls(c=>c+1);
      setTokens(t=>t+(data.usage?.input_tokens||0)+(data.usage?.output_tokens||0));
    } catch(e) {
      setAdminMsgs(m => [...m, {role:"assistant", content:`⚠️ ${e.message}`}]);
    }
    setAdminLoading(false);
    setTimeout(() => adminRef.current?.focus(), 100);
  };

  const handleKey = (e) => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); send(); } };
  const handleAdminKey = (e) => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendAdmin(); } };
  const previewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(previewContent)}`;
  const login = () => {
    if (lu===ADMIN_USER&&lp===ADMIN_PASS) { setAuthed(true); setLe(""); }
    else setLe("Invalid credentials");
  };

  // LOGIN
  if (!authed) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",padding:16}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:52,marginBottom:8}}>⚡</div>
          <div style={{fontSize:30,fontWeight:900,color:C.accent,letterSpacing:-1}}>FORGE IDE</div>
          <div style={{fontSize:11,color:C.muted,letterSpacing:4,marginTop:6}}>AI-POWERED CODE STUDIO</div>
        </div>
        <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:28,borderRadius:6}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:4,marginBottom:20}}>SIGN IN</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:6,letterSpacing:2}}>USERNAME</div>
            <input value={lu} onChange={e=>setLu(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
              style={{width:"100%",boxSizing:"border-box",background:C.bg,border:`1px solid ${C.border}`,color:C.text,padding:"12px 14px",fontFamily:"monospace",fontSize:14,outline:"none",borderRadius:3}}
            />
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:6,letterSpacing:2}}>PASSWORD</div>
            <input type="password" value={lp} onChange={e=>setLp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
              style={{width:"100%",boxSizing:"border-box",background:C.bg,border:`1px solid ${C.border}`,color:C.text,padding:"12px 14px",fontFamily:"monospace",fontSize:14,outline:"none",borderRadius:3}}
            />
          </div>
          {le&&<div style={{color:C.red,fontSize:12,marginBottom:12}}>{le}</div>}
          <button onClick={login}
            style={{width:"100%",background:C.accent,border:"none",color:"#fff",padding:14,fontFamily:"monospace",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,borderRadius:3}}>
            LOGIN →
          </button>
          <div style={{marginTop:16,padding:12,background:C.accentDim,border:`1px solid ${C.border}`,fontSize:11,color:C.muted,textAlign:"center",lineHeight:1.8,borderRadius:3}}>
            admin / forge2024
          </div>
        </div>
      </div>
    </div>
  );

  // ADMIN
  if (view==="admin") return (
    <div style={{height:"100vh",background:C.bg,fontFamily:"monospace",color:C.text,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{height:50,background:C.sidebar,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 20px",gap:16,flexShrink:0}}>
        <span style={{color:C.accent,fontWeight:900,fontSize:18}}>⚡ FORGE</span>
        <span style={{color:C.muted,fontSize:11,letterSpacing:2}}>/ ADMIN</span>
        <div style={{flex:1}}/>
        <button onClick={()=>setView("ide")} style={{background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,padding:"6px 16px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:3}}>← IDE</button>
        <button onClick={()=>setAuthed(false)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"6px 12px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:3}}>LOG OUT</button>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{width:210,background:C.sidebar,borderRight:`1px solid ${C.border}`,padding:"16px 10px",flexShrink:0}}>
          {[{id:"dashboard",label:"📊 Dashboard"},{id:"claude",label:"🤖 Claude AI",badge:true},{id:"history",label:"📋 Build History"},{id:"settings",label:"⚙️ Settings"}].map(t=>(
            <div key={t.id} onClick={()=>setAdminTab(t.id)} style={{padding:"10px 12px",marginBottom:4,cursor:"pointer",borderRadius:4,background:adminTab===t.id?(t.id==="claude"?"#0d1a0d":C.accentDim):"transparent",border:`1px solid ${adminTab===t.id?(t.id==="claude"?C.green:C.accent):"transparent"}`,color:adminTab===t.id?(t.id==="claude"?C.green:C.accent):C.muted,fontSize:12,display:"flex",alignItems:"center",gap:8}}>
              {t.label}
              {t.badge&&<span style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:C.green,boxShadow:`0 0 4px ${C.green}`}}/>}
            </div>
          ))}
        </div>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {adminTab==="dashboard"&&(
            <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
              <div style={{fontSize:22,fontWeight:900,color:C.accent,marginBottom:24}}>Dashboard</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14,marginBottom:28}}>
                {[["⚡","API Calls",calls],["🧠","Tokens Used",tokens.toLocaleString()],["🔨","Total Builds",history.length]].map(([icon,label,val])=>(
                  <div key={label} style={{background:C.panel,border:`1px solid ${C.border}`,padding:"20px 18px",borderRadius:6}}>
                    <div style={{fontSize:28,marginBottom:10}}>{icon}</div>
                    <div style={{fontSize:28,fontWeight:900,color:C.accent}}>{val}</div>
                    <div style={{fontSize:10,color:C.muted,letterSpacing:2,marginTop:4}}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:22,borderRadius:6}}>
                <div style={{fontSize:11,color:C.muted,letterSpacing:3,marginBottom:16}}>RECENT BUILDS</div>
                {history.slice(0,8).map(h=>(
                  <div key={h.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:C.accent,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.prompt}</span>
                      <span style={{color:C.muted,fontSize:11,marginLeft:12,flexShrink:0}}>{h.time}</span>
                    </div>
                  </div>
                ))}
                {history.length===0&&<div style={{color:C.muted}}>No builds yet — go build something!</div>}
              </div>
            </div>
          )}
          {adminTab==="claude"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#080e08"}}>
              <div style={{background:"#080e08",borderBottom:"1px solid #1a2a1a",padding:"14px 22px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`}}/>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.green}}>Claude Sonnet 4 — Admin AI</div>
                  <div style={{fontSize:10,color:"#2a5a2a",letterSpacing:1,marginTop:2}}>PRIVATE · ADMIN ONLY · FULL CONTEXT</div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"16px 22px",display:"flex",flexDirection:"column",gap:12}}>
                {adminMsgs.map((msg,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
                    {msg.role==="assistant"&&<div style={{fontSize:9,color:"#1a4a1a",letterSpacing:2,marginBottom:4}}>CLAUDE SONNET 4</div>}
                    <div style={{maxWidth:"85%",background:msg.role==="user"?"#0d2a0d":"#0a1a0a",border:`1px solid ${msg.role==="user"?C.green+"50":"#1a3a1a"}`,padding:"12px 16px",fontSize:13,lineHeight:1.7,color:msg.role==="user"?C.green:"#8aaa8a",whiteSpace:"pre-wrap",wordBreak:"break-word",borderRadius:6}}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {adminLoading&&(
                  <div style={{alignSelf:"flex-start"}}>
                    <div style={{fontSize:9,color:"#1a4a1a",letterSpacing:2,marginBottom:4}}>CLAUDE SONNET 4</div>
                    <div style={{background:"#0a1a0a",border:"1px solid #1a3a1a",padding:"12px 18px",display:"flex",gap:5,alignItems:"center",borderRadius:6}}>
                      {[0,1,2].map(d=><div key={d} style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:`bounce 1s ${d*0.2}s infinite`}}/>)}
                      <span style={{fontSize:11,color:"#2a5a2a",marginLeft:8}}>Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={adminEnd}/>
              </div>
              <div style={{background:"#080e08",padding:"8px 22px 0",borderTop:"1px solid #0f1f0f"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                  {AQUICK.map(p=>(
                    <button key={p} onClick={()=>{setAdminInput(p);adminRef.current?.focus();}}
                      style={{background:"transparent",border:"1px solid #1a3a1a",color:"#2a5a2a",padding:"3px 10px",fontFamily:"monospace",fontSize:9,cursor:"pointer",borderRadius:3}}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{padding:"12px 22px 18px",background:"#080e08",flexShrink:0}}>
                <div style={{background:"#0a150a",border:`2px solid ${adminInput.trim()?C.green:"#1a3a1a"}`,transition:"border-color 0.2s",borderRadius:6}}>
                  <textarea ref={adminRef} value={adminInput} onChange={e=>setAdminInput(e.target.value)} onKeyDown={handleAdminKey}
                    placeholder="Ask Claude anything about your code or IDE..."
                    rows={3}
                    style={{width:"100%",boxSizing:"border-box",background:"transparent",border:"none",outline:"none",color:C.green,fontFamily:"monospace",fontSize:13,padding:"12px 14px 8px",resize:"none",lineHeight:1.55,display:"block"}}
                  />
                  <div style={{display:"flex",alignItems:"center",padding:"8px 12px",borderTop:"1px solid #1a3a1a",gap:10}}>
                    <span style={{fontSize:9,color:"#1a3a1a",flex:1}}>⏎ send · ⇧⏎ newline</span>
                    <button onClick={sendAdmin} disabled={adminLoading||!adminInput.trim()}
                      style={{background:adminInput.trim()&&!adminLoading?C.green:"#0a150a",border:`2px solid ${adminInput.trim()&&!adminLoading?C.green:"#1a3a1a"}`,color:adminInput.trim()&&!adminLoading?"#000":"#1a4a1a",padding:"10px 22px",fontFamily:"monospace",fontSize:13,fontWeight:900,cursor:adminLoading||!adminInput.trim()?"not-allowed":"pointer",letterSpacing:1,display:"flex",alignItems:"center",gap:8,minWidth:130,justifyContent:"center",borderRadius:3}}>
                      {adminLoading?<><span>⏳</span> THINKING</>:<><span>🤖</span> ASK CLAUDE</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {adminTab==="history"&&(
            <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
              <div style={{fontSize:22,fontWeight:900,color:C.accent,marginBottom:24}}>Build History</div>
              {history.length===0&&<div style={{color:C.muted}}>No builds yet!</div>}
              {history.map(h=>(
                <div key={h.id} style={{background:C.panel,border:`1px solid ${C.border}`,padding:"14px 18px",marginBottom:8,borderRadius:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{color:C.accent,fontSize:14,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.prompt}</span>
                    <span style={{color:C.muted,fontSize:11,marginLeft:12,flexShrink:0}}>{h.time} · {h.tok} tok</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {adminTab==="settings"&&(
            <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
              <div style={{fontSize:22,fontWeight:900,color:C.accent,marginBottom:24}}>Settings</div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:22,borderRadius:6}}>
                {[["Model",MODEL],["Admin User",ADMIN_USER],["API Route","/api/chat"],["Version","Forge v3"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
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

  // MAIN IDE — Preview left, Chat right
  return (
    <div style={{height:"100vh",background:C.bg,fontFamily:"monospace",color:C.text,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{height:46,background:C.sidebar,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 16px",gap:12,flexShrink:0}}>
        <span style={{fontSize:22}}>⚡</span>
        <span style={{fontWeight:900,fontSize:17,color:C.accent}}>FORGE IDE</span>
        <div style={{flex:1}}/>
        <button onClick={()=>setView("admin")} style={{background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,padding:"6px 16px",fontFamily:"monospace",fontSize:11,cursor:"pointer",fontWeight:700,borderRadius:3}}>⚙ ADMIN</button>
        <button onClick={()=>setAuthed(false)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"6px 12px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:3}}>LOG OUT</button>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        {/* LIVE PREVIEW */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
          <div style={{height:36,background:C.panel,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 16px",gap:8,flexShrink:0}}>
            <div style={{display:"flex",gap:5}}>
              {["#ff5f57","#ffbd2e","#28c840"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}
            </div>
            <span style={{fontSize:11,color:C.muted,marginLeft:6,letterSpacing:2}}>LIVE PREVIEW</span>
            {history.length>0&&<span style={{marginLeft:"auto",fontSize:10,color:"#2a3a4a"}}>Last: {history[0]?.prompt?.slice(0,25)}...</span>}
          </div>
          <iframe
            key={previewContent.slice(0,100)}
            src={previewSrc}
            style={{flex:1,border:"none",background:"#0d0d0d"}}
            sandbox="allow-scripts allow-forms allow-modals"
            title="preview"
          />
        </div>

        {/* CHAT */}
        <div style={{width:360,background:C.chatBg,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,minHeight:0}}>
          <div style={{height:46,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 16px",gap:10,flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`}}/>
            <span style={{fontSize:11,color:C.muted,letterSpacing:2}}>FORGE AI</span>
            <span style={{marginLeft:"auto",fontSize:9,color:"#1e1e35"}}>SONNET 4</span>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
            {msgs.map((msg,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"92%",background:msg.role==="user"?C.accent:C.panel,border:`1px solid ${msg.role==="user"?C.accent:C.border}`,padding:"10px 13px",fontSize:13,lineHeight:1.6,color:msg.role==="user"?"#fff":C.text,borderRadius:6}}>
                  <span style={{whiteSpace:"pre-wrap"}}>
                    {msg.content.replace(/```[\s\S]*?```/g,"").replace(/\*\*(.*?)\*\*/g,"$1").trim()}
                  </span>
                  {msg.hasCode&&(
                    <div style={{marginTop:8,padding:"6px 10px",background:"#0a1a0a",border:"1px solid #1a3a1a",color:C.green,fontSize:11,borderRadius:3,display:"flex",alignItems:"center",gap:6}}>
                      <span>✓</span> Preview updated!
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{alignSelf:"flex-start"}}>
                <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",gap:5,alignItems:"center",borderRadius:6}}>
                  {[0,1,2].map(d=><div key={d} style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:`bounce 1s ${d*0.2}s infinite`}}/>)}
                  <span style={{fontSize:11,color:C.muted,marginLeft:6}}>Building...</span>
                </div>
              </div>
            )}
            <div ref={chatEnd}/>
          </div>

          <div style={{padding:"10px 12px 14px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
              {QUICK.map(p=>(
                <button key={p} onClick={()=>{setInput(`Build a ${p}`);setTimeout(()=>inputRef.current?.focus(),50);}}
                  style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"3px 8px",fontFamily:"monospace",fontSize:9,cursor:"pointer",borderRadius:3}}>
                  {p}
                </button>
              ))}
            </div>
            <div style={{background:C.inputBg,border:`2px solid ${input.trim()?C.accent:C.border}`,transition:"border-color 0.2s",borderRadius:6}}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe what to build..."
                rows={3}
                style={{width:"100%",boxSizing:"border-box",background:"transparent",border:"none",outline:"none",color:C.text,fontFamily:"monospace",fontSize:13,padding:"12px 13px 8px",resize:"none",lineHeight:1.55,display:"block"}}
              />
              <div style={{display:"flex",alignItems:"center",padding:"8px 10px",borderTop:`1px solid ${C.border}`,gap:10}}>
                <span style={{fontSize:9,color:C.muted,flex:1}}>⏎ send · ⇧⏎ newline</span>
                <button onClick={send} disabled={loading||!input.trim()}
                  style={{background:input.trim()&&!loading?C.accent:"#1a1a28",border:`2px solid ${input.trim()&&!loading?C.accent:C.border}`,color:input.trim()&&!loading?"#fff":C.muted,padding:"10px 22px",fontFamily:"monospace",fontSize:14,fontWeight:900,cursor:loading||!input.trim()?"not-allowed":"pointer",letterSpacing:2,display:"flex",alignItems:"center",gap:8,minWidth:110,justifyContent:"center",borderRadius:4,transition:"all 0.15s"}}>
                  {loading?<><span>⏳</span><span style={{fontSize:12}}>BUILDING</span></>:<><span>⚡</span> SEND</>}
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
        button:hover:not(:disabled){opacity:0.85}
      `}</style>
    </div>
  );
}
