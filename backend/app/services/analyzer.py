import re
TAX = {
 "Programming Languages": ["Python","Java","JavaScript","TypeScript","C++","C#","Go","Ruby","PHP","Kotlin","Swift","R","Rust"],
 "Frameworks": ["Flask","Django","FastAPI","React","Angular","Vue","Node.js","Spring Boot","Express",".NET","Next.js","TensorFlow","PyTorch"],
 "Databases": ["SQL","PostgreSQL","MySQL","MongoDB","SQLite","Redis","NoSQL"],
 "Cloud": ["AWS","Azure","GCP","Kubernetes","Terraform"],
 "Tools": ["Git","Docker","REST API","GraphQL","CI/CD","Jenkins","Linux","Jira","Postman","Agile","Microservices","HTML","CSS","Kafka"],
 "Soft Skills": ["Communication","Teamwork","Leadership","Problem Solving","Collaboration","Adaptability","Critical Thinking"],
}
ALIAS = {"REST API":["rest api","rest apis","restful","restful apis"],"Node.js":["node.js","nodejs"],"PostgreSQL":["postgresql","postgres"],
 "AWS":["aws","amazon web services"],"GCP":["gcp","google cloud"],"CI/CD":["ci/cd","ci-cd","continuous integration"],
 "Problem Solving":["problem solving","problem-solving"],"Teamwork":["teamwork","team player"],".NET":[".net","dotnet"],
 "Spring Boot":["spring boot"],"Kubernetes":["kubernetes","k8s"],"Go":["golang"],"JavaScript":["javascript"],"Collaboration":["collaborat"],
 "Critical Thinking":["critical thinking"],"Next.js":["next.js","nextjs"],"NoSQL":["nosql"],"SQL":["sql"]}
CS = {"Go":r"\bGo\b","R":r"\bR\b","C++":r"C\+\+","C#":r"C#",".NET":r"\.NET"}
def _pat(s):
    if s in ("R", "C++", "C#", ".NET"): return re.compile(CS[s])
    names = ALIAS.get(s, [s.lower()])
    p = r"(?<![\w.+#])(?:" + "|".join(re.escape(n) for n in names) + r")(?![\w+#])"
    if s == "Go": return re.compile(r"\bGo\b|(?i:golang)")
    if s == "SQL": return re.compile(r"(?<![A-Za-z])sql(?![A-Za-z])", re.I)
    return re.compile(p, re.I)
PAT = {s: _pat(s) for v in TAX.values() for s in v}
PREF = re.compile(r"preferred|nice to have|bonus|a plus|good to have|desirable", re.I)
TECH = {"Programming Languages","Frameworks","Databases","Cloud"}

def scan(text):
    found, pref = {}, False
    for line in re.split(r"[\r\n]+", text):
        l = line.strip().lower()
        if re.match(r"^\W*(preferred|nice to have|bonus|good to have|desirable)", l): pref = True
        elif re.match(r"^\W*(requirements|required|qualifications|responsibilities|must have|what you)", l): pref = False
        lp = pref or bool(PREF.search(l))
        for cat, skills in TAX.items():
            for s in skills:
                n = len(PAT[s].findall(line))
                if n:
                    d = found.setdefault(s, {"cat": cat, "count": 0, "required": False})
                    d["count"] += n
                    if not lp: d["required"] = True
    return found

GUIDE = {
 "REST API": ("HTTP methods, status codes, resource design, JSON, auth, validation", "Build a CRUD REST API with auth and documented endpoints", "Beginner"),
 "Docker": ("Images, containers, Dockerfile, volumes, docker-compose", "Dockerize an existing app with a database via compose", "Beginner"),
 "AWS": ("EC2, S3, IAM basics and deploying a simple web app", "Deploy a containerized app to AWS and serve static files from S3", "Intermediate"),
 "SQL": ("Joins, aggregations, indexes, schema design", "Design a normalized schema and write reporting queries", "Beginner"),
 "Git": ("Branching, pull requests, merge conflicts", "Contribute to a small open-source repo through a pull request", "Beginner"),
 "Kubernetes": ("Pods, deployments, services, config maps", "Run a two-service app on a local cluster", "Advanced"),
 "CI/CD": ("Pipelines, automated tests, deploy stages", "Add a GitHub Actions pipeline that tests and deploys your project", "Intermediate"),
 "React": ("Components, state, hooks, routing", "Build a dashboard that consumes your own API", "Intermediate"),
}
def _evidence(text, skill):
    """Return the real resume line mentioning the skill (never generated text)."""
    for line in re.split(r"[\r\n]+", text):
        if PAT[skill].search(line):
            l = line.strip(" \u2022-*\t")
            if l: return l[:160]
    return None

def guide(s, cat):
    if s in GUIDE: return GUIDE[s]
    return (f"Core concepts and everyday usage of {s}", f"Build a small project that uses {s} and add it to your resume", "Intermediate" if cat in TECH else "Beginner")

def _years(t):
    v = [int(x) for x in re.findall(r"(\d{1,2})\s*\+?\s*(?:-\s*\d+\s*)?(?:years|yrs)", t, re.I)]
    return max(v) if v else None
def _edu(t):
    t = t.lower()
    for r, k in ((4, "phd|doctorate"), (3, "master|m\\.?sc|mba|m\\.tech"), (2, "bachelor|b\\.?tech|b\\.?sc|b\\.?e\\b|b\\.s\\."), (1, "diploma|associate")):
        if re.search(k, t): return r
    return 0
EDU = {0: "Not specified", 1: "Diploma / Associate", 2: "Bachelor's degree", 3: "Master's degree", 4: "PhD"}
def _grab(pat, t):
    m = re.search(pat, t, re.I | re.M)
    return m.group(1).strip(" .,-")[:80] if m else "Not specified"

def _pct(items, have):
    if not items: return None
    tot = sum(2 if d["required"] else 1 for d in items.values())
    got = sum((2 if d["required"] else 1) for s, d in items.items() if s in have)
    return round(100 * got / tot)

def _signals(jd):
    """Neutral, text-based observations. Never judges whether a posting is genuine."""
    sal = bool(re.search(r"(?:[$\u20b9\u20ac\u00a3]\s?\d|\b(?:rs\.?|inr|usd|eur|gbp)\s?\d|\d\s?(?:lpa|lakhs?)\b|\d[\d,.]*\s?(?:per|/)\s?(?:year|annum|month|hour)\b)", jd, re.I))
    lines = [re.sub(r"\s+", " ", l.strip(" \u2022-*\t").lower()) for l in jd.splitlines()]
    seen, dup = set(), []
    for l in lines:
        if len(l) > 15:
            if l in seen and l not in dup: dup.append(l)
            seen.add(l)
    yrs = sorted({int(x) for x in re.findall(r"(\d{1,2})\s*\+?\s*(?:-\s*\d+\s*)?(?:years|yrs)", jd, re.I)})
    notes = []
    if len(yrs) > 1: notes.append(f"The posting mentions several experience figures ({', '.join(str(y) for y in yrs)} years). It may be worth clarifying which applies.")
    if re.search(r"intern|fresher|entry[- ]level|junior", jd, re.I) and yrs and max(yrs) >= 3:
        notes.append(f"The role is described as entry-level or junior, but also mentions {max(yrs)}+ years of experience.")
    if re.search(r"\bremote\b", jd, re.I) and re.search(r"on-?site|in[- ]office", jd, re.I) and not re.search(r"hybrid", jd, re.I):
        notes.append("The posting mentions both remote and on-site work. The exact arrangement may need clarifying.")
    return {"salary": "Specified" if sal else "Not specified", "duplicates": dup[:5], "notes": notes}

def analyze(jd, resume):
    js, rs = scan(jd), scan(resume)
    have = [{"skill": s, "strength": "strong" if rs[s]["count"] >= 2 else "partial", "cat": d["cat"],
             "evidence": _evidence(resume, s), "confidence": "High" if rs[s]["count"] >= 2 else "Partial", "status": "Detected" if rs[s]["count"] >= 2 else "Partially detected"} for s, d in js.items() if s in rs]
    miss = []
    for s, d in js.items():
        if s in rs: continue
        pr = "LOW" if not d["required"] else ("HIGH" if d["count"] >= 2 or d["cat"] in ("Programming Languages", "Frameworks", "Databases") else "MEDIUM")
        miss.append({"skill": s, "cat": d["cat"], "priority": pr, "required": d["required"], "mentions": d["count"], "status": "Not detected"})
    order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    miss.sort(key=lambda m: (order[m["priority"]], -m["mentions"]))
    hs = set(rs)
    tech = {s: d for s, d in js.items() if d["cat"] in TECH}
    tools = {s: d for s, d in js.items() if d["cat"] == "Tools"}
    soft = {s: d for s, d in js.items() if d["cat"] == "Soft Skills"}
    jy, ry = _years(jd), _years(resume)
    exp = None if jy is None else (40 if ry is None else min(100, round(100 * ry / max(jy, 1))))
    je, re_ = _edu(jd), _edu(resume)
    edu = None if not je else (100 if re_ >= je else 60 if re_ else 30)
    scores = {"technical": _pct(tech, hs), "tools": _pct(tools, hs), "soft": _pct(soft, hs), "experience": exp, "education": edu}
    w = {"technical": .4, "tools": .2, "soft": .1, "experience": .2, "education": .1}
    av = {k: v for k, v in scores.items() if v is not None}
    scores["overall"] = round(sum(av[k] * w[k] for k in av) / sum(w[k] for k in av)) if av else 0

    sw = sum(w[k] for k in av)
    CATKEY = {**{c: "technical" for c in TECH}, "Tools": "tools", "Soft Skills": "soft"}
    groups = {"technical": ("Technical Skills", tech), "tools": ("Tools", tools), "soft": ("Soft Skills", soft)}
    explain = {}
    for k, (label, items) in groups.items():
        if k not in av:
            explain[k] = {"label": label, "score": None, "note": "The job description doesn't mention any skills in this category."}; continue
        explain[k] = {"label": label, "score": av[k], "weight": round(100 * w[k] / sw), "points": round(av[k] * w[k] / sw, 1), "max_points": round(100 * w[k] / sw, 1),
                      "matched": [x for x in items if x in hs], "missing": [x for x in items if x not in hs],
                      "required_missing": [x for x in items if x not in hs and items[x]["required"]]}
    explain["experience"] = {"label": "Experience", "score": scores["experience"], **({"weight": round(100 * w["experience"] / sw), "points": round(av["experience"] * w["experience"] / sw, 1), "max_points": round(100 * w["experience"] / sw, 1),
        "note": (f"The job asks for {jy}+ years. " + (f"Your resume mentions {ry} years." if ry else "Your resume doesn't state years of experience, so a cautious 40% estimate is used."))} if "experience" in av else {"note": "The job description doesn't state an experience requirement."})}
    explain["education"] = {"label": "Education", "score": scores["education"], **({"weight": round(100 * w["education"] / sw), "points": round(av["education"] * w["education"] / sw, 1), "max_points": round(100 * w["education"] / sw, 1),
        "note": f"The job asks for: {EDU[je]}. " + ("Your resume shows an equal or higher level." if re_ >= je else "Your resume shows a lower level." if re_ else "No matching education found in your resume.")} if "education" in av else {"note": "The job description doesn't state an education requirement."})}
    improve = []
    for m in miss:
        k = CATKEY.get(m["cat"]); items = groups[k][1] if k else {}
        if not k or k not in av or not items: continue
        tot = sum(2 if d["required"] else 1 for d in items.values())
        pts = round(100 * w[k] / sw * (2 if m["required"] else 1) / tot)
        improve.append({"skill": m["skill"], "priority": m["priority"], "required": m["required"], "category": groups[k][0], "impact_estimate": pts})
    improve.sort(key=lambda x: (order[x["priority"]], -x["impact_estimate"], x["skill"]))

    plan = []
    for m in [m for m in miss if m["cat"] != "Soft Skills"]:
        learn, proj, diff = guide(m["skill"], m["cat"])
        why = ("Required directly by the job description and not found in your resume." if m["required"] and m["priority"] == "HIGH" else
               "The role expects this and your resume doesn't show it." if m["required"] else
               "Listed as a preferred skill rather than a core requirement.")
        plan.append({"step": len(plan) + 1, "skill": m["skill"], "priority": m["priority"], "why": why, "learn": learn, "project": proj, "difficulty": diff})

    names = [s for s, _ in sorted(js.items(), key=lambda kv: -kv[1]["count"])]
    fw = [s for s in js if js[s]["cat"] == "Frameworks"]
    role = ("Frontend development" if set(fw) & {"React", "Angular", "Vue", "Next.js"} else "Machine learning" if set(fw) & {"TensorFlow", "PyTorch"}
            else "Backend development" if set(fw) & {"Flask", "Django", "FastAPI", "Node.js", "Spring Boot", "Express"} else "Not specified")
    title = _grab(r"(?:job title|position|role)\s*[:\-]\s*(.+)", jd)
    if title == "Not specified":
        first = next((l.strip() for l in jd.splitlines() if l.strip()), "")
        if len(first) < 70: title = first
    company = _grab(r"company(?: name)?\s*[:\-]\s*(.+)", jd)
    if company == "Not specified": company = _grab(r"\bat ([A-Z][\w&.]+(?: [A-Z][\w&.]+){0,2})", jd)
    level = ("Entry level" if re.search(r"intern|fresher|entry[- ]level|graduate", jd, re.I) else "Not specified" if jy is None else "Entry level" if jy <= 1 else "Mid level" if jy <= 4 else "Senior")
    wm = re.search(r"\b(remote|hybrid|on-?site)\b", jd, re.I)
    meta = {"role_type": role, "level": level, "work_mode": wm.group(1).title() if wm else "Not specified",
            "location": _grab(r"location\s*[:\-]\s*(.+)", jd), "education": EDU[je], "experience": f"{jy}+ years" if jy else "Not specified"}
    summary = (f"This role is focused on {role.lower()}. " if role != "Not specified" else "This role ") + \
              (f"The posting mentions {', '.join(names[:6])}." if names else "The posting lists no recognizable technical skills.")
    certs = sorted({m.group(0).strip() for m in re.finditer(r"(?:AWS|Azure|Google|Oracle|Cisco)? ?Certified[\w \-]{0,30}|\bPMP\b|\bCISSP\b|\bCCNA\b", jd)})

    sugg = []
    matched = [h["skill"] for h in have if h["cat"] != "Soft Skills"][:2]
    for line in resume.splitlines():
        l = line.strip(" \u2022-*\t")
        if 8 < len(l) < 90 and re.match(r"(worked on|helped|responsible for|involved in|assisted)", l, re.I):
            rest = re.sub(r"^(worked on|helped( with)?|responsible for|involved in|assisted( with)?)\s*", "", l, flags=re.I).strip(" .;,")
            rest = re.sub(r"^the\s+", "", rest, flags=re.I)
            if not rest: continue
            verb = "Developed" if re.search(r"develop|build|api|app|service|feature|module|system|backend|frontend|website|tool|script", rest, re.I) else "Contributed to"
            after = f"{verb} {rest}" + (f" using {' and '.join(matched)}" if matched else "") + ", [add scope and measurable result]"
            why = ["More specific: replaces a vague opener with an action verb.", "Prompts a measurable result, which recruiters look for."]
            if matched: why.append(f"Names {' and '.join(matched)}, which appear in both your resume and the job description.")
            sugg.append({"before": l, "after": after, "why": why, "warning": "Only use this suggestion if it accurately reflects your actual experience.", "skills_used": matched})
            if len(sugg) == 3: break
    gaps = []
    for m in [m for m in miss if m["required"] and m["cat"] != "Soft Skills"][:4]:
        gaps.append({"skill": m["skill"], "status": "Not detected in your resume", "suggestion": f"If you actually used {m['skill']} in a project or job, describe where and how. If not, treat it as a skill to build rather than something to add."})
    for h in [h for h in have if h["strength"] == "partial" and h["cat"] != "Soft Skills"][:3]:
        gaps.append({"skill": h["skill"], "status": "Not clearly demonstrated", "suggestion": f"{h['skill']} appears only once. If you used it in a project, describe where and how.", "evidence": h.get("evidence")})
    tip = [m["skill"] for m in miss if m["required"]][:2]
    verdict = ({"level": "strong", "message": "You already meet most core requirements. Consider applying."} if scores["overall"] >= 75 and not any(m["priority"] == "HIGH" for m in miss)
               else {"level": "potential", "message": "You match the core role but should strengthen a few important skills."} if scores["overall"] >= 50
               else {"level": "gap", "message": "Several core requirements are missing. Consider building these skills before targeting similar roles."})
    return {"title": title, "company": company, "summary": summary, "meta": meta,
            "jd_skills": {c: [s for s in v if s in js] for c, v in TAX.items() if any(s in js for s in v)},
            "have": have, "missing": miss, "scores": scores, "plan": plan, "suggestions": sugg,
            "suggestion_note": "These are rewrites of your own wording, not claims of experience. Only use them if they are true." if sugg else "No weak bullet points were detected in your resume.",
            "verdict": verdict, "certifications": certs, "preferred": [s for s, d in js.items() if not d["required"]],
            "score_explain": explain, "improve": improve[:6], "evidence_gaps": gaps, "jd_signals": _signals(jd)}
