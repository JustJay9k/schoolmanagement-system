const Input = ({ disabled = false, className = '', ...props }) => (
    <input
        disabled={disabled}
        className={`w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
    />
)

export default Input
