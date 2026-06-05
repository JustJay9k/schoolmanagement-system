const Loading = () => {
    return (
        <div className="flex min-h-screen items-center justify-center px-6">
            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-raised)] px-8 py-6 text-sm font-semibold text-[var(--ink)] shadow-[0_20px_50px_var(--shadow-soft)] backdrop-blur">
                Preparing your workspace...
            </div>
        </div>
    )
}

export default Loading
