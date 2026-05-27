"use client";

export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  error,
  options = [],
  rows = 4,
  readOnly = false,
  disabled = false,
  helperText
}) {
  const baseClass =
    "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 read-only:bg-slate-50 read-only:text-slate-500";

  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>

      {type === "textarea" ? (
        <textarea
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={baseClass}
          readOnly={readOnly}
          disabled={disabled}
        />
      ) : type === "select" ? (
        <select name={name} value={value || ""} onChange={onChange} className={baseClass} disabled={disabled}>
          <option value="">{placeholder || "Select option"}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className={baseClass}
          readOnly={readOnly}
          disabled={disabled}
        />
      )}

      {helperText ? <span className="mt-1 block text-xs text-slate-500">{helperText}</span> : null}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}
