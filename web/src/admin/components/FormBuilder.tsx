// admin/components/FormBuilder.tsx — Generic form builder with Zod validation
import type { ZodSchema } from "zod";
import { Button } from "../../components/ui/Button";
import { useForm } from "../hooks/useForm";

export interface FieldConfig {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "select"
    | "switch"
    | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  rows?: number;
  disabled?: boolean;
}

interface FormBuilderProps<T extends Record<string, unknown>> {
  schema: ZodSchema<T>;
  defaultValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  fields: FieldConfig[];
  submitLabel?: string;
  layout?: "single" | "two-column";
}

/** Access nested value via dot notation */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function FormBuilder<T extends Record<string, unknown>>({
  schema,
  defaultValues,
  onSubmit,
  fields,
  submitLabel = "Kaydet",
  layout = "single",
}: FormBuilderProps<T>) {
  const { values, errors, isSubmitting, handleChange, handleSubmit } =
    useForm<T>({ schema, defaultValues, onSubmit });

  const formClasses = [
    "admin-form",
    layout === "two-column" ? "admin-form--two-column" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderField = (field: FieldConfig) => {
    const value = getNestedValue(values, field.name);
    const error = errors[field.name as keyof T];
    const fieldClasses = [
      "admin-form__field",
      error ? "admin-form__field--error" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div key={field.name} className={fieldClasses}>
        {field.type !== "switch" && (
          <label className="admin-form__label" htmlFor={`field-${field.name}`}>
            {field.label}
            {field.required && <span className="admin-form__required">*</span>}
          </label>
        )}

        {field.type === "textarea" ? (
          <textarea
            id={`field-${field.name}`}
            className="admin-form__textarea"
            value={String(value ?? "")}
            placeholder={field.placeholder}
            rows={field.rows ?? 3}
            disabled={field.disabled}
            onChange={(e) => handleChange(field.name, e.target.value)}
          />
        ) : field.type === "select" ? (
          <select
            id={`field-${field.name}`}
            className="admin-form__select"
            value={String(value ?? "")}
            disabled={field.disabled}
            onChange={(e) => handleChange(field.name, e.target.value)}
          >
            <option value="">
              {field.placeholder ?? "Secin..."}
            </option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : field.type === "switch" ? (
          <label className="admin-form__switch">
            <input
              type="checkbox"
              className="admin-form__switch-input"
              checked={Boolean(value)}
              disabled={field.disabled}
              onChange={(e) => handleChange(field.name, e.target.checked)}
            />
            <div
              className={`admin-form__switch-track ${
                value ? "admin-form__switch-track--active" : ""
              }`}
            >
              <div className="admin-form__switch-thumb" />
            </div>
            <span className="admin-form__label">{field.label}</span>
          </label>
        ) : (
          <input
            id={`field-${field.name}`}
            className="admin-form__input"
            type={field.type}
            value={field.type === "number" ? (value as number) ?? "" : String(value ?? "")}
            placeholder={field.placeholder}
            disabled={field.disabled}
            onChange={(e) =>
              handleChange(
                field.name,
                field.type === "number"
                  ? e.target.value === ""
                    ? ""
                    : Number(e.target.value)
                  : e.target.value
              )
            }
          />
        )}

        {error && <span className="admin-form__error">{error}</span>}
      </div>
    );
  };

  return (
    <form className={formClasses} onSubmit={handleSubmit}>
      <div className="admin-form__fields">
        {fields.map(renderField)}
      </div>
      <div className="admin-form__actions">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
