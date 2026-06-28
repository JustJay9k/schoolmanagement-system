const Input = ({ disabled = false, className = '', ...props }) => (
    <input
        disabled={disabled}
        className={`w-full rounded-[0.8rem] border border-[var(--line)] bg-[var(--surface-field)] px-3 py-2 text-[0.84rem] text-[var(--ink)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
    />
)

export default Input
