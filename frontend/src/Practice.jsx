import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";

function Overlay({ title, onClose, children }) {
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  return (<div className="backdrop"><div className="modal wide" role="dialog" aria-modal="true" aria-label={title}>
    <button className="x" aria-label="Close" onClick={onClose}>×</button><h3>{title}</h3>{children}</div></div>);
}

function Loading({ text }) { return <div className="center-t"><div className="spin" style={{ margin: "24px auto" }} /><p className="muted">{text}</p></div>; }

function ErrorBox({ msg, onRetry, onClose }) {
  return (<div><p className="err" role="alert">{msg}</p><div className="center-t" style={{ marginTop: 14 }}>{onRetry && <button className="btn sm" onClick={onRetry}>Retry</button>} <button className="btn ghost sm" onClick={onClose}>Close</button></div></div>);
}

const VERDICT = { understood: "🟢 Seems understood", partial: "🟡 Partial", gap: "🔴 Knowledge gap" };

/* ---------------- Skill Assessment ---------------- */
export function SkillAssessment({ id, onClose }) {
  const [phase, setPhase] = useState("loading"); const [err, setErr] = useState(""); const [s, setS] = useState(null);
  const [ans, setAns] = useState({}); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false); const started = useRef(false);
  const start = () => { setPhase("loading"); setErr(""); setAns({}); api(`/analyses/${id}/assessment`, { method: "POST" }).then((d) => { setS(d); setPhase("quiz"); }).catch((e) => { setErr(e.message); setPhase("error"); }); };
  useEffect(() => { if (started.current) return; started.current = true; start(); }, []);
  const submit = async () => { setBusy(true); setErr(""); try { const d = await api(`/assessment/${s.session_id}/submit`, { method: "POST", body: { answers: ans } }); setRes(d.result); setPhase("result"); } catch (e) { setErr(e.message); } setBusy(false); };
  const answered = s ? s.questions.filter((q) => ans[q.id] !== undefined).length : 0;
  return (<Overlay title="🧪 Skill Assessment" onClose={onClose}>
    {phase === "loading" && <Loading text="Preparing questions for your missing skills…" />}
    {phase === "error" && <ErrorBox msg={err} onRetry={start} onClose={onClose} />}
    {phase === "quiz" && s && <div>
      <p className="muted">Based on the skills missing or weak in your resume. This shows whether a gap is just your resume, or the skill itself.</p>
      {s.skipped?.length > 0 && <p className="muted">No questions available for: {s.skipped.join(", ")}.</p>}
      {s.questions.map((q, n) => <fieldset key={q.id} className="qbox"><legend><span className="badge p-med">{q.skill}</span></legend><p><b>{n + 1}.</b> {q.question}</p>
        {q.options.map((o, k) => <label key={k} className={`opt ${ans[q.id] === k ? "on" : ""}`}><input type="radio" name={`q${q.id}`} checked={ans[q.id] === k} onChange={() => setAns({ ...ans, [q.id]: k })} /> {o}</label>)}</fieldset>)}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="between wrap"><small className="muted">{answered}/{s.questions.length} answered</small><button className="btn sm" disabled={busy || answered < s.questions.length} onClick={submit}>{busy ? "Checking…" : "Submit answers"}</button></div></div>}
    {phase === "result" && res && <div>
      <div className="center-t"><div className="score-big">{res.correct}/{res.total}</div><p className="muted">Overall {res.percent}%</p></div>
      <p className="grp">Skill Assessment Result</p>
      {res.skills.map((k) => <div key={k.skill} className="xbox"><div className="bar-row"><span>{k.skill}</span><div><i style={{ width: `${k.percent}%` }} /></div><b>{k.correct}/{k.total}</b></div><p><b>{VERDICT[k.verdict]}</b> · <small>{k.resume_status}</small></p><p className="muted">{k.message}</p></div>)}
      <p className="grp">Review</p>
      {res.review.map((q) => <div key={q.id} className="xbox"><p><b>{q.is_correct ? "✓ Correct" : "✗ Incorrect"}</b> · <span className="badge p-med">{q.skill}</span></p><p>{q.question}</p>
        {!q.is_correct && <p className="muted">Your answer: {q.options[q.chosen] ?? "—"}</p>}<p className="muted">Correct answer: {q.options[q.correct_index]}</p><p>{q.explanation}</p></div>)}
      <div className="center-t" style={{ marginTop: 14 }}><button className="btn sm" onClick={start}>Take another assessment</button> <button className="btn ghost sm" onClick={onClose}>Close</button></div></div>}
  </Overlay>);
}

/* ---------------- AI Mock Interview ---------------- */
const List = ({ title, items }) => items?.length ? <div><p className="grp">{title}</p><ul className="why">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null;
const Stat = ({ k, v }) => <div className="card"><small>{k}</small><h2 className="sm-h">{v}</h2></div>;

export function MockInterview({ id, onClose }) {
  const [phase, setPhase] = useState("loading"); const [err, setErr] = useState(""); const [s, setS] = useState(null);
  const [i, setI] = useState(0); const [text, setText] = useState(""); const [evals, setEvals] = useState({}); const [busy, setBusy] = useState(false); const [report, setReport] = useState(null); const started = useRef(false);
  const start = () => { setPhase("loading"); setErr(""); setI(0); setText(""); setEvals({}); setReport(null); api(`/analyses/${id}/interview`, { method: "POST" }).then((d) => { setS(d); setPhase("qa"); }).catch((e) => { setErr(e.message); setPhase("error"); }); };
  useEffect(() => { if (started.current) return; started.current = true; start(); }, []);
  const q = s?.questions[i]; const ev = q && evals[q.id]; const last = s && i === s.questions.length - 1;
  const submit = async () => { setBusy(true); setErr(""); try { const d = await api(`/interview/${s.session_id}/answer`, { method: "POST", body: { question_id: q.id, answer: text } }); setEvals({ ...evals, [q.id]: d.evaluation }); } catch (e) { setErr(e.message); } setBusy(false); };
  const finish = async () => { setBusy(true); setErr(""); try { const d = await api(`/interview/${s.session_id}/finish`, { method: "POST" }); setReport(d.report); setPhase("report"); } catch (e) { setErr(e.message); } setBusy(false); };
  const next = () => { setErr(""); setText(""); if (last) finish(); else setI(i + 1); };
  return (<Overlay title="🎤 AI Mock Interview" onClose={onClose}>
    {phase === "loading" && <Loading text="Preparing questions from your job description and resume…" />}
    {phase === "error" && <ErrorBox msg={err} onRetry={start} onClose={onClose} />}
    {phase === "qa" && q && <div>
      <div className="between wrap"><span className="badge p-med">{s.categories[q.category]}</span><small className="muted">Question {i + 1} of {s.questions.length}</small></div>
      <p className="qtext">{q.question}</p>
      {!ev && <><textarea rows={6} maxLength={4000} aria-label="Your answer" placeholder="Type your answer as you would say it in an interview…" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
        {err && <p className="err" role="alert">{err}</p>}
        <div className="between wrap" style={{ marginTop: 12 }}><button className="btn ghost sm" disabled={busy} onClick={next}>Skip</button><button className="btn sm" disabled={busy || text.trim().length < 10} onClick={submit}>{busy ? "Evaluating…" : "Submit answer"}</button></div></>}
      {ev && <div>
        <div className="center-t"><div className="score-big">{ev.score}/10</div></div>
        <div className="grid3">{[["Technical accuracy", ev.technical_accuracy], ["Relevance", ev.relevance], ["Completeness", ev.completeness], ["Clarity", ev.clarity]].map(([k, v]) => <Stat key={k} k={k} v={`${v}/10`} />)}</div>
        <List title="What was good" items={ev.good} /><List title="What was missing" items={ev.missing} /><List title="How to improve" items={ev.improve} />
        {ev.better_answer && <><p className="grp">Suggested better answer</p><blockquote>{ev.better_answer}</blockquote><p className="warn">⚠ This is a sample answer. Only use points that reflect your real experience.</p></>}
        {err && <p className="err" role="alert">{err}</p>}
        <div className="center-t" style={{ marginTop: 14 }}><button className="btn sm" disabled={busy} onClick={next}>{last ? (busy ? "Building report…" : "Finish & see report") : "Next question"}</button></div></div>}
    </div>}
    {phase === "report" && report && <div>
      <div className="center-t"><div className="score-big">{report.overall}/10</div><p className="muted">Interview score · {report.answered} of {report.total} questions answered</p></div>
      <div className="grid3"><Stat k="Technical performance" v={`${report.technical}/10`} /><Stat k="Communication" v={`${report.communication}/10`} /></div>
      <p className="grp">Strong areas</p><p>{report.strong.length ? report.strong.join(", ") : "None above 7/10 yet. Keep practicing."}</p>
      <p className="grp">Weak areas</p><p>{report.weak.length ? report.weak.join(", ") : "None below 5/10."}</p>
      <List title="Recommended improvements" items={report.recommendations} />
      <div className="center-t" style={{ marginTop: 14 }}><button className="btn sm" onClick={start}>Practice again</button> <button className="btn ghost sm" onClick={onClose}>Close</button></div></div>}
  </Overlay>);
}
