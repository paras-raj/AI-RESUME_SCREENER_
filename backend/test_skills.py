# test_skills.py - quick local test for extractor
from backend.utils.resume_parser import extract_text
from backend.utils.skills_ext import load_skills, extract_skills

resume_path = r"C:\Users\HP\OneDrive\Documents\Ayushi_Rajput_Teacher_Resume.pdf"

with open(resume_path, "rb") as f:
    content = f.read()

text = extract_text(content, resume_path)
print("===== resume preview (first 400 chars) =====")
print(text[:400])
print("============================================")

skills_db = load_skills()
found = extract_skills(text, skills_db)   # default threshold
print("FOUND SKILLS:")
for k, v in found.items():
    print(k + " -> " + str(v))
