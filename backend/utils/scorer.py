# backend/utils/scorer.py
# Scoring function that prioritizes skill overlap (with teaching boosts)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

# Adjusted weights: skills dominate now
WEIGHTS = {
    "skills_overlap": 0.7,
    "text_similarity": 0.15,
    "experience_hint": 0.1,
    "education_hint": 0.05
}

def _flatten(skdict):
    # flatten skill dict to a set of lowercase skills
    return {s.lower() for arr in skdict.values() for s in arr}

def _text_similarity(a: str, b: str) -> float:
    try:
        vec = TfidfVectorizer(stop_words='english').fit([a, b])
        tfidf = vec.transform([a, b])
        sim = cosine_similarity(tfidf[0], tfidf[1])[0][0]
        return float(sim)
    except Exception:
        return 0.0

def _experience_signal(text: str) -> float:
    years = re.findall(r'(\d+)\+?\s*(?:years|yrs)', text, flags=re.IGNORECASE)
    if not years:
        years = re.findall(r'(\d+)\s+(?:year|years|yrs)', text, flags=re.IGNORECASE)
    if not years:
        return 0.2
    y = max([int(x) for x in years])
    return min(1.0, 0.2 + 0.08*y)

def _education_signal(text: str) -> float:
    t = text.lower()
    for kw, v in [("phd",1.0), ("doctor",1.0), ("master",0.8), ("m.tech",0.8), ("b.tech",0.6), ("bachelor",0.6), ("b.a",0.6), ("b.sc",0.6), ("diploma",0.4)]:
        if kw in t:
            return v
    return 0.2

def score_resume(resume_text, jd_text, resume_skills=None, jd_skills=None):
    if resume_skills is None: resume_skills = {}
    if jd_skills is None: jd_skills = {}

    # flattened sets
    res_set = _flatten(resume_skills)
    jd_set  = _flatten(jd_skills)

    # detect teaching JD
    jd_low = (jd_text or "").lower()
    teaching_keywords = ["teach", "teacher", "classroom", "lesson", "student", "curriculum"]
    is_teaching_jd = any(k in jd_low for k in teaching_keywords)

    # if teaching JD, optionally restrict to teaching bucket if present
    if is_teaching_jd:
        res_teach = set([s.lower() for s in resume_skills.get("teaching", [])])
        jd_teach  = set([s.lower() for s in jd_skills.get("teaching", [])])
        if res_teach or jd_teach:
            res_set = res_teach
            jd_set = jd_teach

    inter = len(res_set & jd_set)
    union = len(res_set | jd_set) or 1
    skills_overlap = inter / union

    try:
        text_sim = _text_similarity(resume_text, jd_text)
    except Exception:
        text_sim = 0.0

    exp_sig = _experience_signal(resume_text)
    edu_sig = _education_signal(resume_text)

    overall = (
        WEIGHTS["skills_overlap"] * skills_overlap +
        WEIGHTS["text_similarity"] * text_sim +
        WEIGHTS["experience_hint"] * exp_sig +
        WEIGHTS["education_hint"] * edu_sig
    )

    return {
        "overall_score": round(overall * 100, 2),
        "text_similarity": round(text_sim, 3),
        "skills_matched": sorted(list(res_set & jd_set)),
        "skill_score": round(skills_overlap, 3),
        "signals": {
            "skills_overlap": round(skills_overlap, 3),
            "experience": round(exp_sig, 3),
            "education": round(edu_sig, 3)
        }
    }
