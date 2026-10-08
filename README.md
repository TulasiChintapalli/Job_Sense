# JobSense – AI Job Description Analyzer
Paste/upload a job description + resume → readiness estimate, skill gaps, prioritized action plan, roadmap, honest resume rewrites. Accounts + history included.

## Architecture
- `backend/` Flask API. `app/routes.py` (HTTP), `app/models.py` (User, Analysis), `app/services/files.py` (PDF/DOCX/TXT extraction + validation), `app/services/analyzer.py` (deterministic skill extraction, comparison, scoring, plan), `app/services/ai.py` (optional LLM summary refinement; falls back silently).
- `frontend/` React + Vite SPA (CSS animations only; no heavy libraries).
- Analysis is grounded in the two texts: nothing found → "Not specified"; resume rewrites never add experience.

## Local development
```
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env && flask --app "app:create_app" run   # :5000
cd frontend && npm install && npm run dev                                                      # :5173 (proxies /api)
```
## Environment
Backend: `SECRET_KEY`, `DATABASE_URL` (sqlite default; use a `postgresql://` URL in production), `CORS_ORIGINS`, optional `AI_API_KEY`/`AI_API_URL`/`AI_MODEL` (any OpenAI-compatible endpoint).
Frontend (build time): `VITE_API_URL` e.g. `https://api.example.com/api`.

## Production
Backend: `gunicorn "app:create_app()"` (Procfile included) on Render/Railway/Fly with the env vars above.
Frontend: `npm run build` → deploy `dist/` to Netlify/Vercel/Cloudflare Pages with SPA fallback to `index.html`.

## API (JSON, `Authorization: Bearer <token>`)
`POST /api/auth/signup|login` {email,password} · `GET /api/auth/me` · `POST /api/analyze` (multipart: `jd_text` or `jd_file`, `resume`) · `GET /api/analyses?q=` · `GET|DELETE /api/analyses/<id>` · `GET /api/health`
