import React from 'react';
import { motion } from 'framer-motion';
import { t } from "../../utils/i18n";
import { useUiStore } from "../../stores/uiStore";

const svgP = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/* ── SVG Illustrations ── */
const SparkleIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" {...svgP} strokeWidth={1.8}>
        <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
        <path d="M19 2l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5L19 2z" opacity={0.5} />
    </svg>
);

const QuestionIcon = (
    <svg width="36" height="36" viewBox="0 0 24 24" {...svgP}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const PencilIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" {...svgP}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
);

const HouseIcon = (
    <svg width="40" height="40" viewBox="0 0 24 24" {...svgP}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const RocketIcon = (
    <svg width="40" height="40" viewBox="0 0 24 24" {...svgP}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
);

const BoltIcon = (
    <svg width="40" height="40" viewBox="0 0 24 24" {...svgP}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const LightbulbIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" {...svgP}>
        <path d="M9 18H15" />
        <path d="M10 22H14" />
        <path d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" />
    </svg>
);

/* ── Animated Illustrations ── */
function IllusBooks() {
    return (
        <div className="es-illus">
            <motion.div className="es-illus__book es-illus__book--1" animate={{ rotate: [-5, -3, -5] }} transition={{ duration: 3, repeat: Infinity }} />
            <motion.div className="es-illus__book es-illus__book--2" animate={{ rotate: [3, 1, 3] }} transition={{ duration: 3.5, repeat: Infinity }} />
            <motion.div className="es-illus__book es-illus__book--3" animate={{ rotate: [-2, 0, -2] }} transition={{ duration: 4, repeat: Infinity }} />
            <motion.span className="es-illus__sparkle" animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                {SparkleIcon}
            </motion.span>
        </div>
    );
}

function IllusQuiz() {
    return (
        <div className="es-illus">
            <div className="es-illus__circle">{QuestionIcon}</div>
        </div>
    );
}

function IllusFlashcard() {
    return (
        <div className="es-illus">
            <div className="es-illus__card-stack">
                <div className="es-illus__fcard es-illus__fcard--1" />
                <div className="es-illus__fcard es-illus__fcard--2" />
                <div className="es-illus__fcard es-illus__fcard--3">?</div>
            </div>
        </div>
    );
}

function IllusNotes() {
    return (
        <div className="es-illus">
            <motion.span className="es-illus__pen" animate={{ x: [-2, 2, -2], rotate: [-5, 5, -5] }} transition={{ duration: 3, repeat: Infinity }}>
                {PencilIcon}
            </motion.span>
            <div className="es-illus__lines">
                <div className="es-illus__line" style={{ width: 60 }} />
                <div className="es-illus__line" style={{ width: 45 }} />
                <div className="es-illus__line" style={{ width: 52 }} />
            </div>
        </div>
    );
}

function IllusMindMap() {
    return (
        <div className="es-illus es-illus--mindmap">
            <div className="es-illus__node es-illus__node--center" />
            <div className="es-illus__node es-illus__node--1" />
            <div className="es-illus__node es-illus__node--2" />
            <div className="es-illus__node es-illus__node--3" />
            <div className="es-illus__node es-illus__node--4" />
        </div>
    );
}

function IllusRoom() {
    return (
        <div className="es-illus">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                {HouseIcon}
            </motion.div>
            <div className="es-illus__dots">
                <motion.div className="es-illus__dot" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} />
                <motion.div className="es-illus__dot" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} />
                <motion.div className="es-illus__dot" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} />
            </div>
        </div>
    );
}

function IllusRocket() {
    return (
        <div className="es-illus">
            <motion.div animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                {RocketIcon}
            </motion.div>
        </div>
    );
}

function IllusCheatSheet() {
    return (
        <div className="es-illus">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                {BoltIcon}
            </motion.div>
        </div>
    );
}

/* ── Main EmptyState ── */
interface EmptyStateProps {
    icon?: React.ReactNode;
    illustration?: React.ReactNode;
    title: string;
    description?: string;
    hint?: string;
    action?: { label: string; onClick: () => void };
    secondaryAction?: { label: string; onClick: () => void };
    className?: string;
}

export function EmptyState({
    icon,
    illustration,
    title,
    description,
    hint,
    action,
    secondaryAction,
    className = '',
}: EmptyStateProps) {
    return (
        <motion.div
            className={`es ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
            {illustration ? (
                <motion.div
                    className="es__illustration"
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    {illustration}
                </motion.div>
            ) : icon ? (
                <motion.div
                    className="es__icon"
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                >
                    {icon}
                </motion.div>
            ) : null}

            <h3 className="es__title">{title}</h3>

            {description && <p className="es__desc">{description}</p>}

            {hint && (
                <div className="es__hint">
                    <span className="es__hint-icon">{LightbulbIcon}</span>
                    {hint}
                </div>
            )}

            {(action || secondaryAction) && (
                <div className="es__actions">
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
                    {secondaryAction && (
                        <motion.button
                            className="es__action es__action--secondary"
                            onClick={secondaryAction.onClick}
                            whileHover={{ scale: 1.03, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            {secondaryAction.label}
                        </motion.button>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export function NoPlanEmpty({ onAction }: { onAction?: () => void }) {
    const toggleUpload = useUiStore((s) => s.toggleUploadDrawer);

    return (
        <EmptyState
            illustration={<IllusRocket />}
            title={t("empty.noPlan")}
            description={t("empty.noPlanDesc")}
            hint={t("empty.noPlanHint")}
            action={{ label: t("empty.uploadMaterial") || "Materyal Yukle", onClick: toggleUpload }}
            secondaryAction={onAction ? { label: t("empty.getStarted"), onClick: onAction } : undefined}
        />
    );
}

export function NoQuizEmpty({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            illustration={<IllusQuiz />}
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
            illustration={<IllusBooks />}
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
            illustration={<IllusCheatSheet />}
            title={t("empty.noCheatSheet")}
            description={t("empty.noCheatSheetDesc")}
            hint={t("empty.noCheatSheetHint")}
            action={onAction ? { label: t("empty.generate"), onClick: onAction } : undefined}
        />
    );
}

export function NoFlashcardsEmpty({ onAction, onManual }: { onAction?: () => void; onManual?: () => void }) {
    return (
        <EmptyState
            illustration={<IllusFlashcard />}
            title={t("empty.noFlashcards")}
            description={t("empty.noFlashcardsDesc")}
            action={onAction ? { label: t("empty.generateAI"), onClick: onAction } : undefined}
            secondaryAction={onManual ? { label: t("empty.addManual"), onClick: onManual } : undefined}
        />
    );
}

export function NoNotesEmpty({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            illustration={<IllusNotes />}
            title={t("empty.noNotes")}
            description={t("empty.noNotesDesc")}
            action={onAction ? { label: t("empty.createFirstNote"), onClick: onAction } : undefined}
        />
    );
}

export function NoMindMapEmpty({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            illustration={<IllusMindMap />}
            title={t("empty.noMindMap")}
            description={t("empty.noMindMapDesc")}
            action={onAction ? { label: t("empty.generateMindMap"), onClick: onAction } : undefined}
        />
    );
}

export function NoRoomsEmpty({ onAction, onExplore }: { onAction?: () => void; onExplore?: () => void }) {
    return (
        <EmptyState
            illustration={<IllusRoom />}
            title={t("empty.noRooms")}
            description={t("empty.noRoomsDesc")}
            action={onAction ? { label: t("empty.createRoom"), onClick: onAction } : undefined}
            secondaryAction={onExplore ? { label: t("empty.exploreRooms"), onClick: onExplore } : undefined}
        />
    );
}
