import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from .models import db

def create_app():
    load_dotenv()
    app = Flask(__name__)
    url = os.getenv("DATABASE_URL", "sqlite:///jobsense.db")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    app.config.update(SQLALCHEMY_DATABASE_URI=url, SECRET_KEY=os.getenv("SECRET_KEY", "dev-only-change-me"),
                      MAX_CONTENT_LENGTH=12 * 1024 * 1024)
    CORS(app, origins=os.getenv("CORS_ORIGINS", "*").split(","))
    db.init_app(app)
    from .routes import bp
    app.register_blueprint(bp, url_prefix="/api")
    with app.app_context():
        db.create_all()

    @app.errorhandler(413)
    def too_big(_): return jsonify(error="Maximum file size is 5 MB."), 413
    @app.errorhandler(Exception)
    def fail(e):
        app.logger.exception(e)
        return jsonify(error="Something went wrong on our side. Please try again."), 500
    return app
