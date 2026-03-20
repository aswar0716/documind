"""
MLflow experiment tracking for DocuMind RAG queries.

Every call to the RAG pipeline logs one MLflow run with:
  - params:  top_k, model, num_documents, mode
  - metrics: confidence, num_sources
  - tags:    question (truncated), document_ids

This module is the ONLY place MLflow is imported. If you later want to
disable tracking (e.g. for tests), you only need to change this file.
"""
from __future__ import annotations

import mlflow

from app.core.config import settings


def _init_experiment() -> None:
    """
    Point MLflow at the tracking server and select the experiment.
    Called once per process — subsequent calls are no-ops because
    mlflow.set_experiment() is idempotent.
    """
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment(settings.mlflow_experiment_name)


def log_query_run(
    *,
    mode: str,                    # "query" | "compare" | "missing"
    question: str,
    document_ids: list[str],
    top_k: int,
    confidence: float | None,     # None for missing-mode (no single confidence)
    num_sources: int,
) -> None:
    """
    Log one RAG pipeline execution as an MLflow run.
    If the MLflow server is unreachable, the error is silently ignored so
    the query still returns a result — tracking is best-effort.
    """
    try:
        _init_experiment()

        with mlflow.start_run():
            mlflow.log_param("mode", mode)
            mlflow.log_param("model", settings.llm_model)
            mlflow.log_param("top_k", top_k)
            mlflow.log_param("num_documents", len(document_ids))

            if confidence is not None:
                mlflow.log_metric("confidence", confidence)
            mlflow.log_metric("num_sources", num_sources)

            mlflow.set_tag("question", question[:250])
            mlflow.set_tag("document_ids", ", ".join(document_ids))

    except Exception:
        # MLflow server not running or unreachable — skip tracking silently.
        pass
