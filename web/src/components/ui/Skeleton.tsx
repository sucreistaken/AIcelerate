// src/components/ui/Skeleton.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    lines?: number;
}

const shimmer = {
    animate: {
        backgroundPosition: ['200% 0', '-200% 0'],
    },
    transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear' as const,
    },
};

export function Skeleton({
    width = '100%',
    height = '1rem',
    className = '',
    variant = 'rectangular',
    lines = 1,
}: SkeletonProps) {
    const baseStyles: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        background: 'linear-gradient(90deg, var(--skeleton-base) 0%, var(--skeleton-shine) 50%, var(--skeleton-base) 100%)',
        backgroundSize: '200% 100%',
        borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? '4px' : '8px',
    };

    if (lines > 1) {
        return (
            <div className={`skeleton-lines ${className}`} style={{ display: 'grid', gap: '8px' }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <motion.div
                        key={i}
                        style={{
                            ...baseStyles,
                            width: i === lines - 1 ? '60%' : '100%',
                        }}
                        animate={shimmer.animate}
                        transition={shimmer.transition}
                        aria-hidden="true"
                    />
                ))}
            </div>
        );
    }

    return (
        <motion.div
            className={`skeleton ${className}`}
            style={baseStyles}
            animate={shimmer.animate}
            transition={shimmer.transition}
            aria-hidden="true"
        />
    );
}

// Card Skeleton
export function CardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`card skeleton-card ${className}`} style={{ padding: '16px' }}>
            <Skeleton height={20} width="60%" />
            <div style={{ marginTop: '12px' }}>
                <Skeleton lines={3} />
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <Skeleton width={80} height={28} />
                <Skeleton width={80} height={28} />
            </div>
        </div>
    );
}

// List Skeleton
export function ListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
}

// Quiz Skeleton
export function QuizSkeleton() {
    return (
        <div className="lc-section" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <Skeleton width="40%" height={24} />
                <Skeleton width={80} height={28} />
            </div>
            <div style={{ marginBottom: '20px', padding: '20px', borderRadius: '12px', background: 'var(--bg)' }}>
                <Skeleton width="80%" height={20} />
                <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height={44} />
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Skeleton width={100} height={36} />
                <Skeleton width={120} height={36} />
            </div>
        </div>
    );
}

// Flashcard Skeleton
export function FlashcardSkeleton() {
    return (
        <div className="lc-section" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <Skeleton width="35%" height={22} />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Skeleton width={60} height={24} />
                    <Skeleton width={60} height={24} />
                </div>
            </div>
            <div style={{
                maxWidth: 480, margin: '0 auto', padding: '40px 24px',
                borderRadius: '16px', background: 'var(--bg)', textAlign: 'center',
            }}>
                <Skeleton width="70%" height={24} />
                <div style={{ marginTop: '16px' }}>
                    <Skeleton lines={2} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                <Skeleton width={70} height={36} />
                <Skeleton width={70} height={36} />
                <Skeleton width={70} height={36} />
                <Skeleton width={70} height={36} />
            </div>
        </div>
    );
}

// Deep Dive Chat Skeleton
export function DeepDiveSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Skeleton width={32} height={32} variant="circular" />
                <Skeleton width="30%" height={18} />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                    padding: '16px', borderRadius: '12px', background: 'var(--bg)',
                    alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                }}>
                    <Skeleton lines={i === 1 ? 3 : 1} />
                </div>
            ))}
            <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                <Skeleton height={44} />
                <Skeleton width={44} height={44} />
            </div>
        </div>
    );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="skeleton-table" style={{ display: 'grid', gap: '8px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px' }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} height={24} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px' }}>
                    {Array.from({ length: cols }).map((_, colIdx) => (
                        <Skeleton key={colIdx} height={20} />
                    ))}
                </div>
            ))}
        </div>
    );
}
