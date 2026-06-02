const Button = ({ type = 'submit', className = '', ...props }) => (
    <button
        type={type}
        className={`inline-flex items-center justify-center rounded-2xl border border-transparent bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(18,50,57,0.16)] transition duration-150 ease-in-out hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[rgba(15,118,110,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    />
)

export default Button
