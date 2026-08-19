import { normalizeRole } from '@/lib/userAccess'

const teacherNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Notifications', href: '/notifications', icon: 'notifications' },
    { label: 'Registers', href: '/registers', icon: 'register' },
    { label: 'Classes', href: '/classes', icon: 'classes' },
    { label: 'Gradebook', href: '/gradebook', icon: 'gradebook' },
    { label: 'Attendance Reports', href: '/attendance-reports', icon: 'reports' },
    { label: 'Timetables', href: '/timetables', icon: 'timetable' },
    { label: 'Behaviour', href: '/behaviour', icon: 'behaviour' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
]

const managementNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Notifications', href: '/notifications', icon: 'notifications' },
    { label: 'Registers', href: '/registers', icon: 'register' },
    { label: 'Classes', href: '/classes', icon: 'classes' },
    { label: 'Students', href: '/students', icon: 'students' },
    { label: 'Gradebook', href: '/gradebook', icon: 'gradebook' },
    { label: 'Attendance Reports', href: '/attendance-reports', icon: 'reports' },
    { label: 'Subjects', href: '/management/subjects', icon: 'subjects' },
    { label: 'Teacher Allocations', href: '/management/form-teachers', icon: 'users' },
    { label: 'School Structure', href: '/management/school-structure', icon: 'schoolStructure' },
    { label: 'Timetables', href: '/management/timetables', icon: 'timetable' },
    { label: 'Behaviour', href: '/behaviour', icon: 'behaviour' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
]

const adminNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Notifications', href: '/notifications', icon: 'notifications' },
    { label: 'User Accounts', href: '/admin/users', icon: 'users' },
    { label: 'School Structure', href: '/admin/school-structure', icon: 'schoolStructure' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
]

const financeNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Notifications', href: '/notifications', icon: 'notifications' },
    { label: 'Finance', href: '/finance', icon: 'finance' },
    { label: 'Merchandise', href: '/finance/merchandise', icon: 'merchandise' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
]

const guardianNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Notifications', href: '/notifications', icon: 'notifications' },
    { label: 'School Shop', href: '/guardian/merchandise', icon: 'merchandise' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
]

export const getNavItems = user => {
    const role = normalizeRole(user?.role)

    if (role === 'admin') {
        return adminNavItems
    }

    if (role === 'management') {
        return managementNavItems
    }

    if (role === 'accountant') {
        return financeNavItems
    }

    if (role === 'guardian') {
        return guardianNavItems
    }

    return teacherNavItems
}
