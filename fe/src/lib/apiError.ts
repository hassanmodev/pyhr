/** Backend often returns { detail: string } (Flask) */
export function apiError(err: unknown) {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;
  return typeof detail === 'string' ? detail : 'Something went wrong.';
}
