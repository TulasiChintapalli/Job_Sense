import { useEffect, useRef, useState } from "react";
import { Routes, Route, Link, NavLink, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { api, token } from "./api.js";
import { SkillAssessment, MockInterview } from "./Practice.jsx";
import Compare from "./Compare.jsx";
import JDInsights from "./Insights.jsx";

const OK_EXT = [".pdf", ".docx", ".txt"];
const checkFile = (f) => {
  if (!OK_EXT.some((e) => f.name.toLowerCase().endsWith(e))) return "Please upload a PDF, DOCX, or TXT file.";
  if (f.size > 5 * 1024 * 1024) return "Maximum file size is 5 MB.";
  return "";
};
const date = (s) => new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function Modal({ title, onClose, children }) {
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  return (<div className="backdrop" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
    <button className="x" aria-label="Close" onClick={onClose}>×</button><h3>{title}</h3>{children}</div></div>);
}

function Ring({ value, size = 190, onClick }) {
  const r = 80, c = 2 * Math.PI * r;
  return (<button className="ring pop" style={{ width: size, height: size }} onClick={onClick} aria-label={`Job readiness ${value}%. Open breakdown`}>
    <svg viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" x2="1"><stop stopColor="#6d5dfc" /><stop offset="1" stopColor="#27c3ff" /></linearGradient></defs>
      <circle cx="100" cy="100" r={r} className="track" /><circle cx="100" cy="100" r={r} className="bar" stroke="url(#g)" style={{ "--c": c, "--o": c * (1 - value / 100) }} /></svg>
    <span><b>{value}%</b><small>JOB READINESS</small></span></button>);
}

function Nav({ user, logout }) {
  const [open, setOpen] = useState(false);
  return (<header className="nav"><Link to="/" className="logo">Job<span>Sense</span></Link>
    <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
    <nav className={open ? "open" : ""} onClick={() => setOpen(false)}>
      {user ? (<><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/analyze">Analyze</NavLink><NavLink to="/history">History</NavLink><button className="link" onClick={logout}>Log out</button></>)
        : (<><a href="/#how">How it works</a><NavLink to="/login">Log in</NavLink><Link className="btn sm" to="/signup">Get started</Link></>)}</nav></header>);
}

function Landing({ user }) {
  const go = user ? "/analyze" : "/signup";
  return (<main>
    <section className="hero"><div className="blob b1" /><div className="blob b2" />{[...Array(14)].map((_, i) => <i key={i} className="dot" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${i * 0.7}s` }} />)}
      <div className="hero-copy"><span className="pill">AI career coach for job seekers</span>
        <h1>Understand the Job.<br /><em>Know Your Next Move.</em></h1>
        <p>Analyze any job description, compare it with your resume, discover your skill gaps, and get a personalized roadmap to become job-ready.</p>
        <div className="row"><Link className="btn" to={go}>Analyze My Job</Link><a className="btn ghost" href="#how">See How It Works</a></div></div>
      <div className="hero-art" aria-label="Preview of a JobSense analysis">
        <div className="card float1"><Ring value={82} size={150} onClick={() => {}} /></div>
        <div className="chip float2">⚠ 4 skill gaps</div><div className="chip ok float3">✓ Python · Flask · SQL</div>
        <svg className="flow" viewBox="0 0 320 60" role="img" aria-label="Resume to analysis to roadmap"><path d="M10 30h300" /><circle cx="10" cy="30" r="7" /><circle cx="110" cy="30" r="7" /><circle cx="210" cy="30" r="7" /><circle cx="310" cy="30" r="7" /></svg>
        <div className="flowl"><span>Resume</span><span>Analysis</span><span>Gaps</span><span>Roadmap</span></div></div></section>
    <section id="how" className="sec"><h2>How JobSense works</h2><div className="grid4">
      {[["1", "Paste the job", "Paste a description or upload a PDF, DOCX or TXT."], ["2", "Add your resume", "Used only to personalize your analysis."], ["3", "See your gaps", "Skills you have, skills you need, ranked by priority."], ["4", "Follow your plan", "A step-by-step roadmap and honest resume rewrites."]].map(([n, t, d]) => <div className="card pop" key={n}><b className="num">{n}</b><h4>{t}</h4><p>{d}</p></div>)}</div></section>
    <section className="sec alt"><h2>Why JobSense is different</h2><div className="grid3">
      {[["Answers “what next?”", "Not just keywords: a prioritized action plan and roadmap."], ["Grounded, never invented", "Missing info shows “Not specified”. Resume rewrites never claim experience you lack."], ["Honest scoring", "A transparent readiness estimate, not a fake-precise number."]].map(([t, d]) => <div className="card pop" key={t}><h4>{t}</h4><p>{d}</p></div>)}</div>
      <div className="center"><Link className="btn" to={go}>Analyze My Job</Link></div></section>
    <footer className="foot">© {new Date().getFullYear()} JobSense · Your resume is used only to personalize your analysis.</footer></main>);
}

function Auth({ mode, onAuth }) {
  const [f, setF] = useState({ email: "", password: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const nav = useNavigate();
  const submit = async (e) => { e.preventDefault(); setErr(""); setBusy(true);
    try { const d = await api(`/auth/${mode}`, { method: "POST", body: f }); token.set(d.token); onAuth(d.user); nav("/dashboard"); } catch (x) { setErr(x.message); } setBusy(false); };
  return (<main className="center"><form className="card auth" onSubmit={submit}><h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
    <label htmlFor="em">Email</label><input id="em" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
    <label htmlFor="pw">Password</label><input id="pw" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
    {err && <p className="err" role="alert">{err}</p>}<button className="btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</button>
    <p className="muted">{mode === "login" ? <>New here? <Link to="/signup">Create an account</Link></> : <>Have an account? <Link to="/login">Log in</Link></>}</p></form></main>);
}

function Drop({ label, file, setFile, hint, setErr }) {
  const ref = useRef(); const [over, setOver] = useState(false);
  const take = (f) => { if (!f) return; const m = checkFile(f); setErr(m); if (!m) setFile(f); };
  return (<div className={`drop ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
    <input ref={ref} type="file" hidden accept=".pdf,.docx,.txt" aria-label={label} onChange={(e) => take(e.target.files[0])} />
    {file ? (<div><b>{file.name}</b><p className="ok-t">✓ Ready for analysis · {(file.size / 1024).toFixed(0)} KB</p><button type="button" className="link" onClick={() => setFile(null)}>Remove</button> <button type="button" className="link" onClick={() => ref.current.click()}>Replace</button></div>)
      : (<div><p>Drag & drop {label}, or</p><button type="button" className="btn ghost sm" onClick={() => ref.current.click()}>Browse files</button><p className="muted">{hint || "PDF, DOCX or TXT · max 5 MB"}</p></div>)}</div>);
}

function Analyze() {
  const [jd, setJd] = useState(""); const [jdFile, setJdFile] = useState(null); const [cv, setCv] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [stage, setStage] = useState(0); const nav = useNavigate();
  useEffect(() => { if (!busy) return; const t = setInterval(() => setStage((s) => Math.min(s + 1, 3)), 1100); return () => clearInterval(t); }, [busy]);
  const run = async () => {
    if (!jd.trim() && !jdFile) return setErr("Please provide a job description.");
    if (!cv) return setErr("Upload your resume to receive personalized skill-gap analysis.");
    setErr(""); setStage(0); setBusy(true);
    const form = new FormData(); form.append("jd_text", jd); if (jdFile) form.append("jd_file", jdFile); form.append("resume", cv);
    try { const d = await api("/analyze", { method: "POST", form }); nav(`/results/${d.id}`); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (<main className="page"><h1>Analyze a job</h1>
    <div className="two"><section className="card"><h3>1 · Job description</h3>
      <label htmlFor="jd">Paste the description</label><textarea id="jd" rows={9} maxLength={20000} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full job posting here…" disabled={!!jdFile} />
      <div className="between"><small>{jd.length.toLocaleString()} / 20,000</small>{jd && <button className="link" onClick={() => setJd("")}>Clear</button>}</div>
      <p className="muted center-t">— or —</p><Drop label="a job description file" file={jdFile} setFile={setJdFile} setErr={setErr} /></section>
      <section className="card"><h3>2 · Your resume</h3><Drop label="your resume" file={cv} setFile={setCv} setErr={setErr} hint="PDF, DOCX or TXT · max 5 MB. Your resume is used only to personalize your analysis." /></section></div>
    {err && <p className="err" role="alert">{err}</p>}<div className="center"><button className="btn big" onClick={run} disabled={busy}>Analyze</button></div>
    {busy && <div className="backdrop" role="status"><div className="modal proc"><div className="spin" /><h3>Analyzing…</h3><ul>{["Reading the job description", "Extracting skills & requirements", "Comparing with your resume", "Building your action plan"].map((t, i) => <li key={t} className={i <= stage ? "on" : ""}>{i < stage ? "✓" : "•"} {t}</li>)}</ul></div></div>}</main>);
}

const PRI = { HIGH: "p-high", MEDIUM: "p-med", LOW: "p-low" };
const PROG = [["not_started", "○", "Not Started"], ["learning", "◐", "Learning"], ["completed", "✓", "Completed"]];
const glyph = (st) => (PROG.find((p) => p[0] === (st || "not_started")) || PROG[0])[1];
function Results() {
  const { id } = useParams(); const [d, setD] = useState(null); const [err, setErr] = useState(""); const [modal, setModal] = useState(null); const [open, setOpen] = useState(null); const [prog, setProg] = useState({}); const [perr, setPerr] = useState(""); const [saved, setSaved] = useState(null); const [practice, setPractice] = useState(null); const [pr, setPr] = useState(null);
  useEffect(() => { api(`/analyses/${id}`).then(setD).catch((e) => setErr(e.message)); }, [id]);
  const loadPr = () => api(`/analyses/${id}/practice`).then(setPr).catch(() => {});
  useEffect(() => { loadPr(); }, [id]);
  useEffect(() => { api("/skill-progress").then((x) => setProg(x.items || {})).catch(() => {}); }, [id]);
  const setStatus = async (skill, status) => { const prev = prog[skill]; setPerr(""); setSaved(null); setProg((p) => ({ ...p, [skill]: status }));
    try { await api("/skill-progress", { method: "PUT", body: { skill, status } }); setSaved({ skill, status }); } catch (e) { setProg((p) => ({ ...p, [skill]: prev })); setPerr(e.message); } };
  if (err) return <main className="center"><p className="err">{err}</p><Link className="btn" to="/history">Back to history</Link></main>;
  if (!d) return <main className="center"><div className="spin" /></main>;
  const r = d.result, s = r.scores; const V = { strong: ["🟢 Strong Match", "v-g"], potential: ["🟡 Good Potential", "v-y"], gap: ["🔴 Significant Skill Gap", "v-r"] }[r.verdict.level];
  const bars = [["Technical Skills", s.technical], ["Tools", s.tools], ["Soft Skills", s.soft], ["Experience", s.experience], ["Education", s.education]];
  return (<main className="page"><div className="between wrap"><div><h1>{r.title}</h1><p className="muted">{r.company} · {date(d.created)}</p></div><Link className="btn ghost sm" to="/analyze">New analysis</Link></div>
    <div className="two"><section className="card center-t"><Ring value={s.overall} onClick={() => setModal("score")} /><p className="muted">JobSense Readiness Estimate — a guide, not an exact measure.</p>
      <div className={`verdict ${V[1]}`}><b>{V[0]}</b><p>{r.verdict.message}</p></div></section>
      <section className="card"><h3>Summary</h3><p>{r.summary}</p><dl className="meta">{[["Role type", r.meta.role_type], ["Experience level", r.meta.level], ["Experience", r.meta.experience], ["Work mode", r.meta.work_mode], ["Location", r.meta.location], ["Education", r.meta.education]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {r.certifications.length > 0 && <p><b>Certifications:</b> {r.certifications.join(", ")}</p>}</section></div>
    <JDInsights r={r} />
    <section className="card"><h3>Practice &amp; prove your skills</h3><p className="muted">Built from this job description and your resume analysis.</p>
      <div className="between wrap"><div className="tags"><button className="btn sm" onClick={() => setPractice("interview")}>🎤 Start Mock Interview</button><button className="btn ghost sm" onClick={() => setPractice("assessment")}>🧪 Take Skill Assessment</button></div>
        <small className="muted">{[pr?.interview && `Last interview: ${pr.interview.overall}/10`, pr?.assessment && `Last assessment: ${pr.assessment.correct}/${pr.assessment.total}`].filter(Boolean).join(" · ")}</small></div></section>
    <div className="two"><section className="card"><h3>Skills you have</h3><div className="tags">{r.have.length ? r.have.map((h) => <button key={h.skill} className={`tag pop ok ${h.strength}`} onClick={() => setModal({ haveSkill: h })}>✓ {h.skill} <small>{h.strength === "strong" ? "strong" : "partial"}</small></button>) : <p className="muted">No matching skills found.</p>}</div></section>
      <section className="card"><h3>Skills you need</h3>{r.missing.length ? [["🔴 Required", true], ["🟡 Preferred", false]].map(([lab, req]) => { const g = r.missing.filter((m) => !!m.required === req); return g.length ? <div key={lab}><p className="grp">{lab} skills</p><div className="tags">{g.map((m) => <button key={m.skill} className={`tag pop ${PRI[m.priority]}`} onClick={() => setModal(m)}>⚠ {m.skill} <small>{m.priority}</small></button>)}</div></div> : null; }) : <p className="muted">No gaps detected 🎉</p>}</section></div>
    {r.improve?.length > 0 && <section className="card"><h3>🚀 Improve My Match</h3><p className="muted">Current match: <b>{s.overall}%</b>. Impact figures are rough ESTIMATES from your readiness weights, not a promise of a higher score.</p>
      {r.improve.map((x) => <div key={x.skill} className="impact"><span><b>{x.skill}</b><span className={`badge ${PRI[x.priority]}`}>{x.priority}</span><small> {x.required ? "Required" : "Preferred"} · {x.category}</small></span><span className="est">Est. +{x.impact_estimate}%</span></div>)}
      <div className="center-t"><button className="btn sm" onClick={() => document.getElementById("roadmap")?.scrollIntoView({ behavior: "smooth" })}>Build My Improvement Plan</button></div></section>}
    <section className="card"><h3>Your personalized action plan</h3>{r.plan.length ? r.plan.map((p) => <button key={p.skill} className="step pop" onClick={() => setModal({ plan: p })}><b>STEP {p.step}</b> Learn {p.skill} <span className={`badge ${PRI[p.priority]}`}>{p.priority}</span><small>{p.why}</small></button>) : <p className="muted">No technical gaps — focus on polishing your resume.</p>}</section>
    <section className="card" id="roadmap"><h3>Learning roadmap</h3><div className="road"><span className="node start">Your current level</span>{r.plan.map((p) => <button key={p.skill} className={`node pop ${prog[p.skill] === "completed" ? "done" : ""}`} onClick={() => setModal({ plan: p })}><span aria-hidden="true">{glyph(prog[p.skill])}</span> {p.skill}</button>)}<span className="node end">JOB READY</span></div></section>
    <section className="card"><h3>Resume improvement suggestions</h3><p className="muted">{r.suggestion_note}</p>{r.suggestions.map((x, i) => <button key={i} className="sugg pop" onClick={() => setModal({ sugg: x })}>“{x.before}” →  see rewrite</button>)}
      {r.evidence_gaps?.length > 0 && <><p className="grp">Missing resume evidence</p>{r.evidence_gaps.map((g) => <div key={g.skill} className="gap"><b>{g.skill}</b> <span className="badge p-med">{g.status}</span><small>{g.suggestion}</small></div>)}</>}</section>
    {modal === "score" && <Modal title="Readiness breakdown" onClose={() => setModal(null)}>{bars.map(([k, v], i) => { const key = ["technical", "tools", "soft", "experience", "education"][i]; const x = r.score_explain?.[key];
        return (<div key={k}><button className="bar-row xp" aria-expanded={open === key} disabled={!x} onClick={() => setOpen(open === key ? null : key)}><span>{k}{x ? (open === key ? " ▾" : " ▸") : ""}</span><div><i style={{ width: `${v ?? 0}%` }} /></div><b>{v == null ? "Not specified" : `${v}%`}</b></button>
          {x && open === key && <div className="xbox">{x.note && <p>{x.note}</p>}{x.matched && <p><b>Matched:</b> {x.matched.length ? x.matched.join(", ") : "None"}</p>}{x.missing && <p><b>Missing:</b> {x.missing.length ? x.missing.join(", ") : "None"}</p>}{x.weight != null && <p className="muted">Counts for {x.weight}% of the overall score and contributed {x.points} of a possible {x.max_points} points.</p>}</div>}</div>); })}<p className="muted">Weighted from skills the job mentions (required skills count double) vs. those found in your resume.</p></Modal>}
    {practice === "interview" && <MockInterview id={id} onClose={() => { setPractice(null); loadPr(); }} />}
    {practice === "assessment" && <SkillAssessment id={id} onClose={() => { setPractice(null); loadPr(); }} />}
    {modal?.haveSkill && <Modal title={modal.haveSkill.skill} onClose={() => setModal(null)}><p><b>Status:</b> {modal.haveSkill.status || "Detected"}</p><p><b>Confidence:</b> {modal.haveSkill.confidence || (modal.haveSkill.strength === "strong" ? "High" : "Partial")}</p>{modal.haveSkill.evidence ? <><p className="muted">Evidence from your resume</p><blockquote>{modal.haveSkill.evidence}</blockquote></> : <p className="muted">Evidence text isn't available for analyses created before this feature.</p>}</Modal>}
    {modal?.skill && !modal.haveSkill && <Modal title={modal.skill} onClose={() => setModal(null)}><p><span className={`badge ${PRI[modal.priority]}`}>{modal.priority}</span> {modal.required ? "Required" : "Preferred"} · mentioned {modal.mentions}× in the job description.</p><p>Your resume doesn’t clearly show {modal.skill}. {modal.required ? "Employers listed it as a core requirement." : "It’s a bonus rather than a core need."}</p></Modal>}
    {modal?.plan && <Modal title={modal.plan.skill} onClose={() => setModal(null)}><p><b>Why you need it:</b> {modal.plan.why}</p><p><b>What to learn:</b> {modal.plan.learn}</p><p><b>Project idea:</b> {modal.plan.project}</p><p><b>Difficulty:</b> {modal.plan.difficulty} · <b>Priority:</b> {modal.plan.priority}</p>
      <p className="muted">Your progress (saved to your account)</p><div className="seg" role="group" aria-label="Skill progress">{PROG.map(([k, g, l]) => <button key={k} type="button" aria-pressed={(prog[modal.plan.skill] || "not_started") === k} className={(prog[modal.plan.skill] || "not_started") === k ? "on" : ""} onClick={() => setStatus(modal.plan.skill, k)}>{g} {l}</button>)}</div>
      {saved && saved.skill === modal.plan.skill && saved.status === prog[modal.plan.skill] && !perr && <p className="saved" role="status">✓ Saved as {(PROG.find((x) => x[0] === saved.status) || [])[2]}. Your roadmap and dashboard are updated.</p>}
      {perr && <p className="err" role="alert">{perr} <button className="link" onClick={() => setPerr("")}>Dismiss</button></p>}</Modal>}
    {modal?.sugg && <Modal title="Before / after" onClose={() => setModal(null)}><p className="muted">Before</p><blockquote>{modal.sugg.before}</blockquote><p className="muted">Suggested rewrite</p><blockquote className="new">{modal.sugg.after}</blockquote>{modal.sugg.why?.length > 0 && <><p className="muted">Why this is better</p><ul className="why">{modal.sugg.why.map((w) => <li key={w}>{w}</li>)}</ul></>}
      <p className="muted">Edit the bracketed part with true details. Don’t claim anything you haven’t done.</p>{modal.sugg.warning && <p className="warn">⚠ {modal.sugg.warning}</p>}</Modal>}</main>);
}

function History({ dash }) {
  const [items, setItems] = useState(null); const [prog, setProg] = useState(null); const [q, setQ] = useState(""); const [del, setDel] = useState(null); const [err, setErr] = useState("");
  const load = (s = "") => api(`/analyses?q=${encodeURIComponent(s)}`).then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  useEffect(() => { if (dash) { load(); return; } const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q, dash]);
  const loadProg = () => { setProg(null); api("/progress/summary").then(setProg).catch(() => setProg("error")); };
  useEffect(() => { if (dash) loadProg(); }, [dash]);
  const remove = async () => { try { await api(`/analyses/${del.id}`, { method: "DELETE" }); setDel(null); load(q); if (dash) loadProg(); } catch (e) { setErr(e.message); setDel(null); } };
  if (!items) return <main className="center">{err ? <p className="err">{err}</p> : <div className="spin" />}</main>;
  const avg = items.length ? Math.round(items.reduce((a, b) => a + b.score, 0) / items.length) : 0;
  const list = dash ? items.slice(0, 5) : items;
  return (<main className="page"><h1>{dash ? "Dashboard" : "History"}</h1>
    {dash && <div className="grid3"><div className="card"><small>Total analyses</small><h2>{items.length}</h2></div><div className="card"><small>Average readiness</small><h2>{avg}%</h2></div><div className="card"><small>Most recent</small><h2 className="sm-h">{items[0]?.title || "—"}</h2></div></div>}
    {dash && items.length > 0 && <><h3 className="grp">Career progress</h3>{prog === "error" ? <div className="card"><p className="muted">Couldn’t load career progress. <button className="link" onClick={loadProg}>Retry</button></p></div> : !prog ? <div className="card"><div className="spin" /></div> :
      <><div className="grid3">{[["Average match", prog.average != null ? `${prog.average}%` : "—"], ["Best match", prog.best != null ? `${prog.best}%` : "—"], ["Jobs analyzed", prog.count], ["Most requested skill", prog.most_requested || "—"], ["Top missing skill", prog.top_missing || "—"], ["Career goal", prog.career_goal || "Not enough data"], ["Skills completed", prog.completed_skills]].map(([k, v]) => <div className="card" key={k}><small>{k}</small><h2 className="sm-h">{v}</h2></div>)}</div>
      {prog.badges && <div className="card"><div className="bar-row"><span>Level {prog.level}</span><div><i style={{ width: `${prog.level_xp}%` }} /></div><b>{prog.level_xp}/100 XP</b></div><p className="muted"><small>{prog.xp} XP total, earned from analyses, practice and skill progress.</small></p>
        <div className="badges">{prog.badges.map((b) => <div key={b.id} className={`bdg ${b.earned ? "" : "locked"}`} title={b.desc}><span aria-hidden="true">{b.icon}</span><b>{b.name}</b><small>{b.earned ? "Earned" : b.desc}</small></div>)}</div></div>}</>}</>}
    {!dash && <div className="center-t"><Link className="btn ghost sm" to="/compare">Compare jobs</Link></div>}
    {!dash && <><label htmlFor="s" className="sr">Search</label><input id="s" className="search" placeholder="Search by title or company…" value={q} onChange={(e) => setQ(e.target.value)} /></>}
    {err && <p className="err" role="alert">{err}</p>}
    {list.length === 0 ? <div className="card center-t"><p>No analyses yet.</p><Link className="btn" to="/analyze">Analyze My Job</Link></div> :
      list.map((a) => <div className="card row-card" key={a.id}><Link to={`/results/${a.id}`}><b>{a.title}</b><span className="muted"> {a.company} · {date(a.created)}</span></Link><span className="score">{a.score}%</span><button className="link danger" onClick={() => setDel(a)} aria-label={`Delete ${a.title}`}>Delete</button></div>)}
    {dash && <div className="center"><Link className="btn" to="/analyze">New analysis</Link>{items.length > 1 && <Link className="btn ghost" to="/compare">Compare jobs</Link>}</div>}
    {del && <Modal title="Delete this analysis?" onClose={() => setDel(null)}><p>“{del.title}” will be permanently removed.</p><div className="row"><button className="btn ghost" onClick={() => setDel(null)}>Cancel</button><button className="btn danger-b" onClick={remove}>Delete</button></div></Modal>}</main>);
}

export default function App() {
  const [user, setUser] = useState(null); const [ready, setReady] = useState(!token.get()); const loc = useLocation();
  useEffect(() => { if (token.get()) api("/auth/me").then((d) => setUser(d.user)).catch(() => token.clear()).finally(() => setReady(true)); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const logout = () => { token.clear(); setUser(null); };
  if (!ready) return <div className="center"><div className="spin" /></div>;
  const P = (el) => (user ? el : <Navigate to="/login" replace />);
  return (<><Nav user={user} logout={logout} /><Routes>
    <Route path="/" element={<Landing user={user} />} /><Route path="/login" element={<Auth mode="login" onAuth={setUser} />} /><Route path="/signup" element={<Auth mode="signup" onAuth={setUser} />} />
    <Route path="/dashboard" element={P(<History dash />)} /><Route path="/analyze" element={P(<Analyze />)} /><Route path="/results/:id" element={P(<Results />)} /><Route path="/history" element={P(<History />)} /><Route path="/compare" element={P(<Compare />)} />
    <Route path="*" element={<Navigate to="/" />} /></Routes></>);
}
