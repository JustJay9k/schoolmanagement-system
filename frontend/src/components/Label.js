const Label = ({ className = '', children, ...props }) => (
    <label
        className={`mb-2 block text-sm font-semibold tracking-[0.02em] text-[var(--ink)] ${className}`}
        {...props}>
        {children}
    </label>
)

export default Label
