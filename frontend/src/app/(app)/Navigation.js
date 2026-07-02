'use client'

import ApplicationLogo from '@/components/ApplicationLogo'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/auth'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import axios from '@/lib/axios'
import styles from './navigation.module.css'
import { getNavItems } from './navigation.config'
import { formatRoleLabel } from '@/lib/userAccess'

const icons = {
    dashboard: (
        <path
            d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-4.5v-6h-5v6H5a1 1 0 01-1-1v-9.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    ),
    register: (
        <>
            <rect
                x="4.5"
                y="5"
                width="15"
                height="15"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M8 3.8v3M16 3.8v3M7.5 11.2h9M8.6 15h2.1M13.3 15h2.1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    classes: (
        <>
            <path
                d="M4.5 8.5L12 5l7.5 3.5L12 12 4.5 8.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M7 10.7v4.1c0 1.4 2.2 2.7 5 2.7s5-1.3 5-2.7v-4.1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    gradebook: (
        <>
            <path
                d="M6 5.5h9.5a2.5 2.5 0 012.5 2.5v10.5H8.5A2.5 2.5 0 016 16V5.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M9 9.5h6M9 13h6M9 16.5h3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    students: (
        <>
            <circle
                cx="12"
                cy="8"
                r="3.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M5.5 18.5c1.3-2.6 3.7-4 6.5-4s5.2 1.4 6.5 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    reports: (
        <>
            <path
                d="M6 18.5v-6M12 18.5v-11M18 18.5v-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M4.5 20h15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    timetable: (
        <>
            <rect
                x="4.5"
                y="5"
                width="15"
                height="15"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M8 3.8v3M16 3.8v3M8 11h8M8 15h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    subjects: (
        <>
            <path
                d="M6 5.5h8.4a2.8 2.8 0 012.8 2.8v10.2H8.8A2.8 2.8 0 016 15.7V5.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M17.2 18.5V8.3a2.8 2.8 0 00-2.8-2.8H6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M9 9.2h5.2M9 12.3h5.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    behaviour: (
        <>
            <path
                d="M12 4.5l6.5 2.4v5.6c0 4.2-2.5 6.9-6.5 8.8-4-1.9-6.5-4.6-6.5-8.8V6.9L12 4.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M9.2 12.2l1.8 1.8 3.8-4.1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </>
    ),
    settings: (
        <>
            <circle
                cx="12"
                cy="12"
                r="2.7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M12 4.8v1.6M12 17.6v1.6M19.2 12h-1.6M6.4 12H4.8M17.1 6.9l-1.1 1.1M8 16l-1.1 1.1M17.1 17.1L16 16M8 8 6.9 6.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    users: (
        <>
            <circle
                cx="9"
                cy="9"
                r="2.7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <circle
                cx="16.5"
                cy="10"
                r="2.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M4.8 18.5c1.1-2.5 3.3-3.9 5.9-3.9s4.7 1.4 5.8 3.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M14.7 18.2c.7-1.7 2.1-2.7 3.8-2.7.7 0 1.4.2 2 .5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    schoolStructure: (
        <>
            <path
                d="M5 18.5V8.2l7-3.2 7 3.2v10.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M9 18.5v-4h6v4M8 10.5h8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    finance: (
        <>
            <path
                d="M5.5 8.2L12 5l6.5 3.2v8.6L12 20l-6.5-3.2V8.2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M9.2 10.5h5.6M9.2 13.5h3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    merchandise: (
        <>
            <path
                d="M6 8.5h12l-1 10H7L6 8.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M9 8.5a3 3 0 0 1 6 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
    notifications: (
        <>
            <path
                d="M12 5.2a4.2 4.2 0 0 1 4.2 4.2v2.1c0 .8.2 1.5.6 2.2l.9 1.5H6.3l.9-1.5c.4-.7.6-1.4.6-2.2V9.4A4.2 4.2 0 0 1 12 5.2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M9.8 18a2.2 2.2 0 0 0 4.4 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </>
    ),
}

const NavIcon = ({ name }) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={styles.navIcon}>
        {icons[name]}
    </svg>
)

const Navigation = ({ user, sidebarCollapsed }) => {
    const { logout } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const navItems = getNavItems(user)
    const { data: notificationsData } = useSWR(
        user ? '/api/notifications' : null,
        url => axios.get(url).then(response => response.data),
    )
    const unreadNotifications = notificationsData?.summary?.unread ?? 0
    const activeHref = navItems
        .filter(
            item =>
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`),
        )
        .sort((left, right) => right.href.length - left.href.length)[0]?.href
    const isItemActive = href => href === activeHref
    const activeItem = navItems.find(item => item.href === activeHref)

    const Sidebar = (
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
            <div className={styles.brand}>
                <div className={styles.brandMark}>
                    <ApplicationLogo className="h-8 w-8 fill-current" />
                </div>
                <div
                    className={`${styles.brandCopy} ${
                        sidebarCollapsed ? styles.brandCopyCollapsed : ''
                    }`}>
                    <div>
                        <p className={styles.schoolName}>PCMS</p>
                        <p className={styles.schoolMeta}>Phunziro Class Management System</p>
                    </div>
                </div>
            </div>

            <nav className={styles.navList}>
                {navItems.map(item => {
                    const active = isItemActive(item.href)
                    const showNotificationBadge =
                        item.href === '/notifications' && unreadNotifications > 0

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`${styles.navLink} ${active ? styles.navLinkActive : ''} ${
                                sidebarCollapsed ? styles.navLinkCollapsed : ''
                            }`}>
                            <span className={styles.navIconWrap}>
                                <NavIcon name={item.icon} />
                                {showNotificationBadge && sidebarCollapsed ? (
                                    <span className={styles.navBadgeDot} />
                                ) : null}
                            </span>
                            <span
                                className={`${styles.navLabel} ${
                                    sidebarCollapsed ? styles.navLabelCollapsed : ''
                                }`}>
                                <span>{item.label}</span>
                                {showNotificationBadge ? (
                                    <span className={styles.navBadge}>
                                        {unreadNotifications}
                                    </span>
                                ) : null}
                            </span>
                        </Link>
                    )
                })}
            </nav>

            <div className={`${styles.profileCard} ${sidebarCollapsed ? styles.profileCardCollapsed : ''}`}>
                <div className={styles.avatar}>
                    {user?.profile_photo_url ? (
                        <Image
                            src={user.profile_photo_url}
                            alt={`${user?.name ?? 'User'} profile`}
                            className={styles.avatarImage}
                            fill
                            sizes="32px"
                            unoptimized
                        />
                    ) : (
                        (user?.name ?? 'U')
                            .split(' ')
                            .slice(0, 2)
                            .map(part => part[0])
                            .join('')
                    )}
                </div>
                <div
                    className={`${styles.profileCopy} ${
                        sidebarCollapsed ? styles.profileCopyCollapsed : ''
                    }`}>
                    <div>
                        <p className={styles.profileName}>{user?.name}</p>
                        <p className={styles.profileRole}>{formatRoleLabel(user?.role)}</p>
                    </div>
                </div>
            </div>

            <button onClick={logout} className={styles.logoutButton}>
                <span className={`${styles.logoutLabel} ${sidebarCollapsed ? styles.logoutLabelCollapsed : ''}`}>
                    Logout
                </span>
            </button>
        </aside>
    )

    return (
        <>
            <div className={styles.mobileBar}>
                <Link href="/dashboard" className={styles.mobileBrand}>
                    <div className={styles.mobileBrandMark}>
                        <ApplicationLogo className="h-7 w-7 fill-current" />
                    </div>
                    <div>
                        <p className={styles.schoolName}>PCMS</p>
                        <p className={styles.schoolMeta}>{activeItem?.label ?? 'Workspace'}</p>
                    </div>
                </Link>

                <button onClick={() => setOpen(true)} className={styles.mobileButton}>
                    Menu
                </button>
            </div>

            <div
                className={`${styles.desktopSidebar} ${
                    sidebarCollapsed ? styles.desktopSidebarCollapsed : ''
                }`}>
                {Sidebar}
            </div>

            {open && (
                <div className={styles.mobileOverlay}>
                    <div className={styles.mobileOverlayInner}>
                        <div className={styles.mobileOverlayActions}>
                            <button
                                onClick={() => setOpen(false)}
                                className={styles.mobileButton}>
                                Close
                            </button>
                        </div>
                        {Sidebar}
                    </div>
                </div>
            )}
        </>
    )
}

export default Navigation
