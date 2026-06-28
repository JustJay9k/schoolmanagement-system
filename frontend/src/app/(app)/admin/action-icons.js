const iconProps = {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
}

export const AddIcon = () => (
    <svg {...iconProps}>
        <path d="M12 5v14M5 12h14" />
    </svg>
)

export const RefreshIcon = () => (
    <svg {...iconProps}>
        <path d="M20 11a8 8 0 1 0 2 5.3" />
        <path d="M20 4v7h-7" />
    </svg>
)

export const EditIcon = () => (
    <svg {...iconProps}>
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-1.4L4 18.6V20Z" />
        <path d="m13.5 6.5 4 4" />
    </svg>
)

export const StatusIcon = () => (
    <svg {...iconProps}>
        <path d="M12 3v9" />
        <path d="M6.2 6.8a8 8 0 1 0 11.6 0" />
    </svg>
)

export const DeleteIcon = () => (
    <svg {...iconProps}>
        <path d="M4 7h16" />
        <path d="M9 4h6" />
        <path d="M7 7l1 12h8l1-12" />
        <path d="M10 11v5M14 11v5" />
    </svg>
)

export const ResetIcon = () => (
    <svg {...iconProps}>
        <path d="M4 4v6h6" />
        <path d="M20 13a8 8 0 1 1-2.3-5.7L20 10" />
    </svg>
)
