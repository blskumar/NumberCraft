import type { ReactNode } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

export const LABEL = 'block text-xs font-semibold text-[#1C232B]';
const input = (pr: string) =>
  `w-full rounded-lg border border-[#D8D1C4] bg-white py-2 pl-9 ${pr} text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none`;
const ICON = 'pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#5A6572]';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function EmailField({ id, label, value, placeholder, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <div className="relative mt-1">
        <Mail className={ICON} aria-hidden="true" />
        <input
          id={id}
          type="email"
          autoComplete="email"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={input('pr-3')}
        />
      </div>
    </div>
  );
}

export function PasswordField({
  id,
  label,
  aside,
  autoComplete,
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  children,
}: FieldProps & {
  aside?: ReactNode;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const labelEl = (
    <label htmlFor={id} className={LABEL}>
      {label}
    </label>
  );
  return (
    <div>
      {aside ? (
        <div className="flex items-center justify-between">
          {labelEl}
          {aside}
        </div>
      ) : (
        labelEl
      )}
      <div className="relative mt-1">
        <Lock className={ICON} aria-hidden="true" />
        <input
          id={id}
          autoComplete={autoComplete}
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={input('pr-9')}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-2 text-[#5A6572] hover:text-[#1C232B]"
        >
          {show ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {children}
    </div>
  );
}

export function RememberMe({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-[#46515E]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded accent-[#1D4ED8]"
      />
      Keep me signed in on this device (not for shared computers)
    </label>
  );
}

export function SubmitButton({
  testId,
  submitting,
  children,
}: {
  testId: string;
  submitting: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      data-testid={testId}
      className="btn-cobalt flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:opacity-60"
    >
      {submitting && (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-semibold text-[#5A6572]"
    >
      Cancel
    </button>
  );
}
