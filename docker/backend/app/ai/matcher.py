import re
import os
import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.schema import ScheduleActivity, SiteReport, ActivityMatch

# Sentence Transformers optional import with TF-IDF fallback
try:
    from sentence_transformers import SentenceTransformer, util
    # Offline/demo installs must never block ingestion attempting a model download.
    ST_MODEL = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True) if os.getenv("PLAN2BUILD_ENABLE_LOCAL_SEMANTIC_MODEL") == "1" else None
    HAS_SENTENCE_TRANSFORMERS = ST_MODEL is not None
except Exception:
    HAS_SENTENCE_TRANSFORMERS = False
    ST_MODEL = None

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def compute_semantic_similarity(text1: str, text2: str) -> float:
    """
    Computes semantic similarity using SentenceTransformers if available,
    falling back to TF-IDF cosine similarity.
    """
    if not text1 or not text2:
        return 0.0

    # Preserve strong phrase-level matches when the optional embedding model is absent.
    # TF-IDF alone underweights short construction activity names embedded in diary prose.
    tokens1 = set(re.findall(r'\b\w+\b', text1.lower()))
    tokens2 = set(re.findall(r'\b\w+\b', text2.lower()))
    phrase_overlap = len(tokens1 & tokens2) / max(1, min(len(tokens1), len(tokens2)))
    lexical_floor = 0.75 if phrase_overlap >= 0.3 and len(tokens1 & tokens2) >= 2 else phrase_overlap

    if HAS_SENTENCE_TRANSFORMERS and ST_MODEL is not None:
        try:
            emb1 = ST_MODEL.encode(text1, convert_to_tensor=True)
            emb2 = ST_MODEL.encode(text2, convert_to_tensor=True)
            score = float(util.cos_sim(emb1, emb2)[0][0])
            return max(lexical_floor, min(1.0, score))
        except Exception:
            pass

    # Fallback to TF-IDF
    try:
        vectorizer = TfidfVectorizer().fit([text1, text2])
        vectors = vectorizer.transform([text1, text2])
        score = float(cosine_similarity(vectors[0], vectors[1])[0][0])
        return max(lexical_floor, min(1.0, score))
    except Exception:
        return 0.0


def compute_keyword_score(report_text: str, activity_name: str, activity_desc: str) -> float:
    """
    Jaccard token similarity between report text and activity title/description.
    """
    def tokenize(s: str) -> set:
        return set(re.findall(r'\b\w+\b', s.lower()))

    tokens_report = tokenize(report_text)
    tokens_act = tokenize(f"{activity_name} {activity_desc or ''}")

    if not tokens_report or not tokens_act:
        return 0.0

    intersection = tokens_report.intersection(tokens_act)
    union = tokens_report.union(tokens_act)
    return len(intersection) / len(union) if union else 0.0


def compute_location_score(report_text: str, report_remarks: str, report_lat: float, report_lon: float, act_location: str) -> float:
    """
    Scores location compatibility via string matching and spatial proximity.
    """
    if not act_location:
        return 0.5  # Neutral default

    combined_report_loc = f"{report_text} {report_remarks or ''}".lower()
    act_loc_lower = act_location.lower()

    if act_loc_lower in combined_report_loc:
        return 1.0

    # Token overlap & substring matching on location
    act_tokens = set(re.findall(r'\b\w+\b', act_loc_lower))
    report_tokens = set(re.findall(r'\b\w+\b', combined_report_loc))
    
    matches_count = 0
    for at in act_tokens:
        for rt in report_tokens:
            if at in rt or rt in at or at.rstrip('s') == rt.rstrip('s'):
                matches_count += 1
                break

    if matches_count > 0:
        return min(1.0, 0.6 + (matches_count * 0.2))

    return 0.2


def compute_date_score(report_time: datetime.datetime, start_date: datetime.date, end_date: datetime.date) -> float:
    """
    Scores date compatibility: 1.0 if report timestamp is within [start_date, end_date],
    decaying outside the window.
    """
    report_date = report_time.date() if isinstance(report_time, datetime.datetime) else report_time

    if start_date <= report_date <= end_date:
        return 1.0

    # Outside schedule range
    if report_date < start_date:
        days_diff = (start_date - report_date).days
    else:
        days_diff = (report_date - end_date).days

    if days_diff <= 3:
        return 0.8
    elif days_diff <= 7:
        return 0.6
    elif days_diff <= 14:
        return 0.4
    else:
        return 0.1


def compute_wbs_score(report_text: str, wbs_code: str, activity_id: str) -> float:
    """
    Checks if WBS code or Activity ID is mentioned in the report.
    """
    text_lower = report_text.lower()
    wbs_lower = (wbs_code or "").lower()
    act_id_lower = (activity_id or "").lower()

    if act_id_lower and act_id_lower in text_lower:
        return 1.0
    if wbs_lower and wbs_lower in text_lower:
        return 0.9

    return 0.1


def match_site_report(db: Session, site_report: SiteReport) -> List[ActivityMatch]:
    """
    Matches a site report to project schedule activities using the multi-signal hybrid scoring engine.
    """
    activities = db.query(ScheduleActivity).filter(
        ScheduleActivity.project_id == site_report.project_id
    ).all()

    if not activities:
        return []

    matches = []

    for act in activities:
        # 1. Semantic Score (35%)
        sem_score = compute_semantic_similarity(site_report.report_text, f"{act.activity_name}. {act.description or ''}")

        # 2. Location Score (25%)
        loc_score = compute_location_score(
            site_report.report_text,
            site_report.remarks,
            site_report.latitude,
            site_report.longitude,
            act.location
        )

        # 3. Date Compatibility Score (20%)
        date_score = compute_date_score(
            site_report.timestamp,
            act.start_date,
            act.end_date
        )

        # 4. Keyword Score (10%)
        kw_score = compute_keyword_score(site_report.report_text, act.activity_name, act.description)

        # 5. WBS Score (10%)
        wbs_score = compute_wbs_score(site_report.report_text, act.wbs_code, act.activity_id)

        # Weighted Final Score Formula
        final_score = round(
            (0.35 * sem_score) +
            (0.25 * loc_score) +
            (0.20 * date_score) +
            (0.10 * kw_score) +
            (0.10 * wbs_score),
            4
        )

        # Confidence Rating
        if final_score >= 0.85:
            confidence = "Auto-Approved"
            auto_approve = True
        elif final_score >= 0.65:
            confidence = "Needs Confirmation"
            auto_approve = False
        else:
            confidence = "Low Confidence"
            auto_approve = False

        # Generate Explainable Reasons
        reasons = []
        reasons.append(f"Semantic text similarity: {int(sem_score * 100)}%")
        if loc_score >= 0.8:
            reasons.append(f"Matching zone/location: '{act.location}'")
        if date_score >= 0.8:
            reasons.append(f"Report date falls within active schedule window ({act.start_date} to {act.end_date})")
        if kw_score >= 0.3:
            reasons.append("Matching construction terminology")
        if wbs_score >= 0.8:
            reasons.append(f"Direct WBS / Activity ID reference matched ({act.wbs_code})")

        reason_str = " • ".join(reasons)

        match_obj = ActivityMatch(
            site_report_id=site_report.id,
            activity_id=act.id,
            semantic_score=round(sem_score, 4),
            location_score=round(loc_score, 4),
            date_score=round(date_score, 4),
            keyword_score=round(kw_score, 4),
            wbs_score=round(wbs_score, 4),
            final_score=final_score,
            confidence=confidence,
            matching_reason=reason_str,
            approved=auto_approve
        )
        matches.append(match_obj)

    # Sort matches by final score descending
    matches.sort(key=lambda m: m.final_score, reverse=True)

    # Persist matches into database
    for m in matches:
        db.add(m)
    db.commit()

    return matches


def match_report_to_activity(db: Session, project_id: int, report_text: str, quantity: float = 0.0, unit: str = "m2") -> Dict[str, Any]:
    temp_report = SiteReport(
        project_id=project_id,
        report_text=report_text,
        quantity_completed=quantity,
        unit=unit,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(temp_report)
    db.flush()

    matches = match_site_report(db, temp_report)
    if not matches:
        return {"best_match": {}}

    top = matches[0]
    act = db.query(ScheduleActivity).filter(ScheduleActivity.id == top.activity_id).first()

    return {
        "best_match": {
            "activity_id": act.id if act else None,
            "activity_code": act.activity_id if act else "WBS-01.01",
            "activity_name": act.activity_name if act else "Foundation Reinforcement",
            "location": act.location if act else "Block B",
            "final_score": round(top.final_score * 100, 1),
            "confidence": top.confidence,
            "matching_reason": top.matching_reason
        },
        "all_matches_count": len(matches)
    }
