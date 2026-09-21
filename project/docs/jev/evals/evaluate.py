"""Offline Jev decision evaluation using only the Python standard library."""

import argparse
import json
import math
import sys
from pathlib import Path


GATE_LEVEL = {"allow": 0, "codex_review": 1, "deep_review": 2}
EXPECTED_DECISIONS = {
    "file_relevance",
    "change_risk",
    "sql_risk",
    "npe_risk",
    "test_required",
    "review_gate",
}


def read_jsonl(path):
    rows = []
    for line_number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}:{line_number}: invalid JSON: {exc}") from exc
        if not isinstance(row, dict):
            raise ValueError(f"{path}:{line_number}: each row must be an object")
        rows.append(row)
    if not rows:
        raise ValueError(f"{path}: no JSONL rows")
    return rows


def validate_decision_pack(path):
    try:
        pack = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"{path}: invalid decision pack: {exc}") from exc
    if not isinstance(pack, dict):
        raise ValueError(f"{path}: decision pack must be an object")
    decision_rows = pack.get("decisions", [])
    if not isinstance(decision_rows, list):
        raise ValueError(f"{path}: decisions must be a list")
    if any(not isinstance(row, dict) for row in decision_rows):
        raise ValueError(f"{path}: every decision must be an object")
    decision_ids = [row.get("id") for row in decision_rows]
    decisions = set(decision_ids)
    if decisions != EXPECTED_DECISIONS:
        raise ValueError(f"{path}: expected decisions {sorted(EXPECTED_DECISIONS)}, got {sorted(decisions)}")
    if len(decision_ids) != len(decisions):
        raise ValueError(f"{path}: decision IDs must be unique")
    policy = pack.get("execution_policy", {})
    if policy.get("fresh_user_turn_only") is not True or policy.get("reuse_across_tool_continuation") is not True:
        raise ValueError(f"{path}: turn-boundary policy must be fail-safe")
    if policy.get("min_confidence", 0) < 0.75 or policy.get("max_attempts", 0) != 1:
        raise ValueError(f"{path}: confidence/attempt policy is too permissive")
    return {row["id"]: row for row in decision_rows}


def allowed_answers(decision):
    if isinstance(decision.get("choices"), list):
        return {str(choice) for choice in decision["choices"]}
    if isinstance(decision.get("rubric"), dict):
        return {str(key) for key in decision["rubric"]}
    raise ValueError(f"decision {decision.get('id')}: missing choices or rubric")


def validate_measurement(row, name, minimum=None, maximum=None):
    value = row.get(name)
    if value is None:
        return
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"prediction {row.get('case_id')}: {name} must be finite numeric data")
    if minimum is not None and value < minimum:
        raise ValueError(f"prediction {row.get('case_id')}: {name} must be >= {minimum}")
    if maximum is not None and value > maximum:
        raise ValueError(f"prediction {row.get('case_id')}: {name} must be <= {maximum}")


def evaluate(cases, predictions, decision_pack):
    case_map = {}
    for row in cases:
        case_id = row.get("case_id")
        if not isinstance(case_id, str) or not case_id or case_id in case_map:
            raise ValueError(f"cases must have unique non-empty case_id: {case_id}")
        if "decision" not in row or "expected" not in row:
            raise ValueError(f"case {case_id}: missing decision or expected")
        decision = decision_pack.get(row["decision"])
        if decision is None:
            raise ValueError(f"case {case_id}: unknown decision {row['decision']}")
        expected = str(row["expected"])
        if expected not in allowed_answers(decision):
            raise ValueError(f"case {case_id}: invalid expected answer {expected} for {row['decision']}")
        case_map[case_id] = row
    prediction_map = {}
    for row in predictions:
        case_id = row.get("case_id")
        if not isinstance(case_id, str) or not case_id:
            raise ValueError(f"prediction must have a non-empty string case_id: {case_id}")
        if case_id in prediction_map:
            raise ValueError(f"duplicate prediction case_id: {case_id}")
        if case_id not in case_map:
            raise ValueError(f"prediction has unknown case_id: {case_id}")
        if "answer" not in row:
            raise ValueError(f"prediction {case_id}: missing answer")
        decision = decision_pack[case_map[case_id]["decision"]]
        answer = str(row["answer"])
        if answer not in allowed_answers(decision):
            raise ValueError(f"prediction {case_id}: invalid answer {answer} for {decision['id']}")
        validate_measurement(row, "confidence", 0.0, 1.0)
        validate_measurement(row, "latency_ms", 0.0)
        validate_measurement(row, "context_saved_pct", 0.0, 100.0)
        prediction_map[case_id] = row

    missing = sorted(set(case_map) - set(prediction_map))
    if missing:
        raise ValueError(f"missing predictions: {', '.join(missing)}")

    labels = sorted({str(row["expected"]) for row in cases} | {str(row["answer"]) for row in predictions})
    true_positive = {label: 0 for label in labels}
    predicted_count = {label: 0 for label in labels}
    expected_count = {label: 0 for label in labels}
    correct = 0
    gate_expected = 0
    gate_safe = 0
    latencies = []
    context_saved = []

    for case_id, case in case_map.items():
        expected = str(case["expected"])
        prediction = prediction_map[case_id]
        answer = str(prediction["answer"])
        expected_count[expected] += 1
        if answer in predicted_count:
            predicted_count[answer] += 1
        if answer == expected:
            correct += 1
            true_positive[expected] += 1
        if case["decision"] == "review_gate":
            expected_level = GATE_LEVEL.get(expected)
            predicted_level = GATE_LEVEL.get(answer)
            if expected_level is None or predicted_level is None:
                raise ValueError(f"review_gate {case_id}: answer must be one of {sorted(GATE_LEVEL)}")
            if expected_level > 0:
                gate_expected += 1
                if predicted_level >= expected_level:
                    gate_safe += 1
        if isinstance(prediction.get("latency_ms"), (int, float)):
            latencies.append(float(prediction["latency_ms"]))
        if isinstance(prediction.get("context_saved_pct"), (int, float)):
            context_saved.append(float(prediction["context_saved_pct"]))

    precisions = []
    recalls = []
    for label in labels:
        precisions.append(true_positive[label] / predicted_count[label] if predicted_count[label] else 0.0)
        recalls.append(true_positive[label] / expected_count[label] if expected_count[label] else 0.0)

    return {
        "cases": len(cases),
        "accuracy": correct / len(cases),
        "macro_precision": sum(precisions) / len(precisions),
        "macro_recall": sum(recalls) / len(recalls),
        "review_gate_recall": gate_safe / gate_expected if gate_expected else None,
        "mean_latency_ms": sum(latencies) / len(latencies) if latencies else None,
        "mean_context_saved_pct": sum(context_saved) / len(context_saved) if context_saved else None,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--decision-pack", type=Path, default=Path(__file__).parents[1] / "questions" / "java-backend-mvp.json")
    parser.add_argument("--cases", type=Path, default=Path(__file__).with_name("cases.jsonl"))
    parser.add_argument("--predictions", type=Path, default=Path(__file__).with_name("sample-predictions.jsonl"))
    args = parser.parse_args()
    try:
        decision_pack = validate_decision_pack(args.decision_pack)
        result = evaluate(read_jsonl(args.cases), read_jsonl(args.predictions), decision_pack)
    except (OSError, ValueError, KeyError) as exc:
        print(f"jev-eval: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
