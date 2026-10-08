import json, os, urllib.request, urllib.error

def refine_summary(summary, jd_text):
    """Optional: rewrite the summary with an OpenAI-compatible LLM, strictly grounded in the JD. Falls back silently."""
    key = os.getenv("AI_API_KEY")
    if not key: return summary
    body = {"model": os.getenv("AI_MODEL", "gpt-4o-mini"), "temperature": 0.2, "messages": [
        {"role": "system", "content": "Summarize this job description in 2-3 plain sentences for a student. Use ONLY facts in the text. Never invent salary, location, company or requirements."},
        {"role": "user", "content": jd_text[:8000]}]}
    try:
        req = urllib.request.Request(os.getenv("AI_API_URL", "https://api.openai.com/v1/chat/completions"),
            json.dumps(body).encode(), {"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)["choices"][0]["message"]["content"].strip() or summary
    except Exception:
        return summary


class AIError(Exception):
    """Raised with a message that is safe to show to the user (never contains keys)."""
    def __init__(self, msg, code="unavailable"):
        super().__init__(msg); self.code = code

def chat_json(system, user, temperature=0.4, timeout=60):
    """Call the configured OpenAI-compatible model and return parsed JSON. Raises AIError."""
    key = os.getenv("AI_API_KEY")
    if not key: raise AIError("AI isn't set up yet. Add AI_API_KEY to backend/.env and restart the backend.", "not_configured")
    body = {"model": os.getenv("AI_MODEL", "gpt-4o-mini"), "temperature": temperature,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    url = os.getenv("AI_API_URL", "https://api.openai.com/v1/chat/completions")
    try:
        req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            text = (json.load(r)["choices"][0]["message"]["content"] or "")
    except urllib.error.HTTPError as e:
        if e.code in (401, 403): raise AIError("The AI service rejected the API key. Check AI_API_KEY in backend/.env.", "bad_key")
        if e.code == 429: raise AIError("The AI service is rate-limited right now. Wait a minute and retry.", "rate_limit")
        if e.code == 404: raise AIError("The AI model or URL wasn't found. Check AI_MODEL and AI_API_URL in backend/.env.", "bad_config")
        raise AIError("The AI service returned an error. Please retry.")
    except Exception:
        raise AIError("Couldn't reach the AI service. Please retry.")
    a, b = text.find("{"), text.rfind("}")
    if a < 0 or b <= a: raise AIError("The AI returned an unreadable answer. Please retry.", "bad_output")
    try: return json.loads(text[a:b + 1])
    except Exception: raise AIError("The AI returned an unreadable answer. Please retry.", "bad_output")
