const InputError = ({ messages = [], className = '' }) => (
    <>
        {messages.length > 0 &&
            messages.map((message, index) => (
                <p
                    className={`text-sm font-medium text-[var(--danger)] ${className}`}
                    key={index}>
                    {message}
                </p>
            ))}
    </>
)

export default InputError
