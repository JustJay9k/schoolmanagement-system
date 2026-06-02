const toneStyles = {
    error: 'border border-red-200 bg-red-50 text-red-700',
    success: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border border-sky-200 bg-sky-50 text-sky-700',
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
            className={`${className} rounded-xl px-4 py-3 text-sm font-medium ${tone}`}
            role="alert"
            {...props}>
            {normalizedStatus.message}
        </div>
    )
}

export default AuthSessionStatus
