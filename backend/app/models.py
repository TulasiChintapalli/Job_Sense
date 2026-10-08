import json
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

class Analysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    title = db.Column(db.String(200)); company = db.Column(db.String(200)); score = db.Column(db.Integer)
    result = db.Column(db.Text, nullable=False)
    created = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    def brief(self):
        return dict(id=self.id, title=self.title, company=self.company, score=self.score, created=self.created.isoformat())
    def full(self):
        return {**self.brief(), "result": json.loads(self.result)}

class SkillProgress(db.Model):
    __table_args__ = (db.UniqueConstraint("user_id", "skill", name="uq_user_skill"),)
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    skill = db.Column(db.String(80), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    updated = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class PracticeSession(db.Model):
    """Skill assessments and mock interviews. `data` is a JSON blob (questions, answers, result)."""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    analysis_id = db.Column(db.Integer, nullable=False, index=True)
    kind = db.Column(db.String(20), nullable=False)
    data = db.Column(db.Text, nullable=False)
    created = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
