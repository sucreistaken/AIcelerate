// admin/hooks/useForm.ts — Generic form hook with Zod validation
import { useState, useCallback, useRef } from "react";
import type { ZodSchema, ZodError } from "zod";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

interface UseFormOptions<T extends Record<string, unknown>> {
  schema: ZodSchema<T>;
  defaultValues: T;
  onSubmit: (values: T) => Promise<void> | void;
}

interface UseFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: FieldErrors<T>;
  isDirty: boolean;
  isSubmitting: boolean;
  handleChange: (path: string, value: unknown) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
}

/** Set a nested value on an object using dot notation (e.g. "a.b") */
function setNestedValue<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  const keys = path.split(".");
  const result = { ...obj };

  if (keys.length === 1) {
    (result as Record<string, unknown>)[keys[0]] = value;
    return result;
  }

  let current: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as Record<string, unknown> || {}) };
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;

  return result;
}

/** Parse Zod errors into a flat field error map */
function parseZodErrors<T>(error: ZodError): FieldErrors<T> {
  const fieldErrors: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") as keyof T;
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

export function useForm<T extends Record<string, unknown>>({
  schema,
  defaultValues,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(defaultValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultRef = useRef(defaultValues);

  const handleChange = useCallback((path: string, value: unknown) => {
    setValues((prev) => {
      const next = setNestedValue(prev, path, value);
      setIsDirty(true);
      return next;
    });
    // Clear field error on change
    setErrors((prev) => {
      const key = path as keyof T;
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      // Validate with Zod
      const result = schema.safeParse(values);
      if (!result.success) {
        setErrors(parseZodErrors<T>(result.error));
        return;
      }

      setErrors({});
      setIsSubmitting(true);

      try {
        await onSubmit(result.data as T);
        setIsDirty(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [schema, values, onSubmit]
  );

  const reset = useCallback(() => {
    setValues(defaultRef.current);
    setErrors({});
    setIsDirty(false);
  }, []);

  return {
    values,
    errors,
    isDirty,
    isSubmitting,
    handleChange,
    handleSubmit,
    reset,
  };
}
