const AREAS = ["Programming Languages", "Frameworks", "Databases", "Cloud", "Tools"];

/* Neutral observations about the job text. Never a judgement on whether a posting is genuine. */
export default function JDInsights({ r }) {
  const all = Object.values(r.jd_skills || {}).flat(); const pref = r.preferred || [];
  const req = all.filter((x) => !pref.includes(x));
  const m = r.meta || {}; const sig = r.jd_signals;
  const rows = [["Required skills", req.length], ["Preferred skills", pref.length], ["Experience", m.experience || "Not specified"], ["Education", m.education || "Not specified"],
    ["Work mode", m.work_mode || "Not specified"], ["Location", m.location || "Not specified"], ...(sig ? [["Salary", sig.salary]] : [])];
  const areas = AREAS.filter((a) => (r.jd_skills || {})[a]?.length);
  const notes = [];
  if (areas.length >= 4) notes.push(`This role spans ${areas.length} skill areas (${areas.join(", ").toLowerCase()}). Broad roles are rarely matched in full, so focus on the required skills first.`);
  if (req.length >= 10) notes.push(`The posting lists ${req.length} required skills, which is a long list.`);
  if (sig?.notes) notes.push(...sig.notes);
  if (sig?.duplicates?.length) notes.push(`${sig.duplicates.length} requirement line${sig.duplicates.length > 1 ? "s appear" : " appears"} more than once in the posting.`);
  return (<section className="card"><h3>Job Description Insights</h3>
    <div className="grid3">{rows.map(([k, v]) => <div className="card" key={k}><small>{k}</small><h2 className="sm-h">{v}</h2></div>)}</div>
    {!sig && <p className="muted">Salary and wording checks are available for analyses created after this update.</p>}
    <p className="grp">Observations</p>
    {notes.length ? <ul className="why">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul> : <p className="muted">Nothing unusual noticed in the text.</p>}
    <p className="muted"><small>These are neutral observations about the wording, not a judgement on the employer or the job posting.</small></p></section>);
}
