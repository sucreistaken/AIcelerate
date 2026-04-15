// src/components/layout/MobileNav.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore';
import {
  LayoutDashboard,
  ClipboardList,
  HelpCircle,
  PenLine,
  MoreHorizontal,
  X,
  Target,
  GitCompare,
  FileText,
  MessageSquare,
  Network,
  GraduationCap,
  CheckCircle,
  Layers,
  CreditCard,
  Zap,
  Share2,
  History,
  Users,
} from 'lucide-react';
import { t } from '../../utils/i18n';
import type { ModeId } from '../../types';

interface NavItem {
  id: ModeId;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'course-dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { id: 'plan', icon: <ClipboardList size={20} />, label: 'Plan' },
  { id: 'quiz', icon: <HelpCircle size={20} />, label: 'Quiz' },
  { id: 'notes', icon: <PenLine size={20} />, label: 'Notes' },
];

interface MoreItem {
  id: ModeId;
  icon: React.ReactNode;
  labelKey: string;
  group: string;
}

const moreItems: MoreItem[] = [
  // Study
  { id: 'lecturer-note', icon: <FileText size={18} />, labelKey: 'mode.lecturerNote', group: 'sidebar.studyGroup' },
  { id: 'deep-dive', icon: <MessageSquare size={18} />, labelKey: 'mode.deepDive', group: 'sidebar.studyGroup' },
  { id: 'mindmap', icon: <Network size={18} />, labelKey: 'mode.mindmap', group: 'sidebar.studyGroup' },
  // Analysis
  { id: 'alignment', icon: <Target size={18} />, labelKey: 'mode.alignment', group: 'sidebar.analysisGroup' },
  { id: 'deviation', icon: <GitCompare size={18} />, labelKey: 'mode.deviation', group: 'sidebar.analysisGroup' },
  { id: 'lo-study', icon: <GraduationCap size={18} />, labelKey: 'mode.loStudy', group: 'sidebar.analysisGroup' },
  { id: 'lo-progress', icon: <CheckCircle size={18} />, labelKey: 'mode.loProgress', group: 'sidebar.analysisGroup' },
  // Practice
  { id: 'adaptive-quiz', icon: <Layers size={18} />, labelKey: 'mode.adaptiveQuiz', group: 'sidebar.practiceGroup' },
  { id: 'flashcards', icon: <CreditCard size={18} />, labelKey: 'mode.flashcards', group: 'sidebar.practiceGroup' },
  // Resources
  { id: 'cheat-sheet', icon: <Zap size={18} />, labelKey: 'mode.cheatSheet', group: 'sidebar.resourcesGroup' },
  { id: 'connections', icon: <Share2 size={18} />, labelKey: 'mode.connections', group: 'sidebar.resourcesGroup' },
  { id: 'knowledge-graph', icon: <Network size={18} />, labelKey: 'mode.knowledgeGraph', group: 'sidebar.resourcesGroup' },
  // Manage
  { id: 'history', icon: <History size={18} />, labelKey: 'sidebar.allLessons', group: 'sidebar.lessons' },
  { id: 'study-hub', icon: <Users size={18} />, labelKey: 'mode.studyHub', group: 'sidebar.lessons' },
];

export function MobileNav() {
  // Per-field selectors — MobileNav stays static on unrelated ui-store ticks.
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = !navItems.some((item) => item.id === mode);

  const handleMore = (id: ModeId) => {
    setMode(id);
    setShowMore(false);
  };

  // Group moreItems
  const groups = moreItems.reduce<Record<string, MoreItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <>
      {/* More bottom sheet */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 99,
              }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--card)',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '70vh',
                overflow: 'auto',
                padding: '16px 16px 80px',
                boxShadow: 'var(--shadow-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{t('sidebar.lessons')}</span>
                <button onClick={() => setShowMore(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>
              {Object.entries(groups).map(([groupKey, items]) => (
                <div key={groupKey} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '4px 0', marginBottom: 2 }}>
                    {t(groupKey)}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleMore(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '10px 8px',
                        background: mode === item.id ? 'var(--accent-soft)' : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: mode === item.id ? 'var(--accent-2)' : 'var(--text)',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: mode === item.id ? 600 : 400,
                        textAlign: 'left',
                      }}
                    >
                      {item.icon}
                      {t(item.labelKey)}
                    </button>
                  ))}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav
        className="mobile-nav"
        role="navigation"
        aria-label="Ana navigasyon"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0 env(safe-area-inset-bottom, 8px)',
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => setMode(item.id)}
            whileTap={{ scale: 0.9 }}
            aria-label={item.label}
            aria-current={mode === item.id ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: mode === item.id ? 'var(--accent-2)' : 'var(--muted)',
              transition: 'color 0.2s',
              position: 'relative',
            }}
          >
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
            {mode === item.id && (
              <motion.div
                layoutId="activeTab"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: 24,
                  height: 3,
                  background: 'var(--accent-2)',
                  borderRadius: 2,
                }}
              />
            )}
          </motion.button>
        ))}

        {/* More button */}
        <motion.button
          onClick={() => setShowMore(true)}
          whileTap={{ scale: 0.9 }}
          aria-label="More"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: isMoreActive ? 'var(--accent-2)' : 'var(--muted)',
            transition: 'color 0.2s',
            position: 'relative',
          }}
        >
          <MoreHorizontal size={20} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>More</span>
          {isMoreActive && (
            <motion.div
              layoutId="activeTab"
              style={{
                position: 'absolute',
                bottom: 0,
                width: 24,
                height: 3,
                background: 'var(--accent-2)',
                borderRadius: 2,
              }}
            />
          )}
        </motion.button>
      </nav>

      {/* Floating Action Button */}
      <motion.button
        className="fab"
        onClick={() => setMode("create-lesson" as ModeId)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Yeni ders oluştur"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 101,
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          boxShadow: 'var(--shadow-1)',
          cursor: 'pointer',
          fontSize: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        +
      </motion.button>
    </>
  );
}

export default MobileNav;
