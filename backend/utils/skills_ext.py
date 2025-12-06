# backend/utils/skills_ext.py
import json
import os
import re
from collections import defaultdict
from rapidfuzz import process, fuzz

SKILLS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "skills.json")

def load_skills():
    """Load skills.json and return dict."""
    with open(SKILLS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def extract_skills(text: str, skills_db: dict, fuzzy_threshold=70):
    """
    Extract skills from text using exact phrase matching first (longer phrases prioritized)
    and a fuzzy partial match fallback.
    Returns a dict: {bucket: [skill1, skill2, ...], ...}
    """
    text_low = (text or "").lower()
    found = defaultdict(list)

    # Build list of (bucket, skill_lower, original_skill)
    all_pairs = []
    for bucket, arr in skills_db.items():
        for s in arr:
            all_pairs.append((bucket, s.lower(), s))

    # Sort by length (longer phrases first) to catch multi-word skills before single words
    all_pairs.sort(key=lambda x: -len(x[1]))

    # Exact phrase / word boundary matches
    for bucket, skill_low, skill_orig in all_pairs:
        # use word boundary for single words and phrase match for multiword
        pattern = r"\b" + re.escape(skill_low) + r"\b"
        if re.search(pattern, text_low):
            found[bucket].append(skill_orig)

    # Fuzzy fallback: match skill phrases against the whole text using partial ratio
    all_skill_lows = [p[1] for p in all_pairs]
    if all_skill_lows:
        matches = process.extract(text_low, all_skill_lows, scorer=fuzz.partial_ratio, limit=200)
        for frag, score, _ in matches:
            if score >= fuzzy_threshold:
                # map back to bucket(s) and original skill text
                for bucket, skill_low, skill_orig in all_pairs:
                    if skill_low == frag:
                        if skill_orig not in found[bucket]:
                            found[bucket].append(skill_orig)

    # Deduplicate and sort lists
    return {k: sorted(set(v)) for k, v in found.items()}
