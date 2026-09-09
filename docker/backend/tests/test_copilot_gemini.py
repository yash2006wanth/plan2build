import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.ai.slm_engine import slm_engine

def test_slm_engine_off_topic_refusal():
    query = "What is the recipe for chocolate cake?"
    intent_info = slm_engine.parse_intent_and_entities(query)
    
    dummy_db_metrics = {
        "progress_summary": {
            "actual_progress_percentage": 58.4,
            "planned_progress_percentage": 65.0,
            "delayed_activities_count": 2
        }
    }
    
    res = slm_engine.generate_grounded_response(dummy_db_metrics, intent_info)
    assert "answer" in res
    assert "evidence" in res
    # Should refuse off-topic query politely
    assert "BuildSync" in res["answer"] or "cannot answer" in res["answer"] or "off-topic" in res["answer"].lower()

def test_slm_engine_on_domain_query():
    query = "Which activities are delayed in the project schedule?"
    intent_info = slm_engine.parse_intent_and_entities(query)
    
    dummy_db_metrics = {
        "progress_summary": {
            "actual_progress_percentage": 58.4,
            "planned_progress_percentage": 65.0,
            "delayed_activities_count": 2
        }
    }
    
    res = slm_engine.generate_grounded_response(dummy_db_metrics, intent_info)
    assert "answer" in res
    assert "evidence" in res
    assert res["answer"] != ""

def test_slm_engine_greeting():
    query = "hi"
    intent_info = slm_engine.parse_intent_and_entities(query)
    dummy_db_metrics = {
        "progress_summary": {
            "actual_progress_percentage": 58.4,
            "planned_progress_percentage": 65.0,
            "delayed_activities_count": 2
        }
    }
    res = slm_engine.generate_grounded_response(dummy_db_metrics, intent_info)
    assert "answer" in res
    assert "Hello" in res["answer"] or "BuildSync" in res["answer"]

if __name__ == "__main__":
    print("Testing greeting response...")
    test_slm_engine_greeting()
    print("PASSED greeting response test.")

    print("Testing off-topic refusal...")
    test_slm_engine_off_topic_refusal()
    print("PASSED off-topic refusal test.")
    
    print("Testing on-domain query...")
    test_slm_engine_on_domain_query()
    print("PASSED on-domain query test.")
