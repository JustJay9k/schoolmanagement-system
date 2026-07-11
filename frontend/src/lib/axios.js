import Axios from 'axios'

const localHosts = new Set(['localhost', '127.0.0.1'])

const resolveBackendUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL

    if (!configuredUrl) {
        return undefined
    }

    try {
        const backendUrl = new URL(configuredUrl)

        if (
            typeof window !== 'undefined' &&
            localHosts.has(backendUrl.hostname) &&
            localHosts.has(window.location.hostname)
        ) {
            backendUrl.hostname = window.location.hostname
        }

        return backendUrl.toString().replace(/\/$/, '')
    } catch {
        return configuredUrl.replace(/\/$/, '')
    }
}

const axios = Axios.create({
    baseURL: resolveBackendUrl(),
    headers: {
        Accept: 'application/json',
    },
})

export default axios