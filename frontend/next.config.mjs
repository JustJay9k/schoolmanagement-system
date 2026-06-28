const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

const remotePatterns = [
    {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
    },
    {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/storage/**',
    },
]

if (backendUrl) {
    try {
        const parsed = new URL(backendUrl)

        remotePatterns.push({
            protocol: parsed.protocol.replace(':', ''),
            hostname: parsed.hostname,
            port: parsed.port,
            pathname: '/storage/**',
        })
    } catch {
        // Ignore invalid env values and rely on the default localhost patterns.
    }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns,
    },
}

export default nextConfig
