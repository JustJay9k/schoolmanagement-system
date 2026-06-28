const Header = ({ title }) => {
    return (
        <header className="border-b border-[var(--line)] bg-[var(--panel)] shadow-sm backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-5 sm:py-4 lg:px-6">

                <h2 className="font-semibold text-base text-[var(--ink)] leading-tight">
                    {title}
                </h2>
            </div>
        </header>
    )
}

export default Header
