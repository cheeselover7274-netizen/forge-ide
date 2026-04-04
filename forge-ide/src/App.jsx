import { useState, useRef, useEffect } from "react";

// ── CONFIG ─────────────────────────────────────────────────────────────────
const ADMIN_USER = "admin";
const ADMIN_PASS = "forge2024";
const MODEL = "claude-sonnet-4-20250514";
const API = "/api/chat"; // Vercel serverless function — key stays server-side

// ── SYSTEM PROMPTS ─────────────────────────────────────────────────────────
const FORGE_SYSTEM = `You are Forge, a world-class AI software engineer inside a browser IDE. You can build ANYTHING a developer can build. You have mastery of every language, framework, and pattern.

WHAT YOU CAN BUILD:
• Full-stack web apps (React, Vue, Svelte, Vanilla JS)
• Landing pages, portfolios, SaaS homepages
• Dashboards with charts, tables, analytics
• Games (snake, tetris, chess, card games, platformers)
• Tools (calculators, converters, timers, generators)
• E-commerce UIs, admin panels, CRMs, kanban boards
• APIs and backend logic (Node.js, Express, FastAPI)
• CLI tools and scripts (Python, Bash, Node)
• Auth UIs, data visualizations, chat interfaces
• Chrome extensions, README files, documentation
• Algorithms, data structures, unit tests
• Regex, SQL queries, CSS animations
• Anything else — just ask

OUTPUT RULES:
1. COMPLETE CODE ONLY — no placeholders, no truncation
2. Single self-contained file unless specified otherwise
3. HTML/JS apps: one .html file with inline style + script
4. React: one JSX component, default export, hooks only
5. Beautiful code — proper indentation, meaningful names
6. Gorgeous styling — dark themes by default
7. Actually WORK — test logic before outputting
8. After code block: 1-2 sentences on what you built

FORMAT:
\`\`\`html
YOUR COMPLETE CODE
\`\`\`
Then explanation.

Use correct fence: html, jsx, js, python, css, sql, bash, etc.

CONVERSATION:
• EDIT/FIX: output FULL updated file
• ADD feature: integrate into full existing code
• HOW question: explain then offer to build
• General question: answer directly, no code block
• Ambiguous: make best assumption, build it, note assumption`;

// ── HELPERS ────────────────────────────────────────────────────────────────
const extractCode = (text) => {
  const m = text.match(/```(?:html|jsx?|tsx?|css|python|py|bash|sh|sql|[a-z]*)?\n([\s\S]*?)```/i);
  return m ? m[1].trim() : null;
};
const extractLang = (text) => {
  const m = text.match(/```([a-z]*)/i);
  return m && m[1] ? m[1] : "html";
};
const fileIcon = (name = "") => {
  if (name.endsWith(".html")) return "🌐";
  if (name.endsWith(".css")) return "🎨";
  if (name.endsWith(".jsx") || name.endsWith(".tsx")) return "⚛";
  if (name.endsWith(".js") || name.endsWith(".ts")) return "📜";
  if (name.endsWith(".py")) return "🐍";
  if (name.endsWith(".md")) return "📝";
  if (name.endsWith(".sql")) return "🗄";
  if (name.endsWith(".sh")) return "💻";
  return "📄";
};

const EXT_MAP = {
  html: "index.html", jsx: "App.jsx", js: "app.js",
  css: "style.css", python: "main.py", py: "main.py",
  sql: "query.sql", bash: "script.sh", sh: "script.sh",
};

const STARTER = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Forge App</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      min-height:100vh; display:flex;
      align-items:center; justify-content:center;
      background:linear-gradient(135deg,#0d0d0d,#0a0a14);
      font-family:'Courier New',monospace; color:#e0e0e0;
    }
    .card {
      text-align:center; padding:56px 48px;
      border:1px solid #1e1e2e;
      background:rgba(124,109,250,0.05);
    }
    h1 { font-size:2.2rem; color:#7c6dfa; margin-bottom:12px; letter-spacing:-1px; }
    p { color:#555; line-height:1.6; }
    .hint { margin-top:24px; font-size:.8rem; color:#333; border-top:1px solid #1e1e2e; padding-top:20px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:48px;margin-bottom:20px">⚡</div>
    <h1>Forge IDE</h1>
    <p>Your AI coding partner is ready.<br/>Describe what you want to build.</p>
    <div class="hint">Try: "Build a todo app" · "Make a snake game" · "Create a SaaS landing page"</div>
  </div>
</body>
</html>`;

const QUICK = [
  "Snake game","Todo app","Calculator","Landing page",
  "Kanban board","Login UI","Dashboard","Chat app UI",
  "Pomodoro timer","Color tool",
];

const ADMIN_QUICK = [
  "Review all files for bugs",
  "Suggest 5 new IDE features",
  "How does the send function work?",
  "How can I improve performance?",
  "Add syntax highlighting",
  "Summarize generation history",
];

// ── COLORS ─────────────────────────────────────────────────────────────────
const C = {
  bg:"#0b0b0f", sidebar:"#0e0e16", panel:"#111118", border:"#1c1c2e",
  accent:"#7c6dfa", accentDim:"#7c6dfa18", green:"#4ade80",
  text:"#c8c8e0", muted:"#44445a", chatBg:"#0d0d16",
  inputBg:"#13131f", red:"#f87171",
};

// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  // Auth
  const [authed, setAuthed]       = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr]   = useState("");

  // View
  const [view, setView]         = useState("ide"); // ide | admin
  const [adminTab, setAdminTab] = useState("dashboard");
  const [paneMode, setPaneMode] = useState("split");

  // Files
  const [files, setFiles]           = useState([{ id:1, name:"index.html", content:STARTER }]);
  const [activeFileId, setActiveFileId] = useState(1);

  // IDE chat
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Hey! I'm Forge ⚡\n\nI can build anything — games, apps, dashboards, landing pages, tools, APIs, scripts, and more.\n\nJust describe what you want, or tap a quick prompt below." }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

  // Admin AI chat
  const [adminMsgs, setAdminMsgs]         = useState([
    { role:"assistant", content:"Hello Admin 👋\n\nI'm Claude Sonnet 4 with full context of your IDE — all files, history, and usage stats.\n\nI can:\n• Review or debug any file\n• Design new Forge features\n• Answer any engineering question\n• Analyse your generation history\n\nWhat do you need?" }
  ]);
  const [adminInput, setAdminInput]       = useState("");
  const [adminLoading, setAdminLoading]   = useState(false);

  // Stats
  const [history, setHistory]         = useState([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCalls, setTotalCalls]   = useState(0);

  // Refs
  const chatEndRef   = useRef(null);
  const inputRef     = useRef(null);
  const adminEndRef  = useRef(null);
  const adminInpRef  = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);
  useEffect(() => { adminEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [adminMsgs, adminLoading]);

  // ── FILE OPS ──────────────────────────────────────────────────────────────
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  const updateContent = (content) =>
    setFiles(fs => fs.map(f => f.id === activeFileId ? { ...f, content } : f));

  const addFile = () => {
    const name = prompt("File name (e.g. style.css, app.js):");
    if (!name) return;
    const id = Date.now();
    setFiles(fs => [...fs, { id, name, content:"" }]);
    setActiveFileId(id);
  };

  const deleteFile = (id) => {
    if (files.length === 1) return;
    const remaining = files.filter(f => f.id !== id);
    setFiles(remaining);
    setActiveFileId(remaining[0].id);
  };

  // ── API CALL ──────────────────────────────────────────────────────────────
  const callAPI = async (system, msgs) => {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ model:MODEL, max_tokens:1000, system, messages:msgs }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  };

  // ── IDE SEND ──────────────────────────────────────────────────────────────
  const send = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput("");
    setMessages(m => [...m, { role:"user", content:prompt }]);
    setLoading(true);

    const apiMsgs = [
      ...messages.map(m => ({ role:m.role, content:m.content })),
      { role:"user", content:`${prompt}\n\n---\nCurrent file: ${activeFile.name}\n\`\`\`\n${activeFile.content.slice(0,1200)}\n\`\`\`` }
    ];

    try {
      const data = await callAPI(FORGE_SYSTEM, apiMsgs);
      const reply = data.content?.map(b => b.text||"").join("") || "No response.";
      const code  = extractCode(reply);
      const lang  = extractLang(reply);

      setMessages(m => [...m, { role:"assistant", content:reply, hasCode:!!code }]);
      const tokens = (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0);
      setTotalCalls(c => c+1);
      setTotalTokens(t => t+tokens);

      if (code) {
        const suggestedName = EXT_MAP[lang] || `output.${lang}`;
        const sameFile = activeFile.name.endsWith(`.${lang}`) ||
          (lang==="html" && activeFile.name.endsWith(".html")) ||
          (lang==="jsx"  && activeFile.name.endsWith(".jsx"));

        if (sameFile) {
          updateContent(code);
        } else {
          const existing = files.find(f => f.name === suggestedName);
          if (existing) {
            setFiles(fs => fs.map(f => f.id===existing.id ? { ...f, content:code } : f));
            setActiveFileId(existing.id);
          } else {
            const id = Date.now();
            setFiles(fs => [...fs, { id, name:suggestedName, content:code }]);
            setActiveFileId(id);
          }
        }
        setHistory(h => [{
          id:Date.now(), prompt, file:activeFile.name,
          time:new Date().toLocaleTimeString(), tokens
        }, ...h].slice(0,100));
      }
    } catch(e) {
      setMessages(m => [...m, { role:"assistant", content:`⚠️ ${e.message}` }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = (e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  // ── ADMIN AI SEND ─────────────────────────────────────────────────────────
  const sendAdmin = async () => {
    const msg = adminInput.trim();
    if (!msg || adminLoading) return;
    setAdminInput("");
    setAdminMsgs(m => [...m, { role:"user", content:msg }]);
    setAdminLoading(true);

    const fileCtx = files.map(f =>
      `FILE: ${f.name}\n\`\`\`\n${f.content.slice(0,800)}${f.content.length>800?"...[truncated]":""}\n\`\`\``
    ).join("\n\n");

    const adminSystem = `You are Claude Sonnet 4, embedded in the private admin panel of Forge IDE. Admin-only access. No restrictions.

LIVE IDE STATE:
• Files: ${files.length} | API Calls: ${totalCalls} | Tokens used: ${totalTokens.toLocaleString()} | Generations: ${history.length}

CURRENT FILES:
${fileCtx}

RECENT GENERATIONS:
${history.slice(0,5).map(h=>`• [${h.time}] "${h.prompt}" → ${h.file} (${h.tokens} tok)`).join("\n")||"None yet"}

Be direct, expert-level. Complete code only when writing code. This is a private admin engineering channel.`;

    const apiMsgs = adminMsgs.map(m => ({ role:m.role, content:m.content })).concat({ role:"user", content:msg });

    try {
      const data = await callAPI(adminSystem, apiMsgs);
      const reply = data.content?.map(b => b.text||"").join("") || "No response.";
      setAdminMsgs(m => [...m, { role:"assistant", content:reply }]);
      setTotalCalls(c => c+1);
      setTotalTokens(t => t+(data.usage?.input_tokens||0)+(data.usage?.output_tokens||0));
    } catch(e) {
      setAdminMsgs(m => [...m, { role:"assistant", content:`⚠️ ${e.message}` }]);
    }
    setAdminLoading(false);
    setTimeout(() => adminInpRef.current?.focus(), 100);
  };

  const handleAdminKey = (e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendAdmin(); } };

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  const previewSrc = (() => {
    const { name, content } = activeFile;
    if (name.endsWith(".html"))
      return `data:text/html;charset=utf-8,${encodeURIComponent(content)}`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(
      `<html><body style="background:#0d0d0d;color:#888;font-family:'Courier New',monospace;padding:24px">
       <div style="color:#7c6dfa;margin-bottom:16px;font-size:13px">⚡ ${name}</div>
       <pre style="color:#a0a0c0;font-size:13px;line-height:1.6;white-space:pre-wrap">${content.replace(/</g,"&lt;")}</pre>
       </body></html>`
    )}`;
  })();

  // ════════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════════
  if (!authed) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:360 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:8 }}>⚡</div>
          <div style={{ fontSize:30, fontWeight:900, color:C.accent, letterSpacing:-1 }}>FORGE IDE</div>
          <div style={{ fontSize:11, color:C.muted, letterSpacing:4, marginTop:6 }}>AI-POWERED CODE STUDIO</div>
        </div>
        <div style={{ background:C.panel, border:`1px solid ${C.border}`, padding:"32px 28px" }}>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:4, marginBottom:24 }}>SIGN IN</div>
          {[
            ["USERNAME", loginUser, setLoginUser, "text"],
            ["PASSWORD", loginPass, setLoginPass, "password"]
          ].map(([label,val,set,type]) => (
            <div key={label} style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, color:C.muted, marginBottom:6, letterSpacing:2 }}>{label}</div>
              <input
                type={type} value={val}
                onChange={e => set(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") {
                  if(loginUser===ADMIN_USER && loginPass===ADMIN_PASS) setAuthed(true);
                  else setLoginErr("Invalid credentials");
                }}}
                style={{ width:"100%", boxSizing:"border-box", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"11px 14px", fontSize:14, outline:"none" }}
              />
            </div>
          ))}
          {loginErr && <div style={{ color:C.red, fontSize:12, marginBottom:12 }}>{loginErr}</div>}
          <button
            onClick={() => {
              if(loginUser===ADMIN_USER && loginPass===ADMIN_PASS) { setAuthed(true); setLoginErr(""); }
              else setLoginErr("Invalid credentials");
            }}
            style={{ width:"100%", background:C.accent, border:"none", color:"#fff", padding:"13px", fontSize:14, fontWeight:900, cursor:"pointer", letterSpacing:2 }}
          >
            LOGIN →
          </button>
          <div style={{ marginTop:20, padding:"12px", background:C.accentDim, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, textAlign:"center", lineHeight:1.8 }}>
            admin &nbsp;/&nbsp; forge2024
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // ADMIN
  // ════════════════════════════════════════════════════════════
  if (view==="admin") return (
    <div style={{ height:"100vh", background:C.bg, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Admin header */}
      <div style={{ height:50, background:C.sidebar, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 24px", gap:20, flexShrink:0 }}>
        <span style={{ color:C.accent, fontWeight:900, fontSize:18 }}>⚡ FORGE</span>
        <span style={{ color:C.muted, fontSize:11, letterSpacing:2 }}>/ ADMIN</span>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:10, color:C.muted }}>{MODEL}</span>
        <button onClick={() => setView("ide")} style={{ background:C.accentDim, border:`1px solid ${C.accent}`, color:C.accent, padding:"6px 18px", fontSize:11, cursor:"pointer", letterSpacing:1 }}>
          ← BACK TO IDE
        </button>
        <button onClick={() => setAuthed(false)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"6px 14px", fontSize:11, cursor:"pointer" }}>
          LOG OUT
        </button>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Admin sidebar */}
        <div style={{ width:210, background:C.sidebar, borderRight:`1px solid ${C.border}`, padding:"20px 12px", flexShrink:0 }}>
          {[
            { id:"dashboard", label:"Dashboard", icon:"📊" },
            { id:"claude",    label:"Claude AI",  icon:"🤖", badge:"ADMIN" },
            { id:"history",   label:"History",    icon:"📋" },
            { id:"files",     label:"Files",      icon:"📁" },
            { id:"settings",  label:"Settings",   icon:"⚙️" },
          ].map(t => (
            <div key={t.id} onClick={() => setAdminTab(t.id)} style={{
              padding:"10px 14px", marginBottom:3, cursor:"pointer",
              background: adminTab===t.id ? (t.id==="claude" ? "#0d1a0d" : C.accentDim) : "transparent",
              border:`1px solid ${adminTab===t.id ? (t.id==="claude" ? C.green : C.accent) : "transparent"}`,
              color: adminTab===t.id ? (t.id==="claude" ? C.green : C.accent) : C.muted,
              fontSize:12, letterSpacing:1,
              display:"flex", alignItems:"center", gap:10,
            }}>
              <span>{t.icon}</span>
              <span style={{ flex:1 }}>{t.label}</span>
              {t.badge && <span style={{ fontSize:8, color:"#2a5a2a", background:"#0a1a0a", padding:"1px 5px", border:"1px solid #1a3a1a" }}>{t.badge}</span>}
              {t.id==="claude" && <span style={{ width:6, height:6, borderRadius:"50%", background:C.green, boxShadow:`0 0 4px ${C.green}`, display:"inline-block" }} />}
            </div>
          ))}
        </div>

        {/* Admin content */}
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

          {/* DASHBOARD */}
          {adminTab==="dashboard" && (
            <div style={{ flex:1, overflowY:"auto", padding:"32px 36px" }}>
              <div style={{ fontSize:22, fontWeight:900, color:C.accent, marginBottom:28 }}>Dashboard</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16, marginBottom:32 }}>
                {[["⚡","API Calls",totalCalls],["🧠","Tokens",totalTokens.toLocaleString()],["📄","Files",files.length],["🔨","Generations",history.length]].map(([icon,label,val]) => (
                  <div key={label} style={{ background:C.panel, border:`1px solid ${C.border}`, padding:"22px 20px" }}>
                    <div style={{ fontSize:26, marginBottom:10 }}>{icon}</div>
                    <div style={{ fontSize:30, fontWeight:900, color:C.accent }}>{val}</div>
                    <div style={{ fontSize:10, color:C.muted, letterSpacing:2, marginTop:4 }}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, padding:24 }}>
                <div style={{ fontSize:11, color:C.muted, letterSpacing:3, marginBottom:16 }}>RECENT GENERATIONS</div>
                {history.slice(0,8).map(h => (
                  <div key={h.id} style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ color:C.accent }}>{fileIcon(h.file)} {h.file}</span>
                      <span style={{ color:C.muted, fontSize:11 }}>{h.time} · {h.tokens} tok</span>
                    </div>
                    <div style={{ color:C.muted, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.prompt}</div>
                  </div>
                ))}
                {history.length===0 && <div style={{ color:C.muted }}>No generations yet.</div>}
              </div>
            </div>
          )}

          {/* CLAUDE ADMIN AI */}
          {adminTab==="claude" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              {/* Header */}
              <div style={{ background:"#080e08", borderBottom:"1px solid #1a2a1a", padding:"14px 28px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:C.green, boxShadow:`0 0 8px ${C.green}` }} />
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.green, letterSpacing:1 }}>Claude Sonnet 4 — Admin AI</div>
                  <div style={{ fontSize:10, color:"#2a5a2a", letterSpacing:2, marginTop:1 }}>PRIVATE · ADMIN ONLY · FULL IDE CONTEXT</div>
                </div>
                <div style={{ marginLeft:"auto", fontSize:10, color:"#1a3a1a" }}>{MODEL}</div>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:"auto", padding:"20px 28px", display:"flex", flexDirection:"column", gap:14, background:"#080e08" }}>
                {adminMsgs.map((msg,i) => (
                  <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:msg.role==="user" ? "flex-end":"flex-start" }}>
                    {msg.role==="assistant" && <div style={{ fontSize:9, color:"#1a4a1a", letterSpacing:2, marginBottom:4 }}>CLAUDE SONNET 4</div>}
                    <div style={{
                      maxWidth:"80%",
                      background: msg.role==="user" ? "#0d2a0d" : "#0a1a0a",
                      border:`1px solid ${msg.role==="user" ? C.green+"50" : "#1a3a1a"}`,
                      padding:"12px 16px", fontSize:13, lineHeight:1.7,
                      color: msg.role==="user" ? C.green : "#8aaa8a",
                      whiteSpace:"pre-wrap", wordBreak:"break-word",
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {adminLoading && (
                  <div style={{ alignSelf:"flex-start" }}>
                    <div style={{ fontSize:9, color:"#1a4a1a", letterSpacing:2, marginBottom:4 }}>CLAUDE SONNET 4</div>
                    <div style={{ background:"#0a1a0a", border:"1px solid #1a3a1a", padding:"12px 18px", display:"flex", gap:5, alignItems:"center" }}>
                      {[0,1,2].map(d => <div key={d} style={{ width:6, height:6, borderRadius:"50%", background:C.green, animation:`bounce 1s ${d*0.2}s infinite` }} />)}
                      <span style={{ fontSize:11, color:"#2a5a2a", marginLeft:8 }}>Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={adminEndRef} />
              </div>

              {/* Quick prompts */}
              <div style={{ background:"#080e08", borderTop:"1px solid #0f1f0f", padding:"10px 28px 0" }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {ADMIN_QUICK.map(p => (
                    <button key={p} onClick={() => { setAdminInput(p); adminInpRef.current?.focus(); }}
                      style={{ background:"transparent", border:"1px solid #1a3a1a", color:"#2a5a2a", padding:"3px 10px", fontSize:9, cursor:"pointer", letterSpacing:0.5 }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin input */}
              <div style={{ padding:"12px 28px 20px", background:"#080e08", borderTop:"1px solid #0f1f0f" }}>
                <div style={{ background:"#0a150a", border:`2px solid ${adminInput.trim() ? C.green : "#1a3a1a"}`, transition:"border-color 0.2s" }}>
                  <textarea
                    ref={adminInpRef}
                    value={adminInput}
                    onChange={e => setAdminInput(e.target.value)}
                    onKeyDown={handleAdminKey}
                    placeholder="Ask Claude anything about your IDE, code, or features..."
                    rows={3}
                    style={{ width:"100%", boxSizing:"border-box", background:"transparent", border:"none", outline:"none", color:C.green, fontSize:13, padding:"12px 14px 8px", resize:"none", lineHeight:1.55 }}
                  />
                  <div style={{ display:"flex", alignItems:"center", padding:"8px 12px", borderTop:"1px solid #1a3a1a", gap:10 }}>
                    <span style={{ fontSize:9, color:"#1a3a1a", flex:1 }}>⏎ send · ⇧⏎ newline</span>
                    <button
                      onClick={sendAdmin}
                      disabled={adminLoading || !adminInput.trim()}
                      style={{
                        background: adminInput.trim() && !adminLoading ? C.green : "#0a150a",
                        border:`2px solid ${adminInput.trim() && !adminLoading ? C.green : "#1a3a1a"}`,
                        color: adminInput.trim() && !adminLoading ? "#000" : "#1a4a1a",
                        padding:"10px 24px", fontSize:13, fontWeight:900,
                        cursor: adminLoading || !adminInput.trim() ? "not-allowed":"pointer",
                        letterSpacing:2, display:"flex", alignItems:"center", gap:8,
                        minWidth:130, justifyContent:"center", transition:"all 0.15s",
                      }}
                    >
                      {adminLoading ? <><span>⏳</span> THINKING</> : <><span>🤖</span> ASK CLAUDE</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {adminTab==="history" && (
            <div style={{ flex:1, overflowY:"auto", padding:"32px 36px" }}>
              <div style={{ fontSize:22, fontWeight:900, color:C.accent, marginBottom:28 }}>Generation History</div>
              {history.length===0 && <div style={{ color:C.muted }}>No generations yet. Start building!</div>}
              {history.map(h => (
                <div key={h.id} style={{ background:C.panel, border:`1px solid ${C.border}`, padding:"16px 20px", marginBottom:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ color:C.accent, fontSize:12 }}>{fileIcon(h.file)} {h.file}</span>
                    <span style={{ color:C.muted, fontSize:11 }}>{h.time} · {h.tokens} tokens</span>
                  </div>
                  <div style={{ fontSize:13, color:C.text }}>{h.prompt}</div>
                </div>
              ))}
            </div>
          )}

          {/* FILES */}
          {adminTab==="files" && (
            <div style={{ flex:1, overflowY:"auto", padding:"32px 36px" }}>
              <div style={{ fontSize:22, fontWeight:900, color:C.accent, marginBottom:28 }}>Files</div>
              {files.map(f => (
                <div key={f.id} style={{ background:C.panel, border:`1px solid ${C.border}`, padding:"16px 20px", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ color:C.accent, fontSize:14, marginBottom:4 }}>{fileIcon(f.name)} {f.name}</div>
                    <div style={{ color:C.muted, fontSize:11 }}>{f.content.split("\n").length} lines · {f.content.length} chars</div>
                  </div>
                  <button onClick={() => { setActiveFileId(f.id); setView("ide"); }} style={{ background:C.accentDim, border:`1px solid ${C.accent}`, color:C.accent, padding:"5px 14px", fontSize:11, cursor:"pointer" }}>
                    OPEN IN IDE
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SETTINGS */}
          {adminTab==="settings" && (
            <div style={{ flex:1, overflowY:"auto", padding:"32px 36px" }}>
              <div style={{ fontSize:22, fontWeight:900, color:C.accent, marginBottom:28 }}>Settings</div>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, padding:24, marginBottom:24 }}>
                <div style={{ fontSize:11, color:C.muted, letterSpacing:3, marginBottom:16 }}>CONFIGURATION</div>
                {[
                  ["Model", MODEL],
                  ["Admin User", ADMIN_USER],
                  ["API Route", "/api/chat (serverless)"],
                  ["Max Tokens / Call", "1000"],
                  ["Version", "Forge v2 — Production"],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:13, color:C.muted }}>{k}</span>
                    <span style={{ fontSize:13, color:C.accent }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:"#1a0a0a", border:`1px solid #2a1a1a`, padding:20 }}>
                <div style={{ fontSize:11, color:"#7a3a3a", letterSpacing:2, marginBottom:12 }}>⚠️ CHANGE CREDENTIALS</div>
                <div style={{ fontSize:13, color:"#5a3a3a", lineHeight:1.7 }}>
                  To change admin credentials, edit <code style={{ color:"#aa6a6a" }}>src/App.jsx</code> lines 4–5:<br/>
                  <code style={{ color:"#aa6a6a", display:"block", marginTop:8 }}>
                    const ADMIN_USER = "your-username";<br/>
                    const ADMIN_PASS = "your-password";
                  </code>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // MAIN IDE
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ height:"100vh", background:C.bg, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* TOP BAR */}
      <div style={{ height:46, background:C.sidebar, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 14px", gap:12, flexShrink:0 }}>
        <span style={{ fontSize:20 }}>⚡</span>
        <span style={{ fontWeight:900, fontSize:17, color:C.accent, letterSpacing:-0.5 }}>FORGE</span>
        <span style={{ fontSize:9, color:C.muted, letterSpacing:3 }}>IDE</span>
        <div style={{ width:1, height:20, background:C.border, margin:"0 4px" }} />
        <div style={{ display:"flex", gap:2 }}>
          {[["split","⬛ Split"],["code","📄 Code"],["preview","👁 Preview"]].map(([m,label]) => (
            <button key={m} onClick={() => setPaneMode(m)} style={{ background:paneMode===m ? C.accentDim:"transparent", border:`1px solid ${paneMode===m ? C.accent:C.border}`, color:paneMode===m ? C.accent:C.muted, padding:"4px 10px", cursor:"pointer", fontSize:10, letterSpacing:1 }}>{label}</button>
          ))}
        </div>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:9, color:"#22223a", letterSpacing:1 }}>{MODEL}</span>
        <div style={{ width:1, height:20, background:C.border }} />
        <button onClick={() => setView("admin")} style={{ background:C.accentDim, border:`1px solid ${C.accent}`, color:C.accent, padding:"5px 14px", fontSize:10, cursor:"pointer", letterSpacing:2, fontWeight:700 }}>⚙ ADMIN</button>
        <button onClick={() => setAuthed(false)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"5px 12px", fontSize:10, cursor:"pointer" }}>LOG OUT</button>
      </div>

      {/* BODY */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* FILE TREE */}
        <div style={{ width:190, background:C.sidebar, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:"10px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:9, color:C.muted, letterSpacing:3 }}>EXPLORER</span>
            <button onClick={addFile} style={{ background:"none", border:"none", color:C.accent, cursor:"pointer", fontSize:20, lineHeight:1, padding:0 }}>+</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"6px 0" }}>
            {files.map(f => (
              <div key={f.id} onClick={() => setActiveFileId(f.id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 10px 6px 12px", cursor:"pointer", background:activeFileId===f.id ? C.accentDim:"transparent", borderLeft:`2px solid ${activeFileId===f.id ? C.accent:"transparent"}` }}>
                <span style={{ fontSize:12, color:activeFileId===f.id ? C.accent:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5 }}>
                  <span>{fileIcon(f.name)}</span><span>{f.name}</span>
                </span>
                {files.length>1 && (
                  <span onClick={e => { e.stopPropagation(); deleteFile(f.id); }} style={{ color:"#2a2a40", fontSize:16, cursor:"pointer", flexShrink:0 }}>×</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* EDITOR + PREVIEW */}
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {paneMode!=="preview" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", borderRight:`1px solid ${C.border}`, overflow:"hidden" }}>
              <div style={{ height:34, background:C.panel, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 16px", gap:10, flexShrink:0 }}>
                <span style={{ fontSize:12, color:C.accent }}>{fileIcon(activeFile.name)} {activeFile.name}</span>
                <span style={{ marginLeft:"auto", fontSize:10, color:C.muted }}>{activeFile.content.split("\n").length} lines</span>
              </div>
              <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
                <div style={{ width:40, background:C.sidebar, borderRight:`1px solid ${C.border}`, padding:"14px 8px 14px 0", overflowY:"hidden", flexShrink:0, textAlign:"right", fontSize:12, lineHeight:"1.65em", color:"#25253a", userSelect:"none" }}>
                  {activeFile.content.split("\n").map((_,i) => <div key={i}>{i+1}</div>)}
                </div>
                <textarea
                  value={activeFile.content}
                  onChange={e => updateContent(e.target.value)}
                  spellCheck={false}
                  style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#b0b0d0", fontSize:13, lineHeight:"1.65em", padding:"14px", resize:"none", caretColor:C.accent }}
                />
              </div>
            </div>
          )}

          {paneMode!=="code" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ height:34, background:C.panel, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 16px", gap:8, flexShrink:0 }}>
                <div style={{ display:"flex", gap:5 }}>
                  {["#ff5f57","#ffbd2e","#28c840"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
                </div>
                <span style={{ fontSize:10, color:C.muted, marginLeft:6, letterSpacing:2 }}>LIVE PREVIEW</span>
              </div>
              <iframe
                key={activeFile.content.slice(0,80)}
                src={previewSrc}
                style={{ flex:1, border:"none", background:"#0d0d0d" }}
                sandbox="allow-scripts allow-forms allow-modals"
                title="preview"
              />
            </div>
          )}
        </div>

        {/* CHAT PANEL */}
        <div style={{ width:360, background:C.chatBg, borderLeft:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ height:46, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 16px", gap:10, flexShrink:0 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, boxShadow:`0 0 6px ${C.green}` }} />
            <span style={{ fontSize:10, color:C.muted, letterSpacing:3 }}>FORGE AI</span>
            <span style={{ marginLeft:"auto", fontSize:9, color:"#1e1e35" }}>SONNET 4</span>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"14px 12px", display:"flex", flexDirection:"column", gap:10 }}>
            {messages.map((msg,i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:msg.role==="user" ? "flex-end":"flex-start" }}>
                <div style={{ maxWidth:"90%", background:msg.role==="user" ? C.accent:C.panel, border:`1px solid ${msg.role==="user" ? C.accent:C.border}`, padding:"10px 13px", fontSize:13, lineHeight:1.6, color:msg.role==="user" ? "#fff":C.text }}>
                  <span style={{ whiteSpace:"pre-wrap" }}>
                    {msg.content.replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").replace(/```[\s\S]*?```/g,"").trim()}
                  </span>
                  {msg.hasCode && (
                    <div style={{ marginTop:8, padding:"5px 10px", background:"#0a1a0a", border:"1px solid #1a3a1a", color:C.green, fontSize:11 }}>
                      ✓ Code applied to editor
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf:"flex-start" }}>
                <div style={{ background:C.panel, border:`1px solid ${C.border}`, padding:"12px 16px", display:"flex", gap:5, alignItems:"center" }}>
                  {[0,1,2].map(d => <div key={d} style={{ width:6, height:6, borderRadius:"50%", background:C.accent, animation:`bounce 1s ${d*0.2}s infinite` }} />)}
                  <span style={{ fontSize:11, color:C.muted, marginLeft:6 }}>Building...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding:"10px 12px 14px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
              {QUICK.map(p => (
                <button key={p} onClick={() => { setInput(`Build a ${p} with dark theme`); inputRef.current?.focus(); }}
                  style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"3px 9px", fontSize:9, cursor:"pointer", letterSpacing:0.5 }}>
                  {p}
                </button>
              ))}
            </div>
            <div style={{ background:C.inputBg, border:`2px solid ${input.trim() ? C.accent:C.border}`, transition:"border-color 0.2s" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe what to build, fix, or ask..."
                rows={3}
                style={{ width:"100%", boxSizing:"border-box", background:"transparent", border:"none", outline:"none", color:C.text, fontSize:13, padding:"12px 13px 8px", resize:"none", lineHeight:1.55 }}
              />
              <div style={{ display:"flex", alignItems:"center", padding:"8px 10px", borderTop:`1px solid ${C.border}`, gap:10 }}>
                <span style={{ fontSize:9, color:C.muted, flex:1 }}>⏎ send · ⇧⏎ newline</span>
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  style={{
                    background: loading ? "#0f0f20" : input.trim() ? C.accent : "#1a1a28",
                    border:`2px solid ${loading ? C.border : input.trim() ? C.accent : C.border}`,
                    color: loading ? C.muted : input.trim() ? "#fff" : C.muted,
                    padding:"10px 22px", fontSize:14, fontWeight:900,
                    cursor: loading||!input.trim() ? "not-allowed":"pointer",
                    letterSpacing:2, display:"flex", alignItems:"center", gap:8,
                    minWidth:110, justifyContent:"center", transition:"all 0.15s",
                  }}
                >
                  {loading ? <><span style={{ fontSize:13 }}>⏳</span> BUILDING</> : <><span style={{ fontSize:16 }}>⚡</span> SEND</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
