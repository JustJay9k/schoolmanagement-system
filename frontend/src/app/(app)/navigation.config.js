import { normalizeRole } from '@/lib/userAccess'

const teacherNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Registers', href: '/registers', icon: 'register' },
    { label: 'Classes', href: '/classes', icon: 'classes' },
    { label: 'Attendance Reports', href: '/attendance-reports', icon: 'reports' },
    { label: 'Timetables', href: '/timetables', icon: 'timetable' },
    { label: 'Behaviour', href: '/behaviour', icon: 'behaviour' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
]

const managementNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Registers', href: '/registers', icon: 'register' },
    { label: 'Classes', href: '/classes', icon: 'classes' },
    { label: 'Students', href: '/students', icon: 'students' },
    { label: 'Attendance Reports', href: '/attendance-reports', icon: 'reports' },
    { label: 'Subjects', href: '/management/subjects', icon: 'subjects' },
    { label: 'Teacher Allocations', href: '/management/form-teachers', icon: 'users' },
    { label: 'Timetables', href: '/management/timetables', icon: 'timetable' },
    { label: 'Behaviour', href: '/behaviour', icon: 'behaviour' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
]

const adminNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'User Accounts', href: '/admin/users', icon: 'users' },
    { label: 'School Structure', href: '/admin/school-structure', icon: 'schoolStructure' },
    { label: 'Settings', href: '/settings', icon: 'users' },
    { label: 'System Settings', href: '/admin/settings', icon: 'settings' },
]

const financeNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Finance', href: '/finance', icon: 'finance' },
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

    return teacherNavItems
}
