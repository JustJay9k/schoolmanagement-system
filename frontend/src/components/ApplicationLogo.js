const ApplicationLogo = ({ className, ...props }) => (
    <img
        src="/images/mcms-logo.png"
        alt="Masambiro Class Management System logo"
        className={`object-contain ${className ?? ''}`.trim()}
        {...props}
    />
)

export default ApplicationLogo
