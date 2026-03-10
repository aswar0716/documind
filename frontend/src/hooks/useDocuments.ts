import { useState, useEffect, useCallback } from "react";
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
} from "../services/api";
import type { DocumentInfo } from "../types";

// The shape of state this hook manages.
// AsyncState<T> is a common pattern: you always need to know whether
// data has arrived, whether you're still waiting, and whether something failed.
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// useDocuments encapsulates everything a component needs to manage documents:
//   - the current list (with loading/error state)
//   - an upload action
//   - a delete action
// Components that call this hook never touch fetch() directly.
export function useDocuments() {
  const [state, setState] = useState<AsyncState<DocumentInfo[]>>({
    data: null,
    loading: false,
    error: null,
  });

  // uploading is a separate boolean so the UI can show a spinner on the
  // upload button while still displaying the existing document list.
  const [uploading, setUploading] = useState(false);

  // fetchDocuments is wrapped in useCallback so its reference is stable
  // across renders. This prevents an infinite loop when it is used as a
  // dependency inside useEffect below.
  const fetchDocuments = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await listDocuments();
      setState({ data: response.documents, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load documents",
      });
    }
  }, []); // empty deps — this function never needs to be recreated

  // Run fetchDocuments once when the hook first mounts (i.e. when the
  // component that uses this hook appears on screen).
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // upload takes a File object, sends it to the backend, then refreshes the list.
  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        await uploadDocument(file);
        await fetchDocuments(); // refresh list after upload
      } catch (err) {
        // Re-throw so the component can display the error near the upload form.
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [fetchDocuments]
  );

  // remove deletes a document by ID then refreshes the list.
  const remove = useCallback(
    async (documentId: string) => {
      try {
        await deleteDocument(documentId);
        await fetchDocuments(); // refresh list after delete
      } catch (err) {
        throw err;
      }
    },
    [fetchDocuments]
  );

  return {
    documents: state.data ?? [],
    loading: state.loading,
    error: state.error,
    uploading,
    upload,
    remove,
    refresh: fetchDocuments,
  };
}
