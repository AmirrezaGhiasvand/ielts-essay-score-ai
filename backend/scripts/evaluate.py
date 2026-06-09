import os
import sys
import json
import time
import pandas as pd
from dotenv import load_dotenv
import traceback


sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from app.services.chain import score_essay
from app.services.chain import get_vector_store


# -------- Settings --------

TEST_SET_PATH   = os.path.join(os.path.dirname(__file__), "../data/test.csv")
RESULTS_PATH    = os.path.join(os.path.dirname(__file__), "../data/eval_results.json")
N_ESSAYS        = 5       # number of essays to evaluate
RANDOM_SEED     = 42


# -------- Metrics --------

def mean_absolute_error(predictions: list[float], targets: list[float]) -> float:
    return sum(abs(p - t) for p, t in zip(predictions, targets)) / len(predictions)


def exact_match_rate(predictions: list[float], targets: list[float]) -> float:
    return sum(1 for p, t in zip(predictions, targets) if p == t) / len(predictions)


def within_half_band_rate(predictions: list[float], targets: list[float]) -> float:
    # within 0.5 band is the standard IELTS examiner agreement threshold
    return sum(1 for p, t in zip(predictions, targets) if abs(p - t) <= 0.5) / len(predictions)


# -------- Evaluate --------

def evaluate():
    print("Loading test set...")
    df = pd.read_csv(TEST_SET_PATH)
    df = df.sample(n=N_ESSAYS, random_state=RANDOM_SEED)
    print(f"Evaluating {N_ESSAYS} essays")
    print(f"Task distribution: {df['task_type'].value_counts().to_dict()}")

    results    = []
    predictions = []
    targets     = []

    for i, (_, row) in enumerate(df.iterrows(), 1):
        print(f"\n--- Essay {i}/{N_ESSAYS} ---")
        print(f"Task: {row['task_type']} | Human band: {row['overall_band']}")

        try:
            start    = time.time()
            response = score_essay(
                task_type=int(row["task_type"]),
                question=str(row["question"]),
                essay=str(row["essay"]),
                language="en",
            )
            latency = int((time.time() - start) * 1000)

            predicted = response.overall_band
            actual    = float(row["overall_band"])

            predictions.append(predicted)
            targets.append(actual)

            print(f"Predicted: {predicted} | Actual: {actual} | Diff: {abs(predicted - actual)}")

            results.append({
                "essay_id":      i,
                "task_type":     int(row["task_type"]),
                "human_band":    actual,
                "predicted_band": predicted,
                "difference":    round(abs(predicted - actual), 1),
                "within_0.5":   abs(predicted - actual) <= 0.5,
                "latency_ms":   latency,
                "task_achievement":           response.task_achievement.score,
                "coherence_cohesion":         response.coherence_cohesion.score,
                "lexical_resource":           response.lexical_resource.score,
                "grammatical_range_accuracy": response.grammatical_range_accuracy.score,
            })

        except Exception as e:
            print(f"Error scoring essay {i}: {e}")
            traceback.print_exc()
            results.append({
                "essay_id":  i,
                "task_type": int(row["task_type"]),
                "error":     str(e),
            })

    # ---- Calculate metrics ----
    valid = [r for r in results if "error" not in r]

    if valid:
        preds   = [r["predicted_band"] for r in valid]
        actuals = [r["human_band"] for r in valid]

        mae              = mean_absolute_error(preds, actuals)
        exact            = exact_match_rate(preds, actuals)
        within_half      = within_half_band_rate(preds, actuals)
        avg_latency      = sum(r["latency_ms"] for r in valid) / len(valid)

        print(f"\n{'='*50}")
        print(f"EVALUATION RESULTS ({len(valid)}/{N_ESSAYS} successful)")
        print(f"{'='*50}")
        print(f"MAE (Mean Absolute Error):     {mae:.3f} bands")
        print(f"Exact match rate:              {exact*100:.1f}%")
        print(f"Within 0.5 band rate:          {within_half*100:.1f}%")
        print(f"Average latency:               {avg_latency/1000:.1f}s")
        print(f"{'='*50}")

        summary = {
            "n_essays":          len(valid),
            "mae":               round(mae, 3),
            "exact_match_rate":  round(exact, 3),
            "within_0.5_rate":   round(within_half, 3),
            "avg_latency_ms":    int(avg_latency),
            "essays":            results,
        }
    else:
        summary = {"error": "No essays scored successfully", "essays": results}

    # ---- Save results ----
    with open(RESULTS_PATH, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n✅ Results saved to {RESULTS_PATH}")


# -------- Entry point --------

if __name__ == "__main__":
    evaluate()