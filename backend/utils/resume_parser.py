from docx import Document
from PyPDF2 import PdfReader
import io, re

def extract_text(content: bytes, filename: str) -> str:
    """Extract text from PDF, DOCX or TXT resume files."""
    name = filename.lower()
    
    if name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
    
    elif name.endswith(".docx"):
        f = io.BytesIO(content)
        doc = Document(f)
        text = "\n".join([p.text for p in doc.paragraphs])
    
    elif name.endswith(".txt"):
        text = content.decode("utf-8", errors="ignore")
    
    else:
        raise ValueError("Unsupported file format (use PDF, DOCX, or TXT only)")

    # Clean up unnecessary spaces and newlines
    text = re.sub(r"\s+", " ", text)
    return text.strip()
