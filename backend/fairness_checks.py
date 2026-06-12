import pandas as pd
from fairlearn.metrics import MetricFrame, selection_rate, demographic_parity_difference

class FairnessAnalyzer:
    """
    Handles Bias Detection and Explainability for the Resume Parser.
    Optimized for CPU by running on small, batched DataFrames.
    """
    def __init__(self):
        pass

    def highlight_entity_context(self, text: str, entity: str, window: int = 40) -> str:
        """
        Explainability Module: Highlights the text segment linked to an extracted entity.
        Returns the entity wrapped in context to show *why* it was extracted.
        """
        start_idx = text.lower().find(entity.lower())
        if start_idx == -1:
            return "Entity not found in original text."
            
        end_idx = start_idx + len(entity)
        
        # Extract surrounding context window
        context_start = max(0, start_idx - window)
        context_end = min(len(text), end_idx + window)
        
        # Emphasize the entity within its original sentence/phrase
        highlighted = (
            text[context_start:start_idx] + 
            f" [HIGHLIGHT: {text[start_idx:end_idx]}] " + 
            text[end_idx:context_end]
        )
        return "..." + highlighted.strip().replace('\n', ' ') + "..."

    def check_fairness(self, batch_data: list, sensitive_feature: str, target_metric: str) -> dict:
        """
        Bias Detection using Fairlearn.
        Evaluates fairness metrics (e.g., Demographic Parity) on a small CPU-friendly batch.
        
        Args:
            batch_data: List of dicts representing parsed resumes + decision outcomes.
            sensitive_feature: Column name for the sensitive attribute (e.g., 'gender', 'age_group').
            target_metric: Column name for the decision outcome (e.g., 'selected_for_interview').
        """
        if not batch_data:
            return {"error": "Batch data is empty."}
            
        df = pd.DataFrame(batch_data)
        
        if sensitive_feature not in df.columns or target_metric not in df.columns:
            return {"error": f"Missing required columns. Found: {list(df.columns)}"}

        # Calculate selection rates across the sensitive groups
        metric_frame = MetricFrame(
            metrics=selection_rate,
            y_true=df[target_metric],      # True labels 
            y_pred=df[target_metric],      # Predicted labels (parser's automated outcome)
            sensitive_features=df[sensitive_feature]
        )
        
        # Calculate demographic parity difference
        # Difference between the largest and smallest selection rate across groups
        dp_diff = demographic_parity_difference(
            y_true=df[target_metric],
            y_pred=df[target_metric],
            sensitive_features=df[sensitive_feature]
        )
        
        return {
            "group_selection_rates": metric_frame.by_group.to_dict(),
            "overall_selection_rate": metric_frame.overall,
            "demographic_parity_difference": dp_diff
        }

if __name__ == "__main__":
    print("Fairness Analyzer initialized.")
    analyzer = FairnessAnalyzer()
    
    # 1. Explainability Demo
    sample_text = "I have over 5 years of extensive experience in Software Engineering and Machine Learning."
    print("\n[Explainability Test]")
    print(analyzer.highlight_entity_context(sample_text, "Machine Learning"))
    
    # 2. Bias Detection Demo
    print("\n[Fairness Check Test on CPU-friendly small batch]")
    # Mock batch where parser decided who moves forward
    mock_batch = [
        {"candidate_id": 1, "gender": "Male", "selected_for_interview": 1},
        {"candidate_id": 2, "gender": "Female", "selected_for_interview": 0},
        {"candidate_id": 3, "gender": "Male", "selected_for_interview": 1},
        {"candidate_id": 4, "gender": "Female", "selected_for_interview": 1},
    ]
    results = analyzer.check_fairness(mock_batch, "gender", "selected_for_interview")
    print(f"Demographic Parity Difference: {results.get('demographic_parity_difference')}")
    print(f"Group Selection Rates: {results.get('group_selection_rates')}")
