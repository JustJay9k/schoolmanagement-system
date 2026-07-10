const toneStyles = {
    error: 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-ink)]',
    success: 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-ink)]',
    info: 'border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info-ink)]',
}

const AuthSessionStatus = ({ status, className = '', ...props }) => {
    if (!status) {
        return null
    }

    const normalizedStatus =
        typeof status === 'string' ? { message: status, type: 'success' } : status

    const tone = toneStyles[normalizedStatus.type] ?? toneStyles.info

    return (
        <div
            className={`${className} rounded-xl border px-4 py-3 text-sm font-medium ${tone}`}
            role="alert"
            {...props}>
            {normalizedStatus.message}
        </div>
    )
}

export default AuthSessionStatus
