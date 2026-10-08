import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./api.js";

const MAX = 4;

export default function Compare() {
  const [items, setItems] = useState(null); const [err, setErr] = useState(""); const [sel, setSel] = useState([]);
  const [jobs, setJobs] = useState(null); const [busy, setBusy] = useState(false); const [cerr, setCerr] = useState("");
  const load = () => { setErr(""); setItems(null); api("/analyses?q=").then((d) => setItems(d.items)).catch((e) => setErr(e.message)); };
  useEffect(load, []);
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX ? [...s, id] : s);
  const run = async () => { setBusy(true); setCerr("");
    try { const ds = await Promise.all(sel.map((id) => api(`/analyses/${id}`))); setJobs(ds.map((d, i) => ({ id: sel[i], title: d.title || d.result.title, company: d.company || d.result.company, score: d.score ?? d.result.scores.overall, r: d.result }))); }
    catch (e) { setCerr(e.message); } setBusy(false); };

  if (err) return <main className="page"><h1>Compare jobs</h1><p className="err" role="alert">{err}</p><button className="btn sm" onClick={load}>Retry</button></main>;
  if (!items) return <main className="center"><div className="spin" /></main>;
  if (items.length < 2) return <main className="page"><h1>Compare jobs</h1><div className="card center-t"><p>Analyze at least two jobs to compare them.</p><Link className="btn" to="/analyze">Analyze My Job</Link></div></main>;

  if (jobs) {
    const info = jobs.map((j) => { const all = Object.values(j.r.jd_skills || {}).flat(); const pref = new Set(j.r.preferred || []); const have = new Set((j.r.have || []).map((h) => h.skill));
      const req = all.filter((x) => !pref.has(x)); return { all: new Set(all), pref, have, req, got: req.filter((x) => have.has(x)).length }; });
    const skills = [...new Set(info.flatMap((i) => [...i.all]))].sort((a, b) => info.filter((i) => i.all.has(b)).length - info.filter((i) => i.all.has(a)).length || a.localeCompare(b));
    const top = Math.max(...jobs.map((j) => j.score)); const best = jobs.filter((j) => j.score === top);
    const gaps = skills.map((s) => [s, info.filter((i) => i.all.has(s) && !i.have.has(s)).length]).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
    return (<main className="page"><h1>Job comparison</h1>
      <section className="card"><h3>🏆 Best current match</h3><p><b>{best.map((b) => b.title).join(" / ")}</b> at <b>{top}%</b>. {best.length > 1 ? "These are tied. " : ""}Based on your existing readiness score for each job.</p>
        {gaps.length > 0 && <p className="muted">Most common gap across these jobs: <b>{gaps[0][0]}</b> (missing for {gaps[0][1]} of {jobs.length} jobs).</p>}</section>
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Skill</th>{jobs.map((j) => <th key={j.id}><Link to={`/results/${j.id}`}>{j.title}</Link><small>{j.company}</small></th>)}</tr></thead>
        <tbody>{skills.map((s) => <tr key={s}><td>{s}</td>{info.map((i, k) => <td key={k}>{!i.all.has(s) ? <span className="muted" title="Not requested">–</span> : i.have.has(s) ? <span className="yes" title="You have this">✓</span> : <span className="no" title="Missing">✗</span>}{i.all.has(s) && i.pref.has(s) && <small className="pref"> pref.</small>}</td>)}</tr>)}
          <tr className="sum"><td>Required skills you have</td>{info.map((i, k) => <td key={k}>{i.got}/{i.req.length}</td>)}</tr>
          <tr className="sum"><td>Match score</td>{jobs.map((j) => <td key={j.id}><b>{j.score}%</b></td>)}</tr></tbody></table></div>
      <p className="muted"><small>✓ you have it · ✗ missing · – not requested by that job · pref. = preferred, not required.</small></p>
      <div className="center-t"><button className="btn ghost sm" onClick={() => setJobs(null)}>Choose different jobs</button></div></main>);
  }
  return (<main className="page"><h1>Compare jobs</h1><p className="muted">Select 2 to {MAX} of your analyses.</p>
    {items.map((a) => <label key={a.id} className={`card row-card pick ${sel.includes(a.id) ? "on" : ""}`}><input type="checkbox" checked={sel.includes(a.id)} onChange={() => toggle(a.id)} disabled={!sel.includes(a.id) && sel.length >= MAX} aria-label={`Select ${a.title}`} />
      <span className="grow"><b>{a.title}</b><span className="muted"> {a.company}</span></span><span className="score">{a.score}%</span></label>)}
    {cerr && <p className="err" role="alert">{cerr} <button className="link" onClick={run}>Retry</button></p>}
    <div className="center-t" style={{ marginTop: 16 }}><button className="btn" disabled={sel.length < 2 || busy} onClick={run}>{busy ? "Comparing…" : `Compare ${sel.length || ""} jobs`}</button></div></main>);
}
