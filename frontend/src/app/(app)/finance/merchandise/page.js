'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import merchandiseStyles from '@/app/(app)/merchandise/merchandise.module.css'
import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import Input from '@/components/Input'
import { useToast } from '@/components/ToastProvider'
import axios from '@/lib/axios'
import { canManageFinanceWorkspace, formatRoleLabel } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const createDraft = () => ({
    name: '',
    category: '',
    price: '',
    description: '',
    is_available: true,
    image: null,
    existing_image_url: null,
})

const formatCurrency = value =>
    new Intl.NumberFormat('en-MW', {
        style: 'currency',
        currency: 'MWK',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0))

const formatTimestamp = value => {
    if (!value) {
        return 'Not updated yet'
    }

    return new Date(value).toLocaleString()
}

export default function FinanceMerchandisePage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { showToast } = useToast()
    const [items, setItems] = useState([])
    const [draft, setDraft] = useState(createDraft())
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [confirmingItem, setConfirmingItem] = useState(null)

    const loadItems = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/finance/merchandise')
            setItems(response.data?.items ?? [])
            setLoadError(null)
        } catch (error) {
            setLoadError(
                error?.response?.data?.message ??
                    'Unable to load merchandise right now.',
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageFinanceWorkspace(user)) {
            return
        }

        loadItems()
    }, [user])

    const stats = useMemo(() => {
        const availableCount = items.filter(item => item.is_available).length
        const totalValue = items.reduce(
            (sum, item) => sum + Number(item.price ?? 0),
            0,
        )

        return {
            total: items.length,
            available: availableCount,
            unavailable: items.length - availableCount,
            totalValue,
        }
    }, [items])

    const updateDraft = (field, value) => {
        setDraft(current => ({
            ...current,
            [field]: value,
        }))
    }

    const resetDraft = () => {
        setDraft(createDraft())
        setEditingId(null)
    }

    const submitItem = async event => {
        event.preventDefault()
        setSubmitting(true)

        const formData = new FormData()
        formData.append('name', draft.name.trim())
        formData.append('category', draft.category.trim())
        formData.append('price', draft.price)
        formData.append('description', draft.description.trim())
        formData.append('is_available', draft.is_available ? '1' : '0')

        if (draft.image) {
            formData.append('image', draft.image)
        }

        try {
            const response = editingId
                ? await axios.post(`/api/finance/merchandise/${editingId}`, (() => {
                      formData.append('_method', 'PUT')
                      return formData
                  })())
                : await axios.post('/api/finance/merchandise', formData)

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Merchandise item saved successfully.',
            })
            resetDraft()
            await loadItems()
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.errors?.name?.[0] ??
                    error?.response?.data?.errors?.price?.[0] ??
                    error?.response?.data?.message ??
                    'Unable to save this merchandise item.',
            })
        } finally {
            setSubmitting(false)
        }
    }

    const startEdit = item => {
        setEditingId(item.id)
        setDraft({
            name: item.name ?? '',
            category: item.category ?? '',
            price: item.price != null ? String(item.price) : '',
            description: item.description ?? '',
            is_available: Boolean(item.is_available),
            image: null,
            existing_image_url: item.image_url ?? null,
        })
    }

    const deleteItem = async item => {
        setDeletingId(item.id)

        try {
            const response = await axios.delete(
                `/api/finance/merchandise/${item.id}`,
            )
            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Merchandise item deleted successfully.',
            })

            if (editingId === item.id) {
                resetDraft()
            }

            await loadItems()
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to delete this merchandise item.',
            })
        } finally {
            setDeletingId(null)
            setConfirmingItem(null)
        }
    }

    if (!user) {
        return null
    }

    if (!canManageFinanceWorkspace(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Finance access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only finance accounts can manage school merchandise.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        School merchandise belongs to the accountant workspace.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Finance"
            title="School merchandise"
            description="Upload uniforms, books, shirts, and any other items the school is selling. These items will appear in the guardian portal once they are marked available."
            actions={
                <button
                    type="button"
                    onClick={() => loadItems()}
                    className={workspaceStyles.secondaryButton}>
                    Refresh
                </button>
            }>
            {loadError ? (
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${managementStyles.notice} ${
                            managementStyles.dangerText
                        }`}>
                        {loadError}
                    </p>
                </section>
            ) : null}

            <section className={managementStyles.statsGrid}>
                {[
                    ['Total items', stats.total],
                    ['Available now', stats.available],
                    ['Hidden from guardians', stats.unavailable],
                    ['Listed value', formatCurrency(stats.totalValue)],
                ].map(([label, value]) => (
                    <article key={label} className={workspaceStyles.statCard}>
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <section className={workspaceStyles.panelGrid}>
                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                {editingId ? 'Update item' : 'Add item'}
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                {editingId
                                    ? 'Edit merchandise details'
                                    : 'Create a merchandise listing'}
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={submitItem} className={managementStyles.stack}>
                        <div className={managementStyles.formGrid}>
                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Item name
                                </span>
                                <Input
                                    value={draft.name}
                                    onChange={event =>
                                        updateDraft('name', event.target.value)
                                    }
                                    placeholder="School uniform"
                                    required
                                />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Category
                                </span>
                                <Input
                                    value={draft.category}
                                    onChange={event =>
                                        updateDraft('category', event.target.value)
                                    }
                                    placeholder="Uniform, Books, Shirts"
                                />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Price
                                </span>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.price}
                                    onChange={event =>
                                        updateDraft('price', event.target.value)
                                    }
                                    placeholder="35000"
                                    required
                                />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Product image
                                </span>
                                <Input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={event =>
                                        updateDraft(
                                            'image',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Visibility
                                </span>
                                <select
                                    value={draft.is_available ? 'yes' : 'no'}
                                    onChange={event =>
                                        updateDraft(
                                            'is_available',
                                            event.target.value === 'yes',
                                        )
                                    }
                                    className={managementStyles.select}>
                                    <option value="yes">
                                        Available to guardians
                                    </option>
                                    <option value="no">Hide for now</option>
                                </select>
                            </label>

                            <label
                                className={`${managementStyles.field} ${managementStyles.fullWidth}`}>
                                <span className={managementStyles.fieldLabel}>
                                    Description and details
                                </span>
                                <textarea
                                    value={draft.description}
                                    onChange={event =>
                                        updateDraft(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    className={managementStyles.textarea}
                                    placeholder="Sizes, set contents, purchase notes, or any other details guardians should see."
                                />
                            </label>
                        </div>

                        {draft.existing_image_url ? (
                            <div className={merchandiseStyles.previewWrap}>
                                <div className={merchandiseStyles.imageFrame}>
                                    <Image
                                        src={draft.existing_image_url}
                                        alt={`${draft.name || 'Merchandise'} preview`}
                                        width={640}
                                        height={480}
                                        className={merchandiseStyles.image}
                                        unoptimized
                                    />
                                </div>
                                <p className={merchandiseStyles.previewNote}>
                                    Upload a new image only if you want to replace the
                                    current one.
                                </p>
                            </div>
                        ) : null}

                        <div className={managementStyles.actions}>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2.5 text-xs">
                                {submitting
                                    ? editingId
                                        ? 'Updating...'
                                        : 'Saving...'
                                    : editingId
                                      ? 'Update item'
                                      : 'Save item'}
                            </Button>

                            {editingId ? (
                                <button
                                    type="button"
                                    onClick={resetDraft}
                                    className={managementStyles.secondaryButton}>
                                    Cancel edit
                                </button>
                            ) : null}
                        </div>
                    </form>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Publishing</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                How guardians see items
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.list}>
                        <div className={workspaceStyles.listItem}>
                            <div className={workspaceStyles.stack}>
                                <strong>Available items only</strong>
                                <p>
                                    Guardians will only see merchandise that is
                                    currently marked as available.
                                </p>
                            </div>
                        </div>

                        <div className={workspaceStyles.listItem}>
                            <div className={workspaceStyles.stack}>
                                <strong>Image and details included</strong>
                                <p>
                                    Uploaded product photos, pricing, category, and
                                    description are shown in the guardian shop menu.
                                </p>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <section className={workspaceStyles.fullPanel}>
                <div className={workspaceStyles.panelHeader}>
                    <div>
                        <p className={workspaceStyles.panelEyebrow}>
                            Merchandise catalogue
                        </p>
                        <h2 className={workspaceStyles.panelTitle}>
                            Manage current school shop items
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <p className={managementStyles.muted}>
                        Loading school merchandise...
                    </p>
                ) : items.length === 0 ? (
                    <p className={managementStyles.notice}>
                        No merchandise has been uploaded yet.
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
                                        No image uploaded for this item yet.
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
                                            {item.category || 'Uncategorised'}
                                        </p>
                                    </div>

                                    <span className={merchandiseStyles.priceTag}>
                                        {formatCurrency(item.price)}
                                    </span>
                                </div>

                                <p className={merchandiseStyles.description}>
                                    {item.description?.trim() ||
                                        'No extra details added yet.'}
                                </p>

                                <div className={merchandiseStyles.cardFooter}>
                                    <span
                                        className={`${
                                            merchandiseStyles.availabilityBadge
                                        } ${
                                            item.is_available
                                                ? merchandiseStyles.available
                                                : merchandiseStyles.unavailable
                                        }`}>
                                        {item.is_available
                                            ? 'Visible to guardians'
                                            : 'Hidden from guardians'}
                                    </span>

                                    <p className={merchandiseStyles.timestamp}>
                                        {formatTimestamp(item.updated_at)}
                                    </p>
                                </div>

                                <div className={managementStyles.actions}>
                                    <button
                                        type="button"
                                        onClick={() => startEdit(item)}
                                        className={
                                            managementStyles.secondaryButton
                                        }>
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingItem(item)}
                                        disabled={deletingId === item.id}
                                        className={managementStyles.dangerButton}>
                                        {deletingId === item.id
                                            ? 'Deleting...'
                                            : 'Delete'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
            <ConfirmDialog
                open={Boolean(confirmingItem)}
                eyebrow="Delete merchandise"
                title="Remove this merchandise item?"
                message={
                    confirmingItem
                        ? `Delete "${confirmingItem.name}" from the school shop?`
                        : ''
                }
                confirmLabel="Delete item"
                busyLabel="Deleting..."
                tone="danger"
                busy={deletingId != null && deletingId === confirmingItem?.id}
                onClose={() => setConfirmingItem(null)}
                onConfirm={() => {
                    if (confirmingItem) {
                        deleteItem(confirmingItem)
                    }
                }}
            />
        </WorkspacePageShell>
    )
}
