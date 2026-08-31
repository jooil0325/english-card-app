/**
 * EngCard - Application Logic
 * Full implementation following Flashcards Deluxe & User Specification
 */

// Ebbinghaus Spaced Repetition Intervals (in days)
const EBBINGHAUS_INTERVALS = [1, 2, 6, 15, 30];

// Initial Sample Sentences
const INITIAL_SENTENCES = [
    {
        no: 1,
        id: 's_1',
        english: 'Consistency is the key to success.',
        korean: '꾸준함이 성공의 열쇠이다.',
        category: '일상 회화',
        source: 'manual',
        memorized: false,
        wrongCount: 0,
        studyCount: 0,
        lastStudiedAt: null,
        nextReviewDate: getTodayString(),
        intervalStep: 0
    },
    {
        no: 2,
        id: 's_2',
        english: 'Could you please clarify that point?',
        korean: '그 부분을 다시 설명해 주시겠어요?',
        category: '비즈니스',
        source: 'ai',
        memorized: false,
        wrongCount: 1,
        studyCount: 3,
        lastStudiedAt: getYesterdayString(),
        nextReviewDate: getTodayString(),
        intervalStep: 0
    },
    {
        no: 3,
        id: 's_3',
        english: 'Where is the nearest subway station?',
        korean: '가장 가까운 지하철역이 어디인가요?',
        category: '여행',
        source: 'manual',
        memorized: true,
        wrongCount: 0,
        studyCount: 6,
        lastStudiedAt: getTodayString(),
        nextReviewDate: addDaysToDate(getTodayString(), 1),
        intervalStep: 1
    },
    {
        no: 4,
        id: 's_4',
        english: 'I will get back to you as soon as possible.',
        korean: '가능한 한 빨리 답변해 드리겠습니다.',
        category: '비즈니스',
        source: 'manual',
        memorized: false,
        wrongCount: 3,
        studyCount: 15,
        lastStudiedAt: getYesterdayString(),
        nextReviewDate: getTodayString(),
        intervalStep: 0
    }
];

const AI_PRESETS = {
    '여행할 때 쓰는 필수 회화': [
        { english: 'Could I have a window seat, please?', korean: '창가 쪽 좌석으로 부탁드립니다.', category: '여행' },
        { english: 'Is there a pharmacy nearby?', korean: '근처에 약국이 있나요?', category: '여행' },
        { english: 'Can I check in early?', korean: '얼리 체크인을 할 수 있을까요?', category: '여행' }
    ],
    '비즈니스 이메일 및 회의 표현': [
        { english: 'Thank you for bringing this to our attention.', korean: '이건을 저희에게 알려주셔서 감사합니다.', category: '비즈니스' },
        { english: 'Let us touch base next week.', korean: '다음 주에 다시 연락해서 진행상황 체크합시다.', category: '비즈니스' },
        { english: 'I agree with your proposal in principle.', korean: '원칙적으로 당신의 제안에 동의합니다.', category: '비즈니스' }
    ],
    '원어민이 매일 쓰는 미드 단골 표현': [
        { english: 'It completely slipped my mind.', korean: '깜빡하고 완전히 잊고 있었어요.', category: '일상 회화' },
        { english: 'Let us call it a day.', korean: '오늘 작업은 여기서 마무리합시다.', category: '일상 회화' },
        { english: 'I am on the fence about it.', korean: '아직 결정하지 못하고 고민 중이에요.', category: '일상 회화' }
    ],
    'OPIC / 토익스피킹 시험용 유용한 표현': [
        { english: 'Speaking of which, I had a similar experience.', korean: '말이 나와서 말인데, 저도 비슷한 경험을 했습니다.', category: '패턴/관용구' },
        { english: 'It plays a crucial role in my daily routine.', korean: '그것은 제 일상 루틴에서 매우 중요한 역할을 합니다.', category: '패턴/관용구' }
    ]
};

// Date Helpers
function getTodayString() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function getYesterdayString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

function addDaysToDate(dateStr, days) {
    const d = new Date(dateStr || getTodayString());
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

class EngCardApp {
    constructor() {
        const DEFAULT_DECKS = [
            { id: 'deck_default', name: '기본 덱', description: '기본 단어장', createdAt: getTodayString(), isDefault: true }
        ];
        this.decks = JSON.parse(localStorage.getItem('engcard_decks')) || DEFAULT_DECKS;
        this.activeDeckId = localStorage.getItem('engcard_active_deck') || 'deck_default';

        this.sentences = JSON.parse(localStorage.getItem('engcard_sentences')) || INITIAL_SENTENCES;
        this.goal = JSON.parse(localStorage.getItem('engcard_goal')) || {
            type: 'daily',
            dailyCount: 10,
            totalCount: 1000,
            targetDays: 30,
            reviewCap: 20,
            catchUpMode: true,
            enableNotifications: true
        };

        // TTS & Voice Shadowing State
        this.ttsRate = parseFloat(localStorage.getItem('engcard_tts_rate')) || 1.0;
        this.cardStartTime = Date.now();
        this.currentCardLatency = 0;
        this.speechRecognition = null;
        this.voiceSilenceTimer = null;
        this.accumulatedTranscript = '';
        this.isGlobalHintActive = false;

        // Smart Capture Voice & Translation State (Idea 1 & 2 + Mic)
        this.smartVoiceRecognition = null;
        this.smartVoiceLang = 'en-US';
        this.isSmartVoiceListening = false;
        this.smartTranslateTimer = null;

        this.currentCardIndex = 0;
        this.touchState = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isDragging: false,
            lastTapTime: 0,
            longPressTimer: null
        };

        this.quizState = {
            active: false,
            questions: [],
            currentIndex: 0,
            score: 0,
            type: 'arrange',
            selectedWords: []
        };

        // Daily Session & Smart Loop Queue State
        this.sessionQueue = [];
        this.sessionTotalCount = 0;
        this.sessionCompletedCount = 0;
        this.sessionCompletedIds = [];
        this.activeListScope = 'today_focus'; // 'today_focus' (기본: 오늘목표+오답복습) or 'all_vault' (전체보관함)
        this.studyViewMode = 'card'; // 'card' (3D Flashcard) or 'list' (Smart Relay List)
        this.listSprintCurrentIndex = 0; // Pointer for 3s Speed Sprint in List mode

        this.initDOM();
        this.ensureValidSchema();
        this.bindEvents();
        this.initGestures();
        this.bindKeyboardShortcuts();
        this.renderAll();
        this.checkEbbinghausNotifications();
    }

    ensureValidSchema() {
        let changed = false;
        if (!this.decks || this.decks.length === 0) {
            this.decks = [{ id: 'deck_default', name: '기본 덱', description: '기본 단어장', createdAt: getTodayString(), isDefault: true }];
            changed = true;
        }
        if (!this.decks.find(d => d.id === this.activeDeckId) && this.activeDeckId !== 'all') {
            this.activeDeckId = this.decks[0].id;
            changed = true;
        }
        this.sentences.forEach((s, idx) => {
            if (!s.no) { s.no = idx + 1; changed = true; }
            if (!s.deckId) { s.deckId = 'deck_default'; changed = true; }
            if (s.wrongCount === undefined) { s.wrongCount = 0; changed = true; }
            if (!s.nextReviewDate) { s.nextReviewDate = getTodayString(); changed = true; }
            if (s.intervalStep === undefined) { s.intervalStep = 0; changed = true; }
            if (s.studyCount === undefined || (s.lastStudiedAt && s.studyCount === 0) || ((s.wrongCount || 0) > 0 && (s.studyCount || 0) < s.wrongCount)) {
                s.studyCount = Math.max(s.studyCount || 0, (s.wrongCount || 0) + (s.intervalStep || 0) + (s.lastStudiedAt ? 1 : 0));
                changed = true;
            }
        });
        if (changed) this.saveState();
    }

    getActiveSentences() {
        if (this.activeDeckId === 'all') {
            return this.sentences;
        }
        return this.sentences.filter(s => s.deckId === this.activeDeckId);
    }

    saveState() {
        localStorage.setItem('engcard_sentences', JSON.stringify(this.sentences));
        localStorage.setItem('engcard_decks', JSON.stringify(this.decks));
        localStorage.setItem('engcard_active_deck', this.activeDeckId);
        localStorage.setItem('engcard_goal', JSON.stringify(this.goal));
        this.updateHeaderStats();
        this.updateGoalProgress();
        this.updateDeckUI();
    }

    initDOM() {
        // Navigation Tabs (Material 3 Bottom Nav & Legacy)
        this.navItems = document.querySelectorAll('.nav-tab-btn, .nav-item');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.subTabBtns = document.querySelectorAll('.sub-tab-btn');
        this.subtabPanels = document.querySelectorAll('.subtab-panel');

        // Header & Goal Stats
        this.totalCountEl = document.getElementById('totalCount');
        this.memorizedCountEl = document.getElementById('memorizedCount');
        this.dueBadge = document.getElementById('dueBadge');
        this.dueCountEl = document.getElementById('dueCount');
        this.btnGoalModal = document.getElementById('btnGoalModal');
        this.goalProgressBarContainer = document.getElementById('goalProgressBarContainer');
        this.goalBadgeText = document.getElementById('goalBadgeText');
        this.goalTitleStr = document.getElementById('goalTitleStr');
        this.goalPercentStr = document.getElementById('goalPercentStr');
        this.goalProgressBar = document.getElementById('goalProgressBar');

        // Deck Selector Elements
        this.btnOpenDeckModal = document.getElementById('btnOpenDeckModal');
        this.currentDeckName = document.getElementById('currentDeckName');
        this.currentDeckCountBadge = document.getElementById('currentDeckCountBadge');
        this.selectScrapTargetDeck = document.getElementById('selectScrapTargetDeck');
        this.chkScrapNewDeck = document.getElementById('chkScrapNewDeck');
        this.inputScrapNewDeckName = document.getElementById('inputScrapNewDeckName');

        // Deck Management Modal Elements
        this.deckModal = document.getElementById('deckModal');
        this.btnCloseDeckModal = document.getElementById('btnCloseDeckModal');
        this.inputNewDeckName = document.getElementById('inputNewDeckName');
        this.btnCreateDeck = document.getElementById('btnCreateDeck');
        this.btnViewAllDecks = document.getElementById('btnViewAllDecks');
        this.deckListContainer = document.getElementById('deckListContainer');

        // Move to Deck Modal Elements
        this.btnMoveSelected = document.getElementById('btnMoveSelected');
        this.moveDeckModal = document.getElementById('moveDeckModal');
        this.btnCloseMoveDeckModal = document.getElementById('btnCloseMoveDeckModal');
        this.btnConfirmMoveDeck = document.getElementById('btnConfirmMoveDeck');
        this.selectTargetMoveDeck = document.getElementById('selectTargetMoveDeck');

        // Smart Quick Capture Elements (Idea 1 & 2 + Voice Input)
        this.unifiedBulkInput = document.getElementById('smartCaptureInput');
        this.btnPasteClipboard = document.getElementById('btnPasteClipboard');
        this.btnVoiceLangEn = document.getElementById('btnVoiceLangEn');
        this.btnVoiceLangKo = document.getElementById('btnVoiceLangKo');
        this.smartCaptureInput = document.getElementById('smartCaptureInput');
        this.btnSmartVoiceMic = document.getElementById('btnSmartVoiceMic');
        this.smartVoiceMicIcon = document.getElementById('smartVoiceMicIcon');
        this.smartVoiceStatus = document.getElementById('smartVoiceStatus');
        this.smartVoiceStatusText = document.getElementById('smartVoiceStatusText');
        this.btnStopSmartVoice = document.getElementById('btnStopSmartVoice');
        this.previewEnglishInput = document.getElementById('previewEnglishInput');
        this.previewKoreanInput = document.getElementById('previewKoreanInput');
        this.selectSmartDeck = document.getElementById('selectSmartDeck');
        this.selectSmartCategory = document.getElementById('selectSmartCategory');
        this.btnConfirmSmartSave = document.getElementById('btnConfirmSmartSave');
        this.smartTranslateIndicator = document.getElementById('smartTranslateIndicator');
        this.omniModeText = document.getElementById('omniModeText');
        this.btnTriggerFileUpload = document.getElementById('btnTriggerFileUpload');

        // Quick Batch & Universal Bulk Elements
        this.inputQuickBatchText = document.getElementById('inputQuickBatchText');
        this.btnParseQuickText = document.getElementById('btnParseQuickText');
        this.quickParsePreview = document.getElementById('quickParsePreview');
        this.btnSmartUnifiedBulk = document.getElementById('btnSmartUnifiedBulk');
        this.youtubeUrlInput = document.getElementById('youtubeUrl');
        this.btnScrapYoutube = document.getElementById('btnScrapYoutube');
        this.youtubeResultList = document.getElementById('youtubeResultList');
        this.fileInput = document.getElementById('fileInput');
        this.fileDropzone = document.getElementById('fileDropzone');

        // Flashcard Elements
        this.flashcard = document.getElementById('flashcard');
        this.cardCategory = document.getElementById('cardCategory');
        this.cardStudyTypeBadge = document.getElementById('cardStudyTypeBadge');
        this.cardEnglish = document.getElementById('cardEnglish');
        this.cardKorean = document.getElementById('cardKorean');
        this.cardPromptKorean = document.getElementById('cardPromptKorean');
        this.firstLetterHintBox = document.getElementById('firstLetterHintBox');
        this.cardReviewInfo = document.getElementById('cardReviewInfo');
        this.cardProgress = document.getElementById('cardProgress');
        this.cardLatencyBadge = document.getElementById('cardLatencyBadge');
        this.cardLatencyText = document.getElementById('cardLatencyText');
        this.btnToggleSpeedTriage = document.getElementById('btnToggleSpeedTriage');
        this.speedTriageGaugeWrapper = document.getElementById('speedTriageGaugeWrapper');
        this.speedTriageGauge = document.getElementById('speedTriageGauge');
        this.speedTriageBtnText = document.getElementById('speedTriageBtnText');
        this.btnTtsRateToggle = document.getElementById('btnTtsRateToggle');
        this.ttsRateBadge = document.getElementById('ttsRateBadge');
        this.btnToggleGlobalHint = document.getElementById('btnToggleGlobalHint');
        this.globalHintBtnText = document.getElementById('globalHintBtnText');
        this.btnViewModeCard = document.getElementById('btnViewModeCard');
        this.btnViewModeList = document.getElementById('btnViewModeList');
        this.studyViewCardContainer = document.getElementById('studyViewCardContainer');
        this.studyViewListContainer = document.getElementById('studyViewListContainer');
        this.btnFirstLetterHint = document.getElementById('btnFirstLetterHint');
        this.btnVoiceRecite = document.getElementById('btnVoiceRecite');
        this.btnShuffleCards = document.getElementById('btnShuffleCards');
        this.btnGradeHard = document.getElementById('btnGradeHard');
        this.btnGradeGood = document.getElementById('btnGradeGood');
        this.btnGradeEasy = document.getElementById('btnGradeEasy');
        this.btnCardTTS = document.getElementById('btnCardTTS');
        this.overlayLeft = document.querySelector('.swipe-left-overlay');
        this.overlayRight = document.querySelector('.swipe-right-overlay');

        // Voice Shadowing Panel Elements
        this.voiceShadowingPanel = document.getElementById('voiceShadowingPanel');
        this.voiceMicIcon = document.getElementById('voiceMicIcon');
        this.voiceStatusTitle = document.getElementById('voiceStatusTitle');
        this.voiceAccuracyBadge = document.getElementById('voiceAccuracyBadge');
        this.btnCloseVoicePanel = document.getElementById('btnCloseVoicePanel');
        this.btnFinishVoiceShadowing = document.getElementById('btnFinishVoiceShadowing');
        this.voiceDiffContainer = document.getElementById('voiceDiffContainer');

        // Session Progress & Complete Modal Elements
        this.sessionProgressBadge = document.getElementById('sessionProgressBadge');
        this.sessionQueueCount = document.getElementById('sessionQueueCount');
        this.sessionCompletedStr = document.getElementById('sessionCompletedStr');
        this.btnResetSession = document.getElementById('btnResetSession');
        this.sessionCompleteModal = document.getElementById('sessionCompleteModal');
        this.completedSessionCount = document.getElementById('completedSessionCount');
        this.btnStartSessionQuiz = document.getElementById('btnStartSessionQuiz');
        this.btnCloseSessionModal = document.getElementById('btnCloseSessionModal');

        // List & Table Elements
        this.sentenceListContainer = document.getElementById('sentenceListContainer');
        this.searchSentence = document.getElementById('searchSentence');
        this.filterCategory = document.getElementById('filterCategory');
        this.filterStatus = document.getElementById('filterStatus');
        this.sortOrder = document.getElementById('sortOrder');
        this.btnDeduplicateInList = document.getElementById('btnDeduplicateInList');
        this.btnExportCSV = document.getElementById('btnExportCSV');
        this.backupFileInput = document.getElementById('backupFileInput');
        this.btnScopeToday = document.getElementById('btnScopeToday');
        this.btnScopeAll = document.getElementById('btnScopeAll');
        this.todayFocusCountBadge = document.getElementById('todayFocusCountBadge');
        this.allLibraryCountBadge = document.getElementById('allLibraryCountBadge');

        // Quiz Elements
        this.quizSetup = document.getElementById('quizSetup');
        this.quizContainer = document.getElementById('quizContainer');
        this.btnStartQuiz = document.getElementById('btnStartQuiz');
        this.btnExitQuiz = document.getElementById('btnExitQuiz');
        this.quizKorean = document.getElementById('quizKorean');
        this.quizScoreBadge = document.getElementById('quizScoreBadge');

        this.quizArrangeArea = document.getElementById('quizArrangeArea');
        this.selectedWordsBox = document.getElementById('selectedWordsBox');
        this.wordPool = document.getElementById('wordPool');

        this.quizBlankArea = document.getElementById('quizBlankArea');
        this.blankSentence = document.getElementById('blankSentence');
        this.blankAnswerInput = document.getElementById('blankAnswerInput');

        this.quizWriteArea = document.getElementById('quizWriteArea');
        this.writeAnswerInput = document.getElementById('writeAnswerInput');

        this.quizFeedback = document.getElementById('quizFeedback');
        this.btnCheckQuiz = document.getElementById('btnCheckQuiz');
        this.btnNextQuiz = document.getElementById('btnNextQuiz');

        // Modal Elements
        this.goalModal = document.getElementById('goalModal');
        this.btnCloseGoalModal = document.getElementById('btnCloseGoalModal');
        this.goalTargetDeckSelect = document.getElementById('goalTargetDeckSelect');
        this.goalDeckStatsText = document.getElementById('goalDeckStatsText');
        this.goalSimulatorText = document.getElementById('goalSimulatorText');
        this.goalTypeSelect = document.getElementById('goalTypeSelect');
        this.goalDailyGroup = document.getElementById('goalDailyGroup');
        this.goalPeriodGroup = document.getElementById('goalPeriodGroup');
        this.goalDailyCount = document.getElementById('goalDailyCount');
        this.goalTotalCount = document.getElementById('goalTotalCount');
        this.goalTargetDays = document.getElementById('goalTargetDays');
        this.goalReviewCapSelect = document.getElementById('goalReviewCapSelect');
        this.enableCatchUpMode = document.getElementById('enableCatchUpMode');
        this.enableNotifications = document.getElementById('enableNotifications');
        this.btnSaveGoal = document.getElementById('btnSaveGoal');

        // Milestone Tier Modal Elements
        this.milestoneModal = document.getElementById('milestoneModal');
        this.milestoneTierIcon = document.getElementById('milestoneTierIcon');
        this.milestoneTierBadge = document.getElementById('milestoneTierBadge');
        this.milestoneTitle = document.getElementById('milestoneTitle');
        this.milestoneDeckName = document.getElementById('milestoneDeckName');
        this.milestoneProgressFill = document.getElementById('milestoneProgressFill');
        this.milestonePercentStr = document.getElementById('milestonePercentStr');
        this.milestonePraiseText = document.getElementById('milestonePraiseText');
        this.btnContinueMilestone = document.getElementById('btnContinueMilestone');
        this.btnShareMilestone = document.getElementById('btnShareMilestone');

        // Share Certificate Modal Elements
        this.btnOpenShareModal = document.getElementById('btnOpenShareModal');
        this.btnSessionShare = document.getElementById('btnSessionShare');
        this.shareModal = document.getElementById('shareModal');
        this.btnCloseShareModal = document.getElementById('btnCloseShareModal');
        this.shareCardDate = document.getElementById('shareCardDate');
        this.shareDeckNameStr = document.getElementById('shareDeckNameStr');
        this.shareStudiedCountStr = document.getElementById('shareStudiedCountStr');
        this.shareStreakStr = document.getElementById('shareStreakStr');
        this.shareKnownPctStr = document.getElementById('shareKnownPctStr');
        this.shareReviewPctStr = document.getElementById('shareReviewPctStr');
        this.shareMetaFillKnown = document.getElementById('shareMetaFillKnown');
        this.shareMetaFillReview = document.getElementById('shareMetaFillReview');
        this.shareCardSentences = document.getElementById('shareCardSentences');
        this.sharePraiseText = document.getElementById('sharePraiseText');
        this.btnShareNative = document.getElementById('btnShareNative');
        this.btnDownloadShareImg = document.getElementById('btnDownloadShareImg');
        this.btnCopyShareText = document.getElementById('btnCopyShareText');

        // Display Mode & Reveal / Hint State for List Tab
        this.listDisplayMode = localStorage.getItem('engcard_display_mode') || 'both';
        this.listPrimaryLanguage = localStorage.getItem('engcard_primary_lang') || 'kor';
        this.revealedItemIds = new Set();
        this.hintedItemIds = new Set();
        this.activeStatusFilter = 'unmemorized';

        // Bulk Selection Elements
        this.bulkActionBar = document.getElementById('bulkActionBar');
        this.bulkSelectCount = document.getElementById('bulkSelectCount');
        this.bulkDeleteCount = document.getElementById('bulkDeleteCount');
        this.btnSelectAll = document.getElementById('btnSelectAll');
        this.btnDeleteSelected = document.getElementById('btnDeleteSelected');
        this.btnCancelSelection = document.getElementById('btnCancelSelection');

        this.isSelectionMode = false;
        this.selectedSentenceIds = new Set();
    }

    bindEvents() {
        // Main Tabs
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // Dashboard Weak Top 3 Review Action
        document.getElementById('btnStudyWeakTop3')?.addEventListener('click', () => {
            const weak = this.sentences.filter(s => (s.wrongCount || 0) > 0).sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0));
            if (weak.length === 0) {
                this.showToast('오답 문장이 없습니다! 완벽합니다 👏', 'success');
                return;
            }
            this.sessionQueue = weak.map(s => s.id);
            this.currentCardIndex = 0;
            this.switchTab('tab-cards');
            this.switchStudyViewMode('card');
            this.renderFlashcard();
            this.showToast('🎯 취약 오답 문장 집중 복습을 시작합니다!', 'info');
        });

        // Bulk Action Bar Event Listeners
        this.btnSelectAll?.addEventListener('click', () => this.selectAllSentences());
        this.btnDeleteSelected?.addEventListener('click', () => this.deleteSelectedSentences());
        this.btnCancelSelection?.addEventListener('click', () => this.exitSelectionMode());

        // Filter Chips Event Listener
        this.filterChips = document.querySelectorAll('#filterStatusChips .chip-btn');
        this.filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const status = chip.dataset.status;
                if (status) {
                    this.activeStatusFilter = status;
                    if (this.filterStatus) this.filterStatus.value = status;
                    this.renderSentenceList();
                }
            });
        });

        // Display Mode Chips Event Listener
        this.displayChips = document.querySelectorAll('#displayModeChips .display-chip');
        this.displayChips.forEach(chip => {
            if (chip.dataset.display === this.listDisplayMode) {
                this.displayChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            }
            chip.addEventListener('click', () => {
                this.displayChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const chosenMode = chip.dataset.display || 'both';
                this.listDisplayMode = chosenMode;
                localStorage.setItem('engcard_display_mode', this.listDisplayMode);

                if (chosenMode === 'kor_only') {
                    this.listPrimaryLanguage = 'kor';
                    localStorage.setItem('engcard_primary_lang', 'kor');
                } else if (chosenMode === 'eng_only') {
                    this.listPrimaryLanguage = 'eng';
                    localStorage.setItem('engcard_primary_lang', 'eng');
                }

                this.revealedItemIds.clear();
                this.hintedItemIds.clear();
                this.renderSentenceList();
            });
        });

        // Subtabs
        this.subTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSub = btn.dataset.subtab;
                if (!targetSub) return;
                this.subTabBtns.forEach(s => {
                    s.classList.remove('active', 'bg-surface', 'text-primary', 'font-extrabold', 'shadow-sm');
                    s.classList.add('text-on-surface-variant', 'font-medium');
                });
                this.subtabPanels.forEach(p => {
                    p.classList.remove('active');
                    p.classList.add('hidden');
                });
                btn.classList.add('active', 'bg-surface', 'text-primary', 'font-extrabold', 'shadow-sm');
                btn.classList.remove('text-on-surface-variant', 'font-medium');
                const targetEl = document.getElementById(targetSub);
                if (targetEl) {
                    targetEl.classList.remove('hidden');
                    targetEl.classList.add('active');
                }
            });
        });

        // Bulk Import Mode Switcher (File / YouTube / Batch Text)
        const bulkModeBtns = document.querySelectorAll('.bulk-mode-btn');
        bulkModeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetMode = btn.dataset.bulkMode;
                if (targetMode) this.switchBulkImportMode(targetMode);
            });
        });

        // Smart Quick Capture Listeners
        this.setupSmartCaptureListeners();

        // Zero-Friction Quick Batch Text Parser
        this.btnParseQuickText?.addEventListener('click', () => this.handleQuickBatchParse());

        // YouTube & Text Scraping
        this.chkScrapNewDeck?.addEventListener('change', (e) => {
            if (this.inputScrapNewDeckName) {
                if (e.target.checked) {
                    this.inputScrapNewDeckName.classList.remove('hidden');
                    if (this.selectScrapTargetDeck) this.selectScrapTargetDeck.disabled = true;
                    this.inputScrapNewDeckName.focus();
                } else {
                    this.inputScrapNewDeckName.classList.add('hidden');
                    if (this.selectScrapTargetDeck) this.selectScrapTargetDeck.disabled = false;
                }
            }
        });

        this.btnScrapYoutube?.addEventListener('click', () => this.handleYoutubeScraping());
        this.btnSmartUnifiedBulk?.addEventListener('click', () => this.handleSmartUnifiedBulk());

        // File Upload & Drag-Drop onto Omni Card
        const omniCard = document.getElementById('omniDropCard');
        this.fileInput?.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));
        omniCard?.addEventListener('dragover', (e) => {
            e.preventDefault();
            omniCard.classList.add('ring-2', 'ring-primary');
        });
        omniCard?.addEventListener('dragleave', () => omniCard?.classList.remove('ring-2', 'ring-primary'));
        omniCard?.addEventListener('drop', (e) => {
            e.preventDefault();
            omniCard?.classList.remove('ring-2', 'ring-primary');
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        // Flashcard & Smart List Control Buttons
        this.btnShuffleCards?.addEventListener('click', () => {
            this.triggerHaptic('light');
            this.sentences.sort(() => Math.random() - 0.5);
            this.reassignNo();
            if (this.sessionQueue && this.sessionQueue.length > 0) {
                this.sessionQueue.sort(() => Math.random() - 0.5);
            }
            this.currentCardIndex = 0;
            this.saveState();
            
            this.renderFlashcard();
            this.renderSentenceList();
            this.showToast('🔀 문장 순서가 랜덤하게 섞였습니다!', 'info');
        });

        // 3-Grade Assessment Buttons
        this.btnGradeHard?.addEventListener('click', () => this.gradeCard('hard'));
        this.btnGradeGood?.addEventListener('click', () => this.gradeCard('good'));
        this.btnGradeEasy?.addEventListener('click', () => this.gradeCard('easy'));

        this.btnResetSession?.addEventListener('click', () => {
            this.triggerHaptic('medium');
            this.initDailySession(true);
            this.currentCardIndex = 0;
            this.saveState();

            this.renderFlashcard();
            this.renderSentenceList();
            this.showToast('↺ 오늘 학습 세션이 초기화되었습니다.', 'info');
        });

        this.btnStartSessionQuiz?.addEventListener('click', () => {
            this.launchSessionQuiz();
        });

        this.btnCloseSessionModal?.addEventListener('click', () => {
            if (this.sessionCompleteModal) this.sessionCompleteModal.classList.add('hidden');
            this.resumeSpeedTriage();
        });

        this.btnCardTTS?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.speakText(this.cardEnglish.textContent);
        });

        this.btnTtsRateToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cycleTtsRate();
        });

        // Retrieval & Speed Triage Controls
        this.btnToggleSpeedTriage?.addEventListener('click', () => this.toggleSpeedTriage());
        this.btnToggleGlobalHint?.addEventListener('click', () => this.toggleGlobalHint());
        this.btnFirstLetterHint?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showFirstLetterHint();
        });
        this.btnVoiceRecite?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startVoiceShadowing();
        });
        this.btnFinishVoiceShadowing?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.finalizeVoiceShadowing();
        });
        this.btnCloseVoicePanel?.addEventListener('click', () => {
            this.closeVoiceShadowingPanel();
        });

        // View Mode Switcher (3D Card vs Smart List)
        this.btnViewModeCard?.addEventListener('click', () => this.switchStudyViewMode('card'));
        this.btnViewModeList?.addEventListener('click', () => this.switchStudyViewMode('list'));

        // Scope Switcher (Today's Focus vs All Vault)
        this.btnScopeToday?.addEventListener('click', () => this.switchListScope('today_focus'));
        this.btnScopeAll?.addEventListener('click', () => this.switchListScope('all_vault'));

        // List Filters
        this.searchSentence?.addEventListener('input', () => this.renderSentenceList());
        this.filterCategory?.addEventListener('change', () => this.renderSentenceList());
        this.filterStatus?.addEventListener('change', () => this.renderSentenceList());
        this.sortOrder?.addEventListener('change', () => this.renderSentenceList());

        // Deduplication Button
        this.btnDeduplicateInList?.addEventListener('click', () => this.cleanDeduplicate());

        // CSV Export / Backup Import
        this.btnExportCSV?.addEventListener('click', () => this.exportCSV());
        this.backupFileInput?.addEventListener('change', (e) => this.importBackup(e.target.files[0]));

        // Quiz Buttons & Scope/Type Listeners
        this.btnStartQuiz?.addEventListener('click', () => this.startQuiz());
        this.btnExitQuiz?.addEventListener('click', () => this.exitQuiz());
        this.btnCheckQuiz?.addEventListener('click', () => this.checkQuizAnswer());
        this.btnNextQuiz?.addEventListener('click', () => this.nextQuizQuestion());
        document.querySelectorAll('input[name="quizScope"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateQuizSetupUI());
        });
        document.querySelectorAll('input[name="quizType"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.quiz-type-btn').forEach(btn => {
                    btn.classList.remove('bg-white', 'shadow-2xs', 'text-primary', 'font-bold');
                    btn.classList.add('text-on-surface-variant', 'font-semibold');
                });
                const activeBtn = radio.closest('.quiz-type-btn');
                if (activeBtn) {
                    activeBtn.classList.add('bg-white', 'shadow-2xs', 'text-primary', 'font-bold');
                    activeBtn.classList.remove('text-on-surface-variant', 'font-semibold');
                }
            });
        });

        // Smart Pacemaker (Goal Modal) Controls
        this.btnGoalModal?.addEventListener('click', () => this.openGoalModal());
        this.goalProgressBarContainer?.addEventListener('click', () => this.openGoalModal());
        this.btnCloseGoalModal?.addEventListener('click', () => this.closeGoalModal());
        this.goalTargetDeckSelect?.addEventListener('change', () => this.updateGoalPaceSimulator());
        this.goalTypeSelect?.addEventListener('change', (e) => {
            if (e.target.value === 'daily') {
                this.goalDailyGroup?.classList.remove('hidden');
                this.goalPeriodGroup?.classList.add('hidden');
            } else {
                this.goalDailyGroup?.classList.add('hidden');
                this.goalPeriodGroup?.classList.remove('hidden');
            }
            this.updateGoalPaceSimulator();
        });
        this.goalDailyCount?.addEventListener('input', () => this.updateGoalPaceSimulator());
        this.goalTotalCount?.addEventListener('input', () => this.updateGoalPaceSimulator());
        this.goalTargetDays?.addEventListener('input', () => this.updateGoalPaceSimulator());
        this.btnSaveGoal?.addEventListener('click', () => this.saveGoalConfig());

        // Milestone Tier Modal Controls
        this.btnContinueMilestone?.addEventListener('click', () => this.closeMilestoneModal());
        this.btnShareMilestone?.addEventListener('click', () => {
            this.closeMilestoneModal();
            this.openShareModal();
        });

        // Share Certificate Controls
        this.btnOpenShareModal?.addEventListener('click', () => this.openShareModal());
        this.btnSessionShare?.addEventListener('click', () => {
            if (this.sessionCompleteModal) this.sessionCompleteModal.classList.add('hidden');
            this.openShareModal();
        });
        this.btnCloseShareModal?.addEventListener('click', () => this.closeShareModal());
        this.btnShareNative?.addEventListener('click', () => this.shareNative());
        this.btnDownloadShareImg?.addEventListener('click', () => this.downloadShareImage());
        this.btnCopyShareText?.addEventListener('click', () => this.copyShareText());

        // Share Card Theme Switcher
        const themeBtns = document.querySelectorAll('#shareThemePicker button');
        themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme || 'dark';
                const card = document.getElementById('shareCardTarget');
                if (!card) return;
                card.className = `share-card-theme-${theme} rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-between relative overflow-hidden backdrop-blur-2xl aspect-[4/5] text-white`;
                themeBtns.forEach(b => {
                    b.classList.remove('border-white');
                    b.classList.add('border-transparent');
                });
                btn.classList.remove('border-transparent');
                btn.classList.add('border-white');
            });
        });

        // Deck Controls
        this.btnOpenDeckModal?.addEventListener('click', () => this.openDeckModal());
        this.btnCloseDeckModal?.addEventListener('click', () => this.closeDeckModal());
        this.btnCreateDeck?.addEventListener('click', () => {
            const name = this.inputNewDeckName ? this.inputNewDeckName.value : '';
            if (this.createDeck(name)) {
                if (this.inputNewDeckName) this.inputNewDeckName.value = '';
            }
        });
        this.btnViewAllDecks?.addEventListener('click', () => this.switchActiveDeck('all'));
        this.btnMoveSelected?.addEventListener('click', () => this.openMoveDeckModal());
        this.btnCloseMoveDeckModal?.addEventListener('click', () => this.closeMoveDeckModal());
        this.btnConfirmMoveDeck?.addEventListener('click', () => this.confirmMoveDeck());

        // Stats Deck Filter
        this.statsDeckSelect = document.getElementById('statsDeckSelect');
        this.statsDeckSelect?.addEventListener('change', () => this.renderStatsDashboard());
        this.dashBarUnstudied = document.getElementById('dashBarUnstudied');
        this.dashCountUnstudied = document.getElementById('dashCountUnstudied');

        // Android Hardware / Gesture Back Button Handling (Popstate Guard)
        window.addEventListener('popstate', () => {
            if (this.isAnyModalOpen()) {
                if (this.milestoneModal && !this.milestoneModal.classList.contains('hidden')) this.closeMilestoneModal();
                if (this.shareModal && !this.shareModal.classList.contains('hidden')) this.closeShareModal();
                if (this.sessionCompleteModal && !this.sessionCompleteModal.classList.contains('hidden')) {
                    this.sessionCompleteModal.classList.add('hidden');
                    this.resumeSpeedTriage();
                }
                if (this.deckModal && !this.deckModal.classList.contains('hidden')) this.closeDeckModal();
                if (this.moveDeckModal && !this.moveDeckModal.classList.contains('hidden')) this.closeMoveDeckModal();
                if (this.goalModal && !this.goalModal.classList.contains('hidden')) this.closeGoalModal();
            }
        });
    }

    /* Tactile Haptic Vibration Feedback Engine (Android & Mobile) */
    triggerHaptic(type = 'light') {
        if (typeof navigator === 'undefined' || !navigator.vibrate) return;
        try {
            if (type === 'heavy') {
                navigator.vibrate([30]);
            } else if (type === 'medium') {
                navigator.vibrate([18]);
            } else if (type === 'success') {
                navigator.vibrate([10, 40, 20]);
            } else {
                navigator.vibrate([8]);
            }
        } catch (e) {}
    }

    switchBulkImportMode(targetMode) {
        if (!targetMode) return;
        const bulkModeBtns = document.querySelectorAll('.bulk-mode-btn');
        const bulkModePanels = document.querySelectorAll('.bulk-mode-panel');

        bulkModeBtns.forEach(b => {
            if (b.dataset.bulkMode === targetMode) {
                b.classList.add('active', 'bg-primary', 'text-white', 'font-extrabold', 'shadow-sm');
                b.classList.remove('text-on-surface-variant', 'font-semibold', 'bg-surface');
            } else {
                b.classList.remove('active', 'bg-primary', 'text-white', 'font-extrabold', 'shadow-sm');
                b.classList.add('text-on-surface-variant', 'font-semibold');
            }
        });

        bulkModePanels.forEach(p => {
            if (p.id === targetMode) {
                p.classList.remove('hidden');
                p.classList.add('active');
            } else {
                p.classList.remove('active');
                p.classList.add('hidden');
            }
        });
    }

    switchTab(targetTab) {
        if (!targetTab) return;
        this.triggerHaptic('light');

        this.navItems.forEach(n => {
            n.classList.remove('active');
            const icon = n.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 0";
        });
        this.tabContents.forEach(c => {
            c.classList.remove('active');
            c.classList.add('hidden');
        });

        const activeNavs = document.querySelectorAll(`.nav-tab-btn[data-tab="${targetTab}"], .nav-item[data-tab="${targetTab}"]`);
        activeNavs.forEach(activeNav => {
            activeNav.classList.add('active');
            const icon = activeNav.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 1";
        });

        const activeContent = document.getElementById(targetTab);
        if (activeContent) {
            activeContent.classList.remove('hidden');
            activeContent.classList.add('active');
        }

        if (targetTab === 'tab-cards') {
            if (this.studyViewMode === 'card') {
                this.renderFlashcard();
            } else {
                this.renderSentenceList();
            }
        } else if (targetTab === 'tab-stats') {
            this.renderStatsDashboard();
        } else if (targetTab === 'tab-quiz') {
            this.updateQuizSetupUI();
        }
    }

    /* Single Tap & Drag Gesture Handler */
    initGestures() {
        const card = this.flashcard;

        const onPointerDown = (e) => {
            if (e.target.closest('button') || e.target.closest('#btnCardTTS') || e.target.closest('#btnFirstLetterHint') || e.target.closest('#btnVoiceRecite')) return;
            this.touchState.startX = e.clientX || (e.touches && e.touches[0].clientX);
            this.touchState.startY = e.clientY || (e.touches && e.touches[0].clientY);
            this.touchState.currentX = this.touchState.startX;
            this.touchState.currentY = this.touchState.startY;
            this.touchState.isDragging = true;
            card.style.transition = 'none';
        };

        const onPointerMove = (e) => {
            if (!this.touchState.isDragging) return;
            this.touchState.currentX = e.clientX || (e.touches && e.touches[0].clientX);
            this.touchState.currentY = e.clientY || (e.touches && e.touches[0].clientY);
            const deltaX = this.touchState.currentX - this.touchState.startX;

            if (Math.abs(deltaX) > 10) {
                card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)`;
            }

            if (deltaX > 40) {
                this.overlayRight.style.opacity = Math.min((deltaX - 40) / 80, 1);
                this.overlayLeft.style.opacity = 0;
            } else if (deltaX < -40) {
                this.overlayLeft.style.opacity = Math.min((-deltaX - 40) / 80, 1);
                this.overlayRight.style.opacity = 0;
            } else {
                this.overlayLeft.style.opacity = 0;
                this.overlayRight.style.opacity = 0;
            }
        };

        const onPointerUp = (e) => {
            if (!this.touchState.isDragging) return;
            this.touchState.isDragging = false;

            const deltaX = this.touchState.currentX - this.touchState.startX;
            card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';

            // Single Tap flips the card
            if (Math.abs(deltaX) < 10) {
                card.style.transform = '';
                this.triggerHaptic('light');
                card.classList.toggle('flipped');
                this.overlayLeft.style.opacity = 0;
                this.overlayRight.style.opacity = 0;
                return;
            }

            // Swipe Threshold (80px)
            if (deltaX > 80) {
                // Swiped Right -> Know / Memorized
                this.triggerHaptic('medium');
                card.style.transform = 'translateX(400px) rotate(30deg)';
                card.style.opacity = '0';
                setTimeout(() => {
                    this.markCurrentCard(true);
                    card.style.transition = 'none';
                    card.style.transform = '';
                    card.style.opacity = '1';
                    this.overlayRight.style.opacity = 0;
                }, 300);
            } else if (deltaX < -80) {
                // Swiped Left -> Don't know / Unmemorized
                this.triggerHaptic('heavy');
                card.style.transform = 'translateX(-400px) rotate(-30deg)';
                card.style.opacity = '0';
                setTimeout(() => {
                    this.markCurrentCard(false);
                    card.style.transition = 'none';
                    card.style.transform = '';
                    card.style.opacity = '1';
                    this.overlayLeft.style.opacity = 0;
                }, 300);
            } else {
                // Snap back
                card.style.transform = '';
                this.overlayLeft.style.opacity = 0;
                this.overlayRight.style.opacity = 0;
            }
        };

        card.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        card.addEventListener('touchstart', onPointerDown, { passive: true });
        card.addEventListener('touchmove', onPointerMove, { passive: true });
        card.addEventListener('touchend', onPointerUp);
    }

    addSentence(english, korean, category = '기타', source = 'manual', targetDeckId = null) {
        const deckId = targetDeckId || (this.selectSmartDeck ? this.selectSmartDeck.value : (this.activeDeckId !== 'all' ? this.activeDeckId : 'deck_default'));
        // Check exact duplicate English sentence in the target deck
        const normEng = english.trim().toLowerCase();
        const existing = this.sentences.find(s => s.english.trim().toLowerCase() === normEng && s.deckId === deckId);
        if (existing) {
            return existing;
        }

        const newSentence = {
            no: this.sentences.length + 1,
            id: 's_' + Date.now() + Math.random().toString(36).substr(2, 4),
            deckId: deckId,
            english,
            korean,
            category,
            source,
            memorized: false,
            wrongCount: 0,
            studyCount: 0,
            lastStudiedAt: null,
            nextReviewDate: getTodayString(),
            intervalStep: 0
        };

        this.sentences.push(newSentence);
        this.reassignNo();
        this.saveState();
        return newSentence;
    }

    reassignNo() {
        this.sentences.forEach((s, idx) => {
            s.no = idx + 1;
        });
    }

    /* Daily Session & Smart Loop Queue Algorithm */
    initDailySession(forceReset = false) {
        if (!forceReset && this.sessionQueue && this.sessionQueue.length > 0) return;

        const focusCandidates = this.getTodayFocusSentences();
        this.sessionQueue = focusCandidates.map(s => s.id);
        this.sessionTotalCount = this.sessionQueue.length;
        this.sessionCompletedCount = 0;
        this.sessionCompletedIds = [];
    }

    /* 3-Grade Assessment & Retrieval Engine (Hard / Good / Easy + Latency) */
    gradeCard(grade = 'good') {
        const activeSentences = this.getActiveSentences();
        if (activeSentences.length === 0) return;
        if (!this.sessionQueue || this.sessionQueue.length === 0) {
            this.initDailySession(true);
            if (this.sessionQueue.length === 0) return;
        }

        const currentId = this.sessionQueue[0];
        const current = this.sentences.find(s => s.id === currentId);

        if (!current) {
            this.sessionQueue.shift();
            this.renderFlashcard();
            return;
        }

        const latencyMs = Date.now() - (this.cardStartTime || Date.now());
        const latencySec = latencyMs / 1000;
        current.lastStudiedAt = getTodayString();
        current.studyCount = (current.studyCount || 0) + 1;

        if (grade === 'hard') {
            this.triggerHaptic('heavy');
            // Hard / Fail -> Reset SRS step, increment wrong count, re-queue at end of retrieval loop
            current.memorized = false;
            current.wrongCount = (current.wrongCount || 0) + 1;
            current.intervalStep = 0;
            current.nextReviewDate = getTodayString();

            const retryId = this.sessionQueue.shift();
            this.sessionQueue.push(retryId);
            this.showToast(`↺ [Hard] 오늘의 루프 끝에서 다시 확인합니다. (${latencySec.toFixed(1)}초)`, 'warning');
        } else if (grade === 'good') {
            this.triggerHaptic('medium');
            // Good / Normal Pass -> Check latency hesitancy (> 4.5s is considered hesitant)
            current.memorized = true;
            if (latencySec >= 4.5) {
                // Hesitant recall: advance interval cautiously (+0 step, next day review)
                current.nextReviewDate = addDaysToDate(getTodayString(), 1);
                this.showToast(`✓ [Good] 망설임 감지 (${latencySec.toFixed(1)}s): 1일 후 복습`, 'info');
            } else {
                // Normal fluent recall: advance Ebbinghaus interval
                current.intervalStep = Math.min((current.intervalStep || 0) + 1, EBBINGHAUS_INTERVALS.length - 1);
                const daysToAdd = EBBINGHAUS_INTERVALS[current.intervalStep];
                current.nextReviewDate = addDaysToDate(getTodayString(), daysToAdd);
                this.showToast(`✓ [Good] ${daysToAdd}일 후 복습 예정 (${latencySec.toFixed(1)}s)`, 'success');
            }

            this.sessionQueue.shift();
            this.sessionCompletedCount++;
            this.sessionCompletedIds.push(current.id);
            this.checkDeckMilestones(current.deckId || this.activeDeckId);
        } else if (grade === 'easy') {
            this.triggerHaptic('success');
            // Easy / Instant Recall -> Fast-track SRS (+2 interval steps)
            current.memorized = true;
            current.intervalStep = Math.min((current.intervalStep || 0) + 2, EBBINGHAUS_INTERVALS.length - 1);
            const daysToAdd = EBBINGHAUS_INTERVALS[current.intervalStep];
            current.nextReviewDate = addDaysToDate(getTodayString(), daysToAdd);

            this.sessionQueue.shift();
            this.sessionCompletedCount++;
            this.sessionCompletedIds.push(current.id);
            this.checkDeckMilestones(current.deckId || this.activeDeckId);
            this.showToast(`⚡ [Easy] 쾌속 통과! ${daysToAdd}일 후 복습 (${latencySec.toFixed(1)}s)`, 'success');
        }

        this.saveState();

        if (this.sessionQueue.length === 0 && this.sessionTotalCount > 0) {
            this.showSessionCompleteModal();
        }

        this.renderFlashcard();
    }

    markCurrentCard(isMemorized) {
        this.gradeCard(isMemorized ? 'good' : 'hard');
    }

    getCurrentCardObject() {
        if (!this.sessionQueue || this.sessionQueue.length === 0) return null;
        const currentId = this.sessionQueue[0];
        return this.sentences.find(s => s.id === currentId) || null;
    }

    /* TTS Playback Rate Cycler (0.8x -> 1.0x -> 1.2x) */
    cycleTtsRate() {
        const rates = [0.8, 1.0, 1.2];
        let idx = rates.indexOf(this.ttsRate);
        if (idx === -1) idx = 1;
        this.ttsRate = rates[(idx + 1) % rates.length];
        localStorage.setItem('engcard_tts_rate', this.ttsRate);

        if (this.ttsRateBadge) {
            this.ttsRateBadge.textContent = `${this.ttsRate.toFixed(1)}x`;
        }
        this.showToast(`🔊 TTS 재생 속도: ${this.ttsRate.toFixed(1)}x`, 'info');
    }

    /* Global Keyboard Shortcuts System */
    bindKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Ignore keystrokes inside input, textarea, or select fields
            if (e.target.matches('input, textarea, select')) return;

            // Only active in flashcard tab or modal dismissals
            const currentTab = document.querySelector('.nav-item.active')?.dataset.tab;

            if (e.key === 'Escape') {
                if (this.goalModal && !this.goalModal.classList.contains('hidden')) this.closeGoalModal();
                if (this.deckModal && !this.deckModal.classList.contains('hidden')) this.closeDeckModal();
                if (this.moveDeckModal && !this.moveDeckModal.classList.contains('hidden')) this.closeMoveDeckModal();
                if (this.sessionCompleteModal && !this.sessionCompleteModal.classList.contains('hidden')) this.sessionCompleteModal.classList.add('hidden');
                if (this.voiceShadowingPanel && !this.voiceShadowingPanel.classList.contains('hidden')) this.closeVoiceShadowingPanel();
                return;
            }

            if (currentTab !== 'tab-cards') return;

            if (e.code === 'Space') {
                e.preventDefault();
                if (this.flashcard) {
                    this.flashcard.classList.toggle('flipped');
                    if (this.flashcard.classList.contains('flipped')) {
                        const current = this.getCurrentCardObject();
                        if (current) this.speakText(current.english);
                    }
                }
            } else if (e.key === '1') {
                e.preventDefault();
                this.gradeCard('hard');
            } else if (e.key === '2') {
                e.preventDefault();
                this.gradeCard('good');
            } else if (e.key === '3') {
                e.preventDefault();
                this.gradeCard('easy');
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                const current = this.getCurrentCardObject();
                if (current) this.speakText(current.english);
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                this.startVoiceShadowing();
            } else if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                this.showFirstLetterHint();
            } else if (e.key === '[') {
                e.preventDefault();
                this.ttsRate = 0.8;
                localStorage.setItem('engcard_tts_rate', this.ttsRate);
                if (this.ttsRateBadge) this.ttsRateBadge.textContent = '0.8x';
                this.showToast('🔊 TTS 재생 속도: 0.8x (쉐도잉/정밀)', 'info');
            } else if (e.key === ']') {
                e.preventDefault();
                this.ttsRate = 1.2;
                localStorage.setItem('engcard_tts_rate', this.ttsRate);
                if (this.ttsRateBadge) this.ttsRateBadge.textContent = '1.2x';
                this.showToast('🔊 TTS 재생 속도: 1.2x (고속 청취)', 'info');
            }
        });
    }

    /* Word-Level Speech Diff Comparison Algorithm (LCS / Token Alignment) */
    computeWordDiff(targetSentence, spokenSentence) {
        if (!targetSentence) return { tokens: [], accuracy: 0 };
        const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

        const targetWords = (targetSentence || '').trim().split(/\s+/).filter(Boolean);
        const spokenWords = (spokenSentence || '').trim().split(/\s+/).filter(Boolean);

        const normTarget = targetWords.map(clean);
        const normSpoken = spokenWords.map(clean);

        // Simple aligned matching
        const resultTokens = [];
        let matchedCount = 0;
        let spokenIdx = 0;

        for (let i = 0; i < targetWords.length; i++) {
            const tWord = targetWords[i];
            const tNorm = normTarget[i];

            if (spokenIdx < spokenWords.length) {
                const sWord = spokenWords[spokenIdx];
                const sNorm = normSpoken[spokenIdx];

                if (tNorm === sNorm) {
                    resultTokens.push({ text: tWord, type: 'correct', spoken: sWord });
                    matchedCount++;
                    spokenIdx++;
                } else {
                    // Check lookahead match
                    const lookahead = normSpoken.slice(spokenIdx, spokenIdx + 3).indexOf(tNorm);
                    if (lookahead !== -1) {
                        // Spoken extra words prior to match
                        for (let k = 0; k < lookahead; k++) {
                            resultTokens.push({ text: spokenWords[spokenIdx + k], type: 'mismatch', spoken: spokenWords[spokenIdx + k] });
                        }
                        spokenIdx += lookahead;
                        resultTokens.push({ text: tWord, type: 'correct', spoken: spokenWords[spokenIdx] });
                        matchedCount++;
                        spokenIdx++;
                    } else {
                        // Mismatch / Mispronounced
                        resultTokens.push({ text: tWord, type: 'mismatch', spoken: sWord });
                        spokenIdx++;
                    }
                }
            } else {
                // Missing words from target
                resultTokens.push({ text: tWord, type: 'missing', spoken: null });
            }
        }

        const accuracy = targetWords.length > 0 ? Math.round((matchedCount / targetWords.length) * 100) : 0;
        return { tokens: resultTokens, accuracy, spokenText: spokenSentence, targetText: targetSentence };
    }

    /* Global Hint Toggle (Card & List View Synchronized) */
    toggleGlobalHint() {
        this.isGlobalHintActive = !this.isGlobalHintActive;
        if (this.btnToggleGlobalHint) {
            if (this.isGlobalHintActive) {
                this.btnToggleGlobalHint.className = 'px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-700 text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1 shadow-sm';
                this.showToast('💡 첫 글자 힌트가 켜졌습니다!', 'info');
            } else {
                this.btnToggleGlobalHint.className = 'px-2.5 py-1.5 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm';
                this.showToast('첫 글자 힌트가 꺼졌습니다.', 'info');
            }
        }

        if (this.studyViewMode === 'card') {
            if (this.isGlobalHintActive) {
                if (this.firstLetterHintBox && this.firstLetterHintBox.classList.contains('hidden')) {
                    this.showFirstLetterHint();
                }
            } else {
                if (this.firstLetterHintBox) this.firstLetterHintBox.classList.add('hidden');
            }
        } else {
            this.renderSentenceList();
        }
    }

    /* Voice Shadowing & Real-time Continuous Pronunciation Feedback */
    startVoiceShadowing(targetCustomSentence = null) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.showToast('이 브라우저는 음성 인식(STT)을 지원하지 않습니다. Chrome/Edge를 권장합니다.', 'warning');
            return;
        }

        const current = targetCustomSentence || this.getCurrentCardObject();
        if (!current) return;
        this.currentShadowingTarget = current;

        // Toggle stop if already recording
        if (this.isRecording) {
            this.finalizeVoiceShadowing();
            return;
        }

        if (this.voiceShadowingPanel) {
            this.voiceShadowingPanel.classList.remove('hidden');
        }
        if (this.voiceStatusTitle) {
            this.voiceStatusTitle.textContent = '🎙️ 음성 듣는 중... (말씀을 마치면 1.8초 후 자동 평가됩니다)';
        }
        if (this.voiceMicIcon) {
            this.voiceMicIcon.classList.add('recording-pulse', 'bg-error', 'text-white');
        }
        if (this.voiceDiffContainer) {
            this.voiceDiffContainer.innerHTML = '<span class="text-xs text-primary font-bold animate-pulse">발화를 기다리는 중입니다... 원어민 억양으로 자연스럽게 말씀하세요.</span>';
        }
        if (this.voiceAccuracyBadge) {
            this.voiceAccuracyBadge.classList.add('hidden');
        }

        this.accumulatedTranscript = '';
        if (this.voiceSilenceTimer) {
            clearTimeout(this.voiceSilenceTimer);
            this.voiceSilenceTimer = null;
        }

        try {
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.lang = 'en-US';
            this.speechRecognition.continuous = true; // Keep listening during short pauses
            this.speechRecognition.interimResults = true; // Real-time feedback
            this.speechRecognition.maxAlternatives = 1;
            this.isRecording = true;

            this.speechRecognition.onresult = (event) => {
                let interim = '';
                let finalized = '';

                for (let i = 0; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalized += event.results[i][0].transcript + ' ';
                    } else {
                        interim += event.results[i][0].transcript + ' ';
                    }
                }

                const liveText = (finalized + interim).trim();
                if (liveText) {
                    this.accumulatedTranscript = liveText;
                    if (this.voiceDiffContainer) {
                        this.voiceDiffContainer.innerHTML = `
                            <div class="flex items-center gap-1.5 w-full text-on-surface">
                                <span class="material-symbols-outlined text-primary text-sm animate-spin">autorenew</span>
                                <span class="font-medium text-xs">"${liveText}"</span>
                            </div>
                        `;
                    }
                }

                // Reset Silence Buffer Timer (1.8s of silence after speaking triggers final evaluation)
                if (this.voiceSilenceTimer) clearTimeout(this.voiceSilenceTimer);
                this.voiceSilenceTimer = setTimeout(() => {
                    if (this.isRecording && this.accumulatedTranscript) {
                        this.finalizeVoiceShadowing();
                    }
                }, 1800);
            };

            this.speechRecognition.onerror = (err) => {
                if (err.error === 'no-speech') {
                    // Ignore no-speech events during continuous listening
                    return;
                }
                console.warn('SpeechRecognition error:', err);
                if (!this.accumulatedTranscript) {
                    this.isRecording = false;
                    if (this.voiceMicIcon) this.voiceMicIcon.classList.remove('recording-pulse', 'bg-error', 'text-white');
                    if (this.voiceStatusTitle) this.voiceStatusTitle.textContent = '음성 인식 대기 중';
                    this.showToast('음성이 감지되지 않았습니다. 마이크를 확인해주세요.', 'warning');
                }
            };

            this.speechRecognition.onend = () => {
                // If recognition ended naturally but we are still recording and have transcript, finalize
                if (this.isRecording) {
                    if (this.accumulatedTranscript) {
                        this.finalizeVoiceShadowing();
                    } else {
                        this.isRecording = false;
                        if (this.voiceMicIcon) this.voiceMicIcon.classList.remove('recording-pulse', 'bg-error', 'text-white');
                    }
                }
            };

            this.speechRecognition.start();
        } catch (e) {
            console.warn('SpeechRecognition start error:', e);
            this.isRecording = false;
        }
    }

    /* Finalize & Grade Voice Shadowing Session */
    finalizeVoiceShadowing() {
        if (this.voiceSilenceTimer) {
            clearTimeout(this.voiceSilenceTimer);
            this.voiceSilenceTimer = null;
        }

        this.isRecording = false;
        if (this.speechRecognition) {
            try {
                this.speechRecognition.stop();
            } catch (e) { }
        }

        if (this.voiceMicIcon) {
            this.voiceMicIcon.classList.remove('recording-pulse', 'bg-error', 'text-white');
        }

        const spoken = (this.accumulatedTranscript || '').trim();
        const target = this.currentShadowingTarget || this.getCurrentCardObject();

        if (!spoken) {
            if (this.voiceDiffContainer) {
                this.voiceDiffContainer.innerHTML = '<span class="text-xs text-outline">음성이 입력되지 않았습니다. 다시 탭하여 말해보세요.</span>';
            }
            if (this.voiceStatusTitle) this.voiceStatusTitle.textContent = '발화 내용 없음';
            return;
        }

        if (target) {
            const diff = this.computeWordDiff(target.english, spoken);
            this.renderVoiceDiffResult(diff);
        }
    }

    renderVoiceDiffResult(diff) {
        if (!this.voiceDiffContainer) return;
        this.voiceDiffContainer.innerHTML = '';

        if (this.voiceStatusTitle) {
            this.voiceStatusTitle.textContent = `인식 완료: "${diff.spokenText}"`;
        }

        if (this.voiceAccuracyBadge) {
            this.voiceAccuracyBadge.textContent = `일치도 ${diff.accuracy}%`;
            this.voiceAccuracyBadge.classList.remove('hidden', 'bg-secondary-container', 'text-secondary', 'bg-error-container', 'text-error', 'bg-tertiary-fixed', 'text-tertiary');

            if (diff.accuracy >= 80) {
                this.voiceAccuracyBadge.classList.add('bg-secondary-container', 'text-secondary');
            } else if (diff.accuracy >= 50) {
                this.voiceAccuracyBadge.classList.add('bg-tertiary-fixed', 'text-tertiary');
            } else {
                this.voiceAccuracyBadge.classList.add('bg-error-container', 'text-error');
            }
        }

        diff.tokens.forEach(tok => {
            const span = document.createElement('span');
            span.className = `diff-word diff-word-${tok.type}`;
            span.textContent = tok.text;
            if (tok.type === 'mismatch' && tok.spoken) {
                span.title = `들린 발음: ${tok.spoken}`;
            }
            this.voiceDiffContainer.appendChild(span);
        });

        if (diff.accuracy >= 80) {
            this.showToast(`🎉 훌륭한 발음입니다! (일치도 ${diff.accuracy}%)`, 'success');
            if (this.flashcard && !this.flashcard.classList.contains('flipped')) {
                this.flashcard.classList.add('flipped');
            }
        } else {
            this.showToast(`일치도: ${diff.accuracy}% - 틀린 단어를 확인해보세요.`, 'warning');
            if (this.flashcard && !this.flashcard.classList.contains('flipped')) {
                this.flashcard.classList.add('flipped');
            }
        }
    }

    closeVoiceShadowingPanel() {
        if (this.voiceSilenceTimer) {
            clearTimeout(this.voiceSilenceTimer);
            this.voiceSilenceTimer = null;
        }
        if (this.voiceShadowingPanel) {
            this.voiceShadowingPanel.classList.add('hidden');
        }
        if (this.speechRecognition && this.isRecording) {
            try { this.speechRecognition.stop(); } catch (e) { }
            this.isRecording = false;
        }
    }

    switchStudyViewMode(mode) {
        this.studyViewMode = mode;
        this.clearSpeedTriageTimer();

        if (mode === 'card') {
            this.btnViewModeCard?.classList.add('bg-white', 'shadow-sm', 'text-primary', 'font-extrabold');
            this.btnViewModeCard?.classList.remove('text-on-surface-variant');
            this.btnViewModeList?.classList.remove('bg-white', 'shadow-sm', 'text-primary', 'font-extrabold');
            this.btnViewModeList?.classList.add('text-on-surface-variant');

            this.studyViewCardContainer?.classList.remove('hidden');
            this.studyViewListContainer?.classList.add('hidden');
            this.renderFlashcard();
        } else {
            this.btnViewModeList?.classList.add('bg-white', 'shadow-sm', 'text-primary', 'font-extrabold');
            this.btnViewModeList?.classList.remove('text-on-surface-variant');
            this.btnViewModeCard?.classList.remove('bg-white', 'shadow-sm', 'text-primary', 'font-extrabold');
            this.btnViewModeCard?.classList.add('text-on-surface-variant');

            this.studyViewListContainer?.classList.remove('hidden');
            this.studyViewCardContainer?.classList.add('hidden');
            this.renderSentenceList();

            if (this.isSpeedTriageActive) {
                this.startListSpeedSprint(0);
            }
        }
    }

    toggleSpeedTriage() {
        this.isSpeedTriageActive = !this.isSpeedTriageActive;
        if (this.btnToggleSpeedTriage) {
            if (this.isSpeedTriageActive) {
                this.btnToggleSpeedTriage.classList.add('bg-tertiary-fixed', 'text-tertiary', 'font-extrabold');
                this.speedTriageGaugeWrapper?.classList.remove('hidden');
                this.showToast('⚡ 3초 스피드 선별 모드가 켜졌습니다!', 'warning');
            } else {
                this.btnToggleSpeedTriage.classList.remove('bg-tertiary-fixed', 'text-tertiary', 'font-extrabold');
                this.speedTriageGaugeWrapper?.classList.add('hidden');
                this.clearSpeedTriageTimer();
                this.showToast('스피드 선별 모드가 꺼졌습니다.', 'info');
            }
        }
        if (this.studyViewMode === 'card') {
            this.renderFlashcard();
        } else {
            this.renderSentenceList();
            if (this.isSpeedTriageActive) {
                this.startListSpeedSprint(0);
            }
        }
    }

    isAnyModalOpen() {
        return [
            this.milestoneModal,
            this.shareModal,
            this.sessionCompleteModal,
            this.goalModal,
            this.deckModal,
            this.moveDeckModal
        ].some(m => m && !m.classList.contains('hidden'));
    }

    pauseSpeedTriage() {
        this.clearSpeedTriageTimer();
    }

    resumeSpeedTriage() {
        if (!this.isSpeedTriageActive) return;
        if (this.isAnyModalOpen()) return;

        if (this.studyViewMode === 'card') {
            if (this.flashcard && !this.flashcard.classList.contains('flipped')) {
                this.startSpeedTriageCountdown();
            }
        } else {
            this.startListSpeedSprint(this.listSprintCurrentIndex || 0);
        }
    }

    clearSpeedTriageTimer() {
        if (this.speedTriageTimer) {
            clearInterval(this.speedTriageTimer);
            this.speedTriageTimer = null;
        }
    }

    startSpeedTriageCountdown() {
        this.clearSpeedTriageTimer();
        if (!this.isSpeedTriageActive || !this.speedTriageGauge) return;
        if (this.isAnyModalOpen()) return;

        let timeLeft = 3000;
        const interval = 50;
        this.speedTriageGauge.style.width = '100%';

        this.speedTriageTimer = setInterval(() => {
            timeLeft -= interval;
            const pct = Math.max(0, (timeLeft / 3000) * 100);
            this.speedTriageGauge.style.width = `${pct}%`;

            if (timeLeft <= 0) {
                this.clearSpeedTriageTimer();
                // Flip card automatically to show answer
                if (this.flashcard && !this.flashcard.classList.contains('flipped')) {
                    this.flashcard.classList.add('flipped');
                    this.showToast('⏰ 3초 경과! 정답을 확인하세요.', 'warning');
                }
            }
        }, interval);
    }

    /* List View 3-Second Speed Relay Sprint Engine */
    startListSpeedSprint(targetIndex = 0) {
        this.clearSpeedTriageTimer();
        if (!this.isSpeedTriageActive || !this.speedTriageGauge) return;
        if (this.isAnyModalOpen()) return;

        const cards = this.sentenceListContainer?.querySelectorAll('.swipe-card-item');
        if (!cards || cards.length === 0) return;

        this.listSprintCurrentIndex = Math.min(Math.max(0, targetIndex), cards.length - 1);
        const targetCard = cards[this.listSprintCurrentIndex];
        if (!targetCard) return;

        // Reset and highlight active sprint card
        cards.forEach(c => c.classList.remove('ring-2', 'ring-primary', 'shadow-lg', 'bg-primary/5'));
        targetCard.classList.add('ring-2', 'ring-primary', 'shadow-lg');
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Temporarily blur English text for active retrieval practice
        const engText = targetCard.querySelector('.sentence-eng-text');
        if (engText && !engText.classList.contains('revealed')) {
            engText.classList.add('blur-mask');
        }

        let timeLeft = 3000;
        const interval = 50;
        this.speedTriageGauge.style.width = '100%';

        this.speedTriageTimer = setInterval(() => {
            timeLeft -= interval;
            const pct = Math.max(0, (timeLeft / 3000) * 100);
            this.speedTriageGauge.style.width = `${pct}%`;

            if (timeLeft <= 0) {
                this.clearSpeedTriageTimer();
                if (engText) engText.classList.remove('blur-mask');
                this.showToast('⏰ 3초 경과! 정답 확인 후 평가를 선택하세요.', 'warning');
            }
        }, interval);
    }

    getFirstLetterHint(text) {
        if (!text) return '';
        const words = text.trim().split(/\s+/);
        return words.map(w => {
            const clean = w.replace(/[^\w]/g, '');
            if (clean.length === 0) return w;
            const first = clean[0];
            const underscores = '_'.repeat(Math.max(1, clean.length - 1));
            return w.replace(clean, first + underscores);
        }).join(' ');
    }

    showFirstLetterHint() {
        const current = this.getCurrentCardObject();
        if (!current || !this.firstLetterHintBox) return;

        if (!this.firstLetterHintBox.classList.contains('hidden')) {
            this.firstLetterHintBox.classList.add('hidden');
            if (this.btnFirstLetterHint) {
                this.btnFirstLetterHint.classList.remove('text-primary', 'font-extrabold');
            }
            return;
        }

        const hint = this.getFirstLetterHint(current.english);

        this.firstLetterHintBox.textContent = hint;
        this.firstLetterHintBox.classList.remove('hidden');
        if (this.btnFirstLetterHint) {
            this.btnFirstLetterHint.classList.add('text-primary', 'font-extrabold');
        }
        if (this.flashcard) this.flashcard.classList.remove('flipped');
    }

    renderFlashcard() {
        this.clearSpeedTriageTimer();
        this.cardStartTime = Date.now(); // Start measuring latency for this card

        const activeSentences = this.getActiveSentences();
        if (activeSentences.length === 0) {
            this.cardEnglish.textContent = '선택된 덱에 문장이 없습니다.';
            this.cardKorean.textContent = '수집 탭에서 문장을 추가하거나 다른 덱을 선택해주세요.';
            if (this.cardPromptKorean) this.cardPromptKorean.textContent = '문장이 없습니다.';
            this.cardCategory.textContent = 'Empty';
            this.cardProgress.textContent = '0 / 0';
            if (this.sessionQueueCount) this.sessionQueueCount.textContent = '0';
            if (this.sessionCompletedStr) this.sessionCompletedStr.textContent = '0/0';
            if (this.cardLatencyBadge) this.cardLatencyBadge.classList.add('hidden');
            return;
        }

        if (!this.sessionQueue || this.sessionQueue.length === 0) {
            this.initDailySession();
        }

        if (this.sessionQueue.length === 0) {
            this.cardEnglish.textContent = '🎉 오늘의 학습을 완수했습니다!';
            this.cardKorean.textContent = '세션 리셋 버튼을 눌러 새로 시작할 수 있습니다.';
            if (this.cardPromptKorean) this.cardPromptKorean.textContent = '🎉 오늘의 학습을 완수했습니다!';
            this.cardCategory.textContent = 'Complete';
            this.cardProgress.textContent = `암기 완료: ${activeSentences.filter(s => s.memorized).length}/${activeSentences.length}`;
            if (this.sessionQueueCount) this.sessionQueueCount.textContent = '0';
            if (this.sessionCompletedStr) this.sessionCompletedStr.textContent = `${this.sessionCompletedCount}/${this.sessionTotalCount}`;
            if (this.cardLatencyBadge) this.cardLatencyBadge.classList.add('hidden');
            return;
        }

        const currentId = this.sessionQueue[0];
        const current = this.sentences.find(s => s.id === currentId) || activeSentences[0];

        if (this.flashcard) {
            this.flashcard.classList.remove('flipped');
            this.flashcard.style.transform = '';
            this.flashcard.style.transition = 'none';
            // Force browser reflow to guarantee reset to front (Korean) before transition
            void this.flashcard.offsetHeight;
            this.flashcard.style.transition = '';
        }
        if (this.firstLetterHintBox) this.firstLetterHintBox.classList.add('hidden');
        if (this.btnFirstLetterHint) this.btnFirstLetterHint.classList.remove('text-primary', 'font-extrabold');
        if (this.ttsRateBadge) this.ttsRateBadge.textContent = `${this.ttsRate.toFixed(1)}x`;

        if (this.cardPromptKorean) this.cardPromptKorean.textContent = current.korean;
        this.cardEnglish.textContent = current.english;
        this.cardKorean.textContent = current.korean;
        this.cardCategory.textContent = `${current.category} ${current.memorized ? '✓' : ''}`;

        const studyCount = Math.max(current.studyCount || 0, (current.wrongCount || 0) + (current.lastStudiedAt ? 1 : 0));
        const isNew = (!current.lastStudiedAt && (current.studyCount || 0) === 0 && (current.wrongCount || 0) === 0);
        const wrongCount = current.wrongCount || 0;

        if (this.cardStudyTypeBadge) {
            if (isNew) {
                this.cardStudyTypeBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1 border shadow-xs bg-emerald-50 text-emerald-700 border-emerald-300';
                this.cardStudyTypeBadge.innerHTML = '✨ 오늘 신규 1회차';
            } else {
                this.cardStudyTypeBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1 border shadow-xs bg-amber-50 text-amber-800 border-amber-300';
                const wrongStr = wrongCount > 0 ? ` • 오답 ${wrongCount}회` : '';
                this.cardStudyTypeBadge.innerHTML = `🔄 복습 ${studyCount}회독${wrongStr}`;
            }
        }

        const wrongStr = wrongCount > 0 ? ` • 오답 ${wrongCount}회` : '';
        this.cardReviewInfo.textContent = isNew
            ? `✨ 오늘 신규 • 1회차 학습`
            : `🔄 누적 복습 • ${studyCount}회독${wrongStr}`;
        this.cardProgress.textContent = `덱 암기: ${activeSentences.filter(s => s.memorized).length}/${activeSentences.length}`;

        if (this.sessionQueueCount) this.sessionQueueCount.textContent = `${this.sessionQueue.length}`;
        if (this.sessionCompletedStr) this.sessionCompletedStr.textContent = `${this.sessionCompletedCount}/${this.sessionTotalCount}`;

        // Live Latency Badge Setup
        if (this.cardLatencyBadge && this.cardLatencyText) {
            this.cardLatencyBadge.classList.remove('hidden');
            this.cardLatencyText.textContent = '0.0s';
        }

        // Start countdown if speed triage is enabled
        if (this.isSpeedTriageActive) {
            this.startSpeedTriageCountdown();
        }
    }



    showSessionCompleteModal() {
        this.pauseSpeedTriage();
        if (this.completedSessionCount) {
            this.completedSessionCount.textContent = `${this.sessionCompletedCount}문장 암기 완수`;
        }
        if (this.sessionCompleteModal) {
            this.sessionCompleteModal.classList.remove('hidden');
        }
    }

    launchSessionQuiz() {
        if (this.sessionCompleteModal) {
            this.sessionCompleteModal.classList.add('hidden');
        }

        // Switch to quiz tab
        const quizNavBtn = document.querySelector('.nav-item[data-tab="tab-quiz"]');
        if (quizNavBtn) quizNavBtn.click();

        // Start quiz populated with sessionCompletedIds
        this.startQuiz(this.sessionCompletedIds);
    }

    moveSentenceUp(sentenceId) {
        const idx = this.sentences.findIndex(s => s.id === sentenceId);
        if (idx > 0) {
            const temp = this.sentences[idx];
            this.sentences[idx] = this.sentences[idx - 1];
            this.sentences[idx - 1] = temp;
            this.reassignNo();
            this.saveState();
            this.renderSentenceList();
        }
    }

    moveSentenceDown(sentenceId) {
        const idx = this.sentences.findIndex(s => s.id === sentenceId);
        if (idx >= 0 && idx < this.sentences.length - 1) {
            const temp = this.sentences[idx];
            this.sentences[idx] = this.sentences[idx + 1];
            this.sentences[idx + 1] = temp;
            this.reassignNo();
            this.saveState();
            this.renderSentenceList();
        }
    }

    enterSelectionMode(initialSentenceId = null) {
        this.isSelectionMode = true;
        if (initialSentenceId) {
            this.selectedSentenceIds.add(initialSentenceId);
        }
        if (this.bulkActionBar) this.bulkActionBar.classList.remove('hidden');
        this.updateBulkActionBar();
        this.renderSentenceList();
    }

    exitSelectionMode() {
        this.isSelectionMode = false;
        this.selectedSentenceIds.clear();
        if (this.bulkActionBar) this.bulkActionBar.classList.add('hidden');
        this.renderSentenceList();
    }

    toggleSentenceSelection(sentenceId) {
        if (this.selectedSentenceIds.has(sentenceId)) {
            this.selectedSentenceIds.delete(sentenceId);
        } else {
            this.selectedSentenceIds.add(sentenceId);
        }
        this.updateBulkActionBar();
        this.renderSentenceList();
    }

    /* Chunking Rules for Beginners (1~3 words per chunk, Natural child-friendly reading pauses) */
    splitIntoMeaningfulChunks(sentence) {
        if (!sentence) return [];
        const cleanTrimmed = sentence.trim();
        if (!cleanTrimmed) return [];

        // 1. Explicit user-provided slash boundary (' / ' or '/')
        if (cleanTrimmed.includes('/')) {
            const rawParts = cleanTrimmed.split(/\s*\/\s*/).map(p => p.trim()).filter(Boolean);
            if (rawParts.length > 1) {
                const chunks = [];
                rawParts.forEach(part => {
                    const words = part.split(/\s+/).filter(Boolean);
                    for (let i = 0; i < words.length; i += 3) {
                        chunks.push(words.slice(i, i + 3).join(' '));
                    }
                });
                return chunks.filter(Boolean);
            }
        }

        const rawWords = cleanTrimmed.split(/\s+/).filter(Boolean);
        if (rawWords.length === 0) return [];
        if (rawWords.length <= 2) return [rawWords.join(' ')];

        const subjectPronouns = new Set(['i', 'you', 'he', 'she', 'we', 'they', 'it']);

        const prepositions = new Set([
            'in', 'on', 'at', 'for', 'with', 'from', 'about', 'by', 'into',
            'through', 'during', 'before', 'after', 'above', 'below', 'under',
            'over', 'between', 'among', 'of', 'off', 'out', 'near', 'without', 'behind', 'around', 'to'
        ]);

        const conjunctions = new Set([
            'and', 'but', 'or', 'so', 'because', 'although', 'though', 'if', 'when',
            'while', 'that', 'which', 'who', 'whom', 'where', 'since', 'unless', 'as'
        ]);

        const beVerbsAndModals = new Set([
            'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
            'will', 'can', 'could', 'should', 'would', 'must', 'may', 'might', 'shall',
            'have', 'has', 'had', 'do', 'does', 'did'
        ]);

        const objectStarters = new Set([
            'a', 'an', 'the', 'some', 'any', 'every', 'each', 'all', 'many', 'much',
            'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those'
        ]);

        const chunks = [];
        let cur = [];

        for (let i = 0; i < rawWords.length; i++) {
            const w = rawWords[i];
            const clean = w.toLowerCase().replace(/[^a-z]/g, '');
            const prevWord = i > 0 ? rawWords[i - 1] : '';
            const prevClean = prevWord.toLowerCase().replace(/[^a-z]/g, '');

            let shouldBreak = false;

            if (cur.length > 0) {
                // Rule 1: Max 3 words per chunk
                if (cur.length >= 3) {
                    shouldBreak = true;
                }
                // Rule 2: Punctuation boundary (comma, semicolon, dash, etc.)
                else if (/[,;:—\-]$/.test(prevWord)) {
                    shouldBreak = true;
                }
                // Rule 3: Before Conjunctions (and, but, so, because, that...)
                else if (conjunctions.has(clean)) {
                    shouldBreak = true;
                }
                // Rule 4: Fixed causative patterns (e.g. 'let me', 'let us') break before the base verb
                else if (prevClean === 'me' && (cur[0] || '').toLowerCase() === 'let') {
                    shouldBreak = true;
                }
                // Rule 5: New Subject Clause (pronouns like I, you, he, she, we, they)
                else if (subjectPronouns.has(clean) && cur.length >= 1 && !['give', 'tell', 'show', 'ask', 'send', 'bring', 'teach', 'lend'].includes(prevClean)) {
                    shouldBreak = true;
                }
                // Rule 6: to-infinitive phrases (e.g. 'to buy', 'to have')
                else if (clean === 'to' && i + 1 < rawWords.length && !prepositions.has(prevClean)) {
                    shouldBreak = true;
                }
                // Rule 7: Prepositional Phrases (e.g. 'in the park', 'around here', 'on the project')
                else if (prepositions.has(clean)) {
                    shouldBreak = true;
                }
                // Rule 8: Object / Article starters (e.g. 'a place', 'a quick update', 'the apple')
                else if (objectStarters.has(clean) && cur.length >= 1 && !prepositions.has(prevClean)) {
                    shouldBreak = true;
                }
                // Rule 8: Long Subject / Verb separation (only if subject was already 2+ words and not a simple pronoun)
                else if (beVerbsAndModals.has(clean) && cur.length >= 2 && !subjectPronouns.has(prevClean)) {
                    shouldBreak = true;
                }
            }

            if (shouldBreak && cur.length > 0) {
                chunks.push(cur.join(' '));
                cur = [w];
            } else {
                cur.push(w);
            }
        }

        if (cur.length > 0) {
            chunks.push(cur.join(' '));
        }

        // Final cleanup: Ensure no chunk exceeds 3 words
        const finalChunks = [];
        chunks.forEach(chunk => {
            const words = chunk.split(/\s+/).filter(Boolean);
            if (words.length > 3) {
                for (let i = 0; i < words.length; i += 3) {
                    finalChunks.push(words.slice(i, i + 3).join(' '));
                }
            } else if (words.length > 0) {
                finalChunks.push(chunk);
            }
        });

        return finalChunks.filter(Boolean);
    }

    /* Get Today's Focus Queue (Smart Ebbinghaus SRS + Daily Target Intake) */
    getTodayFocusSentences() {
        const active = this.getActiveSentences();
        const today = getTodayString();
        const yesterday = getYesterdayString();
        const dailyTargetCount = (this.goal && this.goal.dailyCount) ? parseInt(this.goal.dailyCount, 10) : 10;
        const reviewCap = (this.goal && this.goal.reviewCap !== undefined) ? parseInt(this.goal.reviewCap, 10) : 20;

        // 1. Due Review Sentences (Overdue SRS review, studied yesterday, or wrong >= 1)
        const dueReviews = active.filter(s => {
            if (s.memorized) return false;
            // Case A: Has SRS review schedule and is due today or overdue
            if (s.nextReviewDate && s.nextReviewDate <= today) return true;
            // Case B: Studied yesterday and not yet mastered
            if (s.lastStudiedAt && s.lastStudiedAt === yesterday) return true;
            // Case C: Has wrong count >= 1 and studied previously
            if ((s.wrongCount || 0) >= 1 && s.lastStudiedAt && s.lastStudiedAt <= today) return true;
            return false;
        });

        // Sort reviews by priority: higher wrongCount and earlier nextReviewDate first
        dueReviews.sort((a, b) => {
            const wrongDiff = (b.wrongCount || 0) - (a.wrongCount || 0);
            if (wrongDiff !== 0) return wrongDiff;
            return (a.nextReviewDate || '').localeCompare(b.nextReviewDate || '');
        });

        const selectedReviews = (reviewCap > 0 && dueReviews.length > reviewCap)
            ? dueReviews.slice(0, reviewCap)
            : dueReviews;

        const reviewIds = new Set(selectedReviews.map(s => s.id));

        // 2. New Unstudied Sentences to fill up to dailyTargetCount
        const unstudied = active.filter(s => !s.memorized && !reviewIds.has(s.id));
        const neededNewCount = Math.max(0, dailyTargetCount - selectedReviews.length);
        const selectedNew = unstudied.slice(0, neededNewCount);

        // 3. Combine reviews + new intake (Strictly capped to daily focus size)
        let focusList = [...selectedReviews, ...selectedNew];

        // Fallback: If no reviews and no unstudied, but unmemorized items exist, take up to dailyTargetCount
        if (focusList.length === 0 && active.some(s => !s.memorized)) {
            focusList = active.filter(s => !s.memorized).slice(0, dailyTargetCount);
        }

        return focusList;
    }

    switchListScope(scope) {
        this.activeListScope = scope || 'today_focus';
        if (this.activeListScope === 'today_focus') {
            this.btnScopeToday?.classList.add('bg-white', 'shadow-sm', 'text-primary', 'font-extrabold');
            this.btnScopeToday?.classList.remove('text-on-surface-variant');
            this.btnScopeAll?.classList.remove('bg-white', 'shadow-sm', 'text-primary', 'font-extrabold');
            this.btnScopeAll?.classList.add('text-on-surface-variant');
            if (this.listSubtitle) this.listSubtitle.textContent = '오늘의 집중 미션 (신규 목표 + 누적 약점 복습)';
        } else {
            this.btnScopeAll?.classList.add('bg-white', 'shadow-sm', 'text-primary', 'font-extrabold');
            this.btnScopeAll?.classList.remove('text-on-surface-variant');
            this.btnScopeToday?.classList.remove('bg-white', 'shadow-sm', 'text-primary', 'font-extrabold');
            this.btnScopeToday?.classList.add('text-on-surface-variant');
            if (this.listSubtitle) this.listSubtitle.textContent = '전체 보관함 (검색, 정렬, 덱 관리)';
        }
        this.renderSentenceList();
    }

    getFilteredSentences() {
        const query = this.searchSentence ? this.searchSentence.value.toLowerCase().trim() : '';
        const catFilter = this.filterCategory ? this.filterCategory.value : 'all';
        const statusFilter = this.filterStatus ? this.filterStatus.value : 'all';
        const sortMode = this.sortOrder ? this.sortOrder.value : 'no_asc';

        const todayStr = getTodayString();
        const yesterdayStr = getYesterdayString();

        // Scope resolution: Today's Focus vs All Vault
        const basePool = (this.activeListScope === 'today_focus' && !query)
            ? this.getTodayFocusSentences()
            : this.getActiveSentences();

        let filtered = basePool.filter(s => {
            if (query) {
                const matchText = s.english.toLowerCase().includes(query) || s.korean.toLowerCase().includes(query);
                if (!matchText) return false;
            }

            if (catFilter !== 'all' && s.category !== catFilter) return false;

            if (this.activeListScope !== 'today_focus') {
                if (statusFilter === 'unmemorized' && s.memorized) return false;
                if (statusFilter === 'memorized' && !s.memorized) return false;
                if (statusFilter === 'exclude_memorized' && s.memorized) return false;
                if (statusFilter === 'frequent_wrong' && (s.wrongCount || 0) < 2) return false;
                if (statusFilter === 'studied_yesterday' && s.lastStudiedAt !== yesterdayStr) return false;
                if (statusFilter === 'due_today' && (s.nextReviewDate || todayStr) > todayStr) return false;
            }

            return true;
        });

        filtered.sort((a, b) => {
            if (sortMode === 'no_asc') return a.no - b.no;
            if (sortMode === 'no_desc') return b.no - a.no;
            if (sortMode === 'wrong_desc') return (b.wrongCount || 0) - (a.wrongCount || 0);
            if (sortMode === 'due_asc') return (a.nextReviewDate || '').localeCompare(b.nextReviewDate || '');
            return a.no - b.no;
        });

        // Update Scope Badges
        const todayFocusCount = this.getTodayFocusSentences().length;
        const allLibraryCount = this.getActiveSentences().length;
        if (this.todayFocusCountBadge) this.todayFocusCountBadge.textContent = todayFocusCount;
        if (this.allLibraryCountBadge) this.allLibraryCountBadge.textContent = allLibraryCount;

        return filtered;
    }

    selectAllSentences() {
        const visibleIds = this.getFilteredSentences().map(s => s.id);
        if (this.selectedSentenceIds.size === visibleIds.length) {
            this.selectedSentenceIds.clear();
        } else {
            visibleIds.forEach(id => this.selectedSentenceIds.add(id));
        }
        this.updateBulkActionBar();
        this.renderSentenceList();
    }

    deleteSelectedSentences() {
        const count = this.selectedSentenceIds.size;
        if (count === 0) {
            alert('삭제할 문장을 먼저 선택해주세요.');
            return;
        }

        this.sentences = this.sentences.filter(s => !this.selectedSentenceIds.has(s.id));
        if (this.sessionQueue) {
            this.sessionQueue = this.sessionQueue.filter(id => !this.selectedSentenceIds.has(id));
        }
        if (this.sessionCompletedIds) {
            this.sessionCompletedIds = this.sessionCompletedIds.filter(id => !this.selectedSentenceIds.has(id));
        }
        this.selectedSentenceIds.clear();
        this.reassignNo();
        this.saveState();
        this.exitSelectionMode();
        this.renderAll();
    }

    updateBulkActionBar() {
        const count = this.selectedSentenceIds.size;
        if (this.bulkSelectCount) this.bulkSelectCount.textContent = `${count}개 선택됨`;
        if (this.bulkDeleteCount) this.bulkDeleteCount.textContent = count;
    }

    cleanDeduplicate() {
        const seen = new Set();
        const beforeCount = this.sentences.length;
        const uniqueList = [];

        this.sentences.forEach(s => {
            const norm = s.english.trim().toLowerCase();
            if (!seen.has(norm)) {
                seen.add(norm);
                uniqueList.push(s);
            }
        });

        const removedCount = beforeCount - uniqueList.length;
        if (removedCount > 0) {
            this.sentences = uniqueList;
            this.reassignNo();
            this.saveState();
            this.renderSentenceList();
            this.showToast(`🧹 중복 문장 ${removedCount}개가 정리되었습니다!`, 'success');
        } else {
            this.showToast('✨ 중복된 문장이 없습니다.', 'info');
        }
    }

    deleteSentence(sentenceId) {
        const target = this.sentences.find(s => s.id === sentenceId);
        if (!target) return;

        this.sentences = this.sentences.filter(s => s.id !== sentenceId);
        if (this.sessionQueue) {
            this.sessionQueue = this.sessionQueue.filter(id => id !== sentenceId);
        }
        if (this.sessionCompletedIds) {
            this.sessionCompletedIds = this.sessionCompletedIds.filter(id => id !== sentenceId);
        }
        if (this.selectedSentenceIds) {
            this.selectedSentenceIds.delete(sentenceId);
        }
        this.reassignNo();
        this.saveState();
        this.renderAll();
    }

    /* Structured DB Card List & Filter Renderer */
    renderSentenceList() {
        const filtered = this.getFilteredSentences();

        this.sentenceListContainer.innerHTML = '';

        if (filtered.length === 0) {
            const isLearningFilter = this.activeStatusFilter === 'unmemorized' || this.activeStatusFilter === 'due_today';
            const totalActive = this.getActiveSentences().length;

            if (isLearningFilter && totalActive > 0) {
                this.sentenceListContainer.innerHTML = `
                    <div class="bg-surface rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-center text-center gap-3 animate-fade-in-up my-4">
                        <div class="w-16 h-16 rounded-full bg-secondary-container text-secondary flex items-center justify-center text-3xl shadow-sm">
                            🎉
                        </div>
                        <h4 class="font-extrabold text-xl text-on-surface">오늘의 리스트 암기 완주!</h4>
                        <p class="text-xs text-on-surface-variant leading-relaxed">
                            모르는 문장 없이 모든 문장을 완벽하게 통과하셨습니다.<br>
                            지금 바로 퀴즈를 풀어 장기 기억으로 전환해보세요!
                        </p>
                        <div class="flex gap-2 mt-2 w-full max-w-xs">
                            <button onclick="window.app?.startQuiz()" class="flex-1 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm">
                                퀴즈 풀기 🧩
                            </button>
                            <button onclick="window.app?.openShareModal()" class="flex-1 py-2.5 bg-surface text-primary border border-primary/40 font-bold text-xs rounded-xl hover:bg-primary/5 active:scale-95 transition-all">
                                공부 인증 📸
                            </button>
                        </div>
                    </div>
                `;
            } else {
                this.sentenceListContainer.innerHTML = `
                    <div class="text-center py-12 px-4 text-on-surface-variant bg-surface rounded-2xl border border-dashed border-outline-variant/40 flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-4xl text-outline-variant">folder_open</span>
                        <p class="text-sm font-medium">조건에 일치하는 문장이 없습니다.</p>
                    </div>
                `;
            }
            return;
        }

        filtered.forEach(item => {
            const isSelected = this.selectedSentenceIds.has(item.id);
            const cardEl = document.createElement('div');
            cardEl.className = `swipe-card-item w-full rounded-2xl ${isSelected ? 'selected' : ''}`;
            cardEl.dataset.id = item.id;

            const isRevealed = this.revealedItemIds.has(item.id);

            // SRS Tag & Status Dot
            let statusDotColor = 'bg-primary';
            let srsBadgeHtml = `<span class="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">New</span>`;
            if (item.memorized) {
                statusDotColor = 'bg-secondary';
                srsBadgeHtml = `<span class="bg-secondary-container/40 text-on-secondary-container px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Mastered</span>`;
            } else if ((item.intervalStep || 0) > 0) {
                statusDotColor = 'bg-tertiary-fixed-dim';
                srsBadgeHtml = `<span class="bg-tertiary-fixed-dim/20 text-tertiary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Stage ${item.intervalStep}</span>`;
            }

            const isHinted = this.hintedItemIds.has(item.id) || (this.isGlobalHintActive && !isRevealed);
            const hintEng = this.getFirstLetterHint(item.english);

            // Layout logic based on listDisplayMode with seamless in-place hint replacement
            let textBlocksHtml = '';

            if (this.listDisplayMode === 'kor_only') {
                // 한글만 모드: 상단 한글(선명) -> 하단 영어(블러 마스크 / 힌트 시 빈칸 / 확인 시 정답)
                let engDisplayHtml = '';
                if (isRevealed) {
                    engDisplayHtml = `<p class="sentence-eng-text font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all tracking-tight">${item.english}</p>`;
                } else if (isHinted) {
                    engDisplayHtml = `<p class="sentence-eng-text font-mono font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all tracking-wider">${hintEng}</p>`;
                } else {
                    engDisplayHtml = `<p class="sentence-eng-text font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all tracking-tight blur-mask">${item.english}</p>`;
                }

                textBlocksHtml = `
                    <div class="mt-0.5 text-left">
                        <p class="sentence-kor-text font-extrabold text-base sm:text-lg text-on-surface leading-snug text-left transition-all">${item.korean}</p>
                    </div>
                    ${engDisplayHtml}
                `;
            } else if (this.listDisplayMode === 'eng_only') {
                // 영어만 모드: 상단 영어(선명) -> 하단 한글(블러 마스크 / 힌트 시 일부 / 확인 시 정답)
                let korDisplayHtml = '';
                if (isRevealed) {
                    korDisplayHtml = `<p class="sentence-kor-text font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all leading-relaxed">${item.korean}</p>`;
                } else if (isHinted) {
                    const korHint = item.korean.slice(0, Math.min(3, item.korean.length)) + '...';
                    korDisplayHtml = `<p class="sentence-kor-text font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all leading-relaxed">${korHint}</p>`;
                } else {
                    korDisplayHtml = `<p class="sentence-kor-text font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all leading-relaxed blur-mask">${item.korean}</p>`;
                }

                textBlocksHtml = `
                    <div class="mt-0.5 text-left">
                        <p class="sentence-eng-text font-extrabold text-base sm:text-lg text-on-surface leading-snug text-left transition-all tracking-tight">${item.english}</p>
                    </div>
                    ${korDisplayHtml}
                `;
            } else {
                // 전체보기 모드 (both): 직전에 선택했던 주 언어 방향(한글 우선 or 영어 우선) 유지!
                if (this.listPrimaryLanguage === 'eng') {
                    // 영어 위, 한글 아래
                    let engDisplayHtml = '';
                    if (isHinted) {
                        engDisplayHtml = `<p class="sentence-eng-text font-mono font-extrabold text-base sm:text-lg text-on-surface leading-snug text-left transition-all tracking-wider">${hintEng}</p>`;
                    } else {
                        engDisplayHtml = `<p class="sentence-eng-text font-extrabold text-base sm:text-lg text-on-surface leading-snug text-left transition-all tracking-tight">${item.english}</p>`;
                    }

                    textBlocksHtml = `
                        <div class="mt-0.5 text-left">
                            ${engDisplayHtml}
                        </div>
                        <p class="sentence-kor-text font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all leading-relaxed">${item.korean}</p>
                    `;
                } else {
                    // 한글 위, 영어 아래
                    let engDisplayHtml = '';
                    if (isHinted) {
                        engDisplayHtml = `<p class="sentence-eng-text font-mono font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all tracking-wider">${hintEng}</p>`;
                    } else {
                        engDisplayHtml = `<p class="sentence-eng-text font-bold text-sm sm:text-base text-primary mt-1 text-left transition-all tracking-tight">${item.english}</p>`;
                    }

                    textBlocksHtml = `
                        <div class="mt-0.5 text-left">
                            <p class="sentence-kor-text font-extrabold text-base sm:text-lg text-on-surface leading-snug text-left transition-all">${item.korean}</p>
                        </div>
                        ${engDisplayHtml}
                    `;
                }
            }

            const checkboxHtml = this.isSelectionMode
                ? `<div class="mt-1 flex-shrink-0"><input type="checkbox" class="item-checkbox w-4 h-4 rounded text-primary border-outline-variant focus:ring-primary" ${isSelected ? 'checked' : ''}></div>`
                : '';

            const deleteBtnHtml = !this.isSelectionMode
                ? `<button class="btn-delete-item p-1.5 text-outline-variant hover:text-error rounded-lg hover:bg-error-container/20 transition-all flex-shrink-0" title="문장 삭제"><span class="material-symbols-outlined text-[18px]">delete</span></button>`
                : '';

            const studyCount = Math.max(item.studyCount || 0, (item.wrongCount || 0) + (item.lastStudiedAt ? 1 : 0));
            const isNew = (!item.lastStudiedAt && (item.studyCount || 0) === 0 && (item.wrongCount || 0) === 0);
            let studyTypeBadgeHtml = '';
            if (isNew) {
                studyTypeBadgeHtml = `<span class="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-0.5">✨ 신규 (1회차)</span>`;
            } else {
                const wrongInfo = (item.wrongCount || 0) > 0 ? ` (오답 ${item.wrongCount}회)` : '';
                studyTypeBadgeHtml = `<span class="bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-0.5">🔄 ${studyCount}회독${wrongInfo}</span>`;
            }

            const hintBtnClass = isHinted
                ? 'text-amber-700 bg-amber-500/15 border border-amber-500/30 font-extrabold shadow-xs'
                : 'text-outline-variant hover:text-amber-700 hover:bg-amber-500/10';

            cardEl.innerHTML = `
                <div class="swipe-bg-overlay swipe-bg-left">
                    <span class="material-symbols-outlined text-xl mr-2">close</span>
                    <span>모르는 문장 (오늘 다시)</span>
                </div>
                <div class="swipe-bg-overlay swipe-bg-right">
                    <span>암기 완료 (Mastered)</span>
                    <span class="material-symbols-outlined text-xl ml-2">check</span>
                </div>
                <div class="swipe-card-inner flex flex-col gap-2 p-4 bg-white rounded-2xl w-full border border-outline-variant/20 shadow-sm transition-all text-left">
                    <div class="flex items-start justify-between gap-3 w-full">
                        ${checkboxHtml}
                        <div class="card-reorder-group flex flex-col gap-0.5 text-outline-variant flex-shrink-0 mt-0.5">
                            <button class="btn-reorder btn-move-up p-0.5 hover:text-primary transition-colors" title="위로 이동"><span class="material-symbols-outlined text-[14px]">expand_less</span></button>
                            <button class="btn-reorder btn-move-down p-0.5 hover:text-primary transition-colors" title="아래로 이동"><span class="material-symbols-outlined text-[14px]">expand_more</span></button>
                        </div>
                        <div class="card-text-wrapper flex-grow flex flex-col gap-1.5 cursor-pointer text-left min-w-0">
                            <div class="flex items-center gap-1.5 text-left flex-wrap">
                                <div class="w-2 h-2 rounded-full ${statusDotColor} flex-shrink-0"></div>
                                ${studyTypeBadgeHtml}
                                ${srsBadgeHtml}
                                <span class="text-[10px] font-semibold text-on-surface-variant/80 bg-surface-container-low px-2 py-0.5 rounded-md border border-outline-variant/30">${item.category}</span>
                            </div>
                            ${textBlocksHtml}
                        </div>

                        <!-- Action Toolset (Hint, Voice, TTS, Delete) - Right aligned -->
                        <div class="flex items-center justify-end gap-1 flex-shrink-0 ml-auto self-start mt-0.5">
                            <button class="btn-item-hint p-1.5 ${hintBtnClass} rounded-lg transition-all" title="첫 글자 힌트">
                                <span class="material-symbols-outlined text-[18px]">lightbulb</span>
                            </button>
                            <button class="btn-item-voice p-1.5 text-outline-variant hover:text-secondary hover:bg-secondary-container/40 rounded-lg transition-all" title="발음 쉐도잉 평가">
                                <span class="material-symbols-outlined text-[18px]">mic</span>
                            </button>
                            <button class="btn-item-tts p-1.5 text-outline-variant hover:text-primary hover:bg-primary-fixed/40 rounded-lg transition-all" title="발음 듣기">
                                <span class="material-symbols-outlined text-[18px]">volume_up</span>
                            </button>
                            ${deleteBtnHtml}
                        </div>
                    </div>
                </div>
            `;

            const innerEl = cardEl.querySelector('.swipe-card-inner');
            const overlayLeft = cardEl.querySelector('.swipe-bg-left');
            const overlayRight = cardEl.querySelector('.swipe-bg-right');

            const btnUp = cardEl.querySelector('.btn-move-up');
            const btnDown = cardEl.querySelector('.btn-move-down');
            const btnDelete = cardEl.querySelector('.btn-delete-item');
            const btnTts = cardEl.querySelector('.btn-item-tts');
            const btnHint = cardEl.querySelector('.btn-item-hint');
            const btnVoice = cardEl.querySelector('.btn-item-voice');
            const textWrapper = cardEl.querySelector('.card-text-wrapper');
            const checkboxEl = cardEl.querySelector('.item-checkbox');

            // 💡 List Item In-Place Hint Toggle
            btnHint?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.hintedItemIds.has(item.id)) {
                    this.hintedItemIds.delete(item.id);
                } else {
                    this.hintedItemIds.add(item.id);
                    this.revealedItemIds.delete(item.id);
                }
                this.renderSentenceList();
            });

            // 🎙️ List Item Voice Shadowing Evaluation
            btnVoice?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startVoiceShadowing(item);
            });

            // Long Press Detection (400ms)
            let itemPressTimer = null;

            const onPointerDown = (e) => {
                if (e.target.closest('.btn-reorder') || e.target.closest('.btn-delete-item')) return;
                itemPressTimer = setTimeout(() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    if (!this.isSelectionMode) {
                        this.enterSelectionMode(item.id);
                    }
                }, 400);
            };

            const onPointerCancel = () => {
                if (itemPressTimer) {
                    clearTimeout(itemPressTimer);
                    itemPressTimer = null;
                }
            };

            cardEl.addEventListener('mousedown', onPointerDown);
            cardEl.addEventListener('touchstart', onPointerDown, { passive: true });

            cardEl.addEventListener('mousemove', onPointerCancel);
            cardEl.addEventListener('touchmove', onPointerCancel, { passive: true });
            cardEl.addEventListener('mouseup', onPointerCancel);
            cardEl.addEventListener('touchend', onPointerCancel);

            btnUp?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveSentenceUp(item.id);
            });

            btnDown?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveSentenceDown(item.id);
            });

            btnDelete?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSentence(item.id);
            });

            btnTts?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.speakText(item.english);
            });

            checkboxEl?.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSentenceSelection(item.id);
            });

            textWrapper?.addEventListener('click', (e) => {
                if (this.isSelectionMode) {
                    this.toggleSentenceSelection(item.id);
                    return;
                }
                if (this.listDisplayMode !== 'both') {
                    if (this.revealedItemIds.has(item.id)) {
                        this.revealedItemIds.delete(item.id);
                        this.hintedItemIds.delete(item.id);
                    } else {
                        this.revealedItemIds.add(item.id);
                        this.hintedItemIds.delete(item.id);
                    }
                    this.renderSentenceList();
                } else {
                    if (this.hintedItemIds.has(item.id)) {
                        this.hintedItemIds.delete(item.id);
                        this.renderSentenceList();
                    }
                }
            });

            if (!this.isSelectionMode) {
                this.bindRowSwipeGestures(cardEl, innerEl, overlayLeft, overlayRight, item);
            }

            this.sentenceListContainer.appendChild(cardEl);
        });
    }

    bindRowSwipeGestures(cardEl, innerEl, overlayLeft, overlayRight, item) {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        let isHorizontalSwipe = false;

        const onDown = (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            startX = clientX;
            startY = clientY;
            currentX = clientX;
            currentY = clientY;
            isDragging = true;
            isHorizontalSwipe = false;
            innerEl.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!isDragging) return;
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            currentX = clientX;
            currentY = clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            // Preserve vertical scroll if scrolling vertically
            if (!isHorizontalSwipe && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
                isDragging = false;
                return;
            }

            if (Math.abs(deltaX) > 8) {
                isHorizontalSwipe = true;
                innerEl.style.transform = `translateX(${deltaX}px)`;
                if (deltaX > 20) {
                    overlayRight.style.opacity = Math.min((deltaX - 20) / 70, 1);
                    overlayLeft.style.opacity = 0;
                } else if (deltaX < -20) {
                    overlayLeft.style.opacity = Math.min((-deltaX - 20) / 70, 1);
                    overlayRight.style.opacity = 0;
                } else {
                    overlayLeft.style.opacity = 0;
                    overlayRight.style.opacity = 0;
                }
            }
        };

        const onUp = () => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = currentX - startX;

            innerEl.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

            if (deltaX > 60) {
                // Swiped Right -> Known / Memorized
                innerEl.style.transform = 'translateX(120%)';
                cardEl.classList.add('dismissed');
                setTimeout(() => {
                    item.memorized = true;
                    item.studyCount = (item.studyCount || 0) + 1;
                    item.lastStudiedAt = getTodayString();
                    item.intervalStep = Math.min((item.intervalStep || 0) + 1, EBBINGHAUS_INTERVALS.length - 1);
                    item.nextReviewDate = addDaysToDate(getTodayString(), EBBINGHAUS_INTERVALS[item.intervalStep]);
                    this.saveState();
                    this.renderSentenceList();
                    this.checkDeckMilestones(item.deckId || this.activeDeckId);
                    this.showToast(`✓ [암기 완료] 다음 복습: ${item.nextReviewDate}`, 'success');

                    if (this.isSpeedTriageActive) {
                        this.startListSpeedSprint(this.listSprintCurrentIndex);
                    }
                }, 250);
            } else if (deltaX < -60) {
                // Swiped Left -> Unknown / Unmemorized -> Re-insert 6 items later!
                innerEl.style.transform = 'translateX(-120%)';
                cardEl.classList.add('dismissed');
                setTimeout(() => {
                    item.memorized = false;
                    item.studyCount = (item.studyCount || 0) + 1;
                    item.wrongCount = (item.wrongCount || 0) + 1;
                    item.intervalStep = 0;
                    item.nextReviewDate = getTodayString();
                    item.lastStudiedAt = getTodayString();

                    // Smart Loop Re-insertion: Move item 6 slots later in sentences array
                    const currentIdx = this.sentences.findIndex(s => s.id === item.id);
                    if (currentIdx !== -1) {
                        this.sentences.splice(currentIdx, 1);
                        const targetIdx = Math.min(currentIdx + 6, this.sentences.length);
                        this.sentences.splice(targetIdx, 0, item);
                        this.reassignNo();
                    }

                    this.saveState();
                    this.renderSentenceList();
                    this.showToast('🔁 [모름] 6문장 뒤에 다시 테스트합니다!', 'warning');

                    if (this.isSpeedTriageActive) {
                        this.startListSpeedSprint(this.listSprintCurrentIndex);
                    }
                }, 250);
            } else {
                // Snap back
                innerEl.style.transform = 'translateX(0px)';
                overlayLeft.style.opacity = 0;
                overlayRight.style.opacity = 0;
            }
        };

        innerEl.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        innerEl.addEventListener('touchstart', onDown, { passive: true });
        innerEl.addEventListener('touchmove', onMove, { passive: true });
        innerEl.addEventListener('touchend', onUp);
    }

    /* Ebbinghaus Notification Check */
    checkEbbinghausNotifications() {
        const todayStr = getTodayString();
        const dueList = this.sentences.filter(s => !s.memorized && (s.nextReviewDate || todayStr) <= todayStr);
        this.dueCountEl.textContent = dueList.length;

        if (dueList.length > 0 && this.goal.enableNotifications && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('TUK (툭) 에빙하우스 복습 알림', {
                    body: `오늘 복습할 문장이 ${dueList.length}개 남아있습니다! Train • Unlock • Keep!`,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3407/3407024.png'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
        }
    }

    /* Smart Pacemaker & Goal Setting Engine */
    populateGoalDeckSelect() {
        if (!this.goalTargetDeckSelect) return;
        this.goalTargetDeckSelect.innerHTML = '<option value="all">전체 문장</option>';
        this.decks.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            if (this.goal && this.goal.targetDeckId === d.id) {
                opt.selected = true;
            }
            this.goalTargetDeckSelect.appendChild(opt);
        });
        if (!this.goal || !this.goal.targetDeckId || this.goal.targetDeckId === 'all') {
            this.goalTargetDeckSelect.value = 'all';
        }
    }

    updateGoalPaceSimulator() {
        const targetDeckId = this.goalTargetDeckSelect ? this.goalTargetDeckSelect.value : 'all';
        const targetSentences = (targetDeckId === 'all' || !targetDeckId)
            ? this.sentences
            : this.sentences.filter(s => s.deckId === targetDeckId);

        const totalSentences = targetSentences.length;
        const targetDeckObj = this.decks.find(d => d.id === targetDeckId);
        const deckName = (targetDeckId === 'all' || !targetDeckObj) ? '전체 문장' : targetDeckObj.name;

        if (this.goalDeckStatsText) {
            this.goalDeckStatsText.textContent = `선택한 [${deckName}]의 총 문장 수: ${totalSentences}개`;
        }

        const type = this.goalTypeSelect ? this.goalTypeSelect.value : 'daily';
        if (!this.goalSimulatorText) return;

        if (totalSentences === 0) {
            this.goalSimulatorText.innerHTML = '선택한 덱에 저장된 문장이 없습니다. 먼저 문장을 추가해주세요.';
            return;
        }

        if (type === 'daily') {
            const dailyCount = parseInt(this.goalDailyCount ? this.goalDailyCount.value : '10', 10) || 10;
            const daysNeeded = Math.ceil(totalSentences / Math.max(dailyCount, 1));
            const finishDate = addDaysToDate(getTodayString(), daysNeeded);
            this.goalSimulatorText.innerHTML = `총 <strong>${totalSentences}개</strong> 문장을 매일 <strong>${dailyCount}개</strong>씩 학습 시 약 <strong>${daysNeeded}일 후 (${finishDate.replace(/-/g, '.')})</strong>에 완독하게 됩니다! 🎯`;
        } else {
            const targetDays = parseInt(this.goalTargetDays ? this.goalTargetDays.value : '20', 10) || 20;
            const requiredDaily = Math.ceil(totalSentences / Math.max(targetDays, 1));
            const finishDate = addDaysToDate(getTodayString(), targetDays);
            this.goalSimulatorText.innerHTML = `총 <strong>${totalSentences}개</strong> 문장을 <strong>${targetDays}일</strong> 안에 완독하려면 하루 권장 학습량은 <strong>매일 ${requiredDaily}개</strong>입니다! (${finishDate.replace(/-/g, '.')} 완독 목표 🚀)`;
        }
    }

    openGoalModal() {
        if (!this.goalModal) return;
        this.pauseSpeedTriage();
        try { window.history.pushState({ modalOpen: true }, ''); } catch (e) {}
        this.goalModal.classList.remove('hidden');
        this.populateGoalDeckSelect();

        if (this.goalTypeSelect) this.goalTypeSelect.value = (this.goal && this.goal.type) || 'daily';
        if (this.goalDailyCount) this.goalDailyCount.value = (this.goal && this.goal.dailyCount) || 10;
        if (this.goalTotalCount) this.goalTotalCount.value = (this.goal && this.goal.totalCount) || 100;
        if (this.goalTargetDays) this.goalTargetDays.value = (this.goal && this.goal.targetDays) || 20;
        if (this.goalReviewCapSelect) this.goalReviewCapSelect.value = (this.goal && this.goal.reviewCap !== undefined) ? this.goal.reviewCap : 20;
        if (this.enableCatchUpMode) this.enableCatchUpMode.checked = this.goal ? this.goal.catchUpMode !== false : true;
        if (this.enableNotifications) this.enableNotifications.checked = this.goal ? this.goal.enableNotifications !== false : true;

        if (this.goal && this.goal.type === 'period') {
            this.goalDailyGroup?.classList.add('hidden');
            this.goalPeriodGroup?.classList.remove('hidden');
        } else {
            this.goalDailyGroup?.classList.remove('hidden');
            this.goalPeriodGroup?.classList.add('hidden');
        }

        this.updateGoalPaceSimulator();
    }

    closeGoalModal() {
        if (this.goalModal) this.goalModal.classList.add('hidden');
        this.resumeSpeedTriage();
    }

    saveGoalConfig() {
        if (!this.goal) this.goal = {};
        this.goal.targetDeckId = this.goalTargetDeckSelect ? this.goalTargetDeckSelect.value : 'all';
        this.goal.type = this.goalTypeSelect ? this.goalTypeSelect.value : 'daily';
        this.goal.dailyCount = parseInt(this.goalDailyCount ? this.goalDailyCount.value : '10', 10) || 10;
        this.goal.totalCount = parseInt(this.goalTotalCount ? this.goalTotalCount.value : '100', 10) || 100;
        this.goal.targetDays = parseInt(this.goalTargetDays ? this.goalTargetDays.value : '20', 10) || 20;
        this.goal.reviewCap = parseInt(this.goalReviewCapSelect ? this.goalReviewCapSelect.value : '20', 10);
        this.goal.catchUpMode = this.enableCatchUpMode ? this.enableCatchUpMode.checked : true;
        this.goal.enableNotifications = this.enableNotifications ? this.enableNotifications.checked : true;

        const targetDeckObj = this.decks.find(d => d.id === this.goal.targetDeckId);
        const deckName = (this.goal.targetDeckId === 'all' || !targetDeckObj) ? '전체 문장' : targetDeckObj.name;

        this.saveState();
        this.closeGoalModal();
        this.updateGoalProgress();
        this.initDailySession(true); // Re-initialize session with new cap
        this.renderAll();
        this.showToast(`🎯 [${deckName}] 학습 목표와 일일 복습 캡(${this.goal.reviewCap > 0 ? this.goal.reviewCap + '개' : '무제한'})이 적용되었습니다!`, 'success');
    }

    updateGoalProgress() {
        if (!this.goal) {
            this.goal = {
                type: 'daily',
                dailyCount: 10,
                totalCount: 100,
                targetDays: 20,
                targetDeckId: 'all',
                reviewCap: 20,
                catchUpMode: true,
                enableNotifications: true
            };
        }

        const targetDeckId = this.goal.targetDeckId || 'all';
        const targetSentences = (targetDeckId === 'all' || !targetDeckId)
            ? this.sentences
            : this.sentences.filter(s => s.deckId === targetDeckId);

        let target = 10;
        if (this.goal.type === 'daily') {
            target = Math.max(1, parseInt(this.goal.dailyCount || '10', 10));
            if (this.goalBadgeText) this.goalBadgeText.textContent = `목표: 하루 ${target}개`;
            if (this.goalTitleStr) this.goalTitleStr.innerHTML = `<span class="material-symbols-outlined text-[14px] text-primary">flag</span> 일일 목표: 하루 ${target}개`;
        } else {
            const totalCount = parseInt(this.goal.totalCount || '100', 10);
            const targetDays = Math.max(1, parseInt(this.goal.targetDays || '20', 10));
            target = Math.ceil(totalCount / targetDays);
            if (this.goalBadgeText) this.goalBadgeText.textContent = `목표: ${targetDays}일간 ${totalCount}개`;
            if (this.goalTitleStr) this.goalTitleStr.innerHTML = `<span class="material-symbols-outlined text-[14px] text-primary">flag</span> ${targetDays}일 완독 (일 ${target}개)`;
        }

        const todayStr = getTodayString();
        const todayStudied = targetSentences.filter(s => s.lastStudiedAt === todayStr).length;
        const pct = Math.min(Math.round((todayStudied / target) * 100), 100);

        if (this.goalPercentStr) {
            this.goalPercentStr.textContent = `${pct}% (${todayStudied}/${target}개)`;
        }
        if (this.goalProgressBar) {
            this.goalProgressBar.style.width = `${pct}%`;
        }
    }

    updateHeaderStats() {
        const activeSentences = this.getActiveSentences();
        if (this.totalCountEl) this.totalCountEl.textContent = activeSentences.length;
        if (this.memorizedCountEl) this.memorizedCountEl.textContent = activeSentences.filter(s => s.memorized).length;
        const todayStr = getTodayString();
        const dueCount = activeSentences.filter(s => !s.memorized && (s.nextReviewDate || todayStr) <= todayStr).length;
        if (this.dueCountEl) this.dueCountEl.textContent = dueCount;

        if (this.todayFocusCountBadge) this.todayFocusCountBadge.textContent = this.getTodayFocusSentences().length;
        if (this.allLibraryCountBadge) this.allLibraryCountBadge.textContent = activeSentences.length;
    }

    /* CSV Export & Import */
    exportCSV() {
        let csv = 'No,English,Korean,Category,WrongCount,LastStudied,NextReview,Memorized\n';
        this.sentences.forEach(s => {
            csv += `"${s.no}","${s.english.replace(/"/g, '""')}","${s.korean.replace(/"/g, '""')}","${s.category}","${s.wrongCount}","${s.lastStudiedAt || ''}","${s.nextReviewDate || ''}","${s.memorized}"\n`;
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `TUK_Sentences_${getTodayString()}.csv`;
        link.click();
    }

    importBackup(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    this.sentences = data;
                    this.reassignNo();
                    this.saveState();
                    this.renderAll();
                    alert(`총 ${data.length}개 문장 백업 데이터를 성공적으로 가져왔습니다!`);
                }
            } catch (err) {
                alert('파일 읽기 오류: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    /* Quiz Engine */
    updateQuizSetupUI() {
        const activeSentences = this.getActiveSentences();
        const todayStr = getTodayString();

        const studiedList = activeSentences.filter(s => Boolean(s.lastStudiedAt || (s.studyCount && s.studyCount > 0) || s.memorized));
        const todayList = activeSentences.filter(s => s.lastStudiedAt === todayStr);
        const wrongList = activeSentences.filter(s => (s.wrongCount || 0) >= 1);
        const allList = activeSentences;

        const studiedCountEl = document.getElementById('quizScopeStudiedCount');
        const todayCountEl = document.getElementById('quizScopeTodayCount');
        const wrongCountEl = document.getElementById('quizScopeWrongCount');
        const allCountEl = document.getElementById('quizScopeAllCount');

        if (studiedCountEl) studiedCountEl.textContent = `${studiedList.length}개`;
        if (todayCountEl) todayCountEl.textContent = `${todayList.length}개`;
        if (wrongCountEl) wrongCountEl.textContent = `${wrongList.length}개`;
        if (allCountEl) allCountEl.textContent = `${allList.length}개`;

        // Update visual active state on scope radio labels
        const scopeRadios = document.querySelectorAll('input[name="quizScope"]');
        scopeRadios.forEach(radio => {
            const label = radio.closest('label');
            if (!label) return;
            if (radio.checked) {
                label.classList.add('border-primary', 'bg-primary/5');
                label.classList.remove('border-outline-variant/40');
            } else {
                label.classList.remove('border-primary', 'bg-primary/5');
                label.classList.add('border-outline-variant/40');
            }
        });
    }

    startQuiz(targetIds = null) {
        let pool = [];
        const activeSentences = this.getActiveSentences();
        const todayStr = getTodayString();

        if (targetIds && targetIds.length > 0) {
            pool = this.sentences.filter(s => targetIds.includes(s.id));
        } else {
            const scopeEl = document.querySelector('input[name="quizScope"]:checked');
            const scope = scopeEl ? scopeEl.value : 'studied';

            if (scope === 'studied') {
                pool = activeSentences.filter(s => Boolean(s.lastStudiedAt || (s.studyCount && s.studyCount > 0) || s.memorized));
                if (pool.length === 0) {
                    if (confirm('현재 선택된 덱에 아직 학습을 진행한 문장이 없습니다.\n\n전체 문장(미학습 포함)으로 퀴즈를 출제하시겠습니까?')) {
                        pool = activeSentences;
                    } else {
                        return;
                    }
                }
            } else if (scope === 'today') {
                pool = activeSentences.filter(s => s.lastStudiedAt === todayStr);
                if (pool.length === 0) {
                    alert('오늘 학습 완료한 문장이 아직 없습니다.\n플래시카드로 오늘의 학습을 먼저 진행해보세요!');
                    return;
                }
            } else if (scope === 'wrong') {
                pool = activeSentences.filter(s => (s.wrongCount || 0) >= 1);
                if (pool.length === 0) {
                    alert('틀린 오답 문장 기록이 없습니다! 완벽합니다 👍');
                    return;
                }
            } else { // 'all'
                pool = activeSentences;
            }
        }

        if (pool.length === 0) {
            alert('현재 덱에 출제할 수 있는 문장이 없습니다!');
            return;
        }

        const typeEl = document.querySelector('input[name="quizType"]:checked');
        const type = typeEl ? typeEl.value : 'arrange';
        const questionCount = Math.min(pool.length, 10);
        const questions = [...pool].sort(() => Math.random() - 0.5).slice(0, questionCount);

        this.quizState = {
            active: true,
            questions,
            currentIndex: 0,
            score: 0,
            type,
            selectedWords: []
        };

        this.quizSetup.classList.add('hidden');
        this.quizContainer.classList.remove('hidden');
        this.renderQuizQuestion();
    }

    exitQuiz() {
        this.quizSetup.classList.remove('hidden');
        this.quizContainer.classList.add('hidden');
        this.quizState.active = false;
    }

    renderQuizQuestion() {
        const q = this.quizState.questions[this.quizState.currentIndex];
        this.quizScoreBadge.textContent = `문제 ${this.quizState.currentIndex + 1} / ${this.quizState.questions.length}`;
        
        const progressPct = ((this.quizState.currentIndex + 1) / this.quizState.questions.length) * 100;
        const quizLinearProgress = document.getElementById('quizLinearProgress');
        if (quizLinearProgress) quizLinearProgress.style.width = `${progressPct}%`;

        this.quizKorean.textContent = q.korean;
        this.quizFeedback.classList.add('hidden');
        this.btnCheckQuiz.classList.remove('hidden');
        this.btnNextQuiz.classList.add('hidden');

        this.quizArrangeArea.classList.add('hidden');
        this.quizBlankArea.classList.add('hidden');
        this.quizWriteArea.classList.add('hidden');

        if (this.quizState.type === 'arrange') {
            this.quizArrangeArea.classList.remove('hidden');
            this.selectedWordsBox.innerHTML = '';
            this.quizState.selectedWords = [];

            // Split into Meaningful Chunks instead of individual words!
            const chunks = this.splitIntoMeaningfulChunks(q.english);
            const shuffled = [...chunks].sort(() => Math.random() - 0.5);

            this.wordPool.innerHTML = '';
            shuffled.forEach((chunk, idx) => {
                const chip = document.createElement('span');
                chip.className = 'word-chip text-sm px-4 py-2.5 rounded-xl border border-primary/20 shadow-sm';
                chip.textContent = chunk;
                chip.addEventListener('click', () => {
                    chip.classList.add('used');
                    this.quizState.selectedWords.push(chunk);
                    this.renderSelectedWords();
                });
                this.wordPool.appendChild(chip);
            });
        } else if (this.quizState.type === 'blank') {
            this.quizBlankArea.classList.remove('hidden');
            const words = q.english.split(' ');
            const targetIdx = Math.floor(words.length / 2);
            this.quizState.blankTarget = words[targetIdx].replace(/[^\w]/g, '');

            const masked = words.map((w, i) => i === targetIdx ? '_____' : w).join(' ');
            this.blankSentence.textContent = masked;
            this.blankAnswerInput.value = '';
        } else if (this.quizState.type === 'write') {
            this.quizWriteArea.classList.remove('hidden');
            this.writeAnswerInput.value = '';
        }
    }

    renderSelectedWords() {
        this.selectedWordsBox.innerHTML = '';
        if (this.quizState.selectedWords.length === 0) {
            this.selectedWordsBox.innerHTML = '<span class="text-xs text-outline font-medium">아래 의미 청크(Chunk)를 탭하여 문장을 완성하세요</span>';
            return;
        }
        this.quizState.selectedWords.forEach((chunk, idx) => {
            const chip = document.createElement('span');
            chip.className = 'word-chip-selected text-sm px-3.5 py-2';
            chip.innerHTML = `${chunk} <span class="text-xs opacity-75 ml-1">&times;</span>`;
            chip.addEventListener('click', () => {
                this.quizState.selectedWords.splice(idx, 1);
                this.renderSelectedWords();
                const poolChips = this.wordPool.querySelectorAll('.word-chip');
                for (const c of poolChips) {
                    if (c.textContent === chunk && c.classList.contains('used')) {
                        c.classList.remove('used');
                        break;
                    }
                }
            });
            this.selectedWordsBox.appendChild(chip);
        });
    }

    checkQuizAnswer() {
        const q = this.quizState.questions[this.quizState.currentIndex];
        let userAns = '';
        let isCorrect = false;

        const cleanStr = str => str.toLowerCase().replace(/[^\w]/g, '').trim();

        if (this.quizState.type === 'arrange') {
            userAns = this.quizState.selectedWords.join(' ');
            isCorrect = cleanStr(userAns) === cleanStr(q.english);
        } else if (this.quizState.type === 'blank') {
            userAns = this.blankAnswerInput.value.trim();
            isCorrect = cleanStr(userAns) === cleanStr(this.quizState.blankTarget);
        } else if (this.quizState.type === 'write') {
            userAns = this.writeAnswerInput.value.trim();
            isCorrect = cleanStr(userAns) === cleanStr(q.english);
        }

        this.quizFeedback.classList.remove('hidden');
        if (isCorrect) {
            this.quizFeedback.className = 'quiz-feedback correct p-4 rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2';
            this.quizFeedback.innerHTML = '<span class="material-symbols-outlined text-[20px]" style="font-variation-settings: \'FILL\' 1;">stars</span> 완벽합니다! 정답입니다 (+10 XP)';
            this.quizState.score++;
        } else {
            this.quizFeedback.className = 'quiz-feedback incorrect p-4 rounded-xl text-center font-bold text-sm flex flex-col items-center gap-1';
            this.quizFeedback.innerHTML = `<div><span class="material-symbols-outlined text-[20px] align-middle">cancel</span> 아쉽네요! 정답:</div><div class="font-extrabold text-base text-error mt-0.5">${q.english}</div>`;
            q.wrongCount = (q.wrongCount || 0) + 1;
            this.saveState();
        }

        this.btnCheckQuiz.classList.add('hidden');
        this.btnNextQuiz.classList.remove('hidden');
    }

    nextQuizQuestion() {
        this.quizState.currentIndex++;
        if (this.quizState.currentIndex >= this.quizState.questions.length) {
            alert(`🎉 퀴즈가 종료되었습니다!\n최종 점수: ${this.quizState.score} / ${this.quizState.questions.length}`);
            this.exitQuiz();
        } else {
            this.renderQuizQuestion();
        }
    }

    /* Speech Synthesis */
    speakText(text, customRate = null) {
        if (!('speechSynthesis' in window)) {
            this.showToast('이 브라우저는 음성 합성(TTS)을 지원하지 않습니다.', 'warning');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = customRate !== null ? customRate : (this.ttsRate || 1.0);
        window.speechSynthesis.speak(utterance);
    }

    /* Zero-Friction Quick Batch Text Parser */
    handleQuickBatchParse() {
        const rawText = this.inputQuickBatchText ? this.inputQuickBatchText.value.trim() : '';
        if (!rawText) {
            alert('파싱할 텍스트를 입력해주세요.');
            return;
        }

        const targetDeckId = this.selectQuickDeck ? this.selectQuickDeck.value : 'deck_default';
        const category = this.selectQuickCategory ? this.selectQuickCategory.value : '일상 회화';

        // Split lines and clean
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const parsedPairs = [];

        lines.forEach(line => {
            // Remove leading numbering like "1. ", "1) ", "- ", "• "
            let cleaned = line.replace(/^(\d+[\.\)]|\-|\*|\•)\s*/, '').trim();
            if (!cleaned) return;

            // Pattern A: "English - Korean" or "English / Korean" or "English : Korean"
            const delimiterMatch = cleaned.match(/^([A-Za-z0-9\s,\.\?'"!–—;]+?)\s*([-–—\/|:]|\t)\s*(.+)$/);
            if (delimiterMatch) {
                const eng = delimiterMatch[1].trim();
                const kor = delimiterMatch[3].trim();
                if (eng.length > 2) {
                    parsedPairs.push({ english: eng, korean: kor });
                    return;
                }
            }

            // Pattern B: Korean enclosed in parentheses "English sentence (한국어 뜻)"
            const parenMatch = cleaned.match(/^([A-Za-z0-9\s,\.\?'"!–—;]+?)\s*[\(\[](.*?[가-힣]+.*?)[\)\]]$/);
            if (parenMatch) {
                const eng = parenMatch[1].trim();
                const kor = parenMatch[2].trim();
                if (eng.length > 2) {
                    parsedPairs.push({ english: eng, korean: kor });
                    return;
                }
            }

            // Pattern C: English and Korean mixed line
            if (/[a-zA-Z]{3,}/.test(cleaned)) {
                const korPartMatch = cleaned.match(/[가-힣\s,\.!?~]+/);
                const engPartMatch = cleaned.match(/[a-zA-Z\s,\.!?']+/);

                if (korPartMatch && engPartMatch && engPartMatch[0].trim().length > 3) {
                    parsedPairs.push({
                        english: engPartMatch[0].trim(),
                        korean: korPartMatch[0].trim()
                    });
                } else {
                    parsedPairs.push({
                        english: cleaned,
                        korean: `[자동번역 필요] ${cleaned}`
                    });
                }
            }
        });

        if (parsedPairs.length === 0) {
            alert('인식 가능한 영어 문장을 찾지 못했습니다.');
            return;
        }

        let addedCount = 0;
        parsedPairs.forEach(pair => {
            const res = this.addSentence(pair.english, pair.korean, category, 'quick_text', targetDeckId);
            if (res) addedCount++;
        });

        if (this.inputQuickBatchText) this.inputQuickBatchText.value = '';
        this.saveState();
        this.renderAll();

        const deckObj = this.decks.find(d => d.id === targetDeckId);
        const deckName = deckObj ? deckObj.name : '기본 덱';

        if (this.quickParsePreview) {
            this.quickParsePreview.classList.remove('hidden');
            this.quickParsePreview.innerHTML = `
                <div class="flex items-center justify-between font-bold text-primary">
                    <span>🎉 총 ${addedCount}개 문장이 [${deckName}]에 등록되었습니다!</span>
                    <button onclick="this.parentElement.parentElement.classList.add('hidden')" class="text-on-surface-variant">&times;</button>
                </div>
            `;
        }

        this.showToast(`⚡ ${addedCount}개의 문장이 [${deckName}]에 즉시 추가되었습니다!`, 'success');
    }

    /* AI Recommendation Handler */
    async handleAiRecommendation() {
        const topic = this.aiCategorySelect.value;
        const apiKey = this.apiKeyInput.value.trim();

        this.aiResultList.innerHTML = '<p class="section-desc">AI 추천 문장을 불러오는 중...</p>';

        if (apiKey) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Provide 3 natural English sentences for learning "${topic}" with Korean translations. Return strictly as JSON array of objects with "english" and "korean" keys.`
                            }]
                        }]
                    })
                });
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const jsonMatch = text.match(/\[.*\]/s);
                if (jsonMatch) {
                    const items = JSON.parse(jsonMatch[0]);
                    this.renderAiResults(items, topic);
                    return;
                }
            } catch (err) {
                console.warn('API Error, falling back to preset:', err);
            }
        }

        const presets = AI_PRESETS[topic] || AI_PRESETS['원어민이 매일 쓰는 미드 단골 표현'];
        this.renderAiResults(presets, topic);
    }

    renderAiResults(items, topic) {
        this.aiResultList.innerHTML = '';
        const targetDeckId = this.selectAiTargetDeck ? this.selectAiTargetDeck.value : (this.activeDeckId !== 'all' ? this.activeDeckId : 'deck_default');
        const targetDeckObj = this.decks.find(d => d.id === targetDeckId);
        const deckDisplayName = targetDeckObj ? targetDeckObj.name : '선택된 덱';

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'result-item-card';
            el.innerHTML = `
                <div class="eng">${item.english}</div>
                <div class="kor">${item.korean}</div>
                <button class="btn btn-sm btn-primary btn-add-item"><i class="fa-solid fa-plus"></i> 추가</button>
            `;
            el.querySelector('.btn-add-item').addEventListener('click', (e) => {
                this.addSentence(item.english, item.korean, item.category || 'AI 추천', 'ai', targetDeckId);
                el.classList.add('saved-slide-out');
                setTimeout(() => {
                    el.remove();
                    const remaining = this.aiResultList.querySelectorAll('.result-item-card:not(.saved-slide-out)');
                    if (remaining.length === 0) {
                        this.renderScrapCompletionCard(items.length, deckDisplayName, targetDeckId, this.aiResultList);
                    }
                }, 350);
            });
            this.aiResultList.appendChild(el);
        });
    }

    /* ==========================================================================
       Smart Unified Bulk & YouTube / Document Scraping Implementation
       ========================================================================== */
    async handleSmartUnifiedBulk() {
        const val = this.unifiedBulkInput ? this.unifiedBulkInput.value.trim() : '';
        if (!val) {
            this.showToast('유튜브 링크 또는 여러 줄 문장을 입력하거나 파일을 첨부해 주세요.', 'warning');
            this.unifiedBulkInput?.focus();
            return;
        }

        if (this.youtubeUrlInput) this.youtubeUrlInput.value = val;
        await this.handleYoutubeScraping();
    }

    async handleYoutubeScraping() {
        const input = this.youtubeUrlInput.value.trim();
        if (!input) {
            alert('유튜브 영상 주소, 스프레드시트 복사 내용 또는 영어 텍스트 단락을 입력해 주세요.');
            return;
        }

        const isYoutubeUrl = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(input);

        // Check if user pasted spreadsheet table (contains tabs \t)
        const isSpreadsheetTable = input.includes('\t') && input.includes('\n');

        this.youtubeResultList.innerHTML = `
            <div class="scrap-loading">
                <i class="fa-solid fa-circle-notch spinner"></i>
                <p>${isYoutubeUrl ? '유튜브 자막 및 한글 번역을 추출하는 중입니다...' : (isSpreadsheetTable ? '스프레드시트 표 데이터를 분석하는 중입니다...' : '텍스트에서 영어 문장을 추출하고 번역하는 중입니다...')}</p>
            </div>
        `;
        this.btnScrapYoutube.disabled = true;

        try {
            if (isYoutubeUrl) {
                // Call Python Backend (/api/youtube)
                try {
                    const res = await fetch(`/api/youtube?url=${encodeURIComponent(input)}`);
                    if (!res.ok) throw new Error(`Server returned ${res.status}`);
                    const data = await res.json();
                    if (data && data.length > 0) {
                        this.renderScrapedResults(data, '유튜브 자막');
                        return;
                    } else {
                        throw new Error('No transcript returned');
                    }
                } catch (netErr) {
                    console.warn('Backend API unavailable or error:', netErr);
                    this.youtubeResultList.innerHTML = `
                        <div class="scrap-loading" style="color: var(--danger-color);">
                            <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.8rem; margin-bottom: 8px;"></i>
                            <p><strong>유튜브 스크랩 서버에 연결할 수 없습니다.</strong></p>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                                터미널에서 <code>python main.py</code> 서버가 실행 중인지 확인해주세요.<br>
                                (참고: 유튜브 영상에 영어 자막(CC)이 제공되어야 추출이 가능합니다)
                            </p>
                        </div>
                    `;
                    return;
                }
            } else if (isSpreadsheetTable) {
                // Parse TSV (Google Sheets / Excel copy-paste)
                const rows = input.split(/\r?\n/).map(line => line.split('\t').map(c => c.trim())).filter(r => r.some(c => c));
                const results = await this.extractSentencesFromRows(rows, '스프레드시트');
                if (results.length > 0) {
                    this.renderScrapedResults(results, '스프레드시트 붙여넣기');
                } else {
                    alert('스프레드시트 텍스트에서 영어 문장을 찾지 못했습니다.');
                    this.youtubeResultList.innerHTML = '';
                }
            } else {
                // Direct Text Paragraph Sentence Splitting
                const sentences = this.splitSentences(input);
                if (sentences.length === 0) {
                    alert('입력된 텍스트에서 영어 문장을 찾지 못했습니다.');
                    this.youtubeResultList.innerHTML = '';
                    return;
                }

                const results = [];
                for (const s of sentences.slice(0, 30)) {
                    const kor = await this.autoTranslateText(s);
                    results.push({ english: s, korean: kor });
                }
                this.renderScrapedResults(results, '입력 텍스트');
            }
        } catch (err) {
            console.error('Scraping error:', err);
            this.youtubeResultList.innerHTML = `<p class="section-desc" style="color:var(--danger-color);">오류가 발생했습니다: ${err.message}</p>`;
        } finally {
            this.btnScrapYoutube.disabled = false;
        }
    }

    /* File Upload Handler (Excel, CSV, TSV, PDF, TXT, JSON, EPUB) */
    async handleFileUpload(file) {
        if (!file) return;

        this.youtubeResultList.innerHTML = `
            <div class="scrap-loading">
                <i class="fa-solid fa-circle-notch spinner"></i>
                <p>파일 [${file.name}]을 분석하여 데이터를 불러오는 중입니다...</p>
            </div>
        `;

        const ext = file.name.split('.').pop().toLowerCase();

        try {
            if (ext === 'xlsx' || ext === 'xls') {
                if (!window.XLSX) {
                    alert('엑셀 라이브러리(SheetJS)가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
                    this.youtubeResultList.innerHTML = '';
                    return;
                }
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                const results = await this.extractSentencesFromRows(rows, '엑셀');
                if (results.length > 0) {
                    this.renderScrapedResults(results, `엑셀 (${file.name})`);
                } else {
                    alert('엑셀 파일에서 유효한 영어 문장 데이터를 찾을 수 없습니다.');
                    this.youtubeResultList.innerHTML = '';
                }
            } else if (ext === 'csv' || ext === 'tsv') {
                const text = await file.text();
                const delimiter = ext === 'tsv' ? '\t' : (text.includes('\t') && !text.includes(',') ? '\t' : ',');
                const rows = this.parseCSV(text, delimiter);
                const results = await this.extractSentencesFromRows(rows, 'CSV');
                if (results.length > 0) {
                    this.renderScrapedResults(results, `CSV (${file.name})`);
                } else {
                    alert('CSV 파일에서 유효한 영어 문장 데이터를 찾을 수 없습니다.');
                    this.youtubeResultList.innerHTML = '';
                }
            } else if (ext === 'json') {
                const text = await file.text();
                const data = JSON.parse(text);
                let items = [];
                if (Array.isArray(data)) {
                    items = data.map(d => ({
                        english: d.english || d.eng || d.sentence || d.text || '',
                        korean: d.korean || d.kor || d.meaning || d.translation || '',
                        category: d.category || d.cat || 'JSON'
                    })).filter(d => d.english);
                }
                if (items.length > 0) {
                    this.renderScrapedResults(items, `JSON (${file.name})`);
                } else {
                    alert('JSON 파일에서 유효한 영어 문장 목록을 찾을 수 없습니다.');
                    this.youtubeResultList.innerHTML = '';
                }
            } else if (ext === 'txt') {
                const text = await file.text();
                const sentences = this.splitSentences(text);
                if (sentences.length === 0) {
                    alert('텍스트 파일에서 영어 문장을 찾지 못했습니다.');
                    this.youtubeResultList.innerHTML = '';
                    return;
                }
                const results = [];
                for (const s of sentences.slice(0, 50)) {
                    const kor = await this.autoTranslateText(s);
                    results.push({ english: s, korean: kor });
                }
                this.renderScrapedResults(results, `TXT (${file.name})`);
            } else if (ext === 'pdf') {
                if (!window.pdfjsLib) {
                    alert('PDF 파싱 라이브러리가 로드되지 않았습니다.');
                    return;
                }
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                const maxPages = Math.min(pdf.numPages, 15); // Parse up to 15 pages

                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += ' ' + pageText;
                }

                const sentences = this.splitSentences(fullText);
                if (sentences.length === 0) {
                    alert('PDF 파일에서 영어 문장을 추출하지 못했습니다.');
                    this.youtubeResultList.innerHTML = '';
                    return;
                }
                const results = [];
                for (const s of sentences.slice(0, 40)) {
                    const kor = await this.autoTranslateText(s);
                    results.push({ english: s, korean: kor });
                }
                this.renderScrapedResults(results, `PDF (${file.name})`);
            } else if (ext === 'epub') {
                const text = await file.text();
                const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
                const sentences = this.splitSentences(cleanText);
                if (sentences.length === 0) {
                    alert('EPUB 파일에서 영어 문장을 추출하지 못했습니다.');
                    this.youtubeResultList.innerHTML = '';
                    return;
                }
                const results = [];
                for (const s of sentences.slice(0, 40)) {
                    const kor = await this.autoTranslateText(s);
                    results.push({ english: s, korean: kor });
                }
                this.renderScrapedResults(results, `EPUB (${file.name})`);
            } else {
                alert('지원되지 않는 파일 형식입니다. (엑셀, CSV, PDF, TXT, JSON, EPUB 지원)');
                this.youtubeResultList.innerHTML = '';
            }
        } catch (err) {
            console.error('File parsing error:', err);
            alert(`파일 분석 중 오류가 발생했습니다: ${err.message}`);
            this.youtubeResultList.innerHTML = '';
        }
    }

    /* Helper: Parse 2D Table Rows (from Excel, CSV, Google Sheets) */
    async extractSentencesFromRows(rows, defaultCategory = '스프레드시트') {
        if (!rows || rows.length === 0) return [];

        let engIdx = -1;
        let korIdx = -1;
        let catIdx = -1;
        let startRow = 0;

        // Check if first row is header
        const headerRow = rows[0].map(c => String(c).toLowerCase().trim());
        headerRow.forEach((col, idx) => {
            if (/english|eng|sentence|문장|영어|원문/.test(col)) engIdx = idx;
            if (/korean|kor|meaning|translation|한글|뜻|해석|의미|번역/.test(col)) korIdx = idx;
            if (/category|cat|분류|주제|카테고리/.test(col)) catIdx = idx;
        });

        if (engIdx !== -1) {
            startRow = 1; // Header found, skip 1st row
        } else {
            // Auto-detect columns by analyzing values
            let maxEngCount = -1;
            let maxKorCount = -1;

            for (let c = 0; c < (rows[0] ? rows[0].length : 0); c++) {
                let engScore = 0;
                let korScore = 0;
                for (let r = 0; r < Math.min(rows.length, 10); r++) {
                    const val = String(rows[r][c] || '');
                    if (/[a-zA-Z]{3,}/.test(val)) engScore++;
                    if (/[\u3131-\uD79D]/.test(val)) korScore++;
                }
                if (engScore > maxEngCount && engScore > 0) {
                    maxEngCount = engScore;
                    engIdx = c;
                }
                if (korScore > maxKorCount && korScore > 0) {
                    maxKorCount = korScore;
                    korIdx = c;
                }
            }

            if (engIdx === -1) engIdx = 0;
            if (korIdx === -1 && rows[0] && rows[0].length > 1 && engIdx !== 1) korIdx = 1;
        }

        const items = [];
        const seenKeys = new Set();

        for (let r = startRow; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0) continue;

            let eng = String(row[engIdx] || '').trim();
            let kor = korIdx !== -1 ? String(row[korIdx] || '').trim() : '';
            const cat = catIdx !== -1 && row[catIdx] ? String(row[catIdx]).trim() : defaultCategory;

            // Remove noise quotes and extra spaces
            eng = eng.replace(/^["']|["']$/g, '').trim();
            kor = kor.replace(/^["']|["']$/g, '').trim();

            // Case 1: Both English and Korean are present
            if (eng && kor) {
                const normKey = eng.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normKey && !seenKeys.has(normKey) && eng.length >= 3) {
                    seenKeys.add(normKey);
                    items.push({ english: eng, korean: kor, category: cat });
                }
            }
            // Case 2: Only English is present -> translate to Korean
            else if (eng && /[a-zA-Z]{2,}/.test(eng) && eng.length >= 3) {
                const normKey = eng.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normKey && !seenKeys.has(normKey)) {
                    seenKeys.add(normKey);
                    const translatedKor = await this.autoTranslateText(eng, 'en', 'ko');
                    items.push({ english: eng, korean: translatedKor, category: cat });
                }
            }
            // Case 3: Only Korean is present -> translate to English
            else if (kor && /[\u3131-\uD79D]/.test(kor) && kor.length >= 2) {
                const normKey = kor.replace(/[^가-힣a-z0-9]/g, '');
                if (normKey && !seenKeys.has(normKey)) {
                    seenKeys.add(normKey);
                    const translatedEng = await this.autoTranslateText(kor, 'ko', 'en');
                    if (translatedEng) {
                        items.push({ english: translatedEng, korean: kor, category: cat });
                    }
                }
            }
        }
        return items;
    }

    /* Helper: Standard CSV Parser with Quotes Handling */
    parseCSV(text, delimiter = ',') {
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let insideQuote = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (insideQuote && nextChar === '"') {
                    currentCell += '"';
                    i++; // skip escaped quote
                } else {
                    insideQuote = !insideQuote;
                }
            } else if (char === delimiter && !insideQuote) {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if ((char === '\r' || char === '\n') && !insideQuote) {
                if (char === '\r' && nextChar === '\n') i++; // CRLF
                currentRow.push(currentCell.trim());
                if (currentRow.some(c => c)) rows.push(currentRow);
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c)) rows.push(currentRow);
        }
        return rows;
    }

    /* Helper: Split Text into English Sentences (Filtered & Deduplicated) */
    splitSentences(text) {
        if (!text) return [];
        // Normalize whitespaces & strip noise tags
        const clean = text
            .replace(/\[.*?\]|\(.*?\)/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ');

        const raw = clean.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [];
        const valid = [];
        const seen = new Set();

        raw.forEach(s => {
            const trimmed = s.trim();
            // Filter noise, check word count and English presence
            const words = trimmed.split(/\s+/);
            if (/[a-zA-Z]{2,}/.test(trimmed) && trimmed.length >= 10 && words.length >= 2 && !/^[\d\s\W]+$/.test(trimmed)) {
                const normKey = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!seen.has(normKey)) {
                    seen.add(normKey);
                    valid.push(trimmed);
                }
            }
        });
        return valid;
    }

    /* Helper: Prepare target deck for scraping / extraction */
    prepareScrapTargetDeck(sourceName) {
        if (this.chkScrapNewDeck && this.chkScrapNewDeck.checked) {
            const rawName = this.inputScrapNewDeckName ? this.inputScrapNewDeckName.value.trim() : '';
            const newDeckName = rawName || `${sourceName} (${getTodayString()})`;

            let targetDeck = this.decks.find(d => d.name.toLowerCase() === newDeckName.toLowerCase());
            if (!targetDeck) {
                targetDeck = this.createDeck(newDeckName, `${sourceName} 추출 단어장`);
            }
            if (targetDeck) {
                this.activeDeckId = targetDeck.id;
                this.updateDeckUI();
                if (this.selectScrapTargetDeck) this.selectScrapTargetDeck.value = targetDeck.id;
                return targetDeck.id;
            }
        }
        return (this.selectScrapTargetDeck && this.selectScrapTargetDeck.value)
            ? this.selectScrapTargetDeck.value
            : (this.activeDeckId !== 'all' ? this.activeDeckId : 'deck_default');
    }

    /* Render Scraped Sentences with Bulk Import Controls */
    renderScrapedResults(items, sourceName, initialDeckId = null) {
        this.youtubeResultList.innerHTML = '';

        if (!items || items.length === 0) {
            this.youtubeResultList.innerHTML = '<p class="section-desc">추출된 문장이 없습니다.</p>';
            return;
        }

        // Determine target deck (creates and selects new deck if "새 덱으로 저장" is checked)
        const currentTargetDeckId = initialDeckId || this.prepareScrapTargetDeck(sourceName);

        // Build Deck Options HTML for direct deck switching in results header
        let deckOptsHtml = '';
        this.decks.forEach(d => {
            const isSel = d.id === currentTargetDeckId;
            deckOptsHtml += `<option value="${d.id}" ${isSel ? 'selected' : ''}>${this.escapeHtml(d.name)}</option>`;
        });

        // Header Action Bar
        const actionBar = document.createElement('div');
        actionBar.className = 'bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3';
        actionBar.innerHTML = `
            <div class="flex flex-col gap-1.5">
                <label class="cursor-pointer flex items-center gap-2 text-sm font-bold text-on-surface">
                    <input type="checkbox" id="bulkSelectAll" checked class="w-4 h-4 rounded text-primary border-outline-variant focus:ring-primary">
                    <span><strong>${sourceName}</strong>: 총 <span class="bulk-count text-primary">${items.length}</span>개 문장 추출됨</span>
                </label>
                <div class="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span>📁 저장 덱:</span>
                    <select id="resultTargetDeckSelect" class="bg-surface border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:ring-2 focus:ring-primary">
                        ${deckOptsHtml}
                    </select>
                </div>
            </div>
            <div class="bulk-btns w-full sm:w-auto">
                <button id="btnBulkAdd" class="w-full sm:w-auto px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">save</span> 선택 문장 일괄 저장
                </button>
            </div>
        `;
        this.youtubeResultList.appendChild(actionBar);

        const listContainer = document.createElement('div');
        listContainer.className = 'scraped-items-wrapper flex flex-col gap-2.5';

        const resultTargetDeckSelect = actionBar.querySelector('#resultTargetDeckSelect');

        items.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = 'bg-surface rounded-2xl p-4 border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between transition-all hover:border-primary/40 relative overflow-hidden';
            el.innerHTML = `
                <div class="flex gap-3 items-start sm:items-center flex-grow">
                    <input type="checkbox" class="item-checkbox mt-1 sm:mt-0 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer flex-shrink-0" data-idx="${idx}" checked>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">#${idx + 1}</span>
                            <p class="font-bold text-base text-on-surface leading-snug">${item.english}</p>
                        </div>
                        <p class="text-xs text-on-surface-variant">${item.korean || '[번역 없음]'}</p>
                    </div>
                </div>
                <button class="btn-add-single w-full sm:w-auto px-3.5 py-1.5 bg-surface-container hover:bg-primary hover:text-on-primary text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 flex-shrink-0 whitespace-nowrap" data-idx="${idx}">
                    <span class="material-symbols-outlined text-[16px]">add</span> 추가
                </button>
            `;

            // Single Add
            el.querySelector('.btn-add-single').addEventListener('click', (e) => {
                e.stopPropagation();
                const chosenDeckId = resultTargetDeckSelect ? resultTargetDeckSelect.value : currentTargetDeckId;
                const targetDeckObj = this.decks.find(d => d.id === chosenDeckId);
                const deckDisplayName = targetDeckObj ? targetDeckObj.name : '선택된 덱';

                this.addSentence(item.english, item.korean || item.english, '스크랩', 'youtube', chosenDeckId);

                el.classList.add('saved-slide-out');
                setTimeout(() => {
                    el.remove();
                    const remainingCards = listContainer.querySelectorAll('.result-item-card:not(.saved-slide-out)');
                    const countBadge = actionBar.querySelector('.bulk-count');
                    if (countBadge) countBadge.textContent = remainingCards.length;

                    if (remainingCards.length === 0) {
                        this.renderScrapCompletionCard(items.length, deckDisplayName, chosenDeckId, this.youtubeResultList);
                    }
                }, 350);
            });

            // Checkbox Toggle
            const chk = el.querySelector('.item-checkbox');
            chk.addEventListener('change', () => {
                if (chk.checked) el.classList.add('selected');
                else el.classList.remove('selected');
            });

            listContainer.appendChild(el);
        });

        this.youtubeResultList.appendChild(listContainer);

        // Select All Handler
        const selectAllChk = actionBar.querySelector('#bulkSelectAll');
        selectAllChk.addEventListener('change', () => {
            const checkboxes = listContainer.querySelectorAll('.item-checkbox');
            checkboxes.forEach(c => {
                c.checked = selectAllChk.checked;
                const card = c.closest('.result-item-card');
                if (selectAllChk.checked) card.classList.add('selected');
                else card.classList.remove('selected');
            });
        });

        // Bulk Add Handler
        const btnBulkAdd = actionBar.querySelector('#btnBulkAdd');
        btnBulkAdd.addEventListener('click', () => {
            const checkboxes = listContainer.querySelectorAll('.item-checkbox:checked');
            if (checkboxes.length === 0) {
                alert('추가할 문장을 1개 이상 선택해주세요.');
                return;
            }

            const chosenDeckId = resultTargetDeckSelect ? resultTargetDeckSelect.value : currentTargetDeckId;
            const targetDeckObj = this.decks.find(d => d.id === chosenDeckId);
            const deckDisplayName = targetDeckObj ? targetDeckObj.name : '선택된 덱';

            let addedCount = 0;
            checkboxes.forEach(c => {
                const idx = parseInt(c.dataset.idx, 10);
                const item = items[idx];
                if (item) {
                    this.addSentence(item.english, item.korean || item.english, '스크랩', 'youtube', chosenDeckId);
                    addedCount++;
                }
            });

            this.switchActiveDeck(chosenDeckId);
            this.renderAll();

            // Transition cleanly into celebration completion card!
            this.renderScrapCompletionCard(addedCount, deckDisplayName, chosenDeckId, this.youtubeResultList);
        });
    }

    /* Celebration Completion Card after saving scraped sentences */
    renderScrapCompletionCard(addedCount, deckDisplayName, chosenDeckId, containerEl = this.youtubeResultList) {
        if (!containerEl) return;
        containerEl.innerHTML = `
            <div class="bg-surface rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-md flex flex-col items-center text-center gap-4 animate-fade-in-up">
                <div class="w-16 h-16 rounded-full bg-secondary-container text-secondary flex items-center justify-center shadow-sm">
                    <span class="material-symbols-outlined text-3xl font-bold" style="font-variation-settings: 'FILL' 1;">verified</span>
                </div>
                <div class="space-y-1">
                    <h4 class="font-extrabold text-xl text-on-surface">문장 저장 완료!</h4>
                    <p class="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        총 <strong class="text-primary font-bold">${addedCount}개</strong>의 문장이 <span class="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">[${this.escapeHtml(deckDisplayName)}]</span> 덱에 성공적으로 저장되었습니다.
                    </p>
                </div>
                <div class="w-full flex flex-col gap-2.5 pt-2 max-w-xs">
                    <button class="btn-start-study w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                        <span class="material-symbols-outlined text-[18px]">play_arrow</span> 방금 저장한 덱으로 학습 시작
                    </button>
                    <button class="btn-view-list w-full py-2.5 bg-surface text-primary border border-primary/40 rounded-xl font-bold text-xs hover:bg-primary/5 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">format_list_bulleted</span> 문장 목록 확인
                    </button>
                    <button class="btn-reset-scrap w-full py-2 text-xs text-on-surface-variant hover:underline font-medium">
                        새 문장 가져오기
                    </button>
                </div>
            </div>
        `;

        const btnStartStudy = containerEl.querySelector('.btn-start-study');
        const btnViewList = containerEl.querySelector('.btn-view-list');
        const btnResetScrap = containerEl.querySelector('.btn-reset-scrap');

        btnStartStudy?.addEventListener('click', () => {
            this.switchActiveDeck(chosenDeckId);
            this.switchTab('tab-cards');
        });

        btnViewList?.addEventListener('click', () => {
            this.switchActiveDeck(chosenDeckId);
            this.switchTab('tab-list');
        });

        btnResetScrap?.addEventListener('click', () => {
            if (this.youtubeUrlInput) this.youtubeUrlInput.value = '';
            containerEl.innerHTML = '';
        });
    }

    /* Metacognitive Learning Report Modal Methods */
    openShareModal() {
        if (!this.shareModal) return;

        // 1. Set Date String
        const todayStr = getTodayString().replace(/-/g, '.');
        if (this.shareCardDate) this.shareCardDate.textContent = todayStr;

        // 2. Set Deck Name
        let currentDeckName = '전체 문장';
        if (this.activeDeckId && this.activeDeckId !== 'all' && this.decks) {
            const d = this.decks.find(x => x.id === this.activeDeckId);
            if (d) currentDeckName = d.name;
        }
        if (this.shareDeckNameStr) this.shareDeckNameStr.textContent = currentDeckName;

        // 3. Set Streak
        const streakDays = Math.max(1, parseInt(localStorage.getItem('engcard_streak') || '1', 10));
        if (this.shareStreakStr) this.shareStreakStr.textContent = streakDays;

        // 4. Collect Sentences Studied Today or Active Sentences
        let todaySentences = this.sentences.filter(s => s.lastStudiedAt === getTodayString());
        if (todaySentences.length === 0) {
            todaySentences = this.getActiveSentences ? this.getActiveSentences() : this.sentences;
        }

        const totalCount = todaySentences.length;
        const knownSentences = todaySentences.filter(s => s.memorized);
        const reviewSentences = todaySentences.filter(s => !s.memorized || (s.wrongCount && s.wrongCount > 0));

        const knownCount = knownSentences.length;
        const reviewCount = Math.max(0, totalCount - knownCount);
        const knownPct = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
        const reviewPct = totalCount > 0 ? (100 - knownPct) : 0;

        if (this.shareStudiedCountStr) this.shareStudiedCountStr.textContent = totalCount;
        if (this.shareKnownPctStr) this.shareKnownPctStr.textContent = `${knownPct}%`;
        if (this.shareReviewPctStr) this.shareReviewPctStr.textContent = `${reviewPct}%`;

        const knownBadge = document.getElementById('shareKnownCountBadge');
        if (knownBadge) knownBadge.textContent = `${knownCount}개 (${knownPct}%)`;
        const reviewBadge = document.getElementById('shareReviewCountBadge');
        if (reviewBadge) reviewBadge.textContent = `${reviewCount}개 (${reviewPct}%)`;

        if (this.shareMetaFillKnown) this.shareMetaFillKnown.style.width = `${knownPct}%`;
        if (this.shareMetaFillReview) this.shareMetaFillReview.style.width = `${reviewPct}%`;

        // 5. Render Curated Highlight Sentences (2~3 Representative Sentences)
        if (this.shareCardSentences) {
            this.shareCardSentences.innerHTML = '';

            if (totalCount === 0) {
                this.shareCardSentences.innerHTML = `
                    <div class="share-sentence-item">
                        <div class="share-eng">No study records yet today.</div>
                        <div class="share-kor">오늘 학습한 문장 기록이 아직 없습니다.</div>
                    </div>`;
            } else {
                let pickReview = [];
                let pickKnown = [];

                if (reviewSentences.length > 0 && knownSentences.length > 0) {
                    pickReview = reviewSentences.slice(0, 1);
                    pickKnown = knownSentences.slice(0, 2);
                } else if (reviewSentences.length > 0) {
                    pickReview = reviewSentences.slice(0, 2);
                } else {
                    pickKnown = knownSentences.slice(0, 3);
                }

                if (pickReview.length > 0) {
                    const revHeader = document.createElement('div');
                    revHeader.className = 'share-section-label review-label';
                    revHeader.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> 오늘 집중 공략한 약점 문장`;
                    this.shareCardSentences.appendChild(revHeader);

                    pickReview.forEach((s, idx) => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'share-sentence-item item-review';
                        itemDiv.innerHTML = `
                            <div class="share-eng">${idx + 1}. ${this.escapeHtml(s.english)}</div>
                            <div class="share-kor">${this.escapeHtml(s.korean)}</div>
                        `;
                        this.shareCardSentences.appendChild(itemDiv);
                    });
                }

                if (pickKnown.length > 0) {
                    const knowHeader = document.createElement('div');
                    knowHeader.className = 'share-section-label master-label';
                    knowHeader.innerHTML = `<i class="fa-solid fa-star"></i> 오늘 완벽 마스터 문장`;
                    this.shareCardSentences.appendChild(knowHeader);

                    pickKnown.forEach((s, idx) => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'share-sentence-item item-master';
                        itemDiv.innerHTML = `
                            <div class="share-eng">${idx + 1}. ${this.escapeHtml(s.english)}</div>
                            <div class="share-kor">${this.escapeHtml(s.korean)}</div>
                        `;
                        this.shareCardSentences.appendChild(itemDiv);
                    });
                }

                const displayedCount = pickReview.length + pickKnown.length;
                if (totalCount > displayedCount) {
                    const morePill = document.createElement('div');
                    morePill.className = 'share-more-pill';
                    morePill.textContent = `✨ 외 ${totalCount - displayedCount}개 문장 학습 완료 (+${totalCount - displayedCount} more)`;
                    this.shareCardSentences.appendChild(morePill);
                }
            }
        }

        // 6. Generate Dynamic 1-Line Praise & Encouragement Message
        let praiseMsg = "";
        if (totalCount >= 50) {
            praiseMsg = `오늘 ${totalCount}개 문장 정복! 지치지 않는 열정이 정말 멋집니다. 🏆🔥`;
        } else if (reviewCount > 0 && knownCount > 0) {
            praiseMsg = `약점 문장까지 끝까지 파고들어 내 것으로 만든 멋진 하루! 👏🌟`;
        } else if (streakDays >= 7) {
            praiseMsg = `${streakDays}일 연속 학습 달성! 매일 성장하는 당신이 자랑스럽습니다. ⚡💪`;
        } else if (knownPct >= 80 && totalCount > 0) {
            praiseMsg = `달성률 ${knownPct}% 완벽 마스터! 오늘도 최고였어요. 🌟✨`;
        } else {
            praiseMsg = `오늘도 한 걸음 더 성장한 당신을 진심으로 응원합니다! 💪💖`;
        }

        if (this.sharePraiseText) {
            this.sharePraiseText.textContent = praiseMsg;
        }

        this.pauseSpeedTriage();
        try { window.history.pushState({ modalOpen: true }, ''); } catch (e) {}
        this.shareModal.classList.remove('hidden');
    }

    closeShareModal() {
        if (this.shareModal) this.shareModal.classList.add('hidden');
        this.resumeSpeedTriage();
    }

    async downloadShareImage() {
        const cardTarget = document.getElementById('shareCardTarget');
        if (!cardTarget) return;

        if (typeof html2canvas === 'undefined') {
            this.showToast('이미지 생성 라이브러리를 로드 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
            return;
        }

        try {
            this.showToast('📸 인증 이미지를 생성 중입니다...', 'info');
            const canvas = await html2canvas(cardTarget, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
                logging: false
            });

            const dateStr = getTodayString().replace(/-/g, '');
            const imageURI = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `TUK_StudyReport_${dateStr}.png`;
            link.href = imageURI;
            link.click();
            this.showToast('💾 인증 이미지가 다운로드되었습니다!', 'success');
        } catch (err) {
            console.error('Image export failed:', err);
            this.showToast('이미지 저장 중 오류가 발생했습니다: ' + err.message, 'error');
        }
    }

    copyShareText() {
        const todayStr = getTodayString().replace(/-/g, '.');
        let currentDeckName = '전체 문장';
        if (this.activeDeckId && this.activeDeckId !== 'all' && this.decks) {
            const d = this.decks.find(x => x.id === this.activeDeckId);
            if (d) currentDeckName = d.name;
        }

        let todaySentences = this.sentences.filter(s => s.lastStudiedAt === getTodayString());
        if (todaySentences.length === 0) {
            todaySentences = this.getActiveSentences ? this.getActiveSentences() : this.sentences;
        }

        const totalCount = todaySentences.length;
        const knownSentences = todaySentences.filter(s => s.memorized);
        const reviewSentences = todaySentences.filter(s => !s.memorized || (s.wrongCount && s.wrongCount > 0));

        const knownCount = knownSentences.length;
        const reviewCount = Math.max(0, totalCount - knownCount);
        const knownPct = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
        const reviewPct = totalCount > 0 ? (100 - knownPct) : 0;
        const streakDays = Math.max(1, parseInt(localStorage.getItem('engcard_streak') || '1', 10));

        let fullListText = '';
        todaySentences.forEach((s, idx) => {
            const statusMark = s.memorized ? '🟢' : '🟠';
            fullListText += `${idx + 1}. ${statusMark} ${s.english}\n   (${s.korean})\n`;
        });

        let praiseMsg = "";
        if (totalCount >= 50) {
            praiseMsg = `오늘 ${totalCount}개 문장 정복! 지치지 않는 열정이 정말 멋집니다. 🏆🔥`;
        } else if (reviewCount > 0 && knownCount > 0) {
            praiseMsg = `약점 문장까지 끝까지 파고들어 내 것으로 만든 멋진 하루! 👏🌟`;
        } else if (streakDays >= 7) {
            praiseMsg = `${streakDays}일 연속 학습 달성! 매일 성장하는 당신이 자랑스럽습니다. ⚡💪`;
        } else if (knownPct >= 80 && totalCount > 0) {
            praiseMsg = `달성률 ${knownPct}% 완벽 마스터! 오늘도 최고였어요. 🌟✨`;
        } else {
            praiseMsg = `오늘도 한 걸음 더 성장한 당신을 진심으로 응원합니다! 💪💖`;
        }

        const shareText = `⚡ [TUK] 오늘의 3초 즉시 인출 학습 리포트 (${todayStr})\n📁 학습 덱: ${currentDeckName}\n🎯 오늘 총 ${totalCount}개 문장 학습 (🔥 ${streakDays}일 연속)\n\n📊 [TUK 메타인지 분석]\n🟢 알았음(Unlock): ${knownCount}개 (${knownPct}%)\n🟠 복습필요(Keep): ${reviewCount}개 (${reviewPct}%)\n\n📝 [오늘 학습한 문장 목록] (총 ${totalCount}개)\n${fullListText}\n💌 [오늘의 응원]\n"${praiseMsg}"\n\n#TUK #툭영어 #TrainUnlockKeep #오공완 #공스타그램`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showToast('📋 학습 리포트 텍스트가 복사되었습니다!', 'success');
            }).catch(err => {
                alert('텍스트 복사 중 오류가 발생했습니다.');
            });
        } else {
            prompt('아래 텍스트를 복사하여 공유하세요:', shareText);
        }
    }

    async shareNative() {
        const cardTarget = document.getElementById('shareCardTarget');
        if (!cardTarget) return;

        if (typeof html2canvas === 'undefined') {
            this.showToast('이미지 생성 라이브러리를 로드 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
            return;
        }

        try {
            this.showToast('📸 인증 이미지를 준비 중입니다...', 'info');
            const canvas = await html2canvas(cardTarget, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
                logging: false
            });

            const todayStr = getTodayString().replace(/-/g, '.');
            const dateStr = getTodayString().replace(/-/g, '');
            const fileName = `TUK_StudyReport_${dateStr}.png`;

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    this.showToast('이미지 생성에 실패했습니다.', 'error');
                    return;
                }

                const file = new File([blob], fileName, { type: 'image/png' });
                const textPayload = `⚡ [TUK] 오늘의 영어 공부 인증 (${todayStr})\n#TUK #툭영어 #영어문장암기 #TrainUnlockKeep #오공완`;

                // 1. Mobile Web Share API with File (KakaoTalk, Instagram, AirDrop, Messages)
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: 'TUK 오늘의 학습 인증',
                            text: textPayload,
                            files: [file]
                        });
                        this.showToast('✨ 인증 이미지를 공유했습니다!', 'success');
                        return;
                    } catch (shareErr) {
                        if (shareErr.name === 'AbortError') return; // User canceled
                        console.log('Native share failed, falling back:', shareErr);
                    }
                }

                // 2. Desktop Clipboard Image Copy (Direct paste image with Ctrl+V)
                if (navigator.clipboard && window.ClipboardItem) {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        this.showToast('📋 인증 이미지가 클립보드에 복사되었습니다! (Ctrl+V로 카카오톡, 블로그 등에 바로 붙여넣기)', 'success');
                        return;
                    } catch (clipErr) {
                        console.log('Clipboard image copy failed, falling back to download:', clipErr);
                    }
                }

                // 3. Fallback: Direct Download
                const imageURI = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = fileName;
                link.href = imageURI;
                link.click();
                this.showToast('💾 인증 이미지가 다운로드되었습니다!', 'success');
            }, 'image/png');
        } catch (err) {
            console.error('Image share failed:', err);
            this.showToast('이미지 공유 중 오류가 발생했습니다: ' + err.message, 'error');
        }
    }

    /* ==========================================================================
       Deck Management Methods (CRUD, Switch, Move)
       ========================================================================== */
    openDeckModal() {
        this.pauseSpeedTriage();
        this.renderDeckModalList();
        try { window.history.pushState({ modalOpen: true }, ''); } catch (e) {}
        if (this.deckModal) this.deckModal.classList.remove('hidden');
    }

    closeDeckModal() {
        if (this.deckModal) this.deckModal.classList.add('hidden');
        this.resumeSpeedTriage();
    }

    createDeck(name, description = '') {
        const cleanName = (name || '').trim();
        if (!cleanName) {
            alert('덱 이름을 입력해주세요.');
            return null;
        }

        const newDeck = {
            id: 'deck_' + Date.now() + Math.random().toString(36).substr(2, 4),
            name: cleanName,
            description: description || '단어장',
            createdAt: getTodayString(),
            isDefault: false
        };

        this.decks.push(newDeck);
        this.activeDeckId = newDeck.id;
        this.saveState();
        this.renderDeckModalList();
        this.initDailySession(true);
        this.renderAll();
        return newDeck;
    }

    deleteDeck(deckId) {
        const targetDeck = this.decks.find(d => d.id === deckId);
        if (!targetDeck) return;
        if (targetDeck.isDefault || this.decks.length <= 1) {
            alert('기본 덱은 삭제할 수 없습니다.');
            return;
        }

        const deckSentences = this.sentences.filter(s => s.deckId === deckId);
        const moveCount = deckSentences.length;

        // Move sentences to default deck safely
        const defaultDeck = this.decks.find(d => d.isDefault) || this.decks[0];
        deckSentences.forEach(s => {
            s.deckId = defaultDeck.id;
        });

        this.decks = this.decks.filter(d => d.id !== deckId);
        if (this.activeDeckId === deckId) {
            this.activeDeckId = defaultDeck.id;
        }

        this.saveState();
        this.renderDeckModalList();
        this.initDailySession(true);
        this.renderAll();
        alert(`"${targetDeck.name}" 덱이 삭제되었습니다.\n(${moveCount}개의 문장은 "${defaultDeck.name}"으로 안전하게 보존되었습니다.)`);
    }

    renameDeck(deckId) {
        const targetDeck = this.decks.find(d => d.id === deckId);
        if (!targetDeck) return;
        const newName = prompt('변경할 덱 이름을 입력하세요:', targetDeck.name);
        if (newName && newName.trim()) {
            targetDeck.name = newName.trim();
            this.saveState();
            this.renderDeckModalList();
            this.renderAll();
        }
    }

    switchActiveDeck(deckId) {
        this.activeDeckId = deckId;
        this.saveState();
        this.closeDeckModal();
        this.initDailySession(true);
        this.renderAll();
    }

    renderDeckModalList() {
        if (!this.deckListContainer) return;
        this.deckListContainer.innerHTML = '';

        this.decks.forEach(deck => {
            const sentencesInDeck = this.sentences.filter(s => s.deckId === deck.id);
            const memorizedCount = sentencesInDeck.filter(s => s.memorized).length;
            const totalCount = sentencesInDeck.length;
            const percent = totalCount > 0 ? Math.round((memorizedCount / totalCount) * 100) : 0;
            const isActive = this.activeDeckId === deck.id;

            const highestMilestone = (deck.achievedMilestones && deck.achievedMilestones.length > 0)
                ? Math.max(...deck.achievedMilestones)
                : (percent >= 100 ? 100 : (percent >= 75 ? 75 : (percent >= 50 ? 50 : (percent >= 25 ? 25 : 0))));

            let tierBadgeHtml = '';
            if (highestMilestone >= 100) {
                tierBadgeHtml = '<span class="deck-milestone-tag tier-100">👑 완독</span>';
            } else if (highestMilestone >= 75) {
                tierBadgeHtml = '<span class="deck-milestone-tag tier-75">🥇 75%</span>';
            } else if (highestMilestone >= 50) {
                tierBadgeHtml = '<span class="deck-milestone-tag tier-50">🥈 50%</span>';
            } else if (highestMilestone >= 25) {
                tierBadgeHtml = '<span class="deck-milestone-tag tier-25">🥉 25%</span>';
            }

            const card = document.createElement('div');
            card.className = `deck-item-card ${isActive ? 'active-deck' : ''}`;

            const actionsHtml = deck.isDefault
                ? `<button class="btn-rename-deck p-1 text-on-surface-variant hover:text-primary rounded" title="이름 변경"><span class="material-symbols-outlined text-[16px]">edit</span></button>`
                : `
                    <button class="btn-rename-deck p-1 text-on-surface-variant hover:text-primary rounded" title="이름 변경"><span class="material-symbols-outlined text-[16px]">edit</span></button>
                    <button class="btn-delete-deck p-1 text-error/70 hover:text-error rounded" title="덱 삭제"><span class="material-symbols-outlined text-[16px]">delete</span></button>
                `;

            card.innerHTML = `
                <div class="flex justify-between items-center mb-1.5">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-[20px]" style="font-variation-settings: 'FILL' 1;">folder</span>
                        <strong class="text-sm text-on-surface">${this.escapeHtml(deck.name)}</strong>
                        ${tierBadgeHtml}
                        ${isActive ? '<span class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">학습 중</span>' : ''}
                    </div>
                    <div class="flex items-center gap-1">
                        ${actionsHtml}
                    </div>
                </div>
                <div class="flex justify-between items-center text-xs text-on-surface-variant mb-1">
                    <span>${totalCount}개 문장 (${memorizedCount}개 암기)</span>
                    <strong class="text-primary">${percent}%</strong>
                </div>
                <div class="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style="width: ${percent}%;"></div>
                </div>
            `;

            // Click card body to switch deck
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                this.switchActiveDeck(deck.id);
            });

            const renameBtn = card.querySelector('.btn-rename-deck');
            renameBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.renameDeck(deck.id);
            });

            const deleteBtn = card.querySelector('.btn-delete-deck');
            deleteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteDeck(deck.id);
            });

            this.deckListContainer.appendChild(card);
        });
    }

    /* Milestone Rewards & Celebration Engine */
    checkDeckMilestones(deckId) {
        if (!deckId || deckId === 'all') return;
        const targetDeck = this.decks.find(d => d.id === deckId);
        if (!targetDeck) return;

        const deckSentences = this.sentences.filter(s => s.deckId === deckId);
        const total = deckSentences.length;
        if (total < 4) return; // Only trigger for decks with 4+ sentences

        const memorized = deckSentences.filter(s => s.memorized).length;
        const currentPct = Math.round((memorized / total) * 100);

        targetDeck.achievedMilestones = targetDeck.achievedMilestones || [];

        const milestones = [25, 50, 75, 100];
        for (const milestone of milestones) {
            if (currentPct >= milestone && !targetDeck.achievedMilestones.includes(milestone)) {
                targetDeck.achievedMilestones.push(milestone);
                this.saveState();
                this.openMilestoneModal(targetDeck, milestone, currentPct, memorized, total);
                break; // Trigger one milestone at a time
            }
        }
    }

    openMilestoneModal(deck, milestone, currentPct, memorized, total) {
        if (!this.milestoneModal) return;

        const TIERS = {
            25: {
                icon: '🥉',
                badge: '25% 마일스톤 돌파',
                title: '루키 러너 달성!',
                praise: `첫 발을 멋지게 뗐습니다! "${deck.name}"의 1/4을 정복하셨네요! 이 기세로 계속 달려보세요. 🔥`
            },
            50: {
                icon: '🥈',
                badge: '50% 절반 정복!',
                title: '패션 러너 달성!',
                praise: `벌써 절반이나 해내셨어요! "${deck.name}"의 반환점을 멋지게 돌았습니다. 이제 완독이 눈앞입니다! 🌟`
            },
            75: {
                icon: '🥇',
                badge: '75% 마스터 임박!',
                title: '마스터리 레벨 도달!',
                praise: `놀라운 암기력! "${deck.name}" 문장의 75%가 입에 붙었습니다. 정상이 바로 눈앞입니다! 🚀`
            },
            100: {
                icon: '👑',
                badge: '100% 완벽 정복!',
                title: '덱 챔피언 (Champion)!',
                praise: `축하합니다! "${deck.name}"의 모든 문장을 완벽하게 마스터하셨습니다! 당신은 진정한 영어 정복자입니다! 👑🎉`
            }
        };

        const tierInfo = TIERS[milestone] || TIERS[25];

        if (this.milestoneTierIcon) this.milestoneTierIcon.textContent = tierInfo.icon;
        if (this.milestoneTierBadge) this.milestoneTierBadge.textContent = tierInfo.badge;
        if (this.milestoneTitle) this.milestoneTitle.textContent = tierInfo.title;
        if (this.milestoneDeckName) this.milestoneDeckName.textContent = `${deck.name} (${memorized}/${total}개 암기 완료)`;
        if (this.milestoneProgressFill) this.milestoneProgressFill.style.width = `${currentPct}%`;
        if (this.milestonePercentStr) this.milestonePercentStr.textContent = `${currentPct}%`;
        if (this.milestonePraiseText) this.milestonePraiseText.textContent = tierInfo.praise;

        this.pauseSpeedTriage();
        this.milestoneModal.classList.remove('hidden');
    }

    closeMilestoneModal() {
        if (this.milestoneModal) this.milestoneModal.classList.add('hidden');
        this.resumeSpeedTriage();
    }

    openMoveDeckModal() {
        const count = this.selectedSentenceIds.size;
        if (count === 0) {
            alert('이동할 문장을 1개 이상 선택해주세요.');
            return;
        }
        const promptText = document.getElementById('moveDeckPromptText');
        if (promptText) promptText.textContent = `선택한 ${count}개의 문장을 이동할 덱을 선택하세요:`;
        this.updateDeckUI();
        this.pauseSpeedTriage();
        try { window.history.pushState({ modalOpen: true }, ''); } catch (e) {}
        if (this.moveDeckModal) this.moveDeckModal.classList.remove('hidden');
    }

    closeMoveDeckModal() {
        if (this.moveDeckModal) this.moveDeckModal.classList.add('hidden');
        this.resumeSpeedTriage();
    }

    confirmMoveDeck() {
        const targetDeckId = this.selectTargetMoveDeck ? this.selectTargetMoveDeck.value : null;
        if (!targetDeckId) return;

        const targetDeck = this.decks.find(d => d.id === targetDeckId);
        const count = this.selectedSentenceIds.size;

        this.sentences.forEach(s => {
            if (this.selectedSentenceIds.has(s.id)) {
                s.deckId = targetDeckId;
            }
        });

        this.saveState();
        this.closeMoveDeckModal();
        this.exitSelectionMode();
        this.renderAll();
        alert(`선택한 ${count}개의 문장이 "${targetDeck.name}" 덱으로 이동되었습니다.`);
    }

    updateDeckUI() {
        const activeSentences = this.getActiveSentences();
        const activeDeck = this.decks.find(d => d.id === this.activeDeckId);

        if (this.currentDeckName) {
            this.currentDeckName.textContent = this.activeDeckId === 'all' ? '전체 문장' : (activeDeck ? activeDeck.name : '기본 덱');
        }
        if (this.currentDeckCountBadge) {
            const memorized = activeSentences.filter(s => s.memorized).length;
            this.currentDeckCountBadge.textContent = `${memorized}/${activeSentences.length}`;
        }

        // Update Deck Select Dropdown in Smart Capture form
        if (this.selectSmartDeck) {
            this.selectSmartDeck.innerHTML = '';
            this.decks.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.name;
                if (d.id === this.activeDeckId && this.activeDeckId !== 'all') {
                    opt.selected = true;
                }
                this.selectSmartDeck.appendChild(opt);
            });
        }

        // Update Deck Select Dropdown in scrap form
        if (this.selectScrapTargetDeck) {
            this.selectScrapTargetDeck.innerHTML = '';
            this.decks.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.name;
                if (d.id === this.activeDeckId && this.activeDeckId !== 'all') {
                    opt.selected = true;
                }
                this.selectScrapTargetDeck.appendChild(opt);
            });
        }

        // Update Deck Select Dropdown in move modal
        if (this.selectTargetMoveDeck) {
            this.selectTargetMoveDeck.innerHTML = '';
            this.decks.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.name;
                this.selectTargetMoveDeck.appendChild(opt);
            });
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    renderAll() {
        this.updateHeaderStats();
        this.updateGoalProgress();
        this.updateDeckUI();
        this.renderFlashcard();
        this.renderSentenceList();
        this.updateQuizSetupUI();
    }

    showToast(message, type = 'info') {
        let toastContainer = document.getElementById('engcard-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'engcard-toast-container';
            toastContainer.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-[90%] max-w-sm';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        let bgStyle = 'bg-inverse-surface text-inverse-on-surface border-white/10';
        if (type === 'success') bgStyle = 'bg-secondary-container text-on-secondary-container border-secondary-fixed/50';
        if (type === 'warning') bgStyle = 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim/40';
        if (type === 'error') bgStyle = 'bg-error-container text-on-error-container border-error/30';

        toast.className = `${bgStyle} px-4 py-2.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] border text-xs font-bold flex items-center gap-2 backdrop-blur-md animate-fade-in-up transition-all duration-300 pointer-events-auto`;
        toast.innerHTML = `<span>${message}</span>`;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px) scale(0.95)';
            setTimeout(() => toast.remove(), 300);
        }, 2200);
    }

    /* ==========================================================================
       Smart Quick Capture Logic (Idea 1 & 2 + Voice Mic Input)
       ========================================================================== */
    setupSmartCaptureListeners() {
        // Clipboard Smart Paste Button
        this.btnPasteClipboard?.addEventListener('click', () => this.handleSmartClipboardPaste());

        // File Attachment Button Click
        this.btnTriggerFileUpload?.addEventListener('click', () => this.fileInput?.click());

        // Voice Recognition Language Switcher
        this.btnVoiceLangEn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.setVoiceLanguage('en-US');
        });

        this.btnVoiceLangKo?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.setVoiceLanguage('ko-KR');
        });

        // Voice Recognition Controls
        this.btnSmartVoiceMic?.addEventListener('click', () => this.toggleSmartVoiceCapture());
        this.btnStopSmartVoice?.addEventListener('click', () => this.stopSmartVoiceCapture());

        // Smart Single Input Change / Typing (Debounced 350ms)
        this.smartCaptureInput?.addEventListener('input', () => {
            clearTimeout(this.smartTranslateTimer);
            const val = this.smartCaptureInput.value.trim();
            if (!val) {
                if (this.omniModeText) this.omniModeText.textContent = '✨ 스마트 자동 감지 모드';
                if (this.smartTranslateIndicator) this.smartTranslateIndicator.classList.add('hidden');
                return;
            }
            this.smartTranslateTimer = setTimeout(() => {
                this.processSmartInput(val);
            }, 300);
        });

        // Enter key in Omni-Input -> Save immediately (Shift+Enter for newline)
        this.smartCaptureInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveSmartCaptureSentence();
            }
        });

        // Confirm Save Button Click
        this.btnConfirmSmartSave?.addEventListener('click', () => this.saveSmartCaptureSentence());
    }

    setVoiceLanguage(lang) {
        this.smartVoiceLang = lang === 'ko-KR' ? 'ko-KR' : 'en-US';

        if (this.smartVoiceLang === 'ko-KR') {
            this.btnVoiceLangKo?.classList.add('bg-primary', 'text-white', 'shadow-sm', 'font-extrabold');
            this.btnVoiceLangKo?.classList.remove('text-on-surface-variant', 'hover:text-on-surface');
            this.btnVoiceLangEn?.classList.remove('bg-primary', 'text-white', 'shadow-sm', 'font-extrabold');
            this.btnVoiceLangEn?.classList.add('text-on-surface-variant');

            if (this.smartCaptureInput) {
                this.smartCaptureInput.placeholder = '한국어 뜻을 입력하거나 마이크로 말씀하세요... (영어 자동 생성)';
            }
            if (this.btnSmartVoiceMic) {
                this.btnSmartVoiceMic.title = '한국어 음성으로 말하기';
            }
            this.showToast('🎙️ 음성 인식 언어가 [한국어 (KO)]로 설정되었습니다.', 'info');
        } else {
            this.btnVoiceLangEn?.classList.add('bg-primary', 'text-white', 'shadow-sm', 'font-extrabold');
            this.btnVoiceLangEn?.classList.remove('text-on-surface-variant', 'hover:text-on-surface');
            this.btnVoiceLangKo?.classList.remove('bg-primary', 'text-white', 'shadow-sm', 'font-extrabold');
            this.btnVoiceLangKo?.classList.add('text-on-surface-variant');

            if (this.smartCaptureInput) {
                this.smartCaptureInput.placeholder = '영어 문장 또는 뜻을 입력/말씀하세요... (Enter로 즉시 저장)';
            }
            if (this.btnSmartVoiceMic) {
                this.btnSmartVoiceMic.title = '영어 음성으로 말하기';
            }
            this.showToast('🎙️ 음성 인식 언어가 [영어 (EN)]로 설정되었습니다.', 'info');
        }
    }

    async handleSmartClipboardPaste() {
        try {
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                this.showToast('클립보드 읽기 권한이 필요합니다. 인풋창에 Ctrl+V로 붙여넣어주세요.', 'warning');
                return;
            }
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                this.showToast('클립보드에 복사된 텍스트가 없습니다.', 'warning');
                return;
            }
            if (this.smartCaptureInput) {
                this.smartCaptureInput.value = text.trim();
                this.processSmartInput(text.trim());
                this.showToast('📋 복사한 문장을 가져왔습니다!', 'success');
            }
        } catch (err) {
            console.warn('Clipboard read failed:', err);
            this.showToast('클립보드 접근에 실패했습니다. 인풋창에 Ctrl+V로 붙여넣어주세요.', 'warning');
        }
    }

    toggleSmartVoiceCapture() {
        if (this.isSmartVoiceListening) {
            this.stopSmartVoiceCapture();
        } else {
            this.startSmartVoiceCapture();
        }
    }

    startSmartVoiceCapture() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.showToast('현재 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome/Edge를 권장합니다.', 'error');
            return;
        }

        try {
            this.smartVoiceRecognition = new SpeechRecognition();
            this.smartVoiceRecognition.lang = this.smartVoiceLang || 'en-US';
            this.smartVoiceRecognition.continuous = false;
            this.smartVoiceRecognition.interimResults = true;
            this.smartVoiceRecognition.maxAlternatives = 1;

            this.smartVoiceRecognition.onstart = () => {
                this.isSmartVoiceListening = true;
                if (this.smartVoiceMicIcon) {
                    this.smartVoiceMicIcon.textContent = 'mic';
                    this.btnSmartVoiceMic?.classList.add('bg-error', 'text-white', 'animate-pulse');
                    this.btnSmartVoiceMic?.classList.remove('bg-white', 'text-secondary');
                }
                if (this.smartVoiceStatus) {
                    this.smartVoiceStatus.classList.remove('hidden');
                    const langLabel = this.smartVoiceLang === 'ko-KR' ? '한국어' : '영어';
                    if (this.smartVoiceStatusText) {
                        this.smartVoiceStatusText.textContent = `[${langLabel}] 음성을 듣고 있습니다... 문장을 말씀해 주세요.`;
                    }
                }
            };

            this.smartVoiceRecognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(r => r[0].transcript)
                    .join('');
                if (this.smartCaptureInput) {
                    this.smartCaptureInput.value = transcript;
                }
            };

            this.smartVoiceRecognition.onerror = (err) => {
                console.warn('Smart Voice STT error:', err);
                this.stopSmartVoiceCapture();
                if (err.error !== 'no-speech') {
                    this.showToast('음성 인식 오류: ' + err.error, 'warning');
                }
            };

            this.smartVoiceRecognition.onend = () => {
                this.stopSmartVoiceCapture();
                const text = this.smartCaptureInput?.value?.trim();
                if (text) {
                    this.processSmartInput(text);
                }
            };

            this.smartVoiceRecognition.start();
        } catch (e) {
            console.error('Failed to start voice recognition:', e);
            this.stopSmartVoiceCapture();
        }
    }

    stopSmartVoiceCapture() {
        this.isSmartVoiceListening = false;
        if (this.smartVoiceRecognition) {
            try { this.smartVoiceRecognition.stop(); } catch (e) { }
            this.smartVoiceRecognition = null;
        }
        if (this.smartVoiceMicIcon) {
            this.smartVoiceMicIcon.textContent = 'mic';
            this.btnSmartVoiceMic?.classList.remove('bg-error', 'text-white', 'animate-pulse');
            this.btnSmartVoiceMic?.classList.add('bg-white', 'text-secondary');
        }
        if (this.smartVoiceStatus) {
            this.smartVoiceStatus.classList.add('hidden');
        }
    }

    async processSmartInput(rawText) {
        if (!rawText || !rawText.trim()) {
            if (this.omniModeText) this.omniModeText.textContent = '✨ 스마트 자동 감지 모드';
            if (this.smartTranslateIndicator) this.smartTranslateIndicator.classList.add('hidden');
            return;
        }

        const trimmed = rawText.trim();

        // 1. YouTube Link Detection
        if (/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(trimmed)) {
            if (this.omniModeText) this.omniModeText.textContent = '🎬 유튜브 링크 감지됨 (Enter로 자막 스크랩)';
            if (this.smartTranslateIndicator) {
                this.smartTranslateIndicator.classList.remove('hidden');
                this.smartTranslateIndicator.textContent = '🎬 YouTube 자막 추출 모드';
            }
            return;
        }

        // 2. Multi-line Detection
        const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 1) {
            if (this.omniModeText) this.omniModeText.textContent = `📁 여러 줄 텍스트 감지됨 (총 ${lines.length}개 문장 일괄 등록)`;
            if (this.smartTranslateIndicator) {
                this.smartTranslateIndicator.classList.remove('hidden');
                this.smartTranslateIndicator.textContent = `⚡ ${lines.length}개 문장 일괄 파싱`;
            }
            return;
        }

        // 3. Single Line Analysis
        const clean = trimmed.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim();
        const hasKorean = /[\uac00-\ud7a3]/.test(clean);
        const hasEnglish = /[a-zA-Z]/.test(clean);

        if (hasEnglish && hasKorean) {
            if (this.omniModeText) this.omniModeText.textContent = '⚡ 영문 + 한글 분리 감지됨 (Enter로 즉시 저장)';
            if (this.smartTranslateIndicator) {
                this.smartTranslateIndicator.classList.remove('hidden');
                this.smartTranslateIndicator.textContent = '⚡ 영문/한글 자동 분리';
            }
        } else if (hasEnglish && !hasKorean) {
            if (this.omniModeText) this.omniModeText.textContent = '🇺🇸 영어 문장 감지 (한국어 자동 번역 준비)';
            if (this.smartTranslateIndicator) {
                this.smartTranslateIndicator.classList.remove('hidden');
                this.smartTranslateIndicator.textContent = '✨ 한국어 자동 번역';
            }
        } else if (!hasEnglish && hasKorean) {
            if (this.omniModeText) this.omniModeText.textContent = '🇰🇷 한국어 뜻 감지 (영어 표현 자동 매칭 준비)';
            if (this.smartTranslateIndicator) {
                this.smartTranslateIndicator.classList.remove('hidden');
                this.smartTranslateIndicator.textContent = '✨ 영어 표현 자동 생성';
            }
        }
    }

    async autoTranslateText(text, sl = 'auto', tl = 'ko') {
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && data[0]) {
                return data[0].map(item => item[0]).join('').trim();
            }
            return '';
        } catch (e) {
            console.warn('Auto translate failed:', e);
            return '';
        }
    }

    async saveSmartCaptureSentence() {
        const raw = this.smartCaptureInput?.value?.trim() || '';
        if (!raw) {
            this.showToast('외우고 싶은 문장이나 유튜브 링크를 입력하세요.', 'warning');
            this.smartCaptureInput?.focus();
            return;
        }

        const deckId = this.selectSmartDeck?.value || (this.activeDeckId !== 'all' ? this.activeDeckId : 'deck_default');
        const category = this.selectSmartCategory?.value || '일상 회화';

        // 1. YouTube Link detection
        if (/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(raw)) {
            if (this.youtubeUrlInput) this.youtubeUrlInput.value = raw;
            await this.handleYoutubeScraping();
            if (this.smartCaptureInput) this.smartCaptureInput.value = '';
            return;
        }

        // 2. Multi-line detection (Bulk Import)
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 1) {
            this.showToast(`✨ ${lines.length}개 문장 분석 및 일괄 추출 중...`, 'info');
            const results = [];
            for (let idx = 0; idx < lines.length; idx++) {
                const line = lines[idx].replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim();
                if (!line) continue;

                // Delimiter split
                const delimiterMatch = line.split(/\s*[-–—:/|\t]+\s*/);
                if (delimiterMatch.length >= 2) {
                    const first = delimiterMatch[0].trim();
                    const second = delimiterMatch.slice(1).join(' ').trim();
                    if (/[a-zA-Z]/.test(first) && /[\uac00-\ud7a3]/.test(second)) {
                        results.push({ english: first, korean: second, category });
                    } else if (/[\uac00-\ud7a3]/.test(first) && /[a-zA-Z]/.test(second)) {
                        results.push({ english: second, korean: first, category });
                    } else {
                        const kor = await this.autoTranslateText(line, 'auto', 'ko');
                        results.push({ english: line, korean: kor || line, category });
                    }
                } else if (/[a-zA-Z]/.test(line) && !/[\uac00-\ud7a3]/.test(line)) {
                    const kor = await this.autoTranslateText(line, 'en', 'ko');
                    results.push({ english: line, korean: kor || '[뜻 없음]', category });
                } else if (!/[a-zA-Z]/.test(line) && /[\uac00-\ud7a3]/.test(line)) {
                    const eng = await this.autoTranslateText(line, 'ko', 'en');
                    results.push({ english: eng || line, korean: line, category });
                } else {
                    results.push({ english: line, korean: '[뜻 없음]', category });
                }
            }

            if (results.length > 0) {
                this.renderScrapedResults(results, '일괄 텍스트 추출', deckId);
                if (this.smartCaptureInput) this.smartCaptureInput.value = '';
            } else {
                this.showToast('문장 추출에 실패했습니다.', 'warning');
            }
            return;
        }

        // 3. Single Item Detection
        let cleanText = raw.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim();
        const hasKorean = /[\uac00-\ud7a3]/.test(cleanText);
        const hasEnglish = /[a-zA-Z]/.test(cleanText);

        let eng = '';
        let kor = '';

        if (hasEnglish && hasKorean) {
            const delimiterMatch = cleanText.split(/\s*[-–—:/|\t]+\s*/);
            if (delimiterMatch.length >= 2) {
                const first = delimiterMatch[0].trim();
                const second = delimiterMatch.slice(1).join(' ').trim();
                if (/[a-zA-Z]/.test(first) && /[\uac00-\ud7a3]/.test(second)) {
                    eng = first; kor = second;
                } else {
                    eng = second; kor = first;
                }
            } else {
                const boundaryMatch = cleanText.match(/^([a-zA-Z0-9\s',.!?\-]+?)([\uac00-\ud7a3].*)$/);
                if (boundaryMatch) {
                    eng = boundaryMatch[1].trim(); kor = boundaryMatch[2].trim();
                } else {
                    eng = cleanText; kor = await this.autoTranslateText(cleanText, 'auto', 'ko');
                }
            }
        } else if (hasEnglish && !hasKorean) {
            eng = cleanText;
            kor = await this.autoTranslateText(eng, 'en', 'ko');
        } else if (!hasEnglish && hasKorean) {
            kor = cleanText;
            eng = await this.autoTranslateText(kor, 'ko', 'en');
        } else {
            eng = cleanText;
            kor = '[뜻 없음]';
        }

        if (!eng) eng = cleanText;
        if (!kor) kor = '[뜻 없음]';

        this.addSentence(eng, kor, category, 'magic_collector', deckId);

        if (this.smartCaptureInput) {
            this.smartCaptureInput.value = '';
            this.smartCaptureInput.focus();
        }
        if (this.omniModeText) {
            this.omniModeText.textContent = '✨ 스마트 자동 감지 모드';
        }
        if (this.smartTranslateIndicator) {
            this.smartTranslateIndicator.classList.add('hidden');
        }

        this.showToast(`🎉 "${eng.slice(0, 25)}" 등록 완료!`, 'success');
        this.renderAll();
    }

    /* ==========================================================================
       Learning Statistics & Mastery Progress Dashboard
       ========================================================================== */
    renderStatsDashboard() {
        const selectedDeckId = this.statsDeckSelect ? this.statsDeckSelect.value : (this.activeDeckId || 'all');
        const targetSentences = (selectedDeckId === 'all')
            ? this.sentences
            : this.sentences.filter(s => (s.deckId || 'deck_default') === selectedDeckId);

        const total = targetSentences.length;

        // 🟢 완벽 마스터 (Mastered): 에빙하우스 3단계 이상(15일+ 주기) 도달한 장기 기억 확립 문장
        const mastered = targetSentences.filter(s => (s.intervalStep || 0) >= 3 || (s.memorized && (s.studyCount || 0) >= 3 && (s.wrongCount || 0) === 0)).length;

        // 🔴 취약 오답 (Weak / Needs Focus): 현재 오답/모름 상태이거나 누적 오답 2회 이상인 약점 문장
        const hard = targetSentences.filter(s => (!s.memorized && (s.wrongCount || 0) > 0) || (s.wrongCount || 0) >= 2).length;

        // 🟡 복습 진행중 (Learning): 학습을 시작하여 단기/중기 기억 주기를 밟아가고 있는 문장
        const learning = targetSentences.filter(s => {
            const isStudied = ((s.studyCount || 0) > 0 || s.lastStudiedAt);
            const isMastered = (s.intervalStep || 0) >= 3 || (s.memorized && (s.studyCount || 0) >= 3 && (s.wrongCount || 0) === 0);
            const isHard = (!s.memorized && (s.wrongCount || 0) > 0) || (s.wrongCount || 0) >= 2;
            return isStudied && !isMastered && !isHard;
        }).length;

        // ⚪ 미학습 신규 (New / Unstudied): 아직 학습을 시작하지 않은 신규 문장
        const unstudied = targetSentences.filter(s => (s.studyCount || 0) === 0 && !s.lastStudiedAt && (s.wrongCount || 0) === 0).length;

        const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
        const learningPct = total > 0 ? Math.round((learning / total) * 100) : 0;
        const hardPct = total > 0 ? Math.round((hard / total) * 100) : 0;
        const unstudiedPct = total > 0 ? Math.max(0, 100 - masteryPct - learningPct - hardPct) : 0;

        // Populate Stats Deck Select Dropdown if not populated or mismatch
        if (this.statsDeckSelect) {
            const currentSelected = this.statsDeckSelect.value || selectedDeckId;
            this.statsDeckSelect.innerHTML = '<option value="all">전체 문장 (All)</option>';
            const decks = this.decks && this.decks.length > 0 ? this.decks : [{ id: 'deck_default', name: '기본 덱' }];
            decks.forEach(d => {
                const count = this.sentences.filter(s => (s.deckId || 'deck_default') === d.id).length;
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = `${d.name} (${count}개)`;
                if (d.id === currentSelected) opt.selected = true;
                this.statsDeckSelect.appendChild(opt);
            });
            if (currentSelected === 'all') {
                this.statsDeckSelect.value = 'all';
            }
        }

        // 1. Overall Mastery Card
        const badge = document.getElementById('dashMasteryPercentBadge');
        if (badge) badge.textContent = `${masteryPct}%`;
        const bigPct = document.getElementById('dashMasteryPercentBig');
        if (bigPct) bigPct.textContent = `${masteryPct}%`;
        const countStr = document.getElementById('dashMasteryCountStr');
        if (countStr) countStr.textContent = `${mastered} / ${total} 문장 마스터`;

        const barMastered = document.getElementById('dashBarMastered');
        if (barMastered) barMastered.style.width = `${masteryPct}%`;
        const barLearning = document.getElementById('dashBarLearning');
        if (barLearning) barLearning.style.width = `${learningPct}%`;
        const barHard = document.getElementById('dashBarHard');
        if (barHard) barHard.style.width = `${hardPct}%`;
        const barUnstudied = document.getElementById('dashBarUnstudied');
        if (barUnstudied) barUnstudied.style.width = `${unstudiedPct}%`;

        const elMastered = document.getElementById('dashCountMastered');
        if (elMastered) elMastered.textContent = `${mastered}개 (${masteryPct}%)`;
        const elLearning = document.getElementById('dashCountLearning');
        if (elLearning) elLearning.textContent = `${learning}개 (${learningPct}%)`;
        const elHard = document.getElementById('dashCountHard');
        if (elHard) elHard.textContent = `${hard}개 (${hardPct}%)`;
        const elUnstudied = document.getElementById('dashCountUnstudied');
        if (elUnstudied) elUnstudied.textContent = `${unstudied}개 (${unstudiedPct}%)`;

        // 2. Today's Mission & Streak
        const today = getTodayString();
        const todayStudied = targetSentences.filter(s => s.lastStudiedAt === today).length;
        const dailyGoal = (this.goal && this.goal.dailyCount) ? parseInt(this.goal.dailyCount, 10) : 20;
        const todayPct = Math.min(100, Math.round((todayStudied / dailyGoal) * 100));

        const todayCountEl = document.getElementById('dashTodayMissionCount');
        if (todayCountEl) todayCountEl.textContent = `${todayStudied} / ${dailyGoal}`;
        const todayPctEl = document.getElementById('dashTodayMissionPercent');
        if (todayPctEl) todayPctEl.textContent = `${todayPct}%`;
        const todayBarEl = document.getElementById('dashTodayMissionBar');
        if (todayBarEl) todayBarEl.style.width = `${todayPct}%`;

        const noteEl = document.getElementById('dashTodayStatusNote');
        if (noteEl) {
            noteEl.textContent = todayPct >= 100
                ? '🎉 오늘 목표를 100% 달성했습니다! 대단해요!'
                : `목표까지 ${Math.max(0, dailyGoal - todayStudied)}개 문장 남았습니다.`;
        }

        // Streak
        const streakDays = this.goal?.streakDays || 1;
        const streakEl = document.getElementById('dashStreakDays');
        if (streakEl) streakEl.textContent = `🔥 ${streakDays}일 연속`;

        // 7-day Dots
        const weekContainer = document.getElementById('dashWeekDaysContainer');
        if (weekContainer) {
            weekContainer.innerHTML = '';
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                const dayName = dayNames[d.getDay()];
                const isToday = dStr === today;
                const isStudied = this.sentences.some(s => s.lastStudiedAt === dStr) || (isToday && todayStudied > 0);

                const dot = document.createElement('div');
                dot.className = 'flex flex-col items-center gap-1';
                dot.innerHTML = `
                    <span class="text-[10px] font-bold ${isToday ? 'text-primary font-black' : 'text-outline'}">${dayName}</span>
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${isStudied
                        ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300/50'
                        : 'bg-surface-container-high text-outline-variant'
                    }">
                        ${isStudied ? '✓' : ''}
                    </div>
                `;
                weekContainer.appendChild(dot);
            }
        }

        // 3. Cumulative Repetitions & Top 3 Weak
        const totalRepetitions = targetSentences.reduce((acc, s) => acc + (s.studyCount || 0), 0);
        const avgRepetition = total > 0 ? (totalRepetitions / total).toFixed(1) : '0.0';

        const totalStudyBadge = document.getElementById('dashTotalStudyCountBadge');
        if (totalStudyBadge) totalStudyBadge.textContent = `총 ${totalRepetitions.toLocaleString()}회독`;
        const totalStudyEl = document.getElementById('dashTotalStudyCount');
        if (totalStudyEl) totalStudyEl.textContent = `${totalRepetitions.toLocaleString()}회`;
        const avgStudyEl = document.getElementById('dashAvgStudyCount');
        if (avgStudyEl) avgStudyEl.textContent = `${avgRepetition}회`;

        // Top 3 Weak
        const weakListEl = document.getElementById('dashWeakSentencesList');
        if (weakListEl) {
            weakListEl.innerHTML = '';
            const topWeak = targetSentences
                .filter(s => (s.wrongCount || 0) > 0)
                .sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
                .slice(0, 3);

            if (topWeak.length === 0) {
                weakListEl.innerHTML = `
                    <div class="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold text-center border border-emerald-200/50">
                        👏 오답 문장이 없습니다! 모든 문장을 순조롭게 외우고 계십니다.
                    </div>
                `;
            } else {
                topWeak.forEach((item, idx) => {
                    const row = document.createElement('div');
                    row.className = 'p-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex items-center justify-between gap-3 text-xs';
                    row.innerHTML = `
                        <div class="flex items-center gap-2.5 overflow-hidden">
                            <span class="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-black text-[10px] flex items-center justify-center flex-shrink-0">${idx + 1}</span>
                            <div class="truncate">
                                <p class="font-bold text-on-surface truncate">${item.english}</p>
                                <p class="text-[11px] text-on-surface-variant truncate">${item.korean}</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-extrabold text-[10px] border border-rose-200 flex-shrink-0">
                            오답 ${item.wrongCount}회
                        </span>
                    `;
                    weakListEl.appendChild(row);
                });
            }
        }

        // 4. Deck by Deck Progress
        const deckListEl = document.getElementById('dashDeckProgressList');
        if (deckListEl) {
            deckListEl.innerHTML = '';
            const decks = this.decks && this.decks.length > 0 ? this.decks : [{ id: 'deck_default', name: '기본 덱', emoji: '📚' }];
            decks.forEach(deck => {
                const deckSentences = this.sentences.filter(s => (s.deckId || 'deck_default') === deck.id);
                const dTotal = deckSentences.length;
                const dMastered = deckSentences.filter(s => s.memorized || (s.intervalStep || 0) >= 3).length;
                const dPct = dTotal > 0 ? Math.round((dMastered / dTotal) * 100) : 0;

                const deckRow = document.createElement('div');
                deckRow.className = 'p-3.5 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col gap-2';
                deckRow.innerHTML = `
                    <div class="flex items-center justify-between text-xs font-bold">
                        <span class="text-on-surface flex items-center gap-1.5">
                            <span>${deck.emoji || '📁'}</span>
                            <span>${deck.name}</span>
                        </span>
                        <span class="text-primary font-black">${dPct}% (${dMastered}/${dTotal})</span>
                    </div>
                    <div class="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" style="width: ${dPct}%"></div>
                    </div>
                `;
                deckListEl.appendChild(deckRow);
            });
        }
    }
}

// Initialize Application safely regardless of load timing
function initEngCardApp() {
    if (!window.app) {
        window.app = new EngCardApp();
        console.log('[EngCard] App instance initialized successfully:', window.app);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngCardApp);
} else {
    initEngCardApp();
}
