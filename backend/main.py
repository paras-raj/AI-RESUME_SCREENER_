from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.utils.resume_parser import extract_text
from backend.utils.skills_ext import load_skills, extract_skills
from backend.utils.scorer import score_resume

app = FastAPI(title="AI Resume Screener")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # <-- tumhara frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = extract_text(content, file.filename)
        return {"filename": file.filename, "preview": text[:1500]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/score")
async def score(file: UploadFile = File(...), job_description: str = Form(...)):
    try:
        content = await file.read()
        resume_text = extract_text(content, file.filename)
        jd_text = job_description

        skills_db = load_skills()
        res_skills = extract_skills(resume_text, skills_db)
        jd_skills = extract_skills(jd_text, skills_db)

        result = score_resume(resume_text, jd_text, resume_skills=res_skills, jd_skills=jd_skills)
        # include the extracted skills for debugging/visibility
        result["resume_skills"] = res_skills
        result["jd_skills"] = jd_skills
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
