import { useState, useCallback } from "react";
import { queryDocuments, compareDocuments, whatIsMissing } from "../services/api";
import type {
  QueryResponse,
  CompareResponse,
  MissingResponse,
  QueryRequest,
  CompareRequest,
  MissingRequest,
} from "../types";

// Generic async state — same pattern as useDocuments.
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function initialState<T>(): AsyncState<T> {
  return { data: null, loading: false, error: null };
}

// useQuery handles a single-document (or multi-document) RAG query.
export function useQuery() {
  const [state, setState] = useState<AsyncState<QueryResponse>>(
    initialState()
  );

  const run = useCallback(async (request: QueryRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await queryDocuments(request);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Query failed",
      });
    }
  }, []);

  // reset clears the result so the UI can return to the empty state.
  const reset = useCallback(() => setState(initialState()), []);

  return { result: state.data, loading: state.loading, error: state.error, run, reset };
}

// useCompare handles side-by-side comparison of two documents.
export function useCompare() {
  const [state, setState] = useState<AsyncState<CompareResponse>>(
    initialState()
  );

  const run = useCallback(async (request: CompareRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await compareDocuments(request);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Comparison failed",
      });
    }
  }, []);

  const reset = useCallback(() => setState(initialState()), []);

  return { result: state.data, loading: state.loading, error: state.error, run, reset };
}

// useMissing handles the "what's missing" gap analysis.
export function useMissing() {
  const [state, setState] = useState<AsyncState<MissingResponse>>(
    initialState()
  );

  const run = useCallback(async (request: MissingRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await whatIsMissing(request);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Analysis failed",
      });
    }
  }, []);

  const reset = useCallback(() => setState(initialState()), []);

  return { result: state.data, loading: state.loading, error: state.error, run, reset };
}
