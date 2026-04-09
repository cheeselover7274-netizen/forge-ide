import { useState, useRef, useEffect } from "react";

const ADMIN_USER = "admin";
const ADMIN_PASS = "forge2024";
const MODEL = "claude-sonnet-4-6";
const FREE_CREDIT_LIMIT = 4000;
const PRO_PRICE = "$12.99/mo";

// Simple user store (in-memory — resets on refresh, fine for demo)
const USER_STORE = {};

const FORGE_SYSTEM = `You are Forge, a world-class AI software engineer. Build ANYTHING the user asks for.

CRITICAL RULES:
1. ALWAYS output a COMPLETE working HTML file with ALL code inside it
2. NEVER use placeholders - write every single line of code
3. Games must be FULLY PLAYABLE - include complete game logic, controls, scoring
4. Snake game: use arrow keys, canvas, full collision detection, food, score
5. Use beautiful dark themes with animations
6. After the code block, list exactly what you built in this format:

BUILT:
- [feature 1]
- [feature 2]
- [feature 3]
(etc, be specific)

ALWAYS use EXACTLY this format for the code:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
... your COMPLETE code here ...
</html>
\`\`\`

STRICT RULE: After the closing \`\`\` put ONLY the BUILT list. NO extra code, NO raw HTML, NO extra text outside the BUILT list.`;

const STARTER = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Forge</title><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0d0d0d,#0a0a14);font-family:'Courier New',monospace;color:#e0e0e0}.card{text-align:center;padding:40px;border:1px solid #1e1e2e;background:rgba(124,109,250,0.05);max-width:400px}h1{font-size:1.8rem;color:#7c6dfa;margin-bottom:10px}p{color:#555;line-height:1.6;font-size:0.9rem}</style></head><body><div class="card"><div style="font-size:40px;margin-bottom:12px">⚡</div><h1>Forge IDE</h1><p>Your AI is ready!<br/>Type what to build below.</p></div></body></html>`;

const extractCode = (text) => {
  if (!text) return null;
  // Method 1: standard fenced code block ```html ... ```
  const fence = text.match(/```html([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // Method 2: any fenced block containing HTML
  const anyFence = text.match(/```[a-z]*([\s\S]*?)```/i);
  if (anyFence && anyFence[1].includes('<!DOCTYPE')) return anyFence[1].trim();
  // Method 3: raw HTML document in the text
  const raw = text.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>)/i);
  if (raw) return raw[1].trim();
  return null;
};

const extractBullets = (text) => {
  const section = text.match(/BUILT:\s*([\s\S]*?)(?:\n\n|$)/i);
  if (!section) return [];
  return section[1].split("\n").map(l=>l.replace(/^[-•*]\s*/,"").trim()).filter(Boolean);
};

const extractTheme = (text) => {
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
};

const DEFAULT_THEME = {
  bg:"#e8f0fe", sidebar:"#c8d8f8", panel:"#dce8ff", border:"#a0b8e8",
  accent:"#4a6ef5", accentDim:"#4a6ef520", green:"#22c55e",
  text:"#1a2a4a", muted:"#6080b0", chatBg:"#f0f5ff", inputBg:"#ffffff", red:"#ef4444",
};

const QUICK = ["Snake game","Tetris","Todo app","Calculator","Tic tac toe","Pomodoro timer","Kanban board","Landing page"];
const AQUICK = ["Change theme to dark","Change theme to purple","Make it green","Reset to light blue","Review current build"];
const EXAMPLES = ["Build a snake game with neon visuals","Create a todo app with drag and drop","Make a Tetris clone","Build a pomodoro timer","Create a music visualizer","Make a pixel art editor"];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  // auth page: "signin" or "signup"
  const [authPage, setAuthPage] = useState("signin");
  const [lu, setLu] = useState(""); const [lp, setLp] = useState(""); const [le, setLe] = useState("");
  const [su, setSu] = useState(""); const [se, setSe] = useState(""); const [sp, setSp] = useState(""); const [sp2, setSp2] = useState(""); const [sErr, setSErr] = useState(""); const [sOk, setSOk] = useState("");
  const [view, setView] = useState("home");
  const [adminTab, setAdminTab] = useState("dashboard");
  const [previewHtml, setPreviewHtml] = useState(STARTER);
  const [previewKey, setPreviewKey] = useState(0);
  const [msgs, setMsgs] = useState([{role:"assistant",content:"Hey! I'm Forge ⚡\n\nI can build anything — games, apps, tools, dashboards.\n\nTap a quick prompt or type below!"}]);
  const [input, setInput] = useState("");
  const [homeInput, setHomeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [buildSteps, setBuildSteps] = useState([]);
  const [adminMsgs, setAdminMsgs] = useState([{role:"assistant",content:"Hello Admin 👋\n\nI'm your live AI co-pilot. I can change the IDE colours and theme in real time!\n\nTry: \"Change theme to dark\" or \"Make the accent orange\""}]);
  const [adminInput, setAdminInput] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [tokens, setTokens] = useState(0);
  const [calls, setCalls] = useState(0);
  const [C, setC] = useState(DEFAULT_THEME);
  const [typed, setTyped] = useState("");
  const [exIdx, setExIdx] = useState(0);

  const chatEnd = useRef(null);
  const adminEnd = useRef(null);
  const inputRef = useRef(null);
  const adminRef = useRef(null);

  useEffect(() => {
    let t;
    const target = EXAMPLES[exIdx];
    if (typed.length < target.length) {
      t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 50);
    } else {
      t = setTimeout(() => { setTyped(""); setExIdx(i => (i+1) % EXAMPLES.length); }, 2200);
    }
    return () => clearTimeout(t);
  }, [typed, exIdx]);

  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[msgs,loading,buildSteps]);
  useEffect(()=>{ adminEnd.current?.scrollIntoView({behavior:"smooth"}); },[adminMsgs,adminLoading]);

  const callAPI = async (system, messages) => {
    const r = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:4096,system,messages})});
    if(!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  };

  // Simulate live build steps while waiting
  const startBuildSteps = (prompt) => {
    const steps = [
      "📐 Planning structure...",
      "🎨 Designing layout...",
      "⚙️ Writing core logic...",
      "🖥️ Building interface...",
      "✨ Adding animations...",
      "🔗 Connecting everything...",
      "🧪 Final checks...",
    ];
    setBuildSteps([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setBuildSteps(prev => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 600);
    return interval;
  };

  const runBuild = async (prompt, currentHtml) => {
    const apiMsgs = [...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:`${prompt}\n\nCurrent code: ${currentHtml.slice(0,300)}`}];
    const interval = startBuildSteps(prompt);
    const data = await callAPI(FORGE_SYSTEM, apiMsgs);
    clearInterval(interval);
    const reply = data.content?.map(b=>b.text||"").join("")||"";
    const code = extractCode(reply);
    const bullets = extractBullets(reply);
    setBuildSteps([]);
    // Only store clean display text — never the raw code
    const label = prompt.replace(/^build (a |an )?/i,"").trim() || "app";
    const displayMsg = code
      ? `✅ Done! Built your ${label}.`
      : `⚠️ The AI responded but I couldn't extract the code. Try again or rephrase.`;
    setMsgs(m=>[...m,{role:"assistant",content:displayMsg,hasCode:!!code,bullets,failed:!code}]);
    setCalls(c=>c+1);
    const tok=(data.usage?.input_tokens||0)+(data.usage?.output_tokens||0);
    setTokens(t=>t+tok);
    if(code){ setPreviewHtml(code); setPreviewKey(k=>k+1); setHistory(h=>[{id:Date.now(),prompt,time:new Date().toLocaleTimeString(),tok},...h].slice(0,100)); }
  };

  const startBuilding = async (prompt) => {
    if(!prompt.trim()) return;
    setView("ide");
    setLoading(true);
    setMsgs(m=>[...m,{role:"user",content:prompt}]);
    try { await runBuild(prompt, STARTER); } catch(e){ setMsgs(m=>[...m,{role:"assistant",content:`⚠️ Error: ${e.message}`}]); setBuildSteps([]); }
    setLoading(false);
  };

  const send = async () => {
    const p = input.trim();
    if(!p||loading) return;
    if(!isAdmin && tokens >= FREE_CREDIT_LIMIT) { setShowUpgrade(true); return; }
    setInput("");
    setMsgs(m=>[...m,{role:"user",content:p}]);
    setLoading(true);
    try { await runBuild(p, previewHtml); } catch(e){ setMsgs(m=>[...m,{role:"assistant",content:`⚠️ Error: ${e.message}`}]); setBuildSteps([]); }
    setLoading(false);
    setTimeout(()=>inputRef.current?.focus(),100);
  };

  const sendAdmin = async () => {
    const p = adminInput.trim();
    if(!p||adminLoading) return;
    setAdminInput("");
    setAdminMsgs(m=>[...m,{role:"user",content:p}]);
    setAdminLoading(true);
    const ADMIN_SYS = `You are Claude, the live admin AI for Forge IDE. You can change the app theme in real time.
CURRENT THEME: ${JSON.stringify(C)}
STATS: Calls:${calls} Tokens:${tokens} Builds:${history.length}
If user asks to change theme/colours, respond with a short message AND this exact JSON block:
\`\`\`json
{"bg":"#hex","sidebar":"#hex","panel":"#hex","border":"#hex","accent":"#hex","accentDim":"#hex20","green":"#22c55e","text":"#hex","muted":"#hex","chatBg":"#hex","inputBg":"#hex","red":"#ef4444"}
\`\`\`
PRESETS:
- Dark: bg:#0b0b0f sidebar:#0e0e16 panel:#111118 border:#1c1c2e accent:#7c6dfa accentDim:#7c6dfa18 text:#c8c8e0 muted:#44445a chatBg:#0d0d16 inputBg:#13131f
- Purple: bg:#1a0a2e sidebar:#2a1040 panel:#1e1030 border:#4a2060 accent:#a855f7 accentDim:#a855f720 text:#e8d8ff muted:#8060a0 chatBg:#160824 inputBg:#200a34
- Green: bg:#0a1a12 sidebar:#0d2018 panel:#102418 border:#1a4028 accent:#10b981 accentDim:#10b98120 text:#d0f0e0 muted:#406050 chatBg:#081410 inputBg:#0a1a10
- Orange: bg:#1a0f00 sidebar:#2a1800 panel:#1e1200 border:#4a2800 accent:#f97316 accentDim:#f9731620 text:#ffe8d0 muted:#806040 chatBg:#140a00 inputBg:#1a0f00
- Light blue: bg:#e8f0fe sidebar:#c8d8f8 panel:#dce8ff border:#a0b8e8 accent:#4a6ef5 accentDim:#4a6ef520 text:#1a2a4a muted:#6080b0 chatBg:#f0f5ff inputBg:#ffffff
Be concise and friendly.`;
    try {
      const data = await callAPI(ADMIN_SYS, [...adminMsgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:p}]);
      const reply = data.content?.map(b=>b.text||"").join("")||"No response.";
      const theme = extractTheme(reply);
      const displayReply = reply.replace(/```json[\s\S]*?```/gi,"").trim();
      setAdminMsgs(m=>[...m,{role:"assistant",content:displayReply||"Theme updated!"}]);
      if(theme && theme.bg) {
        setC(prev=>({...prev,...theme}));
        setAdminMsgs(m=>[...m,{role:"assistant",content:"✅ Theme applied live across the whole IDE!"}]);
      }
      setCalls(c=>c+1); setTokens(t=>t+(data.usage?.input_tokens||0)+(data.usage?.output_tokens||0));
    } catch(e){ setAdminMsgs(m=>[...m,{role:"assistant",content:`⚠️ ${e.message}`}]); }
    setAdminLoading(false);
    setTimeout(()=>adminRef.current?.focus(),100);
  };

  const handleKey = (e)=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} };
  const handleAdminKey = (e)=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAdmin();} };
  const handleHomeKey = (e)=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();startBuilding(homeInput);} };

  const login = () => {
    if(lu===ADMIN_USER&&lp===ADMIN_PASS){ setAuthed(true); setIsAdmin(true); setCurrentUser("Admin"); setLe(""); return; }
    if(USER_STORE[lu] && USER_STORE[lu]===lp){ setAuthed(true); setIsAdmin(false); setCurrentUser(lu); setLe(""); return; }
    setLe("Invalid username or password");
  };

  const signup = () => {
    setSErr(""); setSOk("");
    if(!su.trim()||!se.trim()||!sp.trim()){ setSErr("All fields are required"); return; }
    if(sp!==sp2){ setSErr("Passwords don't match"); return; }
    if(sp.length < 6){ setSErr("Password must be at least 6 characters"); return; }
    if(su===ADMIN_USER){ setSErr("That username is taken"); return; }
    if(USER_STORE[su]){ setSErr("Username already exists"); return; }
    USER_STORE[su] = sp;
    setSOk("Account created! You can now sign in.");
    setAuthPage("signin");
    setLu(su); setLp("");
  };

  // ── AUTH PAGES ─────────────────────────────────────────────────
  if(!authed) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#06061a,#0e0830,#0a0a20)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",padding:16}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:52,marginBottom:8}}>⚡</div>
          <div style={{fontSize:30,fontWeight:900,background:"linear-gradient(90deg,#7c6dfa,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>FORGE IDE</div>
          <div style={{fontSize:11,color:"#5050a0",letterSpacing:4,marginTop:4}}>AI-POWERED CODE STUDIO</div>
        </div>

        {/* Tab toggle */}
        <div style={{display:"flex",background:"#0a0a1a",border:"1px solid #2a2a4a",borderRadius:8,padding:4,marginBottom:20}}>
          {[["signin","Sign In"],["signup","Sign Up"]].map(([id,label])=>(
            <button key={id} onClick={()=>{setAuthPage(id);setLe("");setSErr("");setSOk("");}}
              style={{flex:1,padding:"8px 0",fontFamily:"monospace",fontSize:12,fontWeight:700,cursor:"pointer",borderRadius:6,border:"none",background:authPage===id?"linear-gradient(90deg,#7c6dfa,#a855f7)":"transparent",color:authPage===id?"#fff":"#5050a0",letterSpacing:1,transition:"all 0.2s"}}>
              {label}
            </button>
          ))}
        </div>

        <div style={{background:"#111128",border:"1px solid #2a2a4a",padding:28,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>

          {authPage==="signin" && <>
            <div style={{fontSize:10,color:"#4040a0",letterSpacing:4,marginBottom:18}}>SIGN IN TO FORGE</div>
            {sOk&&<div style={{color:"#4ade80",fontSize:12,marginBottom:12,padding:"8px 12px",background:"#0a1a0a",border:"1px solid #4ade80",borderRadius:6}}>{sOk}</div>}
            {[["USERNAME",lu,setLu,"text"],["PASSWORD",lp,setLp,"password"]].map(([label,val,set,type])=>(
              <div key={label} style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"#5050a0",marginBottom:5,letterSpacing:2}}>{label}</div>
                <input value={val} onChange={e=>set(e.target.value)} type={type} onKeyDown={e=>e.key==="Enter"&&login()}
                  style={{width:"100%",boxSizing:"border-box",background:"#0a0a1a",border:"1px solid #2a2a4a",color:"#c8c8e0",padding:"11px 13px",fontFamily:"monospace",fontSize:14,outline:"none",borderRadius:6}}/>
              </div>
            ))}
            {le&&<div style={{color:"#f87171",fontSize:12,marginBottom:10}}>{le}</div>}
            <button onClick={login} style={{width:"100%",background:"linear-gradient(90deg,#7c6dfa,#a855f7)",border:"none",color:"#fff",padding:13,fontFamily:"monospace",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,borderRadius:6,marginTop:4}}>
              SIGN IN →
            </button>
            <div style={{marginTop:14,textAlign:"center",fontSize:11,color:"#4040a0"}}>
              Don't have an account?{" "}
              <span onClick={()=>setAuthPage("signup")} style={{color:"#7c6dfa",cursor:"pointer",textDecoration:"underline"}}>Sign up free</span>
            </div>
          </>}

          {authPage==="signup" && <>
            <div style={{fontSize:10,color:"#4040a0",letterSpacing:4,marginBottom:18}}>CREATE YOUR ACCOUNT</div>
            {[["USERNAME",su,setSu,"text"],["EMAIL",se,setSe,"email"],["PASSWORD",sp,setSp,"password"],["CONFIRM PASSWORD",sp2,setSp2,"password"]].map(([label,val,set,type])=>(
              <div key={label} style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"#5050a0",marginBottom:5,letterSpacing:2}}>{label}</div>
                <input value={val} onChange={e=>set(e.target.value)} type={type} onKeyDown={e=>e.key==="Enter"&&signup()}
                  style={{width:"100%",boxSizing:"border-box",background:"#0a0a1a",border:"1px solid #2a2a4a",color:"#c8c8e0",padding:"11px 13px",fontFamily:"monospace",fontSize:14,outline:"none",borderRadius:6}}/>
              </div>
            ))}
            {sErr&&<div style={{color:"#f87171",fontSize:12,marginBottom:10}}>{sErr}</div>}
            <button onClick={signup} style={{width:"100%",background:"linear-gradient(90deg,#7c6dfa,#a855f7)",border:"none",color:"#fff",padding:13,fontFamily:"monospace",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,borderRadius:6,marginTop:4}}>
              CREATE ACCOUNT →
            </button>
            <div style={{marginTop:14,textAlign:"center",fontSize:11,color:"#4040a0"}}>
              Already have an account?{" "}
              <span onClick={()=>setAuthPage("signin")} style={{color:"#7c6dfa",cursor:"pointer",textDecoration:"underline"}}>Sign in</span>
            </div>
          </>}

        </div>
      </div>
      <style>{`input:focus{border-color:#7c6dfa!important;}`}</style>
    </div>
  );

  // ── UPGRADE MODAL ──────────────────────────────────────────────
  const UpgradeModal = () => showUpgrade && (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,fontFamily:"monospace"}}>
      <div style={{background:C.panel,border:`2px solid ${C.accent}`,borderRadius:12,padding:36,maxWidth:380,width:"90%",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>⚡</div>
        <div style={{fontSize:22,fontWeight:900,color:C.accent,marginBottom:6}}>Free limit reached!</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:24,lineHeight:1.7}}>You've used all <strong style={{color:C.text}}>{FREE_CREDIT_LIMIT.toLocaleString()} free credits</strong>.<br/>Upgrade to <strong style={{color:C.accent}}>Forge Pro</strong> for unlimited builds.</div>
        <div style={{background:C.accentDim,border:`1px solid ${C.accent}`,borderRadius:8,padding:"18px 20px",marginBottom:20}}>
          <div style={{fontSize:32,fontWeight:900,color:C.accent}}>{PRO_PRICE}</div>
          <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginTop:4}}>PER MONTH</div>
          <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6,textAlign:"left"}}>
            {["✓ Unlimited AI builds","✓ All app types & games","✓ Priority generation","✓ Full history access"].map(f=>(
              <div key={f} style={{fontSize:12,color:C.text}}>{f}</div>
            ))}
          </div>
        </div>
        <button style={{width:"100%",background:C.accent,border:"none",color:"#fff",padding:"13px 0",fontFamily:"monospace",fontSize:15,fontWeight:900,cursor:"pointer",borderRadius:6,letterSpacing:2,marginBottom:10}}>UPGRADE TO PRO →</button>
        <button onClick={()=>setShowUpgrade(false)} style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"10px 0",fontFamily:"monospace",fontSize:12,cursor:"pointer",borderRadius:6}}>Maybe later</button>
      </div>
    </div>
  );

  // Shared nav buttons
  const NavBar = ({extra}) => (
    <div style={{height:52,display:"flex",alignItems:"center",padding:"0 22px",borderBottom:"1px solid #1a1a3a",background:"rgba(0,0,0,0.3)",flexShrink:0,gap:10}}>
      <button onClick={()=>setView("home")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7,padding:0}}>
        <span style={{fontSize:22}}>⚡</span>
        <span style={{fontWeight:900,fontSize:16,background:"linear-gradient(90deg,#7c6dfa,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>FORGE</span>
      </button>
      <div style={{flex:1}}/>
      {extra}
      {isAdmin&&<span style={{fontSize:9,color:"#4ade80",background:"#0a1a0a",border:"1px solid #4ade80",padding:"3px 8px",borderRadius:3}}>∞ ADMIN</span>}
      <span style={{fontSize:10,color:"#5050a0"}}>👤 {currentUser}</span>
      <button onClick={()=>setView("ide")} style={{background:"#7c6dfa20",border:"1px solid #7c6dfa",color:"#7c6dfa",padding:"6px 14px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:6}}>IDE</button>
      <button onClick={()=>setView("admin")} style={{background:"transparent",border:"1px solid #2a2a4a",color:"#6060a0",padding:"6px 12px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:6}}>⚙</button>
      <button onClick={()=>{setAuthed(false);setCurrentUser("");setIsAdmin(false);}} style={{background:"transparent",border:"1px solid #2a2a4a",color:"#6060a0",padding:"6px 10px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:6}}>Out</button>
    </div>
  );

  // ── HOMEPAGE ───────────────────────────────────────────────────
  if(view==="home") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#06061a,#0e0830,#0a0a20)",fontFamily:"monospace",color:"#e0e0ff",display:"flex",flexDirection:"column"}}>
      <NavBar/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,#7c6dfa,#a855f7)",boxShadow:"0 0 60px #7c6dfa80,0 0 120px #a855f740",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:32}}>⚡</div>
        <h1 style={{fontSize:"clamp(2rem,5vw,3.2rem)",fontWeight:900,lineHeight:1.15,marginBottom:14,letterSpacing:-1}}>
          <span style={{background:"linear-gradient(90deg,#ffffff,#c8c8ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Forge is your</span>
          <br/>
          <span style={{background:"linear-gradient(90deg,#7c6dfa,#a855f7,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>co-AI assistant</span>
        </h1>
        <p style={{fontSize:"clamp(0.9rem,2vw,1.1rem)",color:"#7070b0",maxWidth:500,lineHeight:1.8,marginBottom:40}}>
          Start typing your prompt and watch your idea come to life —<br/>games, apps, tools, built in seconds.
        </p>
        <div style={{width:"100%",maxWidth:620,background:"#0d0d24",border:"2px solid #3a2a6a",borderRadius:16,padding:4,boxShadow:"0 0 40px #7c6dfa30",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,padding:"10px 10px 10px 18px"}}>
            <textarea value={homeInput} onChange={e=>setHomeInput(e.target.value)} onKeyDown={handleHomeKey}
              placeholder={typed.length ? typed : "What do you want to build?"} rows={2}
              style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e0e0ff",fontFamily:"monospace",fontSize:15,resize:"none",lineHeight:1.5,padding:"4px 0"}}/>
            <button onClick={()=>startBuilding(homeInput)}
              style={{background:homeInput.trim()?"linear-gradient(90deg,#7c6dfa,#a855f7)":"#1a1a3a",border:"none",color:homeInput.trim()?"#fff":"#3a3a6a",padding:"12px 22px",fontFamily:"monospace",fontSize:13,fontWeight:900,cursor:homeInput.trim()?"pointer":"default",borderRadius:10,flexShrink:0,letterSpacing:1}}>
              BUILD ⚡
            </button>
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",maxWidth:580,marginBottom:48}}>
          {EXAMPLES.map(p=>(
            <button key={p} onClick={()=>startBuilding(p)} style={{background:"#0d0d24",border:"1px solid #2a2a4a",color:"#7070b0",padding:"6px 14px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:20}}>
              {p}
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
          {[["⚡","Instant builds"],["🎮","Full games"],["🎨","Beautiful UI"],["🔄","Live preview"],["🤖","Claude Sonnet 4"]].map(([icon,label])=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:6,background:"#0d0d24",border:"1px solid #1a1a3a",padding:"8px 16px",borderRadius:20,fontSize:12,color:"#5050a0"}}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`textarea::placeholder{color:#3a3a6a}button:hover{opacity:0.85}`}</style>
    </div>
  );

  // ── ADMIN ──────────────────────────────────────────────────────
  if(view==="admin") return (
    <div style={{height:"100vh",background:C.bg,fontFamily:"monospace",color:C.text,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{height:48,background:C.sidebar,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 18px",gap:12,flexShrink:0}}>
        <button onClick={()=>setView("home")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:0}}>
          <span style={{fontSize:18}}>⚡</span>
          <span style={{fontWeight:900,fontSize:14,color:C.accent}}>FORGE</span>
        </button>
        <span style={{color:C.muted,fontSize:12}}>/ Admin</span>
        <div style={{flex:1}}/>
        <span style={{fontSize:10,color:C.muted}}>👤 {currentUser}</span>
        <button onClick={()=>setView("home")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"5px 12px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:4}}>🏠 Home</button>
        <button onClick={()=>setView("ide")} style={{background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,padding:"5px 14px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:4}}>← IDE</button>
        <button onClick={()=>{setAuthed(false);setCurrentUser("");setIsAdmin(false);}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"5px 10px",fontFamily:"monospace",fontSize:11,cursor:"pointer",borderRadius:4}}>LOG OUT</button>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{width:200,background:C.sidebar,borderRight:`1px solid ${C.border}`,padding:"14px 10px",flexShrink:0}}>
          {[{id:"dashboard",label:"📊 Dashboard"},{id:"claude",label:"🤖 Live AI",badge:true},{id:"history",label:"📋 History"},{id:"settings",label:"⚙️ Settings"}].map(t=>(
            <div key={t.id} onClick={()=>setAdminTab(t.id)} style={{padding:"9px 12px",marginBottom:4,cursor:"pointer",borderRadius:4,background:adminTab===t.id?C.accentDim:"transparent",border:`1px solid ${adminTab===t.id?C.accent:"transparent"}`,color:adminTab===t.id?C.accent:C.muted,fontSize:12,display:"flex",alignItems:"center",gap:8}}>
              {t.label}
              {t.badge&&<span style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:C.green,boxShadow:`0 0 4px ${C.green}`}}/>}
            </div>
          ))}
          <div style={{marginTop:16,padding:"10px 12px",background:C.accentDim,border:`1px solid ${C.accent}`,borderRadius:6,fontSize:10,color:C.accent}}>
            <div style={{fontWeight:900,marginBottom:6}}>AI CAN CHANGE:</div>
            <div style={{color:C.muted,lineHeight:1.8}}>• Theme colours<br/>• Dark/light mode<br/>• Accent colour<br/>• Background</div>
          </div>
        </div>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {adminTab==="dashboard"&&(
            <div style={{flex:1,overflowY:"auto",padding:"22px 26px"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.accent,marginBottom:20}}>Dashboard</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:24}}>
                {[["⚡","API Calls",calls],["🧠","Tokens",tokens.toLocaleString()],["🔨","Builds",history.length]].map(([icon,label,val])=>(
                  <div key={label} style={{background:C.panel,border:`1px solid ${C.border}`,padding:"18px 16px",borderRadius:8}}>
                    <div style={{fontSize:26,marginBottom:8}}>{icon}</div>
                    <div style={{fontSize:26,fontWeight:900,color:C.accent}}>{val}</div>
                    <div style={{fontSize:10,color:C.muted,letterSpacing:2,marginTop:4}}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:20,borderRadius:8}}>
                <div style={{fontSize:11,color:C.muted,letterSpacing:3,marginBottom:12}}>RECENT BUILDS</div>
                {history.slice(0,8).map(h=>(
                  <div key={h.id} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:12,display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:C.accent,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.prompt}</span>
                    <span style={{color:C.muted,fontSize:11,marginLeft:10,flexShrink:0}}>{h.time}</span>
                  </div>
                ))}
                {history.length===0&&<div style={{color:C.muted}}>No builds yet!</div>}
              </div>
            </div>
          )}
          {adminTab==="claude"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.chatBg}}>
              <div style={{background:C.sidebar,borderBottom:`1px solid ${C.border}`,padding:"12px 20px",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`}}/>
                  <div style={{fontWeight:700,color:C.green,fontSize:13}}>Claude Sonnet 4 — Live Admin AI</div>
                </div>
                <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Ask me to change any colour or theme — it updates instantly!</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {AQUICK.map(q=>(
                    <button key={q} onClick={()=>{setAdminInput(q);adminRef.current?.focus();}}
                      style={{background:C.panel,border:`1px solid ${C.border}`,color:C.muted,padding:"4px 10px",fontFamily:"monospace",fontSize:10,cursor:"pointer",borderRadius:4}}>{q}</button>
                  ))}
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 20px",display:"flex",flexDirection:"column",gap:10}}>
                {adminMsgs.map((msg,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
                    {msg.role==="assistant"&&<div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:3}}>CLAUDE AI</div>}
                    <div style={{maxWidth:"85%",background:msg.role==="user"?C.accent:C.panel,border:`1px solid ${msg.role==="user"?C.accent:C.border}`,padding:"10px 14px",fontSize:13,lineHeight:1.7,color:msg.role==="user"?"#fff":C.text,whiteSpace:"pre-wrap",wordBreak:"break-word",borderRadius:8}}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {adminLoading&&(
                  <div style={{alignSelf:"flex-start"}}>
                    <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",gap:5,alignItems:"center",borderRadius:8}}>
                      {[0,1,2].map(d=><div key={d} style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:`bounce 1s ${d*0.2}s infinite`}}/>)}
                      <span style={{fontSize:11,color:C.muted,marginLeft:8}}>Applying changes...</span>
                    </div>
                  </div>
                )}
                <div ref={adminEnd}/>
              </div>
              <div style={{padding:"10px 20px 16px",background:C.sidebar,borderTop:`1px solid ${C.border}`,flexShrink:0}}>
                <div style={{background:C.inputBg,border:`2px solid ${adminInput.trim()?C.accent:C.border}`,borderRadius:8}}>
                  <textarea ref={adminRef} value={adminInput} onChange={e=>setAdminInput(e.target.value)} onKeyDown={handleAdminKey}
                    placeholder="e.g. Change theme to dark purple..." rows={2}
                    style={{width:"100%",boxSizing:"border-box",background:"transparent",border:"none",outline:"none",color:C.text,fontFamily:"monospace",fontSize:13,padding:"10px 13px 6px",resize:"none",lineHeight:1.5,display:"block"}}/>
                  <div style={{display:"flex",alignItems:"center",padding:"6px 10px",borderTop:`1px solid ${C.border}`,gap:8}}>
                    <span style={{fontSize:9,color:C.muted,flex:1}}>⏎ send</span>
                    <button onClick={sendAdmin} disabled={adminLoading||!adminInput.trim()}
                      style={{background:adminInput.trim()&&!adminLoading?C.accent:C.panel,border:`1px solid ${adminInput.trim()&&!adminLoading?C.accent:C.border}`,color:adminInput.trim()&&!adminLoading?"#fff":C.muted,padding:"8px 18px",fontFamily:"monospace",fontSize:12,fontWeight:900,cursor:adminLoading||!adminInput.trim()?"not-allowed":"pointer",borderRadius:6,letterSpacing:1}}>
                      {adminLoading?"THINKING...":"APPLY →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {adminTab==="history"&&(
            <div style={{flex:1,overflowY:"auto",padding:"22px 26px"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.accent,marginBottom:20}}>Build History</div>
              {history.length===0&&<div style={{color:C.muted}}>No builds yet!</div>}
              {history.map(h=>(
                <div key={h.id} style={{background:C.panel,border:`1px solid ${C.border}`,padding:"12px 16px",marginBottom:6,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:C.accent,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.prompt}</span>
                  <span style={{color:C.muted,fontSize:11,marginLeft:10,flexShrink:0}}>{h.time}</span>
                </div>
              ))}
            </div>
          )}
          {adminTab==="settings"&&(
            <div style={{flex:1,overflowY:"auto",padding:"22px 26px"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.accent,marginBottom:20}}>Settings</div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:20,borderRadius:8,marginBottom:16}}>
                {[["Model",MODEL],["Admin User",ADMIN_USER],["API Route","/api/chat"],["Version","Forge v8"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:13,color:C.muted}}>{k}</span>
                    <span style={{fontSize:13,color:C.accent}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:20,borderRadius:8}}>
                <div style={{fontSize:11,color:C.muted,letterSpacing:3,marginBottom:12}}>RESET THEME</div>
                <button onClick={()=>setC(DEFAULT_THEME)} style={{background:C.accent,border:"none",color:"#fff",padding:"10px 20px",fontFamily:"monospace",fontSize:12,cursor:"pointer",borderRadius:6,fontWeight:900}}>Reset to Default</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  );

  // ── MAIN IDE ───────────────────────────────────────────────────
  return (
    <div style={{height:"100vh",background:C.bg,fontFamily:"monospace",color:C.text,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <UpgradeModal/>
      {/* TOP BAR */}
      <div style={{height:44,background:C.sidebar,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 14px",gap:10,flexShrink:0}}>
        <button onClick={()=>setView("home")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:0}}>
          <span style={{fontSize:20}}>⚡</span>
          <span style={{fontWeight:900,fontSize:16,color:C.accent}}>FORGE</span>
        </button>
        <div style={{width:6,height:6,borderRadius:"50%",background:C.green,boxShadow:`0 0 4px ${C.green}`,marginLeft:2}}/>
        <span style={{fontSize:10,color:C.muted}}>AI READY</span>
        <div style={{flex:1}}/>
        {history.length>0&&<span style={{fontSize:10,color:C.muted,display:"none"}}>Last: {history[0]?.prompt?.slice(0,20)}...</span>}
        {!isAdmin&&(
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.panel,border:`1px solid ${C.border}`,borderRadius:4,padding:"4px 10px"}}>
            <div style={{width:60,height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${Math.min(100,(tokens/FREE_CREDIT_LIMIT)*100)}%`,height:"100%",background:tokens>=FREE_CREDIT_LIMIT?C.red:C.accent,borderRadius:3,transition:"width 0.3s"}}/>
            </div>
            <span style={{fontSize:9,color:tokens>=FREE_CREDIT_LIMIT?C.red:C.muted}}>{tokens.toLocaleString()}/{FREE_CREDIT_LIMIT.toLocaleString()}</span>
          </div>
        )}
        {isAdmin&&<span style={{fontSize:9,color:C.green,background:C.chatBg,border:`1px solid ${C.green}`,padding:"3px 8px",borderRadius:3}}>∞ ADMIN</span>}
        <span style={{fontSize:10,color:C.muted}}>👤 {currentUser}</span>
        <button onClick={()=>setView("home")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"5px 10px",fontFamily:"monospace",fontSize:10,cursor:"pointer",borderRadius:3}}>🏠</button>
        <button onClick={()=>setView("admin")} style={{background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,padding:"5px 14px",fontFamily:"monospace",fontSize:10,cursor:"pointer",fontWeight:700,borderRadius:3}}>⚙ ADMIN</button>
        <button onClick={()=>{setAuthed(false);setCurrentUser("");setIsAdmin(false);}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"5px 10px",fontFamily:"monospace",fontSize:10,cursor:"pointer",borderRadius:3}}>LOG OUT</button>
      </div>

      {/* SIDE BY SIDE */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        {/* LEFT — PREVIEW */}
        <div style={{width:"60%",display:"flex",flexDirection:"column",borderRight:`1px solid ${C.border}`}}>
          <div style={{height:32,background:C.panel,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 14px",gap:8,flexShrink:0}}>
            <div style={{display:"flex",gap:5}}>{["#ff5f57","#ffbd2e","#28c840"].map(c=><div key={c} style={{width:9,height:9,borderRadius:"50%",background:c}}/>)}</div>
            <span style={{fontSize:10,color:C.muted,marginLeft:4,letterSpacing:2}}>LIVE PREVIEW</span>
            {loading&&<span style={{fontSize:10,color:C.accent,marginLeft:"auto"}}>⚡ Building...</span>}
          </div>
          <iframe key={previewKey} srcDoc={previewHtml} style={{flex:1,border:"none",background:"#fff",width:"100%"}} sandbox="allow-scripts allow-forms allow-modals allow-same-origin" title="preview"/>
        </div>

        {/* RIGHT — CHAT */}
        <div style={{width:"40%",display:"flex",flexDirection:"column",overflow:"hidden",background:C.chatBg}}>
          <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,background:C.sidebar,display:"flex",flexWrap:"wrap",gap:4,flexShrink:0}}>
            {QUICK.map(p=>(
              <button key={p} onClick={()=>{setInput(`Build a ${p}`);setTimeout(()=>inputRef.current?.focus(),50);}}
                style={{background:C.inputBg,border:`1px solid ${C.border}`,color:C.muted,padding:"3px 10px",fontFamily:"monospace",fontSize:10,cursor:"pointer",borderRadius:3}}>{p}</button>
            ))}
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
            {msgs.map((msg,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"88%",background:msg.role==="user"?C.accent:C.panel,border:`1px solid ${msg.role==="user"?C.accent:C.border}`,padding:"8px 12px",fontSize:13,lineHeight:1.55,color:msg.role==="user"?"#fff":C.text,borderRadius:8}}>
                  <span style={{whiteSpace:"pre-wrap"}}>{msg.content}</span>
                  {msg.bullets && msg.bullets.length>0 && (
                    <div style={{marginTop:8,padding:"8px 10px",background:C.chatBg,border:`1px solid ${C.green}`,borderRadius:6}}>
                      <div style={{fontSize:10,color:C.green,letterSpacing:2,marginBottom:6}}>BUILT</div>
                      {msg.bullets.map((b,j)=>(
                        <div key={j} style={{fontSize:11,color:C.text,marginBottom:3,display:"flex",gap:6}}>
                          <span style={{color:C.green}}>✓</span><span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.hasCode&&!msg.bullets?.length&&(
                    <div style={{marginTop:6,padding:"4px 8px",background:C.chatBg,border:`1px solid ${C.green}`,color:C.green,fontSize:11,borderRadius:3}}>✓ Preview updated — look left!</div>
                  )}
                </div>
              </div>
            ))}

            {/* Live build steps */}
            {loading && buildSteps.length>0 && (
              <div style={{alignSelf:"flex-start"}}>
                <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:"10px 14px",borderRadius:8,minWidth:200}}>
                  <div style={{fontSize:10,color:C.accent,letterSpacing:2,marginBottom:8}}>⚡ BUILDING</div>
                  {buildSteps.map((step,i)=>(
                    <div key={i} style={{fontSize:11,color:i===buildSteps.length-1?C.text:C.muted,marginBottom:4,display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{color:i===buildSteps.length-1?C.accent:C.green}}>{i===buildSteps.length-1?"▶":"✓"}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",gap:4,marginTop:8}}>
                    {[0,1,2].map(d=><div key={d} style={{width:5,height:5,borderRadius:"50%",background:C.accent,animation:`bounce 1s ${d*0.2}s infinite`}}/>)}
                  </div>
                </div>
              </div>
            )}

            {loading && buildSteps.length===0 && (
              <div style={{alignSelf:"flex-start"}}>
                <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",gap:5,alignItems:"center",borderRadius:8}}>
                  {[0,1,2].map(d=><div key={d} style={{width:5,height:5,borderRadius:"50%",background:C.accent,animation:`bounce 1s ${d*0.2}s infinite`}}/>)}
                  <span style={{fontSize:11,color:C.muted,marginLeft:6}}>Starting...</span>
                </div>
              </div>
            )}
            <div ref={chatEnd}/>
          </div>

          <div style={{padding:"8px 12px 10px",borderTop:`1px solid ${C.border}`,background:C.sidebar,flexShrink:0}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <div style={{flex:1,background:C.inputBg,border:`2px solid ${input.trim()?C.accent:C.border}`,borderRadius:8,transition:"border-color 0.2s"}}>
                <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Describe what to build..." rows={2}
                  style={{width:"100%",boxSizing:"border-box",background:"transparent",border:"none",outline:"none",color:C.text,fontFamily:"monospace",fontSize:13,padding:"10px 12px",resize:"none",lineHeight:1.5,display:"block"}}/>
              </div>
              <button onClick={send} disabled={loading||!input.trim()}
                style={{background:input.trim()&&!loading?C.accent:C.panel,border:`2px solid ${input.trim()&&!loading?C.accent:C.border}`,color:input.trim()&&!loading?"#fff":C.muted,padding:"10px 20px",fontFamily:"monospace",fontSize:14,fontWeight:900,cursor:loading||!input.trim()?"not-allowed":"pointer",letterSpacing:1,display:"flex",alignItems:"center",gap:6,borderRadius:8,transition:"all 0.15s",flexShrink:0,height:58}}>
                {loading?<span style={{fontSize:18}}>⏳</span>:<><span style={{fontSize:18}}>⚡</span>SEND</>}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-5px);opacity:1}}
        *{scrollbar-width:thin;scrollbar-color:${C.border} transparent}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        textarea::placeholder{color:${C.muted}80}
        button:hover:not(:disabled){opacity:0.85}
      `}</style>
    </div>
  );
}
