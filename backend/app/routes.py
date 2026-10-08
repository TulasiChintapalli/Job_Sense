import json, re, jwt, datetime
from functools import wraps
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from .models import db, User, Analysis, SkillProgress, PracticeSession
from .services.files import extract_text, FileError
from .services.analyzer import analyze
from .services.ai import refine_summary, AIError
from .services import practice
bp = Blueprint("api", __name__)

def token_for(u):
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    return jwt.encode({"sub": str(u.id), "exp": exp}, current_app.config["SECRET_KEY"], algorithm="HS256")

def auth(fn):
    @wraps(fn)
    def w(*a, **k):
        try:
            p = jwt.decode(request.headers.get("Authorization", "")[7:], current_app.config["SECRET_KEY"], algorithms=["HS256"])
            g.user = db.session.get(User, int(p["sub"]))
        except Exception:
            g.user = None
        if not g.user: return jsonify(error="Please log in to continue."), 401
        return fn(*a, **k)
    return w

def creds():
    d = request.get_json(silent=True) or {}
    e, p = (d.get("email") or "").strip().lower(), d.get("password") or ""
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", e): return None, None, "Enter a valid email address."
    if len(p) < 8: return None, None, "Password must be at least 8 characters."
    return e, p, None

@bp.post("/auth/signup")
def signup():
    e, p, err = creds()
    if err: return jsonify(error=err), 400
    if User.query.filter_by(email=e).first(): return jsonify(error="An account with this email already exists."), 409
    u = User(email=e, password_hash=generate_password_hash(p)); db.session.add(u); db.session.commit()
    return jsonify(token=token_for(u), user={"email": u.email}), 201

@bp.post("/auth/login")
def login():
    e, p, err = creds()
    u = User.query.filter_by(email=e).first() if e else None
    if not u or not check_password_hash(u.password_hash, p or ""): return jsonify(error="Incorrect email or password."), 401
    return jsonify(token=token_for(u), user={"email": u.email})

@bp.get("/auth/me")
@auth
def me(): return jsonify(user={"email": g.user.email})

@bp.post("/analyze")
@auth
def run():
    try:
        jd = (request.form.get("jd_text") or "").strip()
        if request.files.get("jd_file"): jd = extract_text(request.files["jd_file"])
        if len(jd) < 50: return jsonify(error="Please provide a job description."), 400
        rf = request.files.get("resume")
        if not rf: return jsonify(error="Upload your resume to receive personalized skill-gap analysis."), 400
        resume = extract_text(rf)
    except FileError as e:
        return jsonify(error=str(e)), 400
    res = analyze(jd, resume)
    res["summary"] = refine_summary(res["summary"], jd)
    a = Analysis(user_id=g.user.id, title=res["title"], company=res["company"], score=res["scores"]["overall"], result=json.dumps(res))
    db.session.add(a); db.session.commit()
    return jsonify(a.full()), 201

@bp.get("/analyses")
@auth
def listing():
    q = Analysis.query.filter_by(user_id=g.user.id)
    s = (request.args.get("q") or "").strip()
    if s: q = q.filter(db.or_(Analysis.title.ilike(f"%{s}%"), Analysis.company.ilike(f"%{s}%")))
    return jsonify(items=[a.brief() for a in q.order_by(Analysis.created.desc()).all()])

@bp.get("/analyses/<int:i>")
@auth
def one(i):
    a = Analysis.query.filter_by(id=i, user_id=g.user.id).first()
    return (jsonify(a.full()) if a else (jsonify(error="Analysis not found."), 404))

@bp.delete("/analyses/<int:i>")
@auth
def rm(i):
    a = Analysis.query.filter_by(id=i, user_id=g.user.id).first()
    if not a: return jsonify(error="Analysis not found."), 404
    PracticeSession.query.filter_by(analysis_id=i, user_id=g.user.id).delete()
    db.session.delete(a); db.session.commit(); return "", 204

STATUSES = {"not_started", "learning", "completed"}

@bp.get("/skill-progress")
@auth
def progress_list():
    rows = SkillProgress.query.filter_by(user_id=g.user.id).all()
    return jsonify(items={x.skill: x.status for x in rows})

@bp.put("/skill-progress")
@auth
def progress_set():
    d = request.get_json(silent=True) or {}
    skill, status = d.get("skill"), d.get("status")
    if not isinstance(skill, str) or not skill.strip() or len(skill) > 80: return jsonify(error="Invalid skill."), 400
    if status not in STATUSES: return jsonify(error="Invalid status."), 400
    skill = skill.strip()
    row = SkillProgress.query.filter_by(user_id=g.user.id, skill=skill).first()
    if row: row.status = status
    else: db.session.add(SkillProgress(user_id=g.user.id, skill=skill, status=status))
    db.session.commit()
    return jsonify(skill=skill, status=status)

@bp.get("/progress/summary")
@auth
def progress_summary():
    from collections import Counter
    rows = Analysis.query.filter_by(user_id=g.user.id).all()
    scores, req, miss, roles = [], Counter(), Counter(), Counter()
    for a in rows:
        try: res = json.loads(a.result)
        except Exception: continue
        if a.score is not None: scores.append(a.score)
        for v in (res.get("jd_skills") or {}).values():
            for sk in set(v): req[sk] += 1
        for mm in res.get("missing") or []: miss[mm["skill"]] += 1
        rt = (res.get("meta") or {}).get("role_type")
        if rt and rt != "Not specified": roles[rt] += 1
    top = lambda c: sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[0][0] if c else None
    done = SkillProgress.query.filter_by(user_id=g.user.id, status="completed").count()
    learning = SkillProgress.query.filter_by(user_id=g.user.id, status="learning").count()
    n_assess, n_int, best_int = 0, 0, 0
    for ps in PracticeSession.query.filter_by(user_id=g.user.id).all():
        try: pd = json.loads(ps.data)
        except Exception: continue
        if ps.kind == "assessment" and pd.get("result"): n_assess += 1
        if ps.kind == "interview" and pd.get("report"): n_int += 1; best_int = max(best_int, pd["report"].get("overall") or 0)
    xp = len(rows) * 10 + learning * 5 + done * 20 + n_assess * 15 + n_int * 20
    badges = [
        {"id": "first_analysis", "icon": "🏅", "name": "First Analysis", "desc": "Analyze your first job.", "earned": len(rows) >= 1},
        {"id": "skill_explorer", "icon": "🎯", "name": "Skill Explorer", "desc": "Complete a skill assessment.", "earned": n_assess >= 1},
        {"id": "interview_ready", "icon": "🎤", "name": "Interview Ready", "desc": "Score 7/10 or more in a mock interview.", "earned": best_int >= 7},
        {"id": "roadmap_starter", "icon": "📚", "name": "Roadmap Starter", "desc": "Start learning a skill from your roadmap.", "earned": learning + done >= 1},
    ]
    return jsonify(xp=xp, level=xp // 100 + 1, level_xp=xp % 100, badges=badges, count=len(rows), average=round(sum(scores) / len(scores)) if scores else None, best=max(scores) if scores else None,
                   most_requested=top(req), top_missing=top(miss), career_goal=top(roles), completed_skills=done)

# ---------------- Practice: skill assessment + mock interview ----------------
def _ai_err(e):
    return jsonify(error=str(e), ai_unavailable=True, code=e.code), 503

def _own_analysis(i):
    return Analysis.query.filter_by(id=i, user_id=g.user.id).first()

def _session(sid, kind):
    s = PracticeSession.query.filter_by(id=sid, user_id=g.user.id, kind=kind).first()
    return s, (json.loads(s.data) if s else None)

def _save(s, data):
    s.data = json.dumps(data); db.session.commit()

@bp.post("/analyses/<int:i>/assessment")
@auth
def assessment_start(i):
    a = _own_analysis(i)
    if not a: return jsonify(error="Analysis not found."), 404
    questions, skipped = practice.build_assessment(json.loads(a.result))
    if not questions:
        msg = "No technical skills to assess for this job. Great news, you have no skill gaps." if not skipped else "No questions are available for these skills yet: " + ", ".join(skipped) + ". Add AI_API_KEY to generate questions for them."
        return jsonify(error=msg), 400
    s = PracticeSession(user_id=g.user.id, analysis_id=i, kind="assessment", data=json.dumps({"questions": questions, "skipped": skipped, "result": None}))
    db.session.add(s); db.session.commit()
    hide = [{k: v for k, v in q.items() if k not in ("correct", "explanation")} for q in questions]
    return jsonify(session_id=s.id, questions=hide, skipped=skipped), 201

@bp.post("/assessment/<int:sid>/submit")
@auth
def assessment_submit(sid):
    s, d = _session(sid, "assessment")
    if not s: return jsonify(error="Assessment not found."), 404
    if d.get("result"): return jsonify(result=d["result"])
    ans = (request.get_json(silent=True) or {}).get("answers")
    if not isinstance(ans, dict): return jsonify(error="Please answer the questions first."), 400
    clean = {str(k): v for k, v in ans.items() if isinstance(v, int) and not isinstance(v, bool) and 0 <= v < 4}
    if len(clean) < len(d["questions"]): return jsonify(error="Please answer every question before submitting."), 400
    d["result"] = practice.grade_assessment(d["questions"], clean)
    _save(s, d)
    return jsonify(result=d["result"])

@bp.post("/analyses/<int:i>/interview")
@auth
def interview_start(i):
    a = _own_analysis(i)
    if not a: return jsonify(error="Analysis not found."), 404
    ctx = practice.interview_context(a, json.loads(a.result))
    try: qs = practice.generate_questions(ctx)
    except AIError as e: return _ai_err(e)
    s = PracticeSession(user_id=g.user.id, analysis_id=i, kind="interview", data=json.dumps({"questions": qs, "evals": {}, "report": None}))
    db.session.add(s); db.session.commit()
    return jsonify(session_id=s.id, questions=qs, categories=practice.CATS), 201

@bp.post("/interview/<int:sid>/answer")
@auth
def interview_answer(sid):
    s, d = _session(sid, "interview")
    if not s: return jsonify(error="Interview not found."), 404
    b = request.get_json(silent=True) or {}
    qid, text = b.get("question_id"), (b.get("answer") or "")
    q = next((x for x in d["questions"] if x["id"] == qid), None) if isinstance(qid, int) else None
    if not q: return jsonify(error="Unknown question."), 400
    if not isinstance(text, str) or len(text.strip()) < 10: return jsonify(error="Write a few sentences so the answer can be evaluated (at least 10 characters)."), 400
    if len(text) > 4000: return jsonify(error="Please keep the answer under 4000 characters."), 400
    if str(qid) in d["evals"]: return jsonify(evaluation=d["evals"][str(qid)])
    a = _own_analysis(s.analysis_id)
    if not a: return jsonify(error="Analysis not found."), 404
    try: ev = practice.evaluate_answer(practice.interview_context(a, json.loads(a.result)), q["question"], text.strip())
    except AIError as e: return _ai_err(e)
    d["evals"][str(qid)] = ev; _save(s, d)
    return jsonify(evaluation=ev)

@bp.post("/interview/<int:sid>/finish")
@auth
def interview_finish(sid):
    s, d = _session(sid, "interview")
    if not s: return jsonify(error="Interview not found."), 404
    rep = practice.interview_report(d["questions"], d["evals"])
    if not rep: return jsonify(error="Answer at least one question to get a report."), 400
    d["report"] = rep; _save(s, d)
    return jsonify(report=rep)

@bp.get("/analyses/<int:i>/practice")
@auth
def practice_summary(i):
    if not _own_analysis(i): return jsonify(error="Analysis not found."), 404
    out = {"assessment": None, "interview": None}
    for s in PracticeSession.query.filter_by(user_id=g.user.id, analysis_id=i).order_by(PracticeSession.created.desc()).all():
        d = json.loads(s.data)
        if s.kind == "assessment" and not out["assessment"] and d.get("result"): out["assessment"] = {"percent": d["result"]["percent"], "correct": d["result"]["correct"], "total": d["result"]["total"]}
        if s.kind == "interview" and not out["interview"] and d.get("report"): out["interview"] = {"overall": d["report"]["overall"]}
    return jsonify(out)

@bp.get("/health")
def health(): return jsonify(ok=True)
