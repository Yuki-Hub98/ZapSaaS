import { useCallback } from "react";
import api from "@/auth/api";

export function useApi() {
  const get = useCallback(
    <T>(url: string, params?: Record<string, unknown>): Promise<T> =>
      api.get<T>(url, { params }).then((r) => r.data),
    []
  );

  const post = useCallback(
    <T>(url: string, body?: unknown): Promise<T> =>
      api.post<T>(url, body).then((r) => r.data),
    []
  );

  const put = useCallback(
    <T>(url: string, body?: unknown): Promise<T> =>
      api.put<T>(url, body).then((r) => r.data),
    []
  );

  const del = useCallback(
    <T>(url: string): Promise<T> =>
      api.delete<T>(url).then((r) => r.data),
    []
  );

  const patch = useCallback(
  <T>(url: string, body?: unknown): Promise<T> =>
    api.patch<T>(url, body).then((r) => r.data),
  []
);

return { get, post, put, del, patch };
}