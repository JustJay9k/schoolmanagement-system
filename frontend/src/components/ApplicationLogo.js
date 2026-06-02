const ApplicationLogo = props => (
    <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="beacon-shield" x1="8" y1="8" x2="64" y2="64">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.96" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
            </linearGradient>
        </defs>

        <path
            d="M36 6l23 8v18c0 15.1-8.3 25.5-23 34-14.7-8.5-23-18.9-23-34V14l23-8z"
            fill="url(#beacon-shield)"
        />
        <path
            d="M23 24.5c0-2.5 2-4.5 4.5-4.5h16.3c2.4 0 4.4 2 4.4 4.5v15.9c0 1.3-.6 2.5-1.8 3.3l-7.8 5.2a4.9 4.9 0 01-5.3 0l-8-5.2a4 4 0 01-1.8-3.3V24.5z"
            fill="#fffaf2"
            opacity="0.96"
        />
        <path
            d="M28 28.5h16M28 34.5h16M36 28v14"
            stroke="#0f766e"
            strokeWidth="3"
            strokeLinecap="round"
        />
        <circle cx="36" cy="47" r="3.5" fill="#d97706" />
    </svg>
)

export default ApplicationLogo
