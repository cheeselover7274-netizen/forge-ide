# ⚡ Forge IDE — Deployment Guide

AI-powered code studio. Powered by Claude Sonnet 4. Deploy in ~15 minutes.

---

## 🔑 Your Login Credentials
- **Username:** admin
- **Password:** forge2024

*(Change these in `src/App.jsx` lines 4–5 before deploying)*

---

## 🚀 Deploy to Vercel (Free — Recommended)

### Step 1 — Install Node.js
Download from https://nodejs.org (LTS version)

### Step 2 — Unzip this project
Unzip the downloaded file. You'll get a `forge-ide` folder.

### Step 3 — Install dependencies
Open Terminal (Mac) or Command Prompt (Windows), then:
```bash
cd forge-ide
npm install
```

### Step 4 — Test locally (optional)
```bash
npm run dev
```
Open http://localhost:5173 — should work except AI (no API key yet).

### Step 5 — Push to GitHub
1. Go to https://github.com → sign up free if needed
2. Click "New repository" → name it `forge-ide` → Create
3. In your terminal:
```bash
git init
git add .
git commit -m "Forge IDE initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/forge-ide.git
git push -u origin main
```

### Step 6 — Deploy on Vercel
1. Go to https://vercel.com → sign up with GitHub
2. Click "Add New Project"
3. Import your `forge-ide` repository
4. Click **Deploy** (no build settings needed — auto-detected)
5. ✅ You get a live URL: `https://forge-ide-xxx.vercel.app`

### Step 7 — Add your Anthropic API key (REQUIRED for AI to work)
1. Get your API key from https://console.anthropic.com
2. In Vercel dashboard → your project → **Settings** → **Environment Variables**
3. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...your key...`
4. Click Save → then **Redeploy** (Deployments tab → 3 dots → Redeploy)

### Step 8 — Custom domain (optional, ~$10/year)
Vercel dashboard → your project → **Domains** → Add your domain

---

## 🔒 Security Notes
- Your API key is **never** in the browser — it lives only in Vercel's server environment
- The `/api/chat` serverless function proxies all requests securely
- Login is client-side (simple auth). For production hardening, add a proper auth service.

---

## 📁 Project Structure
```
forge-ide/
├── api/
│   └── chat.js          ← Serverless function (holds API key)
├── src/
│   ├── App.jsx          ← Full IDE + Admin panel
│   ├── main.jsx         ← React entry point
│   └── index.css        ← Global styles
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── vercel.json          ← Routing config
└── package.json
```

---

## 🛠 Changing Credentials
Edit `src/App.jsx`:
```js
const ADMIN_USER = "your-username";  // line 4
const ADMIN_PASS = "your-password";  // line 5
```
Then commit + push — Vercel auto-redeploys.

---

## ❓ Troubleshooting
| Problem | Fix |
|---------|-----|
| AI returns error | Check API key in Vercel env vars, redeploy |
| White screen | Run `npm run build` locally, check for errors |
| Can't log in | Check credentials in App.jsx lines 4–5 |
| Build fails | Make sure Node.js 18+ is installed |
