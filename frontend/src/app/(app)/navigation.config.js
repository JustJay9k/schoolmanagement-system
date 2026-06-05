import { isAdminUser } from '@/lib/userAccess'

const baseNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Registers', href: '/registers', icon: 'register' },
    { label: 'Classes', href: '/classes', icon: 'classes' },
    { label: 'Students', href: '/students', icon: 'students' },
    { label: 'Attendance Reports', href: '/attendance-reports', icon: 'reports' },
    { label: 'Timetables', href: '/timetables', icon: 'timetable' },
    { label: 'Behaviour', href: '/behaviour', icon: 'behaviour' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
]

const adminNavItems = [
    { label: 'User Accounts', href: '/admin/users', icon: 'users' },
    { label: 'School Structure', href: '/admin/school-structure', icon: 'schoolStructure' },
]

export const getNavItems = user => (
    isAdminUser(user)
        ? [...baseNavItems, ...adminNavItems]
        : baseNavItems
)
