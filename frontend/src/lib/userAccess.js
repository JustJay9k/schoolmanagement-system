export const roleLabels = {
    admin: 'Administrator',
    management: 'Head Teacher / Management',
    staff: 'Operations Staff',
    teacher: 'Teacher',
    accountant: 'Accountant',
    student: 'Student',
    guardian: 'Guardian',
}

export const normalizeRole = role => {
    if (typeof role === 'string') {
        return role.toLowerCase()
    }

    if (role && typeof role === 'object') {
        if (typeof role.value === 'string') {
            return role.value.toLowerCase()
        }

        if (typeof role.name === 'string') {
            return role.name.toLowerCase()
        }
    }

    return 'staff'
}

export const isAdminUser = user => normalizeRole(user?.role) === 'admin'

export const formatRoleLabel = role => roleLabels[normalizeRole(role)] ?? 'School staff account'
