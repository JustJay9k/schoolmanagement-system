import Link from 'next/link'
import AuthCard from '@/app/(auth)/AuthCard'
import ApplicationLogo from '@/components/ApplicationLogo'

export const metadata = {
    title: 'Beacon School OS',
}

const Layout = ({ children }) => {
    return (
        <div className="text-[var(--ink)] antialiased">
            <AuthCard
                logo={
                    <Link href="/">
                        <ApplicationLogo className="h-12 w-12 fill-current" />
                    </Link>
                }>
                {children}
            </AuthCard>
        </div>
    )
}

export default Layout
