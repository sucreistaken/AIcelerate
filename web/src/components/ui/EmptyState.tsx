import React from 'react';
import { motion } from 'framer-motion';
import { t } from "../../utils/i18n";

const MailboxIcon = (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V9C2 7.89543 2.89543 7 4 7H10" />
        <path d="M6 19V10C6 8.34315 7.34315 7 9 7H9" />
        <rect x="13" y="3" width="9" height="8" rx="1" />
        <path d="M16 7H20" />
        <path d="M18 5V9" />
    </svg>
);

const RocketIcon = (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5C3 18 2.5 21.5 2.5 21.5C2.5 21.5 6 21 7.5 19.5C8.35 18.65 8.35 17.3 7.5 16.5C6.7 15.65 5.35 15.65 4.5 16.5Z" />
        <path d="M14.5 4C14.5 4 13 6.5 13 9C13 11 14.5 13.5 14.5 13.5" />
        <path d="M9.5 10C9.5 10 12 8.5 14.5 8.5C17 8.5 19.5 10 19.5 10" />
        <path d="M15 2.5C15 2.5 18 3.5 20 5.5C22 7.5 23 10.5 23 10.5" />
        <path d="M9 15L3.5 20.5" />
        <path d="M15 9C15 9 18.5 5.5 21 3C21 3 17.5 1 14 3C10.5 5 9 9 9 9L15 15C15 15 19 13.5 21 10C23 6.5 21 3 21 3" />
    </svg>
);

const TargetIcon = (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const BookStackIcon = (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5V4.5C4 3.67 4.67 3 5.5 3H14.5L20 8.5V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5Z" />
        <path d="M14 3V8.5H20" />
        <path d="M8 13H16" />
        <path d="M8 17H13" />
        <path d="M2 6V20C2 20.55 2.45 21 3 21H17" />
    </svg>
);

const DocumentIcon = (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
        <path d="M14 2V8H20" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
    </svg>
);

const LightbulbIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18H15" />
        <path d="M10 22H14" />
        <path d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" />
    </svg>
);

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    hint?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon = MailboxIcon,
    title,
    description,
    hint,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <motion.div
            className={`es ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
            <motion.div
                className="es__icon"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
            >
                {icon}
            </motion.div>

            <h3 className="es__title">{title}</h3>

            {description && (
                <p className="es__desc">{description}</p>
            )}

            {hint && (
                <div className="es__hint">
                    <span className="es__hint-icon">{LightbulbIcon}</span>
                    {hint}
                </div>
            )}

            {action && (
                <motion.button
                    className="es__action"
                    onClick={action.onClick}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                >
                    {action.label}
                </motion.button>
            )}
        </motion.div>
    );
}

export function NoPlanEmpty({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            icon={RocketIcon}
            title={t("empty.noPlan")}
            description={t("empty.noPlanDesc")}
            hint={t("empty.noPlanHint")}
            action={onAction ? { label: t("empty.getStarted"), onClick: onAction } : undefined}
        />
    );
}

export function NoQuizEmpty({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            icon={TargetIcon}
            title={t("empty.noQuiz")}
            description={t("empty.noQuizDesc")}
            hint={t("empty.noQuizHint")}
            action={onAction ? { label: t("empty.createQuiz"), onClick: onAction } : undefined}
        />
    );
}

export function NoLessonsEmpty({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            icon={BookStackIcon}
            title={t("empty.noLessons")}
            description={t("empty.noLessonsDesc")}
            hint={t("empty.noLessonsHint")}
            action={onAction ? { label: t("empty.createFirstLesson"), onClick: onAction } : undefined}
        />
    );
}

export function NoCheatSheetEmpty({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            icon={DocumentIcon}
            title={t("empty.noCheatSheet")}
            description={t("empty.noCheatSheetDesc")}
            hint={t("empty.noCheatSheetHint")}
            action={onAction ? { label: t("empty.generate"), onClick: onAction } : undefined}
        />
    );
}
