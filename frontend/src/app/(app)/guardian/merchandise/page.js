'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import merchandiseStyles from '@/app/(app)/merchandise/merchandise.module.css'
import axios from '@/lib/axios'
import { formatRoleLabel, isGuardianUser } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const formatCurrency = value =>
    new Intl.NumberFormat('en-MW', {
        style: 'currency',
        currency: 'MWK',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0))

const formatTimestamp = value => {
    if (!value) {
        return 'Recently updated'
    }

    return `Updated ${new Date(value).toLocaleString()}`
}

export default function GuardianMerchandisePage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [pageStatus, setPageStatus] = useState(null)

    useEffect(() => {
        const loadItems = async () => {
            setLoading(true)

            try {
                const response = await axios.get('/api/guardian/merchandise')
                setItems(response.data?.items ?? [])
            } catch (error) {
                setPageStatus({
                    type: 'error',
                    message:
                        error?.response?.data?.message ??
                        'Unable to load school merchandise right now.',
                })
            } finally {
                setLoading(false)
            }
        }

        if (!user || !isGuardianUser(user)) {
            return
        }

        loadItems()
    }, [user])

    const stats = useMemo(() => {
        const categories = new Set(
            items
                .map(item => item.category?.trim())
                .filter(Boolean),
        )

        return {
            total: items.length,
            categories: categories.size,
        }
    }, [items])

    if (!user) {
        return null
    }

    if (!isGuardianUser(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Guardian access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only guardian accounts can view the school shop menu.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        The school shop is only available in the guardian portal.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Guardian"
            title="School shop"
            description="Browse uniforms, books, shirts, and other items the school has made available for guardians."
        >
            {pageStatus ? (
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${managementStyles.notice} ${
                            pageStatus.type === 'error'
                                ? managementStyles.dangerText
                                : ''
                        }`}>
                        {pageStatus.message}
                    </p>
                </section>
            ) : null}

            <section className={managementStyles.statsGrid}>
                {[
                    ['Items available', stats.total],
                    ['Categories', stats.categories],
                ].map(([label, value]) => (
                    <article key={label} className={workspaceStyles.statCard}>
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <section className={workspaceStyles.fullPanel}>
                <div className={workspaceStyles.panelHeader}>
                    <div>
                        <p className={workspaceStyles.panelEyebrow}>
                            Available merchandise
                        </p>
                        <h2 className={workspaceStyles.panelTitle}>
                            Items published by the school finance office
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <p className={managementStyles.muted}>
                        Loading school shop items...
                    </p>
                ) : items.length === 0 ? (
                    <p className={managementStyles.notice}>
                        No merchandise is available right now.
                    </p>
                ) : (
                    <div className={merchandiseStyles.catalogGrid}>
                        {items.map(item => (
                            <article
                                key={item.id}
                                className={merchandiseStyles.catalogCard}>
                                {item.image_url ? (
                                    <div className={merchandiseStyles.imageFrame}>
                                        <Image
                                            src={item.image_url}
                                            alt={item.name}
                                            width={640}
                                            height={480}
                                            className={merchandiseStyles.image}
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className={
                                            merchandiseStyles.imagePlaceholder
                                        }>
                                        No product image has been uploaded for this
                                        item yet.
                                    </div>
                                )}

                                <div className={merchandiseStyles.cardHeader}>
                                    <div>
                                        <h3
                                            className={
                                                merchandiseStyles.cardTitle
                                            }>
                                            {item.name}
                                        </h3>
                                        <p className={merchandiseStyles.category}>
                                            {item.category || 'School item'}
                                        </p>
                                    </div>

                                    <span className={merchandiseStyles.priceTag}>
                                        {formatCurrency(item.price)}
                                    </span>
                                </div>

                                <p className={merchandiseStyles.description}>
                                    {item.description?.trim() ||
                                        'Contact the school for more details about this item.'}
                                </p>

                                <p className={merchandiseStyles.timestamp}>
                                    {formatTimestamp(item.updated_at)}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </WorkspacePageShell>
    )
}
