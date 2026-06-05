const Button = ({ type = 'submit', className = '', ...props }) => (
    <button
        type={type}
        className={`inline-flex items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_12px_30px_var(--shadow-strong)] transition duration-150 ease-in-out hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-strong)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    />
)

export default Button
