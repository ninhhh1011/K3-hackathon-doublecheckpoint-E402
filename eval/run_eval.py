from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "codebase" / "be"
CASES = ROOT / "eval" / "golden-set.json"
RESULTS_JSON = ROOT / "eval" / "results.json"
RESULTS_MD = ROOT / "eval" / "results.md"
BACKEND_LOG = ROOT / "eval" / "backend.log"
API_URL = "http://127.0.0.1:8765/api/v1/chat"
HEALTH_URL = "http://127.0.0.1:8765/health"


def load_cases() -> list[dict[str, Any]]:
    cases = json.loads(CASES.read_text(encoding="utf-8"))
    if not isinstance(cases, list) or len(cases) != 20:
        raise ValueError("Golden set must contain exactly 20 cases.")
    if sum(case.get("origin") == "chatlog" for case in cases) < 10:
        raise ValueError("Golden set must contain at least 10 chatlog cases.")
    ids = [case.get("id") for case in cases]
    if len(set(ids)) != len(ids):
        raise ValueError("Golden set case IDs must be unique.")
    return cases


def post_json(url: str, payload: dict[str, Any], timeout: float) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8")
        return json.loads(body)


def wait_for_backend(process: subprocess.Popen[Any], timeout: float = 45) -> str | None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            return f"Backend exited during startup with code {process.returncode}."
        try:
            with urllib.request.urlopen(HEALTH_URL, timeout=2) as response:
                if response.status == 200:
                    return None
        except (OSError, urllib.error.URLError):
            time.sleep(0.5)
    return f"Backend did not become healthy within {timeout:.0f} seconds."


def observed_action(payload: dict[str, Any]) -> str:
    if payload.get("mindmap_image") is not None:
        return "mindmap"
    if payload.get("quiz") is not None:
        return "quiz"
    if payload.get("quiz_offer") is True:
        return "quiz_suggested"
    return "no_tool"


def run_case(case: dict[str, Any]) -> dict[str, Any]:
    request_payload = {
        "message": case["message"],
        "stream": False,
        "page_number": case["page_number"],
        "source_ids": case["source_ids"],
        "quiz_request": case["quiz_request"],
    }
    if case.get("selected_text"):
        request_payload["selected_text"] = case["selected_text"]

    started = time.perf_counter()
    try:
        response = post_json(API_URL, request_payload, timeout=90)
        action = observed_action(response)
        expected = case["expected"]
        allowed = action in expected["allowed_actions"]
        no_forbidden_artifact = not (
            expected["must_not_generate_artifact"] and action in {"mindmap", "quiz"}
        )
        return {
            "id": case["id"],
            "origin": case["origin"],
            "category": case["category"],
            "status": "completed",
            "observed_action": action,
            "passed": allowed and no_forbidden_artifact,
            "duration_ms": round((time.perf_counter() - started) * 1000),
            "response": response,
            "error": None,
        }
    except (KeyError, OSError, TypeError, ValueError, urllib.error.URLError) as error:
        return {
            "id": case["id"],
            "origin": case["origin"],
            "category": case["category"],
            "status": "error",
            "observed_action": "error",
            "passed": False,
            "duration_ms": round((time.perf_counter() - started) * 1000),
            "response": {},
            "error": f"{type(error).__name__}: {error}",
        }


def error_results(cases: list[dict[str, Any]], error: str) -> list[dict[str, Any]]:
    return [
        {
            "id": case["id"],
            "origin": case["origin"],
            "category": case["category"],
            "status": "error",
            "observed_action": "error",
            "passed": False,
            "duration_ms": 0,
            "response": {},
            "error": error,
        }
        for case in cases
    ]


def summarize(results: list[dict[str, Any]]) -> dict[str, int | float]:
    passed = sum(result["passed"] is True for result in results)
    errors = sum(result["status"] == "error" for result in results)
    failed = len(results) - passed - errors
    return {
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "pass_rate": round((passed / len(results)) * 100, 1) if results else 0.0,
    }


def write_results(results: list[dict[str, Any]]) -> dict[str, int | float]:
    summary = summarize(results)
    payload = {
        "generated_at": datetime.now(UTC).isoformat(),
        "api_url": API_URL,
        "summary": summary,
        "results": results,
    }
    RESULTS_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    rows = [
        "# VLearn Golden Set — Kết quả lượt 1",
        "",
        f"- Thời điểm: `{payload['generated_at']}`",
        f"- Tổng: **{summary['total']}**",
        f"- Đạt: **{summary['passed']}**",
        f"- Không đạt: **{summary['failed']}**",
        f"- Lỗi kỹ thuật: **{summary['errors']}**",
        f"- Tỷ lệ đạt: **{summary['pass_rate']}%**",
        "- Quality bar đã chốt: **80%**",
        "",
        "| Case | Nguồn | Nhóm | Action | Trạng thái | Thời gian |",
        "|---|---|---|---|---|---:|",
    ]
    for result in results:
        state = "PASS" if result["passed"] else "ERROR" if result["status"] == "error" else "FAIL"
        rows.append(
            f"| {result['id']} | {result['origin']} | {result['category']} | "
            f"{result['observed_action']} | {state} | {result['duration_ms']} ms |"
        )
    failures = [result for result in results if not result["passed"]]
    rows.extend(["", "## Case chưa đạt", ""])
    if failures:
        for result in failures:
            reason = result["error"] or (
                "Action quan sát được không thuộc tập action mong đợi đã chốt."
            )
            rows.append(f"- `{result['id']}`: {reason}")
    else:
        rows.append("- Không có.")
    RESULTS_MD.write_text("\n".join(rows) + "\n", encoding="utf-8")
    return summary


def start_backend(log_file: Any) -> subprocess.Popen[Any]:
    creation_flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8765",
        ],
        cwd=BACKEND,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=creation_flags,
    )


def stop_backend(process: subprocess.Popen[Any]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    arguments = parser.parse_args()
    cases = load_cases()
    print(f"{len(cases)} cases, {sum(case['origin'] == 'chatlog' for case in cases)} real")
    if arguments.validate_only:
        return 0

    process: subprocess.Popen[Any] | None = None
    with BACKEND_LOG.open("w", encoding="utf-8") as log_file:
        try:
            process = start_backend(log_file)
            startup_error = wait_for_backend(process)
            results = (
                error_results(cases, startup_error)
                if startup_error
                else [run_case(case) for case in cases]
            )
        finally:
            if process is not None:
                stop_backend(process)

    summary = write_results(results)
    print(json.dumps(summary, ensure_ascii=False))
    return 0 if summary["errors"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
