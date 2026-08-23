type ErrorValue = string | string[] | Record<string, unknown> | unknown;

/**
 * Formats a DRF validation-error payload (field-keyed dict, possibly nested
 * `items` arrays) into a single human-readable string. Shared by
 * DeviceStorageForm and GatePassForm.
 */
export const formatFieldErrors = (data: Record<string, ErrorValue>): string => {
  return Object.entries(data)
    .map(([key, value]) => {
      if (key === 'items' && Array.isArray(value)) {
        return value
          .map((itemError: Record<string, unknown>, index: number) =>
            Object.entries(itemError)
              .map(
                ([itemKey, itemValue]) =>
                  `Item ${index + 1} ${itemKey}: ${joinErrorValue(itemValue)}`
              )
              .join('; ')
          )
          .join(' | ');
      }
      return `${key}: ${joinErrorValue(value)}`;
    })
    .join(' ');
};

const joinErrorValue = (value: ErrorValue): string =>
  Array.isArray(value) ? value.join(', ') : String(value);

interface SubmissionApiError extends Error {
  status?: number;
  data?: Record<string, ErrorValue> & { detail?: string };
}

/**
 * Turns a failed form submission into a display message, handling 500s,
 * field-keyed validation dicts and plain detail messages.
 */
export const getSubmissionErrorMessage = (
  err: SubmissionApiError,
  fallback: string
): string => {
  const baseMessage = err.data?.detail || err.message || fallback;
  if (err.status === 500) {
    return `Internal Server Error. Please check backend logs. Details: ${baseMessage}`;
  }
  if (err.data && !err.data.detail) {
    return formatFieldErrors(err.data) || baseMessage;
  }
  return baseMessage;
};
