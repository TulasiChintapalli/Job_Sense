import io, os
ALLOWED = {".pdf", ".docx", ".txt"}
MAX = 5 * 1024 * 1024

class FileError(ValueError): pass

def extract_text(f):
    ext = os.path.splitext(f.filename or "")[1].lower()
    if ext not in ALLOWED: raise FileError("Please upload a PDF, DOCX, or TXT file.")
    data = f.read()
    if len(data) > MAX: raise FileError("Maximum file size is 5 MB.")
    try:
        if ext == ".pdf":
            from pypdf import PdfReader
            text = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
        elif ext == ".docx":
            from docx import Document
            text = "\n".join(p.text for p in Document(io.BytesIO(data)).paragraphs)
        else:
            text = data.decode("utf-8", errors="ignore")
    except Exception:
        raise FileError("We couldn't read that file. Try another PDF, DOCX, or TXT.")
    if len(text.strip()) < 30: raise FileError("We couldn't find readable text in that file.")
    return text
