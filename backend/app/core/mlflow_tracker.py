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

    Parameters
    ----------
    mode         : which pipeline ran ("query", "compare", "missing")
    question     : the user's question
    document_ids : IDs of documents that were queried
    top_k        : number of chunks retrieved
    confidence   : answer confidence score (0–1), or None if not applicable
    num_sources  : number of source chunks returned
    """
    _init_experiment()

    # mlflow.start_run() opens a new run. The `with` block closes it automatically,
    # even if an exception is raised — similar to how `with open(file)` works.
    with mlflow.start_run():

        # --- Parameters (settings that were chosen before the run) ---
        mlflow.log_param("mode", mode)
        mlflow.log_param("model", settings.llm_model)
        mlflow.log_param("top_k", top_k)
        mlflow.log_param("num_documents", len(document_ids))

        # --- Metrics (numeric measurements from the run) ---
        if confidence is not None:
            mlflow.log_metric("confidence", confidence)
        mlflow.log_metric("num_sources", num_sources)

        # --- Tags (freeform text for search/filter in the MLflow UI) ---
        # Truncate the question to 250 chars — MLflow tag values have a
        # length limit and a full question is rarely needed for comparison.
        mlflow.set_tag("question", question[:250])
        mlflow.set_tag("document_ids", ", ".join(document_ids))
