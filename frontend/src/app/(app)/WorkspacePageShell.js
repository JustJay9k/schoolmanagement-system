'use client'

import styles from './workspace-page.module.css'

const WorkspacePageShell = ({ eyebrow, title, description, actions, children }) => (
    <div className={styles.page}>
        <section className={styles.hero}>
            <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>{eyebrow}</p>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.description}>{description}</p>
            </div>

            {actions ? <div className={styles.actions}>{actions}</div> : null}
        </section>

        {children}
    </div>
)

export default WorkspacePageShell
