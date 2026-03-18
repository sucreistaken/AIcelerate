// src/utils/i18n.ts — Simple i18n system

type Lang = 'tr' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  tr: {
    // Common
    'common.cancel': 'İptal',
    'common.confirm': 'Onayla',
    'common.delete': 'Sil',
    'common.save': 'Kaydet',
    'common.close': 'Kapat',
    'common.loading': 'Yükleniyor...',
    'common.error': 'Hata',
    'common.success': 'Başarılı',
    'common.yes': 'Evet',
    'common.no': 'Hayır',
    'common.search': 'Ara...',
    'common.export': 'Dışa Aktar',
    'common.import': 'İçe Aktar',
    'common.copy': 'Kopyala',
    'common.copied': 'Kopyalandı!',
    'common.download': 'İndir',
    'common.upload': 'Yükle',
    'common.create': 'Oluştur',
    'common.edit': 'Düzenle',
    'common.back': 'Geri',
    'common.next': 'İleri',
    'common.pdf': 'PDF İndir',
    'common.noData': 'Veri bulunamadı.',

    // Nav / Modes
    'nav.brand': 'AIcelerate',
    'mode.plan': 'Plan',
    'mode.alignment': 'Eşleştirme',
    'mode.deviation': 'Sapma',
    'mode.lecturerNote': 'Ders Notu',
    'mode.quiz': 'Quiz',
    'mode.deepDive': 'Deep Dive',
    'mode.mindmap': 'Mind Map',
    'mode.examSprint': 'Sınav Spriniti',
    'mode.history': 'Geçmiş',
    'mode.loStudy': 'LO Çalışma',
    'mode.cheatSheet': 'Cheat Sheet',
    'mode.notes': 'Notlar',
    'mode.weakness': 'Zayıf Noktalar',
    'mode.flashcards': 'Flashcardlar',
    'mode.connections': 'Bağlantılar',
    'mode.studyRoom': 'Çalışma Odası',
    'mode.studyHub': 'Study Hub',
    'mode.courseDashboard': 'Kurs Paneli',

    // Plan
    'plan.title': 'Öğrenme Planı',
    'plan.generate': 'Plan Oluştur',
    'plan.generating': 'Plan oluşturuluyor...',
    'plan.weekLabel': 'Hafta',
    'plan.difficulty': 'Zorluk',
    'plan.keyConcepts': 'Ana Kavramlar',
    'plan.noTranscript': 'Henüz transkript yok. Lütfen önce bir ders yükleyin.',

    // Quiz
    'quiz.title': 'Quiz Modu',
    'quiz.generate': 'Quiz Oluştur',
    'quiz.generating': 'Quiz oluşturuluyor...',
    'quiz.submit': 'Cevabı Gönder',
    'quiz.next': 'Sonraki Soru',
    'quiz.finish': 'Quizi Bitir',
    'quiz.score': 'Puan',
    'quiz.question': 'Soru',
    'quiz.correct': 'Doğru',
    'quiz.incorrect': 'Yanlış',
    'quiz.results': 'Sonuçlar',

    // Flashcard
    'flashcard.title': 'Flashcardlar',
    'flashcard.generate': 'Flashcard Oluştur',
    'flashcard.flip': 'Çevir',
    'flashcard.easy': 'Kolay',
    'flashcard.medium': 'Orta',
    'flashcard.hard': 'Zor',
    'flashcard.again': 'Tekrar',
    'flashcard.reviewComplete': 'Tekrar tamamlandı!',
    'flashcard.cardsReviewed': 'kart incelendi',
    'flashcard.dueCards': 'Bekleyen Kartlar',

    // Deep Dive
    'deepDive.title': 'Deep Dive',
    'deepDive.placeholder': 'Bir soru sorun...',
    'deepDive.send': 'Gönder',
    'deepDive.noLesson': 'Ders seçin ve sohbete başlayın',

    // Notes
    'notes.title': 'Notlar',
    'notes.newNote': 'Yeni Not',
    'notes.clearAll': 'Tümünü Sil',
    'notes.noNotes': 'Henüz not yok.',
    'notes.deleteConfirmTitle': 'Tüm Notları Sil',
    'notes.deleteConfirmMsg': 'Tüm notlarınız silinecek. Bu işlem geri alınamaz.',

    // Mind Map
    'mindmap.title': 'Mind Map',
    'mindmap.generate': 'Mind Map Oluştur',
    'mindmap.search': 'Node ara...',

    // Cheat Sheet
    'cheatSheet.title': 'Cheat Sheet',
    'cheatSheet.generate': 'Cheat Sheet Oluştur',
    'cheatSheet.langChange': 'Dil değişti. Cheat sheet yeniden oluşturulsun mu?',

    // Course Dashboard
    'course.title': 'Kurslar',
    'course.create': 'Yeni Kurs',
    'course.delete': 'Kursu Sil',
    'course.deleteConfirm': 'kursu silinecek. Bu işlem geri alınamaz.',
    'course.rebuild': 'Index Yeniden Oluştur',
    'course.rebuildConfirm': 'Knowledge Index yeniden oluşturulsun mu?',

    // Lessons History
    'history.title': 'Kayıtlı Derslerim',
    'history.search': 'Ders ara...',
    'history.noLessons': 'Henüz hiç dersin yok.',
    'history.bulkDelete': 'Toplu Sil',
    'history.bulkDeleteConfirm': 'ders silinecek. Emin misiniz?',

    // Gamification
    'xp.levelUp': 'Seviye Atladın!',
    'xp.streak': 'gün streak',
    'xp.level.1': 'Çaylak',
    'xp.level.2': 'Öğrenci',
    'xp.level.3': 'Uzman',
    'xp.level.4': 'Üstad',

    // Upload
    'upload.slides': 'Slayt Yükle (PDF)',
    'upload.audio': 'Ses Yükle',
    'upload.transcribing': 'Transkript ediliyor...',

    // Progress Stepper
    'stepper.analyzing': 'Materyal analiz ediliyor...',
    'stepper.generating': 'Plan oluşturuluyor...',
    'stepper.extracting': 'Vurgular çıkarılıyor...',
    'stepper.complete': 'Tamamlandı!',
  },
  en: {
    // Common
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.search': 'Search...',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.create': 'Create',
    'common.edit': 'Edit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.pdf': 'Download PDF',
    'common.noData': 'No data found.',

    // Nav / Modes
    'nav.brand': 'AIcelerate',
    'mode.plan': 'Plan',
    'mode.alignment': 'Alignment',
    'mode.deviation': 'Deviation',
    'mode.lecturerNote': 'Lecture Notes',
    'mode.quiz': 'Quiz',
    'mode.deepDive': 'Deep Dive',
    'mode.mindmap': 'Mind Map',
    'mode.examSprint': 'Exam Sprint',
    'mode.history': 'History',
    'mode.loStudy': 'LO Study',
    'mode.cheatSheet': 'Cheat Sheet',
    'mode.notes': 'Notes',
    'mode.weakness': 'Weaknesses',
    'mode.flashcards': 'Flashcards',
    'mode.connections': 'Connections',
    'mode.studyRoom': 'Study Room',
    'mode.studyHub': 'Study Hub',
    'mode.courseDashboard': 'Course Dashboard',

    // Plan
    'plan.title': 'Learning Plan',
    'plan.generate': 'Generate Plan',
    'plan.generating': 'Generating plan...',
    'plan.weekLabel': 'Week',
    'plan.difficulty': 'Difficulty',
    'plan.keyConcepts': 'Key Concepts',
    'plan.noTranscript': 'No transcript yet. Please upload a lesson first.',

    // Quiz
    'quiz.title': 'Quiz Mode',
    'quiz.generate': 'Generate Quiz',
    'quiz.generating': 'Generating quiz...',
    'quiz.submit': 'Submit Answer',
    'quiz.next': 'Next Question',
    'quiz.finish': 'Finish Quiz',
    'quiz.score': 'Score',
    'quiz.question': 'Question',
    'quiz.correct': 'Correct',
    'quiz.incorrect': 'Incorrect',
    'quiz.results': 'Results',

    // Flashcard
    'flashcard.title': 'Flashcards',
    'flashcard.generate': 'Generate Flashcards',
    'flashcard.flip': 'Flip',
    'flashcard.easy': 'Easy',
    'flashcard.medium': 'Medium',
    'flashcard.hard': 'Hard',
    'flashcard.again': 'Again',
    'flashcard.reviewComplete': 'Review complete!',
    'flashcard.cardsReviewed': 'cards reviewed',
    'flashcard.dueCards': 'Due Cards',

    // Deep Dive
    'deepDive.title': 'Deep Dive',
    'deepDive.placeholder': 'Ask a question...',
    'deepDive.send': 'Send',
    'deepDive.noLesson': 'Select a lesson to start a conversation',

    // Notes
    'notes.title': 'Notes',
    'notes.newNote': 'New Note',
    'notes.clearAll': 'Clear All',
    'notes.noNotes': 'No notes yet.',
    'notes.deleteConfirmTitle': 'Delete All Notes',
    'notes.deleteConfirmMsg': 'All your notes will be deleted. This action cannot be undone.',

    // Mind Map
    'mindmap.title': 'Mind Map',
    'mindmap.generate': 'Generate Mind Map',
    'mindmap.search': 'Search nodes...',

    // Cheat Sheet
    'cheatSheet.title': 'Cheat Sheet',
    'cheatSheet.generate': 'Generate Cheat Sheet',
    'cheatSheet.langChange': 'Language changed. Regenerate cheat sheet?',

    // Course Dashboard
    'course.title': 'Courses',
    'course.create': 'New Course',
    'course.delete': 'Delete Course',
    'course.deleteConfirm': 'course will be deleted. This action cannot be undone.',
    'course.rebuild': 'Rebuild Index',
    'course.rebuildConfirm': 'Rebuild Knowledge Index? This may take some time.',

    // Lessons History
    'history.title': 'My Lessons',
    'history.search': 'Search lessons...',
    'history.noLessons': "You don't have any lessons yet.",
    'history.bulkDelete': 'Bulk Delete',
    'history.bulkDeleteConfirm': 'lessons will be deleted. Are you sure?',

    // Gamification
    'xp.levelUp': 'Level Up!',
    'xp.streak': 'day streak',
    'xp.level.1': 'Rookie',
    'xp.level.2': 'Student',
    'xp.level.3': 'Expert',
    'xp.level.4': 'Master',

    // Upload
    'upload.slides': 'Upload Slides (PDF)',
    'upload.audio': 'Upload Audio',
    'upload.transcribing': 'Transcribing...',

    // Progress Stepper
    'stepper.analyzing': 'Analyzing materials...',
    'stepper.generating': 'Generating plan...',
    'stepper.extracting': 'Extracting highlights...',
    'stepper.complete': 'Complete!',
  },
};

// Language state - synced with uiStore
let currentLang: Lang = 'tr';

export function setLanguage(lang: Lang) {
  currentLang = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('lc.language', lang);
  }
}

export function getLanguage(): Lang {
  return currentLang;
}

export function initLanguage(): Lang {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('lc.language') as Lang | null;
    if (saved === 'tr' || saved === 'en') {
      currentLang = saved;
      return saved;
    }
  }
  return 'tr';
}

/**
 * Translate a key to the current language.
 * Falls back to English, then returns the key itself.
 */
export function t(key: string): string {
  return translations[currentLang]?.[key]
    ?? translations['en']?.[key]
    ?? key;
}

/**
 * Translate with explicit language.
 */
export function tLang(key: string, lang: Lang): string {
  return translations[lang]?.[key]
    ?? translations['en']?.[key]
    ?? key;
}
