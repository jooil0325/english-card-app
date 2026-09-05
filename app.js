/**
 * EngCard - Application Logic
 * Full implementation following Flashcards Deluxe & User Specification
 */

// Ebbinghaus Spaced Repetition Intervals (in days)
const EBBINGHAUS_INTERVALS = [1, 2, 6, 15, 30];

// 5-Stage Long-Term Memory Graduation System (Option 1: Temporal Spaced Verification)
const STAGE_CONFIG = {
    1: { name: '씨앗', emoji: '🌱', interval: 1, badgeClass: 'text-slate-600 bg-slate-100', desc: '1단계 씨앗 (인출 입문)' },
    2: { name: '새싹', emoji: '🌿', interval: 3, badgeClass: 'text-emerald-700 bg-emerald-100/80', desc: '2단계 새싹 (1일차 통과)' },
    3: { name: '줄기', emoji: '🪴', interval: 7, badgeClass: 'text-teal-700 bg-teal-100/80', desc: '3단계 줄기 (3일차 통과)' },
    4: { name: '꽃', emoji: '🌸', interval: 14, badgeClass: 'text-indigo-700 bg-indigo-100/80', desc: '4단계 꽃 (7일차 통과)' },
    5: { name: '열매', emoji: '🍎', interval: 30, badgeClass: 'text-amber-700 bg-amber-100/90 font-black', desc: '5단계 열매 (장기기억 졸업!)' }
};

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
        nextReviewDate: null,
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

        // 3 Smart Stage Buckets & 3-Tier View Density State
        this.activeStudyBucket = localStorage.getItem('engcard_study_bucket') || 'review'; // 'review' | 'new' | 'hard' | 'all'
        this.viewDensity = localStorage.getItem('engcard_view_density') || 'feed'; // 'feed' (기본: 2~3개 피드) | 'focus' (1개 집중) | 'compact' (목록)
        this.activeListScope = 'today_focus'; // legacy fallback
        this.studyViewMode = this.viewDensity === 'focus' ? 'card' : 'list';
        this.listSprintCurrentIndex = 0; // Pointer for 3s Speed Sprint in List mode
        // N-Times Dynamic Leitner Queue Drill Mode in Compact
        this.isDrillMode = false;
        this.drillTargetCount = parseInt(localStorage.getItem('engcard_drill_target'), 10) || 5;
        this.drillProgress = {};
        this.drillQueue = [];
        this.drillGraduatedIds = [];
        this.drillTotalInitialCount = 0;

        // User Preferences & Settings
        this.autoPlayTtsOnFlip = localStorage.getItem('engcard_auto_tts_flip') !== 'false';
        this.hapticFeedbackEnabled = localStorage.getItem('engcard_haptic_feedback') !== 'false';

        this.initDOM();
        this.ensureValidSchema();
        this.bindEvents();
        this.initGestures();
        this.bindKeyboardShortcuts();
        this.renderAll();
        this.switchDensityMode(this.viewDensity);
        this.switchStudyBucket(this.activeStudyBucket);
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
            if (s.intervalStep === undefined) { s.intervalStep = 0; changed = true; }

            const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
            if (!isStudied) {
                // Brand-new unstudied sentences must NOT have nextReviewDate set or be flagged as overdue
                if (s.nextReviewDate !== null) {
                    s.nextReviewDate = null;
                    changed = true;
                }
                if (s.stage !== 1) {
                    s.stage = 1;
                    changed = true;
                }
            } else {
                if (!s.nextReviewDate) {
                    s.nextReviewDate = getTodayString();
                    changed = true;
                }
                if (!s.stage) {
                    s.stage = s.memorized ? 5 : (s.intervalStep > 0 ? Math.min(s.intervalStep + 1, 4) : 1);
                    changed = true;
                }
            }

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

        // Horizontal Deck Chips & Inline New Deck Elements
        this.smartDeckChipsList = document.getElementById('smartDeckChipsList');
        this.btnInlineNewDeckTrigger = document.getElementById('btnInlineNewDeckTrigger');
        this.inlineNewDeckForm = document.getElementById('inlineNewDeckForm');
        this.inlineNewDeckInput = document.getElementById('inlineNewDeckInput');
        this.btnConfirmInlineNewDeck = document.getElementById('btnConfirmInlineNewDeck');
        this.btnCancelInlineNewDeck = document.getElementById('btnCancelInlineNewDeck');

        // Smart Clipboard Radar Elements
        this.clipboardRadarBanner = document.getElementById('clipboardRadarBanner');
        this.clipboardRadarPreview = document.getElementById('clipboardRadarPreview');
        this.btnClipboardRadarApply = document.getElementById('btnClipboardRadarApply');
        this.btnClipboardRadarDismiss = document.getElementById('btnClipboardRadarDismiss');
        this.clipboardRadarClickArea = document.getElementById('clipboardRadarClickArea');
        this.lastDetectedClipboard = '';
        this.pendingClipboardText = '';

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
        this.btnCardDownloadMp3 = document.getElementById('btnCardDownloadMp3');
        this.btnExportDeckAudio = document.getElementById('btnExportDeckAudio');
        this.currentAudioPlayer = null;
        this.ttsAudioCache = new Map();
        this.btnToggleGlobalHint = document.getElementById('btnToggleGlobalHint');
        this.globalHintBtnText = document.getElementById('globalHintBtnText');

        // 3 Smart Stage Buckets Elements
        this.smartStageBuckets = document.getElementById('smartStageBuckets');
        this.bucketButtons = document.querySelectorAll('.bucket-btn');
        this.bucketCountReview = document.getElementById('bucketCountReview');
        this.bucketCountNew = document.getElementById('bucketCountNew');
        this.bucketCountHard = document.getElementById('bucketCountHard');
        this.bucketCountAll = document.getElementById('bucketCountAll');

        // 3-Tier View Density Switcher Elements
        this.btnDensityFocus = document.getElementById('btnDensityFocus');
        this.btnDensityFeed = document.getElementById('btnDensityFeed');
        this.btnDensityCompact = document.getElementById('btnDensityCompact');
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
        this.btnCardEdit = document.getElementById('btnCardEdit');
        this.btnCardBackEdit = document.getElementById('btnCardBackEdit');
        this.overlayLeft = document.querySelector('.swipe-left-overlay');
        this.overlayRight = document.querySelector('.swipe-right-overlay');

        // Sentence Edit Modal Elements
        this.sentenceEditModal = document.getElementById('sentenceEditModal');
        this.btnCloseSentenceEditModal = document.getElementById('btnCloseSentenceEditModal');
        this.btnCancelSentenceEdit = document.getElementById('btnCancelSentenceEdit');
        this.formSentenceEdit = document.getElementById('formSentenceEdit');
        this.editSentenceId = document.getElementById('editSentenceId');
        this.editSentenceEnglish = document.getElementById('editSentenceEnglish');
        this.editSentenceKorean = document.getElementById('editSentenceKorean');
        this.editSentenceCategory = document.getElementById('editSentenceCategory');
        this.editSentenceDeck = document.getElementById('editSentenceDeck');
        this.chkAutoTranslateInEdit = document.getElementById('chkAutoTranslateInEdit');
        this.editTranslateStatus = document.getElementById('editTranslateStatus');
        this.btnTranslateToKorean = document.getElementById('btnTranslateToKorean');
        this.btnTranslateToEnglish = document.getElementById('btnTranslateToEnglish');
        this.editTranslateTimer = null;
        this.isProgrammaticEditSet = false;

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

        // Quiz Studio Elements
        this.quizSetup = document.getElementById('quizSetup');
        this.quizContainer = document.getElementById('quizContainer');
        this.btnStartQuiz = document.getElementById('btnStartQuiz');
        this.btnExitQuiz = document.getElementById('btnExitQuiz');
        this.quizKorean = document.getElementById('quizKorean');
        this.quizScoreBadge = document.getElementById('quizScoreBadge');
        this.quizModeBadge = document.getElementById('quizModeBadge');
        this.quizPromptSubTitle = document.getElementById('quizPromptSubTitle');
        this.btnQuizTTSAudio = document.getElementById('btnQuizTTSAudio');

        // Mode 1: Chunk Assembly
        this.quizArrangeArea = document.getElementById('quizArrangeArea');
        this.selectedWordsBox = document.getElementById('selectedWordsBox');
        this.wordPool = document.getElementById('wordPool');

        // Mode 2: 3-Second Flash Speaking
        this.quizFlashArea = document.getElementById('quizFlashArea');
        this.flashTimerSecText = document.getElementById('flashTimerSecText');
        this.flashTimerBar = document.getElementById('flashTimerBar');
        this.flashRevealedTargetBox = document.getElementById('flashRevealedTargetBox');
        this.flashTargetEnglish = document.getElementById('flashTargetEnglish');
        this.flashSelfEvalButtons = document.getElementById('flashSelfEvalButtons');

        // Mode 3: Smart Hybrid Dictation
        this.quizWriteArea = document.getElementById('quizWriteArea');
        this.writeAnswerInput = document.getElementById('writeAnswerInput');
        this.btnQuizVoiceMic = document.getElementById('btnQuizVoiceMic');
        this.quizVoiceMicIcon = document.getElementById('quizVoiceMicIcon');
        this.quizVoiceStatus = document.getElementById('quizVoiceStatus');
        this.btnStopQuizVoice = document.getElementById('btnStopQuizVoice');
        this.btnClearWriteInput = document.getElementById('btnClearWriteInput');

        this.quizBlankArea = document.getElementById('quizBlankArea');
        this.blankSentence = document.getElementById('blankSentence');
        this.blankAnswerInput = document.getElementById('blankAnswerInput');

        this.quizFeedback = document.getElementById('quizFeedback');
        this.btnCheckQuiz = document.getElementById('btnCheckQuiz');
        this.btnNextQuiz = document.getElementById('btnNextQuiz');
        this.chkQuizInfiniteLoop = document.getElementById('chkQuizInfiniteLoop');
        this.quizTypeDescText = document.getElementById('quizTypeDescText');

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

        // Bluetooth Keyboard Shortcuts Modal Elements
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.btnOpenShortcutsModal = document.getElementById('btnOpenShortcutsModal');
        this.btnCloseShortcutsModal = document.getElementById('btnCloseShortcutsModal');
        this.btnConfirmCloseShortcuts = document.getElementById('btnConfirmCloseShortcuts');

        // Comprehensive App Settings Modal Elements
        this.settingsModal = document.getElementById('settingsModal');
        this.btnOpenSettingsModal = document.getElementById('btnOpenSettingsModal');
        this.btnCloseSettingsModal = document.getElementById('btnCloseSettingsModal');
        this.btnSaveAndCloseSettings = document.getElementById('btnSaveAndCloseSettings');

        this.btnToolbarDrillMode = document.getElementById('btnToolbarDrillMode');

        this.settingsDailyCount = document.getElementById('settingsDailyCount');
        this.settingsReviewCap = document.getElementById('settingsReviewCap');
        this.settingsDrillTargetRounds = document.getElementById('settingsDrillTargetRounds');
        this.settingsTtsRate = document.getElementById('settingsTtsRate');
        this.settingsAutoPlayTts = document.getElementById('settingsAutoPlayTts');
        this.settingsHapticFeedback = document.getElementById('settingsHapticFeedback');

        this.btnOpenGoalFromSettings = document.getElementById('btnOpenGoalFromSettings');
        this.btnOpenShortcutsFromSettings = document.getElementById('btnOpenShortcutsFromSettings');
        this.btnBackupJSON = document.getElementById('btnBackupJSON');
        this.btnTriggerRestoreJSON = document.getElementById('btnTriggerRestoreJSON');
        this.inputRestoreJSON = document.getElementById('inputRestoreJSON');
        this.btnSettingsDeduplicate = document.getElementById('btnSettingsDeduplicate');
        this.btnSettingsResetData = document.getElementById('btnSettingsResetData');

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
            this.sessionTotalCount = this.sessionQueue.length;
            this.sessionCompletedCount = 0;
            this.sessionCompletedIds = [];
            this.currentCardIndex = 0;
            this.switchTab('tab-cards');
            this.switchStudyViewMode('card');
            this.renderFlashcard();
            this.showToast('🎯 취약 오답 문장 집중 복습을 시작합니다!', 'info');
        });

        // Dashboard Lifesaver Review Action
        document.getElementById('btnStartLifesaverReview')?.addEventListener('click', () => {
            this.startLifesaverReview();
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

        this.btnCardDownloadMp3?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadSentenceMp3(this.getCurrentCard());
        });

        this.btnExportDeckAudio?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadDeckAudioZip();
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

        // 3 Smart Stage Buckets Listeners
        this.bucketButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                const bucket = btn.dataset.bucket;
                if (bucket) this.switchStudyBucket(bucket);
            });
        });

        // 3-Tier View Density Switcher Listeners
        this.btnDensityFocus?.addEventListener('click', () => this.switchDensityMode('focus'));
        this.btnDensityFeed?.addEventListener('click', () => this.switchDensityMode('feed'));
        this.btnDensityCompact?.addEventListener('click', () => this.switchDensityMode('compact'));

        // Legacy compatibility listeners
        this.btnViewModeCard?.addEventListener('click', () => this.switchDensityMode('focus'));
        this.btnViewModeList?.addEventListener('click', () => this.switchDensityMode('feed'));
        this.btnScopeToday?.addEventListener('click', () => this.switchStudyBucket('review'));
        this.btnScopeAll?.addEventListener('click', () => this.switchStudyBucket('all'));

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
        this.btnQuizVoiceMic?.addEventListener('click', () => this.toggleQuizVoiceInput());
        this.btnStopQuizVoice?.addEventListener('click', () => this.stopQuizVoiceInput());
        this.btnQuizTTSAudio?.addEventListener('click', () => this.playCurrentQuizTTS());
        this.btnClearWriteInput?.addEventListener('click', () => {
            if (this.writeAnswerInput) {
                this.writeAnswerInput.value = '';
                this.writeAnswerInput.focus();
            }
        });

        // Quiz Type Switcher Listeners
        const quizTypeRadios = document.querySelectorAll('input[name="quizType"]');
        quizTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const val = radio.value;
                document.querySelectorAll('.quiz-type-btn').forEach(btn => {
                    const r = btn.querySelector('input');
                    if (r && r.checked) {
                        btn.classList.add('bg-white', 'shadow-2xs', 'text-primary');
                        btn.classList.remove('text-on-surface-variant');
                    } else {
                        btn.classList.remove('bg-white', 'shadow-2xs', 'text-primary');
                        btn.classList.add('text-on-surface-variant');
                    }
                });
                if (this.quizTypeDescText) {
                    if (val === 'chunk') {
                        this.quizTypeDescText.textContent = '의미 덩어리(Chunk)를 탭하여 1~2초 만에 문장을 직관적으로 완성합니다.';
                    } else if (val === 'flash') {
                        this.quizTypeDescText.textContent = '한글을 보고 3초 안에 소리내어 말한 후 즉시 자가 평가합니다.';
                    } else if (val === 'dictation') {
                        this.quizTypeDescText.textContent = '마이크로 영어로 말하고, 실시간 키보드 수정과 1:1 시각적 디프 및 문법 팁을 확인합니다.';
                    }
                }
            });
        });

        // Flash 3-Tier Self-Assessment Button Listeners
        document.querySelectorAll('.btn-flash-eval').forEach(btn => {
            btn.addEventListener('click', () => {
                const evalType = btn.dataset.eval; // 'known', 'unsure', 'unknown'
                this.handleFlashSelfEvaluation(evalType);
            });
        });

        // Write Answer Enter Key Listener
        this.writeAnswerInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.btnCheckQuiz.classList.contains('hidden')) {
                    this.checkQuizAnswer();
                } else if (!this.btnNextQuiz.classList.contains('hidden')) {
                    this.nextQuizQuestion();
                }
            }
        });

        // Quiz Result Modal Listeners
        document.getElementById('btnCloseQuizResultModal')?.addEventListener('click', () => {
            this.closeQuizResultModal();
            this.exitQuiz();
        });
        document.getElementById('btnCloseQuizResult')?.addEventListener('click', () => {
            this.closeQuizResultModal();
            this.exitQuiz();
        });
        document.getElementById('btnRetryQuiz')?.addEventListener('click', () => {
            this.closeQuizResultModal();
            this.startQuiz();
        });
        document.getElementById('btnGoToWrongReview')?.addEventListener('click', () => {
            this.closeQuizResultModal();
            this.exitQuiz();
            this.switchTab('tab-cards');
            this.switchStudyBucket('hard');
            this.switchDensityMode('compact');
            this.showToast('📋 퀴즈 오답 문장을 콤팩트 모드로 불러왔습니다.', 'info');
        });

        // Compact Continuous Audio Listener
        document.getElementById('btnCompactPlayAll')?.addEventListener('click', () => {
            this.playAllCompactAudio();
        });

        // B 방식: 학습 화면에서 현재 버킷으로 바로 퀴즈 시작
        document.getElementById('btnQuickQuizFromStudy')?.addEventListener('click', () => {
            this.startQuickQuizFromCurrentBucket();
        });

        // More Utilities Menu Toggle & Popover
        const btnMore = document.getElementById('btnStudyMoreMenu');
        const popover = document.getElementById('studyMoreMenuPopover');
        btnMore?.addEventListener('click', (e) => {
            e.stopPropagation();
            popover?.classList.toggle('hidden');
        });

        // Close popover when clicking outside or when an item inside is clicked
        document.addEventListener('click', (e) => {
            if (popover && !popover.classList.contains('hidden')) {
                if (!popover.contains(e.target) && e.target !== btnMore && !btnMore?.contains(e.target)) {
                    popover.classList.add('hidden');
                }
            }
        });

        popover?.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                popover?.classList.add('hidden');
            });
        });

        // Search Box Toggle
        const btnToggleSearch = document.getElementById('btnToggleSearch');
        const searchWrapper = document.getElementById('studyInlineSearchWrapper');
        const searchInput = document.getElementById('searchSentence');
        const btnCloseSearch = document.getElementById('btnCloseSearch');

        btnToggleSearch?.addEventListener('click', () => {
            if (searchWrapper) {
                const isHidden = searchWrapper.classList.toggle('hidden');
                if (!isHidden) {
                    searchInput?.focus();
                } else {
                    if (searchInput && searchInput.value) {
                        searchInput.value = '';
                        this.renderSentenceList();
                    }
                }
            }
        });

        btnCloseSearch?.addEventListener('click', () => {
            searchWrapper?.classList.add('hidden');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                this.renderSentenceList();
            }
        });

        // N회 반복 소거 드릴 모드 이벤트
        document.getElementById('btnToggleDrillMode')?.addEventListener('click', () => {
            this.toggleDrillMode();
        });
        document.getElementById('btnExitDrillMode')?.addEventListener('click', () => {
            this.exitDrillMode();
        });
        document.getElementById('selectDrillTarget')?.addEventListener('change', (e) => {
            this.drillTargetCount = parseInt(e.target.value, 10) || 5;
            this.renderSentenceList();
        });

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

        // Bluetooth Keyboard Shortcuts Modal Controls
        this.btnOpenShortcutsModal?.addEventListener('click', () => this.openShortcutsModal());
        this.btnCloseShortcutsModal?.addEventListener('click', () => this.closeShortcutsModal());
        this.btnConfirmCloseShortcuts?.addEventListener('click', () => this.closeShortcutsModal());
        this.shortcutsModal?.addEventListener('click', (e) => {
            if (e.target === this.shortcutsModal) this.closeShortcutsModal();
        });

        // App Settings Modal Controls
        this.btnOpenSettingsModal?.addEventListener('click', () => this.openSettingsModal());
        this.btnCloseSettingsModal?.addEventListener('click', () => this.closeSettingsModal());
        this.btnSaveAndCloseSettings?.addEventListener('click', () => this.saveSettings());
        this.settingsModal?.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettingsModal();
        });

        this.btnOpenGoalFromSettings?.addEventListener('click', () => {
            this.closeSettingsModal();
            this.openGoalModal();
        });

        this.btnOpenShortcutsFromSettings?.addEventListener('click', () => {
            this.closeSettingsModal();
            this.openShortcutsModal();
        });

        this.btnBackupJSON?.addEventListener('click', () => this.exportJSONBackup());
        this.btnTriggerRestoreJSON?.addEventListener('click', () => this.inputRestoreJSON?.click());
        this.inputRestoreJSON?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) {
                this.importJSONBackup(file);
                e.target.value = '';
            }
        });

        this.btnSettingsDeduplicate?.addEventListener('click', () => {
            this.deduplicateSentences();
        });

        this.btnSettingsResetData?.addEventListener('click', () => {
            this.resetAllData();
        });

        // Toolbar 5-Round Drill Button
        this.btnToolbarDrillMode?.addEventListener('click', () => {
            this.toggleDrillMode();
        });

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

        // Sentence Edit Modal Controls
        this.btnCardEdit?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openEditModalForCurrentCard();
        });
        this.btnCardBackEdit?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openEditModalForCurrentCard();
        });
        this.btnCloseSentenceEditModal?.addEventListener('click', () => this.closeSentenceEditModal());
        this.btnCancelSentenceEdit?.addEventListener('click', () => this.closeSentenceEditModal());
        this.formSentenceEdit?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditedSentence();
        });

        // Auto-translate toggle persistence
        this.chkAutoTranslateInEdit?.addEventListener('change', () => {
            localStorage.setItem('engcard_auto_translate', this.chkAutoTranslateInEdit.checked ? 'true' : 'false');
        });

        // Real-time debounce auto-translate (English -> Korean)
        this.editSentenceEnglish?.addEventListener('input', () => {
            if (this.isProgrammaticEditSet) return;
            if (!this.chkAutoTranslateInEdit || !this.chkAutoTranslateInEdit.checked) return;

            clearTimeout(this.editTranslateTimer);
            const text = this.editSentenceEnglish.value.trim();
            if (text.length < 2) return;

            this.editTranslateTimer = setTimeout(async () => {
                if (document.activeElement !== this.editSentenceEnglish) return;
                if (this.editTranslateStatus) this.editTranslateStatus.classList.remove('hidden');
                try {
                    const tr = await this.autoTranslateText(text, 'en', 'ko');
                    if (tr && document.activeElement === this.editSentenceEnglish) {
                        this.isProgrammaticEditSet = true;
                        if (this.editSentenceKorean) this.editSentenceKorean.value = tr;
                        this.isProgrammaticEditSet = false;
                    }
                } finally {
                    if (this.editTranslateStatus) this.editTranslateStatus.classList.add('hidden');
                }
            }, 500);
        });

        // Real-time debounce auto-translate (Korean -> English)
        this.editSentenceKorean?.addEventListener('input', () => {
            if (this.isProgrammaticEditSet) return;
            if (!this.chkAutoTranslateInEdit || !this.chkAutoTranslateInEdit.checked) return;

            clearTimeout(this.editTranslateTimer);
            const text = this.editSentenceKorean.value.trim();
            if (text.length < 2) return;

            this.editTranslateTimer = setTimeout(async () => {
                if (document.activeElement !== this.editSentenceKorean) return;
                if (this.editTranslateStatus) this.editTranslateStatus.classList.remove('hidden');
                try {
                    const tr = await this.autoTranslateText(text, 'ko', 'en');
                    if (tr && document.activeElement === this.editSentenceKorean) {
                        this.isProgrammaticEditSet = true;
                        if (this.editSentenceEnglish) this.editSentenceEnglish.value = tr;
                        this.isProgrammaticEditSet = false;
                    }
                } finally {
                    if (this.editTranslateStatus) this.editTranslateStatus.classList.add('hidden');
                }
            }, 500);
        });

        // Manual Translate Buttons
        this.btnTranslateToKorean?.addEventListener('click', async () => {
            const text = this.editSentenceEnglish ? this.editSentenceEnglish.value.trim() : '';
            if (!text) {
                this.showToast('번역할 영어 문장을 먼저 입력해주세요.', 'warning');
                return;
            }
            if (this.editTranslateStatus) this.editTranslateStatus.classList.remove('hidden');
            try {
                const tr = await this.autoTranslateText(text, 'en', 'ko');
                if (tr && this.editSentenceKorean) {
                    this.isProgrammaticEditSet = true;
                    this.editSentenceKorean.value = tr;
                    this.isProgrammaticEditSet = false;
                    this.showToast('✨ 한글 뜻이 번역되었습니다.', 'success');
                }
            } finally {
                if (this.editTranslateStatus) this.editTranslateStatus.classList.add('hidden');
            }
        });

        this.btnTranslateToEnglish?.addEventListener('click', async () => {
            const text = this.editSentenceKorean ? this.editSentenceKorean.value.trim() : '';
            if (!text) {
                this.showToast('영작할 한국어 뜻을 먼저 입력해주세요.', 'warning');
                return;
            }
            if (this.editTranslateStatus) this.editTranslateStatus.classList.remove('hidden');
            try {
                const tr = await this.autoTranslateText(text, 'ko', 'en');
                if (tr && this.editSentenceEnglish) {
                    this.isProgrammaticEditSet = true;
                    this.editSentenceEnglish.value = tr;
                    this.isProgrammaticEditSet = false;
                    this.showToast('✨ 영어 문장으로 영작되었습니다.', 'success');
                }
            } finally {
                if (this.editTranslateStatus) this.editTranslateStatus.classList.add('hidden');
            }
        });

        // Stats Deck Filter
        this.statsDeckSelect = document.getElementById('statsDeckSelect');
        this.statsDeckSelect?.addEventListener('change', () => this.renderStatsDashboard());
        this.dashBarUnstudied = document.getElementById('dashBarUnstudied');
        this.dashCountUnstudied = document.getElementById('dashCountUnstudied');

        // Android Hardware / Gesture Back Button Handling (Popstate Guard)
        window.addEventListener('popstate', () => {
            if (this.isAnyModalOpen()) {
                if (this.sentenceEditModal && !this.sentenceEditModal.classList.contains('hidden')) this.closeSentenceEditModal();
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
        } else if (targetTab === 'tab-add') {
            this.renderDeckQuickChips();
            this.checkClipboardRadar();
        }
        this.currentActiveTab = targetTab;
    }

    /* Single Tap, Long Press & Drag Gesture Handler (Mobile Touch & Desktop Mouse) */
    initGestures() {
        const card = this.flashcard;
        if (!card) return;

        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        let isHorizontalSwipe = false;
        let lastTouchEndTime = 0;
        let longPressTimer = null;
        let isLongPressTriggered = false;

        const clearLongPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const startLongPress = () => {
            clearLongPress();
            isLongPressTriggered = false;
            longPressTimer = setTimeout(() => {
                const moveDist = Math.hypot(currentX - startX, currentY - startY);
                if (moveDist < 14) {
                    isLongPressTriggered = true;
                    isDragging = false;
                    this.triggerHaptic('medium');
                    card.style.transform = '';
                    card.style.transition = 'none';
                    if (this.overlayLeft) this.overlayLeft.style.opacity = 0;
                    if (this.overlayRight) this.overlayRight.style.opacity = 0;
                    this.openEditModalForCurrentCard();
                }
            }, 500);
        };

        // --- Touch Event Handlers (Mobile) ---
        const onTouchStart = (e) => {
            if (e.target.closest('button') || e.target.closest('#btnCardTTS') || e.target.closest('#btnCardEdit') || e.target.closest('#btnCardBackEdit') || e.target.closest('#btnFirstLetterHint') || e.target.closest('#btnVoiceRecite')) return;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = touch.clientX;
            currentY = touch.clientY;
            isDragging = true;
            isHorizontalSwipe = false;
            card.style.transition = 'none';
            startLongPress();
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            currentX = touch.clientX;
            currentY = touch.clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                clearLongPress();
            }

            // Determine if horizontal swipe
            if (!isHorizontalSwipe && Math.abs(deltaX) > 8) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    isHorizontalSwipe = true;
                } else {
                    isDragging = false;
                    return;
                }
            }

            if (isHorizontalSwipe) {
                if (e.cancelable) e.preventDefault(); // Prevent mobile browser default gesture / scroll
                card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)`;

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
            }
        };

        const onTouchEnd = () => {
            clearLongPress();
            if (isLongPressTriggered) {
                isLongPressTriggered = false;
                isDragging = false;
                return;
            }
            if (!isDragging) return;
            isDragging = false;
            lastTouchEndTime = Date.now();

            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';

            // Single Tap (movement < 12px in both X and Y)
            if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) {
                card.style.transform = '';
                this.triggerHaptic('light');
                card.classList.toggle('flipped');
                this.overlayLeft.style.opacity = 0;
                this.overlayRight.style.opacity = 0;
                return;
            }

            // Swipe Threshold (60px)
            if (deltaX > 60) {
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
            } else if (deltaX < -60) {
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

        const onTouchCancel = () => {
            clearLongPress();
            isLongPressTriggered = false;
            isDragging = false;
            card.style.transform = '';
            this.overlayLeft.style.opacity = 0;
            this.overlayRight.style.opacity = 0;
        };

        // --- Mouse Event Handlers (Desktop) ---
        const onMouseDown = (e) => {
            if (Date.now() - lastTouchEndTime < 600) return; // Ignore synthetic mouse events after touch
            if (e.target.closest('button') || e.target.closest('#btnCardTTS') || e.target.closest('#btnCardEdit') || e.target.closest('#btnCardBackEdit') || e.target.closest('#btnFirstLetterHint') || e.target.closest('#btnVoiceRecite')) return;
            startX = e.clientX;
            startY = e.clientY;
            currentX = e.clientX;
            currentY = e.clientY;
            isDragging = true;
            isHorizontalSwipe = false;
            card.style.transition = 'none';
            startLongPress();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            currentX = e.clientX;
            currentY = e.clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                clearLongPress();
            }

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

        const onMouseUp = () => {
            clearLongPress();
            if (isLongPressTriggered) {
                isLongPressTriggered = false;
                isDragging = false;
                return;
            }
            if (!isDragging) return;
            isDragging = false;

            const deltaX = currentX - startX;
            card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';

            if (Math.abs(deltaX) < 10) {
                card.style.transform = '';
                this.triggerHaptic('light');
                card.classList.toggle('flipped');
                this.overlayLeft.style.opacity = 0;
                this.overlayRight.style.opacity = 0;
                return;
            }

            if (deltaX > 80) {
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
                card.style.transform = '';
                this.overlayLeft.style.opacity = 0;
                this.overlayRight.style.opacity = 0;
            }
        };

        card.addEventListener('touchstart', onTouchStart, { passive: true });
        card.addEventListener('touchmove', onTouchMove, { passive: false }); // passive: false enables preventDefault for horizontal swipe
        card.addEventListener('touchend', onTouchEnd);
        card.addEventListener('touchcancel', onTouchCancel);

        card.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    addSentence(english, korean, category = '기타', source = 'manual', targetDeckId = null, idiom = '') {
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
            idiom: idiom || '',
            memorized: false,
            wrongCount: 0,
            studyCount: 0,
            lastStudiedAt: null,
            nextReviewDate: null,
            intervalStep: 0,
            stage: 1
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
        if (!current.firstStudiedAt) current.firstStudiedAt = getTodayString();
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

    /* App Settings Modal & Backup Engine */
    openSettingsModal() {
        if (!this.settingsModal) return;
        this.pauseSpeedTriage();
        this.settingsModal.classList.remove('hidden');

        // Populate current preferences into controls
        if (this.settingsDailyCount) this.settingsDailyCount.value = (this.goal && this.goal.dailyCount) || 10;
        if (this.settingsReviewCap) this.settingsReviewCap.value = (this.goal && this.goal.reviewCap !== undefined) ? this.goal.reviewCap : 20;
        if (this.settingsDrillTargetRounds) this.settingsDrillTargetRounds.value = this.drillTargetCount || 5;
        if (this.settingsTtsRate) this.settingsTtsRate.value = this.ttsRate.toFixed(1);
        if (this.settingsAutoPlayTts) this.settingsAutoPlayTts.checked = this.autoPlayTtsOnFlip !== false;
        if (this.settingsHapticFeedback) this.settingsHapticFeedback.checked = this.hapticFeedbackEnabled !== false;

        this.triggerHaptic('light');
    }

    closeSettingsModal() {
        if (!this.settingsModal) return;
        this.settingsModal.classList.add('hidden');
        this.resumeSpeedTriage();
    }

    saveSettings() {
        // 1. Goal updates
        if (!this.goal) this.goal = {};
        if (this.settingsDailyCount) this.goal.dailyCount = parseInt(this.settingsDailyCount.value, 10) || 10;
        if (this.settingsReviewCap) this.goal.reviewCap = parseInt(this.settingsReviewCap.value, 10) || 20;

        // 2. Drill target rounds
        if (this.settingsDrillTargetRounds) {
            this.drillTargetCount = parseInt(this.settingsDrillTargetRounds.value, 10) || 5;
            localStorage.setItem('engcard_drill_target', this.drillTargetCount);
        }

        // 3. TTS Rate
        if (this.settingsTtsRate) {
            this.ttsRate = parseFloat(this.settingsTtsRate.value) || 1.0;
            localStorage.setItem('engcard_tts_rate', this.ttsRate);
            if (this.ttsRateBadge) this.ttsRateBadge.textContent = `${this.ttsRate.toFixed(1)}x`;
        }

        // 4. Auto TTS on Flip
        if (this.settingsAutoPlayTts) {
            this.autoPlayTtsOnFlip = this.settingsAutoPlayTts.checked;
            localStorage.setItem('engcard_auto_tts_flip', this.autoPlayTtsOnFlip ? 'true' : 'false');
        }

        // 5. Haptic Feedback
        if (this.settingsHapticFeedback) {
            this.hapticFeedbackEnabled = this.settingsHapticFeedback.checked;
            localStorage.setItem('engcard_haptic_feedback', this.hapticFeedbackEnabled ? 'true' : 'false');
        }

        this.saveState();
        this.closeSettingsModal();
        this.showToast('⚙️ 설정이 성공적으로 저장되었습니다.', 'success');
    }

    exportJSONBackup() {
        const backupData = {
            version: '2.5',
            exportedAt: new Date().toISOString(),
            decks: this.decks,
            activeDeckId: this.activeDeckId,
            sentences: this.sentences,
            goal: this.goal,
            ttsRate: this.ttsRate,
            drillTargetCount: this.drillTargetCount
        };
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `TUK_Backup_${getTodayString()}.json`;
        link.click();
        this.showToast('💾 전체 데이터 백업 파일이 다운로드되었습니다.', 'success');
    }

    importJSONBackup(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.sentences && Array.isArray(data.sentences)) {
                    this.sentences = data.sentences;
                    if (data.decks && Array.isArray(data.decks)) this.decks = data.decks;
                    if (data.activeDeckId) this.activeDeckId = data.activeDeckId;
                    if (data.goal) this.goal = data.goal;
                    if (data.ttsRate) this.ttsRate = parseFloat(data.ttsRate) || 1.0;
                    if (data.drillTargetCount) this.drillTargetCount = parseInt(data.drillTargetCount, 10) || 5;

                    this.reassignNo();
                    this.saveState();
                    this.renderAll();
                    this.showToast(`🎉 총 ${this.sentences.length}개 문장 백업 복원이 완료되었습니다!`, 'success');
                    this.closeSettingsModal();
                } else if (Array.isArray(data)) {
                    this.sentences = data;
                    this.reassignNo();
                    this.saveState();
                    this.renderAll();
                    this.showToast(`🎉 총 ${data.length}개 문장 백업 복원이 완료되었습니다!`, 'success');
                    this.closeSettingsModal();
                } else {
                    this.showToast('올바른 TUK 백업 JSON 파일이 아닙니다.', 'error');
                }
            } catch (err) {
                this.showToast('파일 읽기 실패: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    resetAllData() {
        if (confirm('⚠️ 정말로 모든 단어장과 학습 기록을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
            localStorage.clear();
            window.location.reload();
        }
    }

    updateDrillToolbarButton() {
        if (this.btnToolbarDrillMode) {
            if (this.isDrillMode) {
                this.btnToolbarDrillMode.className = 'p-1 rounded-lg border border-primary bg-primary text-white transition-all font-bold text-xs flex items-center shadow-xs active:scale-95 cursor-pointer ring-2 ring-primary/30';
                this.btnToolbarDrillMode.title = `5회 순환 소거 드릴 진행 중 (${this.drillQueue?.length || 0}개 남음) - 클릭하여 종료`;
            } else {
                this.btnToolbarDrillMode.className = 'p-1 rounded-lg border border-primary/30 bg-surface text-primary hover:bg-primary/10 transition-all font-bold text-xs flex items-center shadow-2xs active:scale-95 cursor-pointer';
                this.btnToolbarDrillMode.title = '5회 순환 소거 드릴 (반복 암기)';
            }
        }
    }

    /* Bluetooth Keyboard Navigation & Modal Helpers */
    openShortcutsModal() {
        if (this.shortcutsModal) {
            this.shortcutsModal.classList.remove('hidden');
            this.triggerHaptic('light');
        }
    }

    closeShortcutsModal() {
        if (this.shortcutsModal) {
            this.shortcutsModal.classList.add('hidden');
        }
    }

    toggleShortcutsModal() {
        if (this.shortcutsModal) {
            if (this.shortcutsModal.classList.contains('hidden')) {
                this.openShortcutsModal();
            } else {
                this.closeShortcutsModal();
            }
        }
    }

    getCurrentActiveTab() {
        return document.querySelector('.nav-item.active, .nav-tab-btn.active')?.dataset.tab || 'tab-cards';
    }

    nextCard() {
        if (!this.sessionQueue || this.sessionQueue.length <= 1) return;
        const currentId = this.sessionQueue.shift();
        this.sessionQueue.push(currentId);
        this.renderFlashcard();
        this.triggerHaptic('light');
        this.showToast('⏭️ 다음 카드로 이동', 'info');
    }

    prevCard() {
        if (!this.sessionQueue || this.sessionQueue.length <= 1) return;
        const lastId = this.sessionQueue.pop();
        this.sessionQueue.unshift(lastId);
        this.renderFlashcard();
        this.triggerHaptic('light');
        this.showToast('⏮️ 이전 카드로 이동', 'info');
    }

    graduateCardDirectly() {
        const current = this.getCurrentCardObject();
        if (!current) return;
        current.stage = 5;
        current.memorized = true;
        current.lastStudiedAt = getTodayString();
        this.saveState();
        this.showToast(`🍎 "${(current.english || '').slice(0, 24)}..." 5단계 장기기억 마스터/졸업!`, 'success');
        this.gradeCard('easy');
    }

    cycleStudyBucket() {
        const buckets = ['review', 'new', 'hard', 'all'];
        const idx = buckets.indexOf(this.activeStudyBucket);
        const nextBucket = buckets[(idx + 1) % buckets.length];
        this.switchStudyBucket(nextBucket);
        const names = { review: '복습', new: '새문장', hard: '오답', all: '전체' };
        this.showToast(`📦 학습 버킷: ${names[nextBucket] || nextBucket}`, 'info');
    }

    cycleDensityMode() {
        const modes = ['feed', 'focus', 'compact'];
        const idx = modes.indexOf(this.viewDensity);
        const nextMode = modes[(idx + 1) % modes.length];
        this.switchDensityMode(nextMode);
        const names = { feed: '피드형 (3D 카드)', focus: '1개 몰입형 (플래시)', compact: '콤팩트 목록형' };
        this.showToast(`👁️ 뷰 모드: ${names[nextMode] || nextMode}`, 'info');
    }

    /* Global Bluetooth & Desktop Keyboard Shortcuts System */
    bindKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Ignore keystrokes inside input, textarea, select, or contenteditable fields
            const isEditing = e.target.matches('input, textarea, select, [contenteditable="true"]') || e.target.isContentEditable;
            
            // Allow Escape to dismiss any modal or blur active input
            if (e.key === 'Escape') {
                if (this.settingsModal && !this.settingsModal.classList.contains('hidden')) {
                    this.closeSettingsModal();
                    return;
                }
                if (this.shortcutsModal && !this.shortcutsModal.classList.contains('hidden')) {
                    this.closeShortcutsModal();
                    return;
                }
                if (this.sentenceEditModal && !this.sentenceEditModal.classList.contains('hidden')) {
                    this.closeSentenceEditModal();
                    return;
                }
                if (this.goalModal && !this.goalModal.classList.contains('hidden')) {
                    this.closeGoalModal();
                    return;
                }
                if (this.deckModal && !this.deckModal.classList.contains('hidden')) {
                    this.closeDeckModal();
                    return;
                }
                if (this.moveDeckModal && !this.moveDeckModal.classList.contains('hidden')) {
                    this.closeMoveDeckModal();
                    return;
                }
                if (this.sessionCompleteModal && !this.sessionCompleteModal.classList.contains('hidden')) {
                    this.sessionCompleteModal.classList.add('hidden');
                    return;
                }
                if (this.voiceShadowingPanel && !this.voiceShadowingPanel.classList.contains('hidden')) {
                    this.closeVoiceShadowingPanel();
                    return;
                }
                if (this.quizResultModal && !this.quizResultModal.classList.contains('hidden')) {
                    this.closeQuizResultModal();
                    return;
                }
                if (this.shareModal && !this.shareModal.classList.contains('hidden')) {
                    this.closeShareModal();
                    return;
                }
                if (isEditing) {
                    e.target.blur();
                    return;
                }
                return;
            }

            // When user is typing inside textboxes, don't hijack keyboard inputs
            if (isEditing) return;

            // Global 1: Shortcuts Help Modal Toggle ('?' or 'F1')
            if (e.key === '?' || (e.shiftKey && e.key === '/') || e.key === 'F1') {
                e.preventDefault();
                this.toggleShortcutsModal();
                return;
            }

            // Global 2: Tab Switching (Alt + 1~4 or Ctrl + 1~4)
            if ((e.altKey || e.ctrlKey || e.metaKey) && !e.shiftKey) {
                if (e.key === '1') { e.preventDefault(); this.switchTab('tab-cards'); return; }
                if (e.key === '2') { e.preventDefault(); this.switchTab('tab-capture'); return; }
                if (e.key === '3') { e.preventDefault(); this.switchTab('tab-quiz'); return; }
                if (e.key === '4') { e.preventDefault(); this.switchTab('tab-stats'); return; }
            }

            // Global 3: Playback Rate Controls ([ : 0.8x, ] : 1.2x, \ / 0 : 1.0x)
            if (e.key === '[') {
                e.preventDefault();
                this.ttsRate = 0.8;
                localStorage.setItem('engcard_tts_rate', this.ttsRate);
                if (this.ttsRateBadge) this.ttsRateBadge.textContent = '0.8x';
                this.showToast('🔊 TTS 재생 속도: 0.8x (정밀 쉐도잉)', 'info');
                return;
            } else if (e.key === ']') {
                e.preventDefault();
                this.ttsRate = 1.2;
                localStorage.setItem('engcard_tts_rate', this.ttsRate);
                if (this.ttsRateBadge) this.ttsRateBadge.textContent = '1.2x';
                this.showToast('🔊 TTS 재생 속도: 1.2x (고속 청취)', 'info');
                return;
            } else if (e.key === '\\' || (e.key === '0' && this.getCurrentActiveTab() !== 'tab-cards')) {
                e.preventDefault();
                this.ttsRate = 1.0;
                localStorage.setItem('engcard_tts_rate', this.ttsRate);
                if (this.ttsRateBadge) this.ttsRateBadge.textContent = '1.0x';
                this.showToast('🔊 TTS 재생 속도: 1.0x (표준)', 'info');
                return;
            }

            const currentTab = this.getCurrentActiveTab();

            // ================= 1. TAB-CARDS (학습 & 플래시카드) =================
            if (currentTab === 'tab-cards') {
                const current = this.getCurrentCardObject();

                // Space / Enter: Flip Card & pronounce on flip
                if (e.code === 'Space' || e.key === 'Enter') {
                    e.preventDefault();
                    if (this.flashcard) {
                        this.flashcard.classList.toggle('flipped');
                        if (this.flashcard.classList.contains('flipped') && current) {
                            this.speakText(current.english);
                        }
                    }
                    return;
                }

                // Next Card Navigation (Right Arrow / j / l)
                if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'l' || e.key === 'J' || e.key === 'L') {
                    e.preventDefault();
                    this.nextCard();
                    return;
                }
                // Previous Card Navigation (Left Arrow / k)
                if (e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') {
                    e.preventDefault();
                    this.prevCard();
                    return;
                }

                // Difficulty Grading: 1 (Hard), 2 (Good), 3 (Easy), 4 / m (Master)
                if (e.key === '1') {
                    e.preventDefault();
                    this.gradeCard('hard');
                    return;
                } else if (e.key === '2') {
                    e.preventDefault();
                    this.gradeCard('good');
                    return;
                } else if (e.key === '3') {
                    e.preventDefault();
                    this.gradeCard('easy');
                    return;
                } else if (e.key === '4' || e.key === 'm' || e.key === 'M') {
                    e.preventDefault();
                    this.graduateCardDirectly();
                    return;
                }

                // Audio Playback: r / p
                if (e.key === 'r' || e.key === 'R' || e.key === 'p' || e.key === 'P') {
                    e.preventDefault();
                    if (current) this.speakText(current.english);
                    return;
                }

                // Voice Shadowing: s
                if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    this.startVoiceShadowing();
                    return;
                }

                // First Letter Hint: h / i
                if (e.key === 'h' || e.key === 'H' || e.key === 'i' || e.key === 'I') {
                    e.preventDefault();
                    this.showFirstLetterHint();
                    return;
                }

                // Download MP3: d
                if (e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    if (current) this.downloadSentenceMp3(current);
                    return;
                }

                // Edit sentence modal: e
                if (e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    this.openEditModalForCurrentCard();
                    return;
                }

                // Cycle View Density: v
                if (e.key === 'v' || e.key === 'V') {
                    e.preventDefault();
                    this.cycleDensityMode();
                    return;
                }

                // Cycle Study Bucket: b
                if (e.key === 'b' || e.key === 'B') {
                    e.preventDefault();
                    this.cycleStudyBucket();
                    return;
                }
            }

            // ================= 2. TAB-QUIZ (퀴즈 모드) =================
            if (currentTab === 'tab-quiz') {
                if (this.quizState && this.quizState.active) {
                    const qType = this.quizState.type;

                    // If Next button is visible (after chunk/dictation answer check), Space/Enter advances to next question!
                    if (this.btnNextQuiz && !this.btnNextQuiz.classList.contains('hidden')) {
                        if (e.key === 'Enter' || e.code === 'Space') {
                            e.preventDefault();
                            this.nextQuizQuestion();
                            return;
                        }
                    }

                    // 1. Flash Speaking Mode (3초 플래시)
                    if (qType === 'flash') {
                        const isRevealed = this.flashRevealedTargetBox && !this.flashRevealedTargetBox.classList.contains('hidden');
                        if (!isRevealed) {
                            if (e.code === 'Space' || e.key === 'Enter') {
                                e.preventDefault();
                                this.revealFlashAnswer();
                                return;
                            }
                        } else {
                            if (e.key === '1') {
                                e.preventDefault();
                                this.handleFlashSelfEvaluation('unknown');
                                return;
                            } else if (e.key === '2') {
                                e.preventDefault();
                                this.handleFlashSelfEvaluation('unsure');
                                return;
                            } else if (e.key === '3' || e.code === 'Space' || e.key === 'Enter') {
                                e.preventDefault();
                                this.handleFlashSelfEvaluation('known');
                                return;
                            }
                        }
                    }

                    // 2. Chunk Assembly Mode (청크 조립)
                    if (qType === 'chunk') {
                        // 1~9: Select corresponding unselected word chip
                        if (/^[1-9]$/.test(e.key)) {
                            e.preventDefault();
                            const num = parseInt(e.key, 10);
                            const availableChips = Array.from(this.wordPool?.querySelectorAll('button:not(.opacity-30)') || []);
                            if (num - 1 < availableChips.length) {
                                availableChips[num - 1].click();
                            }
                            return;
                        }

                        // Backspace: Deselect last selected chunk
                        if (e.key === 'Backspace') {
                            e.preventDefault();
                            if (this.quizState.selectedWords && this.quizState.selectedWords.length > 0) {
                                const lastItem = this.quizState.selectedWords[this.quizState.selectedWords.length - 1];
                                if (lastItem && lastItem.el) {
                                    lastItem.el.classList.remove('opacity-30', 'pointer-events-none');
                                    this.quizState.selectedWords.pop();
                                    const cleanChunks = this.splitIntoMeaningfulChunks(this.quizState.queue[0]?.english || '');
                                    this.renderSelectedWords(cleanChunks.length);
                                }
                            }
                            return;
                        }

                        // Enter / Space: Check Answer
                        if (e.key === 'Enter' || e.code === 'Space') {
                            if (this.btnCheckQuiz && !this.btnCheckQuiz.classList.contains('hidden')) {
                                e.preventDefault();
                                this.checkQuizAnswer();
                                return;
                            }
                        }
                    }

                    // TTS in Quiz: r / p
                    if (e.key === 'r' || e.key === 'R' || e.key === 'p' || e.key === 'P') {
                        e.preventDefault();
                        this.playCurrentQuizTTS();
                        return;
                    }
                } else {
                    // Quiz start screen: Enter or Space starts quiz
                    if (e.key === 'Enter' || e.code === 'Space') {
                        e.preventDefault();
                        document.getElementById('btnStartQuiz')?.click();
                        return;
                    }
                }
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
        this.revealedItemIds.clear();
        if (this.btnToggleGlobalHint) {
            if (this.isGlobalHintActive) {
                this.btnToggleGlobalHint.className = 'px-2 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-700 text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer';
                this.showToast('💡 첫 글자 힌트가 켜졌습니다!', 'info');
            } else {
                this.btnToggleGlobalHint.className = 'px-2 py-1.5 rounded-xl border border-outline-variant/30 bg-surface text-on-surface-variant hover:bg-surface-container text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer';
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

    getTodayNewBatch() {
        const todayStr = getTodayString();
        const batchKey = `engcard_new_batch_${todayStr}_${this.activeDeckId}`;
        let batchIds = null;
        try {
            batchIds = JSON.parse(localStorage.getItem(batchKey));
        } catch(e) {}

        let targetLimit = 10;
        if (this.goal && this.goal.dailyCount) {
            targetLimit = Math.max(1, parseInt(this.goal.dailyCount, 10));
        }

        const active = this.getActiveSentences();
        const activeMap = new Map(active.map(s => [s.id, s]));

        if (Array.isArray(batchIds) && batchIds.length > 0) {
            const batch = batchIds.map(id => activeMap.get(id)).filter(Boolean);
            if (batch.length > 0) return batch;
        }

        // Check sentences studied today
        const studiedToday = active.filter(s => s.lastStudiedAt === todayStr);

        let newBatch = [];
        if (studiedToday.length >= targetLimit) {
            // Target already achieved today! Fix batch to the first targetLimit studied today
            newBatch = studiedToday.slice(0, targetLimit);
        } else {
            const studiedTodayIds = new Set(studiedToday.map(s => s.id));
            const unstudied = active.filter(s => !s.lastStudiedAt && (s.studyCount || 0) === 0 && !s.memorized && !studiedTodayIds.has(s.id));
            const needed = targetLimit - studiedToday.length;
            newBatch = [...studiedToday, ...unstudied.slice(0, needed)];
        }

        localStorage.setItem(batchKey, JSON.stringify(newBatch.map(s => s.id)));
        return newBatch;
    }

    getBucketSentences(bucketType = this.activeStudyBucket) {
        const active = this.getActiveSentences();
        const today = getTodayString();
        const yesterday = getYesterdayString();

        if (bucketType === 'review') {
            return active.filter(s => {
                const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
                if (!isStudied) return false;
                if (s.memorized) return false;
                if (s.nextReviewDate && s.nextReviewDate <= today) return true;
                if (s.lastStudiedAt && s.lastStudiedAt === yesterday) return true;
                return false;
            });
        }

        if (bucketType === 'new') {
            const todayBatch = this.getTodayNewBatch();
            return todayBatch.filter(s => {
                const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
                return !isStudied || !(s.lastStudiedAt === today && s.memorized);
            });
        }

        if (bucketType === 'hard') {
            return active.filter(s => (s.wrongCount || 0) >= 1 && !s.memorized);
        }

        // 'all' bucket
        return active;
    }

    updateBucketBadges() {
        const reviewCount = this.getBucketSentences('review').length;
        const newCount = this.getBucketSentences('new').length;
        const hardCount = this.getBucketSentences('hard').length;
        const allCount = this.getBucketSentences('all').length;

        if (this.bucketCountReview) this.bucketCountReview.textContent = reviewCount;
        if (this.bucketCountNew) this.bucketCountNew.textContent = newCount;
        if (this.bucketCountHard) this.bucketCountHard.textContent = hardCount;
        if (this.bucketCountAll) this.bucketCountAll.textContent = allCount;

        if (this.todayFocusCountBadge) this.todayFocusCountBadge.textContent = reviewCount + newCount;
        if (this.allLibraryCountBadge) this.allLibraryCountBadge.textContent = allCount;
    }

    switchStudyBucket(bucketType) {
        this.activeStudyBucket = bucketType;
        localStorage.setItem('engcard_study_bucket', bucketType);

        this.bucketButtons?.forEach(btn => {
            const isMatch = btn.dataset.bucket === bucketType;
            if (isMatch) {
                btn.className = 'bucket-btn py-1.5 px-1.5 sm:px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-xs bg-white text-primary font-extrabold shadow-2xs active:scale-95';
            } else {
                btn.className = 'bucket-btn py-1.5 px-1.5 sm:px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-xs text-on-surface-variant hover:text-on-surface font-semibold active:scale-95';
            }
        });

        if (this.viewDensity === 'focus') {
            const bucketList = this.getBucketSentences(bucketType);
            this.sessionQueue = bucketList.map(s => s.id);
            this.sessionTotalCount = this.sessionQueue.length;
            this.sessionCompletedCount = 0;
            this.renderFlashcard();
        } else {
            this.renderSentenceList();
        }
    }

    switchDensityMode(density) {
        this.viewDensity = density;
        this.studyViewMode = (density === 'focus') ? 'card' : 'list';
        localStorage.setItem('engcard_view_density', density);
        this.clearSpeedTriageTimer();

        const buttons = [
            { el: this.btnDensityFocus, key: 'focus' },
            { el: this.btnDensityFeed, key: 'feed' },
            { el: this.btnDensityCompact, key: 'compact' }
        ];

        buttons.forEach(b => {
            if (!b.el) return;
            if (b.key === density) {
                b.el.className = 'density-btn px-3 py-1.5 rounded-xl bg-white shadow-2xs text-primary font-extrabold flex items-center gap-1 transition-all cursor-pointer';
            } else {
                b.el.className = 'density-btn px-3 py-1.5 rounded-xl text-on-surface-variant hover:text-on-surface font-bold flex items-center gap-1 transition-all cursor-pointer';
            }
        });

        if (density === 'focus') {
            this.studyViewCardContainer?.classList.remove('hidden');
            this.studyViewListContainer?.classList.add('hidden');
            const bucketList = this.getBucketSentences(this.activeStudyBucket);
            this.sessionQueue = bucketList.map(s => s.id);
            this.sessionTotalCount = this.sessionQueue.length;
            this.sessionCompletedCount = 0;
            this.renderFlashcard();
        } else {
            this.studyViewListContainer?.classList.remove('hidden');
            this.studyViewCardContainer?.classList.add('hidden');
            this.renderSentenceList();
            if (this.isSpeedTriageActive) {
                this.startListSpeedSprint(0);
            }
        }
    }

    switchStudyViewMode(mode) {
        this.switchDensityMode(mode === 'card' ? 'focus' : 'feed');
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

    toggleDrillMode() {
        if (!this.isDrillMode) {
            this.startDrillMode();
        } else {
            this.exitDrillMode();
        }
    }

    startDrillMode() {
        this.isDrillMode = true;
        const targetEl = document.getElementById('selectDrillTarget');
        this.drillTargetCount = targetEl ? (parseInt(targetEl.value, 10) || this.drillTargetCount || 5) : (this.drillTargetCount || 5);
        const activeSentences = this.getFilteredSentences();
        this.drillQueue = activeSentences.map(s => s.id);
        this.drillProgress = {};
        this.drillGraduatedIds = [];
        this.drillTotalInitialCount = this.drillQueue.length;
        this.drillQueue.forEach(id => {
            this.drillProgress[id] = 0;
        });
        this.switchDensityMode('compact');
        this.updateDrillToolbarButton();
        this.showToast(`🎯 ${this.drillTargetCount}회 순환 소거 드릴 시작! (알면 맨 밑으로, 모르면 4칸 뒤로)`, 'info');
        this.renderSentenceList();
    }

    exitDrillMode() {
        this.isDrillMode = false;
        this.drillQueue = [];
        this.updateDrillToolbarButton();
        this.renderSentenceList();
        this.showToast('순환 드릴 모드가 종료되었습니다.', 'info');
    }

    handleDrillAnswer(itemId, isKnown) {
        if (!this.isDrillMode || !this.drillQueue) return;
        const idx = this.drillQueue.indexOf(itemId);
        if (idx === -1) return;

        const sentence = this.sentences.find(s => s.id === itemId);

        if (isKnown) {
            const currentCount = (this.drillProgress[itemId] || 0) + 1;
            this.drillProgress[itemId] = currentCount;

            if (currentCount >= this.drillTargetCount) {
                // 5번 알았다고 하면 리스트에서 완전히 제거 (졸업)!
                this.drillQueue.splice(idx, 1);
                if (!this.drillGraduatedIds.includes(itemId)) {
                    this.drillGraduatedIds.push(itemId);
                }
                if (sentence) {
                    sentence.memorized = true;
                    sentence.stage = 5;
                    sentence.lastStudiedAt = getTodayString();
                }
                this.saveState();
                this.showToast(`🎉 "${sentence?.english?.slice(0, 20) || ''}..." ${this.drillTargetCount}회 달성 완료! 리스트에서 졸업!`, 'success');
            } else {
                // 알았다고 하면 맨 밑으로 내려감!
                this.drillQueue.splice(idx, 1);
                this.drillQueue.push(itemId);
                this.showToast(`👍 알았다 (${currentCount}/${this.drillTargetCount}회) ➔ 맨 밑으로 이동!`, 'info');
            }
        } else {
            // 몰랐다고 하면 3~6칸 밑으로 가서 더 자주 봐야 함 (4칸 뒤로 삽입)!
            this.drillProgress[itemId] = Math.max(0, (this.drillProgress[itemId] || 0) - 1);
            this.drillQueue.splice(idx, 1);
            const insertIdx = Math.min(idx + 4, this.drillQueue.length);
            this.drillQueue.splice(insertIdx, 0, itemId);
            if (sentence) {
                sentence.wrongCount = (sentence.wrongCount || 0) + 1;
            }
            this.saveState();
            this.showToast(`⚠️ 몰랐다 ➔ 4칸 뒤로 재배치 (곧 다시 복습)`, 'warning');
        }

        this.renderSentenceList();
    }

    handleCompactMarkMemorized(item, isMemorized = true) {
        item.memorized = isMemorized;
        if (isMemorized) {
            item.stage = Math.max(item.stage || 1, 3);
            item.lastStudiedAt = getTodayString();
            if (!item.firstStudiedAt) item.firstStudiedAt = getTodayString();

            // 알았다고 하면 맨 밑으로 이동!
            const oldIdx = this.sentences.findIndex(s => s.id === item.id);
            if (oldIdx !== -1) {
                this.sentences.splice(oldIdx, 1);
                this.sentences.push(item);
                this.reassignNo();
            }
            this.showToast('✅ [알았다] 암기 완료 ➔ 맨 밑으로 이동', 'success');
        } else {
            this.showToast('🔄 학습 중으로 변경되었습니다.', 'info');
        }
        this.saveState();
        this.renderSentenceList();
    }

    handleCompactMarkHard(item) {
        item.wrongCount = (item.wrongCount || 0) + 1;
        item.memorized = false;
        item.stage = Math.max(1, (item.stage || 1) - 1);
        item.nextReviewDate = getTodayString();
        item.lastStudiedAt = getTodayString();
        if (!item.firstStudiedAt) item.firstStudiedAt = getTodayString();

        // 현재 보고 있는 리스트(filtered)에서 4칸 아래로 재배치!
        const filtered = this.getFilteredSentences();
        const currentFilteredIdx = filtered.findIndex(s => s.id === item.id);

        if (currentFilteredIdx !== -1 && filtered.length > 1) {
            // 3~5칸(기본 4칸) 아래의 타겟 아이템 찾기
            const targetFilteredIdx = Math.min(currentFilteredIdx + 4, filtered.length - 1);
            const targetItem = filtered[targetFilteredIdx];

            if (targetItem && targetItem.id !== item.id) {
                const oldIdx = this.sentences.findIndex(s => s.id === item.id);
                if (oldIdx !== -1) {
                    this.sentences.splice(oldIdx, 1);
                    const newTargetIdx = this.sentences.findIndex(s => s.id === targetItem.id);
                    if (newTargetIdx !== -1) {
                        this.sentences.splice(newTargetIdx + 1, 0, item);
                    } else {
                        this.sentences.push(item);
                    }
                    this.reassignNo();
                }
            }
        } else {
            const oldIdx = this.sentences.findIndex(s => s.id === item.id);
            if (oldIdx !== -1 && this.sentences.length > 1) {
                this.sentences.splice(oldIdx, 1);
                const targetIdx = Math.min(oldIdx + 4, this.sentences.length);
                this.sentences.splice(targetIdx, 0, item);
                this.reassignNo();
            }
        }

        this.saveState();
        this.showToast('🔁 [모름] 4칸 아래로 이동! 곧 다시 복습합니다.', 'warning');
        this.renderSentenceList();
    }

    isAnyModalOpen() {
        return [
            this.sentenceEditModal,
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
        targetCard.dataset.interactStartTime = Date.now().toString();
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
        if (this.cardCategory) {
            if (current.category && current.category !== '스크랩' && current.category !== '기타') {
                this.cardCategory.textContent = `${current.category} ${current.memorized ? '✓' : ''}`;
                this.cardCategory.classList.remove('hidden');
            } else {
                this.cardCategory.classList.add('hidden');
            }
        }

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
        
        // Calculate daily target count based on goal mode (daily count vs period completion)
        let targetLimit = 10;
        if (this.goal) {
            if (this.goal.type === 'period' && this.goal.targetDays) {
                const totalTarget = parseInt(this.goal.totalCount, 10) || active.length;
                const days = Math.max(parseInt(this.goal.targetDays, 10), 1);
                targetLimit = Math.max(1, Math.ceil(totalTarget / days));
            } else if (this.goal.dailyCount) {
                targetLimit = Math.max(1, parseInt(this.goal.dailyCount, 10));
            }
        }
        
        const reviewCap = (this.goal && this.goal.reviewCap !== undefined) ? parseInt(this.goal.reviewCap, 10) : 20;

        // 1. Due Review Sentences (Must be previously studied, not yet mastered)
        const dueReviews = active.filter(s => {
            const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
            if (!isStudied) return false; // Unstudied cards cannot be reviews!
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

        // Review quota should not exceed reviewCap or overall targetLimit
        const maxReviews = reviewCap > 0 ? Math.min(reviewCap, targetLimit) : targetLimit;
        const selectedReviews = dueReviews.slice(0, maxReviews);
        const reviewIds = new Set(selectedReviews.map(s => s.id));

        // 2. New Unstudied Sentences to fill up to targetLimit (cards never studied before)
        const unstudied = active.filter(s => {
            const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
            return !isStudied && !s.memorized && !reviewIds.has(s.id);
        });
        const neededNewCount = Math.max(0, targetLimit - selectedReviews.length);
        const selectedNew = unstudied.slice(0, neededNewCount);

        // 3. Combine reviews + new intake (Strictly capped to targetLimit)
        let focusList = [...selectedReviews, ...selectedNew];

        // Fallback: If no reviews and no unstudied, but unmemorized items exist, take up to targetLimit
        if (focusList.length === 0 && active.some(s => !s.memorized)) {
            focusList = active.filter(s => !s.memorized).slice(0, targetLimit);
        }

        // Guaranteed maximum count never exceeds targetLimit
        return focusList.slice(0, targetLimit);
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
        const sortMode = this.sortOrder ? this.sortOrder.value : 'no_asc';

        // Base pool is driven directly by the 3 Smart Stage Buckets
        const basePool = this.getBucketSentences(this.activeStudyBucket);

        let filtered = basePool.filter(s => {
            if (query) {
                const matchText = s.english.toLowerCase().includes(query) || s.korean.toLowerCase().includes(query);
                if (!matchText) return false;
            }
            if (catFilter !== 'all' && s.category !== catFilter) return false;
            return true;
        });

        filtered.sort((a, b) => {
            if (sortMode === 'no_asc') return a.no - b.no;
            if (sortMode === 'no_desc') return b.no - a.no;
            if (sortMode === 'wrong_desc') return (b.wrongCount || 0) - (a.wrongCount || 0);
            if (sortMode === 'due_asc') return (a.nextReviewDate || '').localeCompare(b.nextReviewDate || '');
            return a.no - b.no;
        });

        this.updateBucketBadges();
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

    /* Sentence Edit Methods */
    openEditSentenceModal(sentenceId) {
        const target = this.sentences.find(s => s.id === sentenceId);
        if (!target) return;

        if (!this.sentenceEditModal) return;

        // Prevent initial field setting from triggering auto-translate
        this.isProgrammaticEditSet = true;
        clearTimeout(this.editTranslateTimer);

        if (this.editSentenceId) this.editSentenceId.value = target.id;
        if (this.editSentenceEnglish) this.editSentenceEnglish.value = target.english || '';
        if (this.editSentenceKorean) this.editSentenceKorean.value = target.korean || '';
        if (this.editSentenceCategory) this.editSentenceCategory.value = target.category || '일상 회화';

        if (this.chkAutoTranslateInEdit) {
            this.chkAutoTranslateInEdit.checked = (localStorage.getItem('engcard_auto_translate') !== 'false');
        }
        if (this.editTranslateStatus) {
            this.editTranslateStatus.classList.add('hidden');
        }

        if (this.editSentenceDeck) {
            this.editSentenceDeck.innerHTML = this.decks.map(d => 
                `<option value="${d.id}" ${d.id === (target.deckId || 'deck_default') ? 'selected' : ''}>${this.escapeHtml(d.name)}</option>`
            ).join('');
        }

        this.sentenceEditModal.classList.remove('hidden');
        setTimeout(() => {
            this.isProgrammaticEditSet = false;
            if (this.editSentenceEnglish) {
                this.editSentenceEnglish.focus();
                this.editSentenceEnglish.select();
            }
        }, 120);
    }

    openEditModalForCurrentCard() {
        const current = this.getCurrentCardObject();
        if (!current) {
            this.showToast('수정할 문장이 없습니다.', 'warning');
            return;
        }
        this.openEditSentenceModal(current.id);
    }

    closeSentenceEditModal() {
        clearTimeout(this.editTranslateTimer);
        this.editTranslateTimer = null;
        if (this.editTranslateStatus) {
            this.editTranslateStatus.classList.add('hidden');
        }
        if (this.sentenceEditModal) {
            this.sentenceEditModal.classList.add('hidden');
        }
    }

    saveEditedSentence() {
        const id = this.editSentenceId ? this.editSentenceId.value : null;
        if (!id) return;

        const target = this.sentences.find(s => s.id === id);
        if (!target) return;

        const newEng = this.editSentenceEnglish ? this.editSentenceEnglish.value.trim() : '';
        const newKor = this.editSentenceKorean ? this.editSentenceKorean.value.trim() : '';
        const newCat = this.editSentenceCategory ? this.editSentenceCategory.value.trim() || '일상 회화' : '일상 회화';
        const newDeckId = this.editSentenceDeck ? this.editSentenceDeck.value : (target.deckId || 'deck_default');

        if (!newEng || !newKor) {
            this.showToast('영어 문장과 한국어 뜻을 모두 입력해주세요.', 'warning');
            return;
        }

        target.english = newEng;
        target.korean = newKor;
        target.category = newCat;
        target.deckId = newDeckId;

        this.saveState();
        this.closeSentenceEditModal();
        this.renderAll();
        this.showToast('✏️ 문장이 성공적으로 수정되었습니다!', 'success');
    }

    /* Structured DB Card List & Filter Renderer */
    renderSentenceList() {
        const filtered = this.getFilteredSentences();

        this.sentenceListContainer.innerHTML = '';

        if (filtered.length === 0) {
            this.sentenceListContainer.className = 'flex flex-col gap-3 w-full pb-8';
            if (this.activeStudyBucket === 'new') {
                let targetLimit = 10;
                if (this.goal && this.goal.dailyCount) {
                    targetLimit = Math.max(1, parseInt(this.goal.dailyCount, 10));
                }
                this.sentenceListContainer.innerHTML = `
                    <div class="bg-surface rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-center text-center gap-3 animate-fade-in-up my-4">
                        <div class="w-16 h-16 rounded-full bg-secondary-container text-secondary flex items-center justify-center text-3xl shadow-sm">
                            🎉
                        </div>
                        <h4 class="font-extrabold text-xl text-on-surface">오늘의 새 문장 학습 완료!</h4>
                        <p class="text-xs text-on-surface-variant leading-relaxed">
                            오늘 목표한 <b>${targetLimit}개</b>의 새로운 문장을 모두 공부했습니다.<br>
                            새로운 문장은 내일 다시 배정됩니다. 지금은 <b>[오늘 복습]</b>이나 <b>[취약/오답]</b>을 복습해보세요!
                        </p>
                        <div class="flex gap-2 mt-2 w-full max-w-xs">
                            <button onclick="window.app?.switchStudyBucket('review')" class="flex-1 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm">
                                오늘 복습하기 🔄
                            </button>
                            <button onclick="window.app?.startQuiz()" class="flex-1 py-2.5 bg-surface text-primary border border-primary/40 font-bold text-xs rounded-xl hover:bg-primary/5 active:scale-95 transition-all">
                                퀴즈 풀기 🧩
                            </button>
                        </div>
                    </div>
                `;
                return;
            }

            const bucketLabels = {
                review: '오늘 복습할 문장을 모두 완료했습니다! 👏',
                hard: '취약/오답 문장이 없습니다! 완벽합니다. 👍',
                all: '문장이 없습니다.'
            };
            const currentMsg = bucketLabels[this.activeStudyBucket] || '문장이 없습니다!';
            this.sentenceListContainer.innerHTML = `
                <div class="bg-surface rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-center text-center gap-3 animate-fade-in-up my-4">
                    <div class="w-16 h-16 rounded-full bg-secondary-container text-secondary flex items-center justify-center text-3xl shadow-sm">
                        ✨
                    </div>
                    <h4 class="font-extrabold text-xl text-on-surface">${currentMsg}</h4>
                    <p class="text-xs text-on-surface-variant leading-relaxed">
                        상단의 다른 스마트 버킷을 선택하여 학습을 이어가거나,<br>
                        퀴즈를 풀어 장기 기억으로 전환해보세요!
                    </p>
                    <div class="flex gap-2 mt-2 w-full max-w-xs">
                        <button onclick="window.app?.startQuiz()" class="flex-1 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm">
                            퀴즈 풀기 🧩
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        const isFeed = (this.viewDensity === 'feed');
        if (isFeed) {
            this.sentenceListContainer.className = 'flex flex-col gap-4 w-full pb-8';
        } else {
            this.sentenceListContainer.className = 'w-full flex flex-col gap-1.5 mb-8';
        }

        // Drill Control Dashboard Card state update
        const drillCard = document.getElementById('drillControlCard');
        const btnToggleDrill = document.getElementById('btnToggleDrillMode');
        const selectDrillTarget = document.getElementById('selectDrillTarget');
        if (selectDrillTarget && this.drillTargetCount) {
            selectDrillTarget.value = this.drillTargetCount.toString();
        }

        let listToRender = filtered;

        if (this.isDrillMode) {
            drillCard?.classList.remove('hidden');
            btnToggleDrill?.classList.add('bg-primary', 'text-white');
            btnToggleDrill?.classList.remove('bg-surface', 'text-primary');

            // If queue is empty, show victory screen!
            if (this.drillQueue && this.drillQueue.length === 0) {
                const totalInitial = this.drillTotalInitialCount || 0;
                this.sentenceListContainer.innerHTML = `
                    <div class="bg-surface rounded-3xl p-8 border border-emerald-300 shadow-sm flex flex-col items-center text-center gap-3 animate-fade-in-up my-4">
                        <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl shadow-xs font-black">
                            🏆
                        </div>
                        <h4 class="font-extrabold text-xl text-on-surface">${this.drillTargetCount}회 반복 드릴 완전 정복!</h4>
                        <p class="text-xs text-on-surface-variant leading-relaxed">
                            총 ${totalInitial}개 문장을 목표한 ${this.drillTargetCount}회씩 완벽하게 인출하여 리스트를 모두 졸업시켰습니다!<br>
                            장기 기억으로 단단하게 전환되었습니다.
                        </p>
                        <div class="flex gap-2 mt-2">
                            <button onclick="window.app?.startDrillMode()" class="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer">
                                다시 반복 드릴 시작 🔁
                            </button>
                            <button onclick="window.app?.exitDrillMode()" class="px-5 py-2.5 bg-surface-container-high text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container-highest transition-all cursor-pointer">
                                드릴 종료 및 전체 목록
                            </button>
                        </div>
                    </div>
                `;
                const progressBar = document.getElementById('drillProgressBar');
                const progressText = document.getElementById('drillProgressText');
                if (progressBar) progressBar.style.width = '100%';
                if (progressText) progressText.textContent = `전체 ${totalInitial}개 문장 졸업 완료! (100%)`;
                return;
            }

            if (this.drillQueue) {
                listToRender = this.drillQueue.map(id => this.sentences.find(s => s.id === id)).filter(Boolean);
            }

            const totalInitial = this.drillTotalInitialCount || (listToRender ? listToRender.length : 1);
            const graduatedCount = (this.drillGraduatedIds || []).length;
            const remainingCount = (this.drillQueue || []).length;
            const pct = totalInitial > 0 ? (graduatedCount / totalInitial) * 100 : 0;

            const progressBar = document.getElementById('drillProgressBar');
            const progressText = document.getElementById('drillProgressText');
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) {
                progressText.textContent = `남은 문장: ${remainingCount}개 | ${this.drillTargetCount}회 졸업: ${graduatedCount}/${totalInitial} (${Math.round(pct)}%)`;
            }
        } else {
            drillCard?.classList.add('hidden');
            btnToggleDrill?.classList.remove('bg-primary', 'text-white');
            btnToggleDrill?.classList.add('bg-surface', 'text-primary');
        }

        listToRender.forEach((item, index) => {
            const isSelected = this.selectedSentenceIds.has(item.id);
            const isRevealed = this.revealedItemIds.has(item.id);
            const isCardHinted = this.hintedItemIds.has(item.id);
            const isHinted = (isCardHinted || this.isGlobalHintActive) && !isRevealed;
            const hintEng = this.getFirstLetterHint(item.english);

            // Status Dot Color
            let statusDotColor = 'bg-primary';
            if (item.memorized) {
                statusDotColor = 'bg-secondary';
            } else if ((item.wrongCount || 0) > 0) {
                statusDotColor = 'bg-error';
            } else if ((item.studyCount || 0) > 0 || item.lastStudiedAt) {
                statusDotColor = 'bg-tertiary-fixed-dim';
            }

            const checkboxHtml = this.isSelectionMode
                ? `<div class="flex-shrink-0"><input type="checkbox" class="item-checkbox w-4 h-4 rounded text-primary border-outline-variant focus:ring-primary" ${isSelected ? 'checked' : ''}></div>`
                : '';

            let cardEl;

            if (isFeed) {
                // ================= 2~3개 피드 모드 (큼직하고 여유로운 카드) =================
                cardEl = document.createElement('div');
                cardEl.className = `swipe-card-item w-full rounded-3xl ${isSelected ? 'selected' : ''}`;
                cardEl.dataset.id = item.id;
                cardEl.dataset.interactStartTime = Date.now().toString();

                let textBlocksHtml = '';
                if (this.listDisplayMode === 'kor_only') {
                    let engDisplayHtml = '';
                    if (isRevealed) {
                        engDisplayHtml = `<p class="sentence-eng-text font-bold text-base sm:text-lg text-primary mt-1 text-left transition-all tracking-tight break-words whitespace-normal">${item.english}</p>`;
                    } else if (isHinted) {
                        engDisplayHtml = `<p class="sentence-eng-text font-mono font-bold text-base sm:text-lg text-amber-600 mt-1 text-left transition-all tracking-wider break-words whitespace-normal">${hintEng}</p>`;
                    } else {
                        engDisplayHtml = `<p class="sentence-eng-text font-bold text-base sm:text-lg text-primary mt-1 text-left transition-all tracking-tight blur-mask break-words whitespace-normal">${item.english}</p>`;
                    }
                    textBlocksHtml = `
                        <div class="mt-0.5 text-left">
                            <p class="sentence-kor-text font-extrabold text-lg sm:text-xl text-on-surface leading-snug text-left transition-all break-words whitespace-normal">${item.korean}</p>
                        </div>
                        ${engDisplayHtml}
                    `;
                } else if (this.listDisplayMode === 'eng_only') {
                    let korDisplayHtml = '';
                    if (isRevealed) {
                        korDisplayHtml = `<p class="sentence-kor-text font-bold text-base sm:text-lg text-primary mt-1 text-left transition-all leading-relaxed break-words whitespace-normal">${item.korean}</p>`;
                    } else if (isHinted) {
                        const korHint = item.korean.slice(0, Math.min(3, item.korean.length)) + '...';
                        korDisplayHtml = `<p class="sentence-kor-text font-bold text-base sm:text-lg text-amber-600 mt-1 text-left transition-all leading-relaxed break-words whitespace-normal">${korHint}</p>`;
                    } else {
                        korDisplayHtml = `<p class="sentence-kor-text font-bold text-base sm:text-lg text-primary mt-1 text-left transition-all leading-relaxed blur-mask break-words whitespace-normal">${item.korean}</p>`;
                    }
                    textBlocksHtml = `
                        <div class="mt-0.5 text-left">
                            <p class="sentence-eng-text font-extrabold text-lg sm:text-xl text-on-surface leading-snug text-left transition-all tracking-tight break-words whitespace-normal">${item.english}</p>
                        </div>
                        ${korDisplayHtml}
                    `;
                } else {
                    if (this.listPrimaryLanguage === 'eng') {
                        let engDisplayHtml = '';
                        if (isHinted) {
                            engDisplayHtml = `<p class="sentence-eng-text font-mono font-extrabold text-lg sm:text-xl text-amber-600 leading-snug text-left transition-all tracking-wider break-words whitespace-normal">${hintEng}</p>`;
                        } else if (isRevealed) {
                            engDisplayHtml = `<p class="sentence-eng-text font-extrabold text-lg sm:text-xl text-primary leading-snug text-left transition-all tracking-tight break-words whitespace-normal">${item.english}</p>`;
                        } else {
                            engDisplayHtml = `<p class="sentence-eng-text font-extrabold text-lg sm:text-xl text-on-surface leading-snug text-left transition-all tracking-tight break-words whitespace-normal">${item.english}</p>`;
                        }
                        textBlocksHtml = `
                            <div class="mt-0.5 text-left">
                                ${engDisplayHtml}
                            </div>
                            <p class="sentence-kor-text font-bold text-base sm:text-lg text-on-surface-variant mt-1 text-left transition-all leading-relaxed break-words whitespace-normal">${item.korean}</p>
                        `;
                    } else {
                        let engDisplayHtml = '';
                        if (isHinted) {
                            engDisplayHtml = `<p class="sentence-eng-text font-mono font-bold text-base sm:text-lg text-amber-600 mt-1 text-left transition-all tracking-wider break-words whitespace-normal">${hintEng}</p>`;
                        } else if (isRevealed) {
                            engDisplayHtml = `<p class="sentence-eng-text font-bold text-base sm:text-lg text-primary mt-1 text-left transition-all tracking-tight break-words whitespace-normal">${item.english}</p>`;
                        } else {
                            engDisplayHtml = `<p class="sentence-eng-text font-bold text-base sm:text-lg text-primary mt-1 text-left transition-all tracking-tight break-words whitespace-normal">${item.english}</p>`;
                        }
                        textBlocksHtml = `
                            <div class="mt-0.5 text-left">
                                <p class="sentence-kor-text font-extrabold text-lg sm:text-xl text-on-surface leading-snug text-left transition-all break-words whitespace-normal">${item.korean}</p>
                            </div>
                            ${engDisplayHtml}
                        `;
                    }
                }

                const studyCount = Math.max(item.studyCount || 0, (item.wrongCount || 0) + (item.lastStudiedAt ? 1 : 0));
                const isNew = (!item.lastStudiedAt && (item.studyCount || 0) === 0 && (item.wrongCount || 0) === 0);
                let statusBadgeHtml = '';
                if (item.memorized) {
                    statusBadgeHtml = `<span class="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-0.5 flex-shrink-0">✓ 암기완료</span>`;
                } else if (isNew) {
                    statusBadgeHtml = `<span class="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-0.5 flex-shrink-0">✨ 신규</span>`;
                } else if ((item.wrongCount || 0) > 0) {
                    statusBadgeHtml = `<span class="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-0.5 flex-shrink-0">⚠️ 오답 ${item.wrongCount}회</span>`;
                } else {
                    statusBadgeHtml = `<span class="bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-0.5 flex-shrink-0">🔄 복습 ${studyCount}회차</span>`;
                }

                const hintBtnClass = isHinted
                    ? 'text-amber-700 bg-amber-500/15 border border-amber-500/30 font-extrabold shadow-xs'
                    : 'text-outline-variant hover:text-amber-700 hover:bg-amber-500/10';

                const deleteBtnHtml = !this.isSelectionMode
                    ? `<button class="btn-delete-item p-1.5 text-outline-variant hover:text-error rounded-lg hover:bg-error-container/20 transition-all flex-shrink-0" title="문장 삭제"><span class="material-symbols-outlined text-[18px]">delete</span></button>`
                    : '';

                const editBtnHtml = !this.isSelectionMode
                    ? `<button class="btn-item-edit p-1.5 text-outline-variant hover:text-primary rounded-lg hover:bg-primary-fixed/40 transition-all flex-shrink-0" title="문장 수정"><span class="material-symbols-outlined text-[17px]">edit</span></button>`
                    : '';

                cardEl.innerHTML = `
                    <div class="swipe-bg-overlay swipe-bg-left">
                        <span class="material-symbols-outlined text-xl mr-2">close</span>
                        <span>모르는 문장 (오늘 다시)</span>
                    </div>
                    <div class="swipe-bg-overlay swipe-bg-right">
                        <span>암기 완료 (Mastered)</span>
                        <span class="material-symbols-outlined text-xl ml-2">check</span>
                    </div>
                    <div class="swipe-card-inner flex flex-col gap-2.5 p-4 sm:p-5 bg-white rounded-3xl w-full border border-outline-variant/20 shadow-sm hover:shadow-md transition-all text-left">
                        <div class="flex items-center justify-between gap-2 w-full">
                            <div class="flex items-center gap-1.5 text-left flex-wrap min-w-0">
                                ${checkboxHtml}
                                <div class="card-reorder-group flex items-center text-outline-variant flex-shrink-0">
                                    <button class="btn-reorder btn-move-up p-0.5 hover:text-primary transition-colors" title="위로 이동"><span class="material-symbols-outlined text-[14px]">expand_less</span></button>
                                    <button class="btn-reorder btn-move-down p-0.5 hover:text-primary transition-colors" title="아래로 이동"><span class="material-symbols-outlined text-[14px]">expand_more</span></button>
                                </div>
                                <div class="w-2 h-2 rounded-full ${statusDotColor} flex-shrink-0"></div>
                                <span class="text-[11px] font-mono font-bold text-outline-variant bg-surface-container px-1.5 py-0.5 rounded-md flex-shrink-0">#${index + 1}</span>
                                ${statusBadgeHtml}
                                ${(item.category && item.category !== '스크랩' && item.category !== '기타') ? `<span class="text-[10px] font-semibold text-on-surface-variant/80 bg-surface-container-low px-2 py-0.5 rounded-md border border-outline-variant/30">${item.category}</span>` : ''}
                            </div>
                            <div class="flex items-center justify-end gap-0.5 flex-shrink-0 ml-auto">
                                <button class="btn-item-hint p-1.5 ${hintBtnClass} rounded-lg transition-all" title="첫 글자 힌트">
                                    <span class="material-symbols-outlined text-[17px]">lightbulb</span>
                                </button>
                                <button class="btn-item-voice p-1.5 text-outline-variant hover:text-secondary hover:bg-secondary-container/40 rounded-lg transition-all" title="발음 쉐도잉 평가">
                                    <span class="material-symbols-outlined text-[17px]">mic</span>
                                </button>
                                <button class="btn-item-download-mp3 p-1.5 text-outline-variant hover:text-primary hover:bg-primary-fixed/40 rounded-lg transition-all" title="원어민 MP3 다운로드">
                                    <span class="material-symbols-outlined text-[17px]">download</span>
                                </button>
                                <button class="btn-item-tts p-1.5 text-outline-variant hover:text-primary hover:bg-primary-fixed/40 rounded-lg transition-all" title="발음 듣기">
                                    <span class="material-symbols-outlined text-[17px]">volume_up</span>
                                </button>
                                ${editBtnHtml}
                                ${deleteBtnHtml}
                            </div>
                        </div>
                        <div class="card-text-wrapper w-full flex flex-col gap-1 cursor-pointer text-left">
                            ${textBlocksHtml}
                        </div>
                        <div class="flex items-center justify-between text-[11px] text-on-surface-variant/60 pt-2 border-t border-surface-container-high/60 mt-0.5 select-none">
                            <span class="flex items-center gap-1">
                                <span class="material-symbols-outlined text-[14px] text-primary">touch_app</span>
                                <span>${this.listDisplayMode === 'both' ? '소리내어 읽기' : (isRevealed ? '확인 완료' : '탭: 정답 확인')}</span>
                            </span>
                            <span class="flex items-center gap-1">
                                <span class="material-symbols-outlined text-[14px]">swipe</span>
                                <span>좌우 스와이프: 암기 판정</span>
                            </span>
                        </div>
                    </div>
                `;
            } else {
                // ================= 콤팩트 모드 (Idea 1: 초슬림 1줄 사전식 리스트) =================
                cardEl = document.createElement('div');
                cardEl.dataset.id = item.id;

                let compactTextHtml = '';

                if (this.listDisplayMode === 'kor_only') {
                    if (!isRevealed) {
                        let engHint = isHinted ? `<p class="sentence-eng-text font-mono font-bold text-xs sm:text-sm text-amber-600 break-words whitespace-normal mt-0.5">${hintEng}</p>` : '';
                        compactTextHtml = `
                            <div class="flex flex-col min-w-0 w-full py-0.5">
                                <span class="sentence-kor-text font-extrabold text-sm sm:text-base text-on-surface break-words whitespace-normal leading-snug">${item.korean}</span>
                                ${engHint}
                            </div>
                        `;
                    } else {
                        compactTextHtml = `
                            <div class="flex flex-col min-w-0 w-full py-0.5">
                                <span class="sentence-eng-text font-extrabold text-sm sm:text-base text-primary break-words whitespace-normal leading-snug">${item.english}</span>
                                <span class="sentence-kor-text font-medium text-xs sm:text-sm text-on-surface-variant break-words whitespace-normal mt-0.5">${item.korean}</span>
                            </div>
                        `;
                    }
                } else if (this.listDisplayMode === 'eng_only') {
                    if (!isRevealed) {
                        compactTextHtml = `
                            <div class="flex flex-col min-w-0 w-full py-0.5">
                                <span class="sentence-eng-text font-extrabold text-sm sm:text-base text-on-surface break-words whitespace-normal leading-snug">${item.english}</span>
                            </div>
                        `;
                    } else {
                        compactTextHtml = `
                            <div class="flex flex-col min-w-0 w-full py-0.5">
                                <span class="sentence-kor-text font-extrabold text-sm sm:text-base text-primary break-words whitespace-normal leading-snug">${item.korean}</span>
                                <span class="sentence-eng-text font-medium text-xs sm:text-sm text-on-surface-variant break-words whitespace-normal mt-0.5">${item.english}</span>
                            </div>
                        `;
                    }
                } else {
                    // 전체보기 (both) 모드: 2줄 콤팩트 레이아웃 (긴 문장은 엔터 쳐서 자동 줄바꿈)
                    let engDisplayHtml = '';
                    if (isHinted) {
                        engDisplayHtml = `<p class="sentence-eng-text font-mono font-bold text-sm sm:text-base text-amber-600 leading-snug break-words whitespace-normal">${hintEng}</p>`;
                    } else if (isRevealed) {
                        engDisplayHtml = `<p class="sentence-eng-text font-bold text-sm sm:text-base text-primary leading-snug break-words whitespace-normal">${item.english}</p>`;
                    } else {
                        engDisplayHtml = `<p class="sentence-eng-text font-bold text-sm sm:text-base text-on-surface leading-snug break-words whitespace-normal">${item.english}</p>`;
                    }
                    compactTextHtml = `
                        <div class="flex flex-col justify-center w-full min-w-0 py-0.5">
                            ${engDisplayHtml}
                            <p class="sentence-kor-text font-medium text-xs sm:text-sm text-on-surface-variant leading-snug mt-0.5 break-words whitespace-normal">${item.korean}</p>
                        </div>
                    `;
                }

                let drillBadgeCompactHtml = '';
                if (this.isDrillMode) {
                    const drillCount = this.drillProgress[item.id] || 0;
                    drillBadgeCompactHtml = `
                        <span class="text-[10px] font-mono font-black px-1 py-0.2 rounded ${drillCount >= this.drillTargetCount ? 'bg-emerald-100 text-emerald-800' : 'bg-primary/10 text-primary'} flex-shrink-0" title="달성 횟수">
                            ${drillCount}/${this.drillTargetCount}
                        </span>
                    `;
                }

                cardEl.className = `compact-row-container relative overflow-hidden rounded-xl bg-surface-container-highest/20 transition-all select-none ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`;
                cardEl.innerHTML = `
                    <!-- Swipe Right background (알았다 / 암기 완료) -->
                    <div class="swipe-bg-right absolute inset-0 bg-emerald-500 text-white flex items-center px-4 font-black text-xs sm:text-sm opacity-0 transition-opacity pointer-events-none z-0">
                        <span class="material-symbols-outlined text-[18px] mr-1.5">check_circle</span>
                        <span>${this.isDrillMode ? '알았다 (맨 밑으로)' : '암기 완료'}</span>
                    </div>
                    <!-- Swipe Left background (몰랐다 / 취약 등록) -->
                    <div class="swipe-bg-left absolute inset-0 bg-amber-500 text-white flex items-center justify-end px-4 font-black text-xs sm:text-sm opacity-0 transition-opacity pointer-events-none z-0">
                        <span>${this.isDrillMode ? '몰랐다 (4칸 뒤로)' : '취약/오답 등록'}</span>
                        <span class="material-symbols-outlined text-[18px] ml-1.5">${this.isDrillMode ? 'replay' : 'warning'}</span>
                    </div>
                    <!-- Swipable Inner Content (본문 영역 88%+ 극대화 레이아웃) -->
                    <div class="compact-row-inner relative bg-white py-2.5 px-3 flex items-center justify-between transition-transform z-10 cursor-pointer border border-outline-variant/25 hover:border-primary/40 rounded-xl">
                        <div class="flex items-center gap-2 flex-grow min-w-0 pr-1">
                            ${checkboxHtml}
                            <span class="text-[11px] font-mono font-bold text-outline-variant/60 w-4 text-right flex-shrink-0">${index + 1}</span>
                            <span class="w-1.5 h-1.5 rounded-full ${statusDotColor} flex-shrink-0"></span>
                            ${drillBadgeCompactHtml}
                            <div class="card-text-wrapper flex-grow min-w-0">
                                ${compactTextHtml}
                            </div>
                        </div>
                        <div class="flex items-center gap-0.5 flex-shrink-0 ml-1">
                            <button class="btn-item-download-mp3 p-1 text-outline-variant/35 hover:text-primary transition-colors cursor-pointer" title="원어민 MP3 다운로드">
                                <span class="material-symbols-outlined text-[15px]">download</span>
                            </button>
                            <button class="btn-item-edit p-1 text-outline-variant/35 hover:text-primary transition-colors cursor-pointer" title="문장 수정">
                                <span class="material-symbols-outlined text-[15px]">edit</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            const innerEl = cardEl.querySelector('.swipe-card-inner') || cardEl.querySelector('.compact-row-inner');
            const overlayLeft = cardEl.querySelector('.swipe-bg-left');
            const overlayRight = cardEl.querySelector('.swipe-bg-right');

            const btnUp = cardEl.querySelector('.btn-move-up');
            const btnDown = cardEl.querySelector('.btn-move-down');
            const btnDelete = cardEl.querySelector('.btn-delete-item');
            const btnEdit = cardEl.querySelector('.btn-item-edit');
            const btnTts = cardEl.querySelector('.btn-item-tts');
            const btnDownloadMp3 = cardEl.querySelector('.btn-item-download-mp3');
            const btnHint = cardEl.querySelector('.btn-item-hint');
            const btnVoice = cardEl.querySelector('.btn-item-voice');
            const textWrapper = cardEl.querySelector('.card-text-wrapper');
            const checkboxEl = cardEl.querySelector('.item-checkbox');

            btnDownloadMp3?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadSentenceMp3(item);
            });

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

            btnVoice?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startVoiceShadowing(item);
            });

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

            btnEdit?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditSentenceModal(item.id);
            });

            btnTts?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.speakText(item.english);
            });

            const btnCheck = cardEl.querySelector('.btn-item-check');
            btnCheck?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleCompactMarkMemorized(item, !item.memorized);
            });

            checkboxEl?.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSentenceSelection(item.id);
            });

            textWrapper?.addEventListener('click', (e) => {
                if (cardEl._lastSwipeTime && Date.now() - cardEl._lastSwipeTime < 350) return;
                if (this.isSelectionMode) {
                    this.toggleSentenceSelection(item.id);
                    return;
                }

                // If currently masked or hinted (either card hint or global hint)
                const isCurrentlyHintedOrMasked = (this.listDisplayMode !== 'both') || isHinted || this.isGlobalHintActive || this.hintedItemIds.has(item.id);

                if (isCurrentlyHintedOrMasked) {
                    if (this.revealedItemIds.has(item.id)) {
                        this.revealedItemIds.delete(item.id);
                    } else {
                        this.revealedItemIds.add(item.id);
                        this.speakText(item.english);
                    }
                    this.renderSentenceList();
                } else {
                    this.speakText(item.english);
                }
            });

            if (!isFeed) {
                cardEl.addEventListener('click', (e) => {
                    if (cardEl._lastSwipeTime && Date.now() - cardEl._lastSwipeTime < 350) return;
                    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.card-text-wrapper')) return;
                    textWrapper?.click();
                });
            }

            if (isFeed && !this.isSelectionMode && innerEl) {
                this.bindRowSwipeGestures(cardEl, innerEl, overlayLeft, overlayRight, item);
            } else if (!isFeed && !this.isSelectionMode && innerEl) {
                this.bindCompactRowSwipe(cardEl, innerEl, overlayLeft, overlayRight, item, index);
            }

            this.sentenceListContainer.appendChild(cardEl);
        });
    }

    bindRowSwipeGestures(cardEl, innerEl, overlayLeft, overlayRight, item) {
        if (!innerEl) return;
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        let isHorizontalSwipe = false;
        let rowTouchStartTime = Date.now();

        const triggerSwipeRight = () => {
            innerEl.style.transform = 'translateX(120%)';
            cardEl.classList.add('dismissed');

            const interactStart = parseInt(cardEl.dataset.interactStartTime, 10) || rowTouchStartTime;
            const latencyMs = Math.max(Date.now() - interactStart, 100);
            const latencySec = latencyMs / 1000;

            setTimeout(() => {
                item.memorized = true;
                item.studyCount = (item.studyCount || 0) + 1;
                item.lastStudiedAt = getTodayString();
                if (!item.firstStudiedAt) item.firstStudiedAt = getTodayString();

                if (latencySec >= 4.5) {
                    item.nextReviewDate = addDaysToDate(getTodayString(), 1);
                    this.showToast(`✓ [망설임 감지] (${latencySec.toFixed(1)}s): 1일 후 복습`, 'info');
                } else if (latencySec < 2.0) {
                    item.intervalStep = Math.min((item.intervalStep || 0) + 2, EBBINGHAUS_INTERVALS.length - 1);
                    const daysToAdd = EBBINGHAUS_INTERVALS[item.intervalStep];
                    item.nextReviewDate = addDaysToDate(getTodayString(), daysToAdd);
                    this.showToast(`⚡ [Easy] 쾌속 통과! ${daysToAdd}일 후 복습 (${latencySec.toFixed(1)}s)`, 'success');
                } else {
                    item.intervalStep = Math.min((item.intervalStep || 0) + 1, EBBINGHAUS_INTERVALS.length - 1);
                    const daysToAdd = EBBINGHAUS_INTERVALS[item.intervalStep];
                    item.nextReviewDate = addDaysToDate(getTodayString(), daysToAdd);
                    this.showToast(`✓ [Good] ${daysToAdd}일 후 복습 예정 (${latencySec.toFixed(1)}s)`, 'success');
                }

                this.saveState();
                this.renderSentenceList();
                this.checkDeckMilestones(item.deckId || this.activeDeckId);

                if (this.isSpeedTriageActive) {
                    this.startListSpeedSprint(this.listSprintCurrentIndex);
                }
            }, 250);
        };

        const triggerSwipeLeft = () => {
            innerEl.style.transform = 'translateX(-120%)';
            cardEl.classList.add('dismissed');
            setTimeout(() => {
                item.memorized = false;
                item.studyCount = (item.studyCount || 0) + 1;
                item.wrongCount = (item.wrongCount || 0) + 1;
                item.intervalStep = 0;
                item.nextReviewDate = getTodayString();
                item.lastStudiedAt = getTodayString();
                if (!item.firstStudiedAt) item.firstStudiedAt = getTodayString();

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
        };

        // --- Touch Event Handlers (Mobile) ---
        const onTouchStart = (e) => {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = touch.clientX;
            currentY = touch.clientY;
            isDragging = true;
            isHorizontalSwipe = false;
            rowTouchStartTime = Date.now();
            innerEl.style.transition = 'none';
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            currentX = touch.clientX;
            currentY = touch.clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            if (!isHorizontalSwipe) {
                if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
                    isDragging = false;
                    return;
                }
                if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    isHorizontalSwipe = true;
                }
            }

            if (isHorizontalSwipe) {
                if (e.cancelable) e.preventDefault();
                innerEl.style.transform = `translateX(${deltaX}px)`;
                if (deltaX > 20) {
                    if (overlayRight) overlayRight.style.opacity = Math.min((deltaX - 20) / 70, 1);
                    if (overlayLeft) overlayLeft.style.opacity = 0;
                } else if (deltaX < -20) {
                    if (overlayLeft) overlayLeft.style.opacity = Math.min((-deltaX - 20) / 70, 1);
                    if (overlayRight) overlayRight.style.opacity = 0;
                } else {
                    if (overlayLeft) overlayLeft.style.opacity = 0;
                    if (overlayRight) overlayRight.style.opacity = 0;
                }
            }
        };

        const onTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = currentX - startX;
            innerEl.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

            if (isHorizontalSwipe && Math.abs(deltaX) > 15) {
                cardEl._lastSwipeTime = Date.now();
            }

            if (isHorizontalSwipe && deltaX > 55) {
                triggerSwipeRight();
            } else if (isHorizontalSwipe && deltaX < -55) {
                triggerSwipeLeft();
            } else {
                innerEl.style.transform = 'translateX(0px)';
                if (overlayLeft) overlayLeft.style.opacity = 0;
                if (overlayRight) overlayRight.style.opacity = 0;
            }
        };

        const onTouchCancel = () => {
            isDragging = false;
            isHorizontalSwipe = false;
            innerEl.style.transition = 'transform 0.2s ease';
            innerEl.style.transform = 'translateX(0px)';
            if (overlayLeft) overlayLeft.style.opacity = 0;
            if (overlayRight) overlayRight.style.opacity = 0;
        };

        innerEl.addEventListener('touchstart', onTouchStart, { passive: true });
        innerEl.addEventListener('touchmove', onTouchMove, { passive: false });
        innerEl.addEventListener('touchend', onTouchEnd);
        innerEl.addEventListener('touchcancel', onTouchCancel);

        // --- Mouse Event Handlers (Desktop) ---
        let isMouseDown = false;
        const onMouseDown = (e) => {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
            if (Date.now() - (cardEl._lastSwipeTime || 0) < 500) return;
            startX = e.clientX;
            startY = e.clientY;
            currentX = e.clientX;
            currentY = e.clientY;
            isMouseDown = true;
            isHorizontalSwipe = false;
            rowTouchStartTime = Date.now();
            innerEl.style.transition = 'none';

            const onMouseMove = (ev) => {
                if (!isMouseDown) return;
                currentX = ev.clientX;
                currentY = ev.clientY;
                const deltaX = currentX - startX;
                const deltaY = currentY - startY;

                if (!isHorizontalSwipe && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    isHorizontalSwipe = true;
                }

                if (isHorizontalSwipe) {
                    innerEl.style.transform = `translateX(${deltaX}px)`;
                    if (deltaX > 20) {
                        if (overlayRight) overlayRight.style.opacity = Math.min((deltaX - 20) / 70, 1);
                        if (overlayLeft) overlayLeft.style.opacity = 0;
                    } else if (deltaX < -20) {
                        if (overlayLeft) overlayLeft.style.opacity = Math.min((-deltaX - 20) / 70, 1);
                        if (overlayRight) overlayRight.style.opacity = 0;
                    } else {
                        if (overlayLeft) overlayLeft.style.opacity = 0;
                        if (overlayRight) overlayRight.style.opacity = 0;
                    }
                }
            };

            const onMouseUp = () => {
                if (!isMouseDown) return;
                isMouseDown = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);

                const deltaX = currentX - startX;
                innerEl.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

                if (isHorizontalSwipe && Math.abs(deltaX) > 15) {
                    cardEl._lastSwipeTime = Date.now();
                }

                if (isHorizontalSwipe && deltaX > 55) {
                    triggerSwipeRight();
                } else if (isHorizontalSwipe && deltaX < -55) {
                    triggerSwipeLeft();
                } else {
                    innerEl.style.transform = 'translateX(0px)';
                    if (overlayLeft) overlayLeft.style.opacity = 0;
                    if (overlayRight) overlayRight.style.opacity = 0;
                }
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        innerEl.addEventListener('mousedown', onMouseDown);
    }

    bindCompactRowSwipe(cardEl, innerEl, overlayLeft, overlayRight, item, index) {
        if (!innerEl) return;
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        let isHorizontalSwipe = false;

        // --- Touch Event Handlers (Mobile) ---
        const onTouchStart = (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = touch.clientX;
            currentY = touch.clientY;
            isDragging = true;
            isHorizontalSwipe = false;
            innerEl.style.transition = 'none';
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            currentX = touch.clientX;
            currentY = touch.clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            // Determine if horizontal swipe vs vertical scroll
            if (!isHorizontalSwipe) {
                if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
                    isDragging = false;
                    return;
                }
                if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    isHorizontalSwipe = true;
                }
            }

            if (isHorizontalSwipe) {
                if (e.cancelable) e.preventDefault(); // Crucial on mobile: prevent native scroll hijack
                innerEl.style.transform = `translateX(${deltaX}px)`;
                if (deltaX > 15) {
                    if (overlayRight) overlayRight.style.opacity = Math.min((deltaX - 15) / 55, 1);
                    if (overlayLeft) overlayLeft.style.opacity = 0;
                } else if (deltaX < -15) {
                    if (overlayLeft) overlayLeft.style.opacity = Math.min((-deltaX - 15) / 55, 1);
                    if (overlayRight) overlayRight.style.opacity = 0;
                } else {
                    if (overlayLeft) overlayLeft.style.opacity = 0;
                    if (overlayRight) overlayRight.style.opacity = 0;
                }
            }
        };

        const onTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = currentX - startX;
            innerEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';

            if (isHorizontalSwipe && Math.abs(deltaX) > 15) {
                cardEl._lastSwipeTime = Date.now();
            }

            if (isHorizontalSwipe && deltaX > 50) {
                // Swiped Right -> Known / Memorized
                innerEl.style.transform = 'translateX(120%)';
                this.triggerHaptic('medium');
                setTimeout(() => {
                    if (this.isDrillMode) {
                        this.handleDrillAnswer(item.id, true);
                    } else {
                        this.handleCompactMarkMemorized(item, true);
                    }
                }, 180);
            } else if (isHorizontalSwipe && deltaX < -50) {
                // Swiped Left -> Unknown / Hard
                innerEl.style.transform = 'translateX(-120%)';
                this.triggerHaptic('light');
                setTimeout(() => {
                    if (this.isDrillMode) {
                        this.handleDrillAnswer(item.id, false);
                    } else {
                        this.handleCompactMarkHard(item);
                    }
                }, 180);
            } else {
                // Return to center
                innerEl.style.transform = 'translateX(0)';
                if (overlayLeft) overlayLeft.style.opacity = 0;
                if (overlayRight) overlayRight.style.opacity = 0;
            }
        };

        const onTouchCancel = () => {
            isDragging = false;
            isHorizontalSwipe = false;
            innerEl.style.transition = 'transform 0.2s ease';
            innerEl.style.transform = 'translateX(0)';
            if (overlayLeft) overlayLeft.style.opacity = 0;
            if (overlayRight) overlayRight.style.opacity = 0;
        };

        innerEl.addEventListener('touchstart', onTouchStart, { passive: true });
        innerEl.addEventListener('touchmove', onTouchMove, { passive: false });
        innerEl.addEventListener('touchend', onTouchEnd);
        innerEl.addEventListener('touchcancel', onTouchCancel);

        // --- Mouse Event Handlers (Desktop) ---
        let isMouseDown = false;
        const onMouseDown = (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
            if (Date.now() - (cardEl._lastSwipeTime || 0) < 500) return;
            startX = e.clientX;
            startY = e.clientY;
            currentX = e.clientX;
            currentY = e.clientY;
            isMouseDown = true;
            isHorizontalSwipe = false;
            innerEl.style.transition = 'none';

            const onMouseMove = (ev) => {
                if (!isMouseDown) return;
                currentX = ev.clientX;
                currentY = ev.clientY;
                const deltaX = currentX - startX;
                const deltaY = currentY - startY;

                if (!isHorizontalSwipe && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    isHorizontalSwipe = true;
                }

                if (isHorizontalSwipe) {
                    innerEl.style.transform = `translateX(${deltaX}px)`;
                    if (deltaX > 15) {
                        if (overlayRight) overlayRight.style.opacity = Math.min((deltaX - 15) / 55, 1);
                        if (overlayLeft) overlayLeft.style.opacity = 0;
                    } else if (deltaX < -15) {
                        if (overlayLeft) overlayLeft.style.opacity = Math.min((-deltaX - 15) / 55, 1);
                        if (overlayRight) overlayRight.style.opacity = 0;
                    } else {
                        if (overlayLeft) overlayLeft.style.opacity = 0;
                        if (overlayRight) overlayRight.style.opacity = 0;
                    }
                }
            };

            const onMouseUp = () => {
                if (!isMouseDown) return;
                isMouseDown = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);

                const deltaX = currentX - startX;
                innerEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';

                if (isHorizontalSwipe && Math.abs(deltaX) > 15) {
                    cardEl._lastSwipeTime = Date.now();
                }

                if (isHorizontalSwipe && deltaX > 50) {
                    innerEl.style.transform = 'translateX(120%)';
                    this.triggerHaptic('medium');
                    setTimeout(() => {
                        if (this.isDrillMode) {
                            this.handleDrillAnswer(item.id, true);
                        } else {
                            this.handleCompactMarkMemorized(item, true);
                        }
                    }, 180);
                } else if (isHorizontalSwipe && deltaX < -50) {
                    innerEl.style.transform = 'translateX(-120%)';
                    this.triggerHaptic('light');
                    setTimeout(() => {
                        if (this.isDrillMode) {
                            this.handleDrillAnswer(item.id, false);
                        } else {
                            this.handleCompactMarkHard(item);
                        }
                    }, 180);
                } else {
                    innerEl.style.transform = 'translateX(0)';
                    if (overlayLeft) overlayLeft.style.opacity = 0;
                    if (overlayRight) overlayRight.style.opacity = 0;
                }
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        innerEl.addEventListener('mousedown', onMouseDown);
    }

    /* Ebbinghaus Notification Check */
    checkEbbinghausNotifications() {
        const todayStr = getTodayString();
        const dueList = this.sentences.filter(s => {
            const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
            return isStudied && !s.memorized && Boolean(s.nextReviewDate && s.nextReviewDate <= todayStr);
        });
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
        const dueCount = activeSentences.filter(s => {
            const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
            return isStudied && !s.memorized && Boolean(s.nextReviewDate && s.nextReviewDate <= todayStr);
        }).length;
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

    /* ==========================================================================
       TUK 퀴즈 스튜디오 (Quiz Studio) 고도화 엔진
       - 모드 1: 🧩 청크 블록 조립 (Chunk Relay)
       - 모드 2: ⚡ 3초 플래시 스피킹 (Flash Speaking & Rapid Self-Eval)
       - 모드 3: 🎙️✍️ 스마트 하이브리드 받아쓰기 (Voice STT + Edit + Visual Diff + 문법 팁)
       - 무한 소거 루프: 틀린 문제는 100% 맞출 때까지 세션 내 재순환
       ========================================================================== */

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

        const selectedRadio = document.querySelector('input[name="quizScope"]:checked');
        const selectedScope = selectedRadio ? selectedRadio.value : 'wrong';
        let count = 0;
        if (selectedScope === 'wrong') count = wrongList.length;
        else if (selectedScope === 'today') count = todayList.length;
        else if (selectedScope === 'studied') count = studiedList.length;
        else count = allList.length;

        const btnText = document.getElementById('btnStartQuizText');
        if (btnText) {
            btnText.textContent = `퀴즈 시작하기 (${Math.min(count, 10)}문제)`;
        }
    }

    startQuickQuizFromCurrentBucket() {
        const bucketSentences = this.getBucketSentences(this.activeStudyBucket);
        if (!bucketSentences || bucketSentences.length === 0) {
            this.showToast('현재 선택된 목록에 출제할 문장이 없습니다.', 'warning');
            return;
        }

        const ids = bucketSentences.map(s => s.id);
        this.switchTab('tab-quiz');
        this.startQuiz(ids);
        this.quizState.launchedFrom = 'study';
        const bucketNames = { review: '오늘 복습', new: '새 문장', hard: '취약/오답', all: '전체 문장' };
        const bName = bucketNames[this.activeStudyBucket] || '현재 목록';
        this.showToast(`⚡ [${bName}] (${Math.min(bucketSentences.length, 10)}문제) 퀴즈 시작!`, 'info');
    }

    startQuiz(targetIds = null) {
        let pool = [];
        const activeSentences = this.getActiveSentences();
        const todayStr = getTodayString();

        if (targetIds && targetIds.length > 0) {
            pool = this.sentences.filter(s => targetIds.includes(s.id));
        } else {
            const scopeEl = document.querySelector('input[name="quizScope"]:checked');
            const scope = scopeEl ? scopeEl.value : 'wrong';

            if (scope === 'wrong') {
                pool = activeSentences.filter(s => (s.wrongCount || 0) >= 1);
                if (pool.length === 0) {
                    alert('틀린 오답 문장 기록이 없습니다! 완벽합니다 👍\n\n[오늘 학습]이나 [전체 문장] 범위로 퀴즈를 시작해보세요.');
                    return;
                }
            } else if (scope === 'today') {
                pool = activeSentences.filter(s => s.lastStudiedAt === todayStr);
                if (pool.length === 0) {
                    alert('오늘 학습한 문장이 아직 없습니다.\n\n학습 탭에서 오늘의 문장을 먼저 학습해보세요!');
                    return;
                }
            } else if (scope === 'studied') {
                pool = activeSentences.filter(s => Boolean(s.lastStudiedAt || (s.studyCount && s.studyCount > 0) || s.memorized));
                if (pool.length === 0) pool = activeSentences;
            } else {
                pool = activeSentences;
            }
        }

        if (pool.length === 0) {
            alert('현재 덱에 출제할 수 있는 문장이 없습니다!');
            return;
        }

        const typeEl = document.querySelector('input[name="quizType"]:checked');
        let type = typeEl ? typeEl.value : 'chunk';
        // Map legacy 'arrange' or 'write' to new standard keys
        if (type === 'arrange') type = 'chunk';
        if (type === 'write' || type === 'blank') type = 'dictation';

        const questionCount = Math.min(pool.length, 10);
        const questions = [...pool].sort(() => Math.random() - 0.5).slice(0, questionCount);
        const isInfiniteLoop = this.chkQuizInfiniteLoop ? this.chkQuizInfiniteLoop.checked : true;

        this.quizState = {
            active: true,
            initialQuestions: [...questions],
            queue: [...questions],
            graduatedIds: new Set(),
            initialTotal: questions.length,
            currentIndex: 0,
            score: 0,
            type,
            isInfiniteLoop,
            selectedWords: [],
            wrongItems: [],
            graduatedCount: 0
        };

        this.quizSetup?.classList.add('hidden');
        this.quizContainer?.classList.remove('hidden');
        this.renderQuizQuestion();
    }

    exitQuiz() {
        if (this.quizAutoAdvanceTimer) {
            clearTimeout(this.quizAutoAdvanceTimer);
            this.quizAutoAdvanceTimer = null;
        }
        if (this.flashTimerInterval) {
            clearInterval(this.flashTimerInterval);
            this.flashTimerInterval = null;
        }
        this.stopQuizVoiceInput();
        this.quizSetup?.classList.remove('hidden');
        this.quizContainer?.classList.add('hidden');
        const wasFromStudy = this.quizState?.launchedFrom === 'study';
        if (this.quizState) this.quizState.active = false;
        if (wasFromStudy) {
            this.switchTab('tab-cards');
        }
    }

    renderQuizQuestion() {
        this.stopQuizVoiceInput();
        if (this.flashTimerInterval) {
            clearInterval(this.flashTimerInterval);
            this.flashTimerInterval = null;
        }

        if (!this.quizState || !this.quizState.active || this.quizState.queue.length === 0) {
            this.showQuizResultModal();
            return;
        }

        const q = this.quizState.queue[0];
        const initialTotal = this.quizState.initialTotal || 1;
        const graduatedCount = this.quizState.graduatedIds.size;
        const remainingCount = this.quizState.queue.length;

        // Mode badge & Subtitle
        const modeLabels = {
            chunk: '🧩 청크 조립',
            flash: '⚡ 3초 플래시',
            dictation: '🎙️✍️ 스마트 받아쓰기'
        };
        const modeSubTitles = {
            chunk: '의미 덩어리(Chunk)를 탭하여 문장을 완성하세요',
            flash: '3초 안에 소리내어 영어로 말하고 정답을 확인하세요',
            dictation: '영어로 말씀하시거나 직접 타이핑하여 문장을 완성하세요'
        };

        if (this.quizModeBadge) this.quizModeBadge.textContent = modeLabels[this.quizState.type] || 'TUK 퀴즈';
        if (this.quizPromptSubTitle) this.quizPromptSubTitle.textContent = modeSubTitles[this.quizState.type] || '한글 뜻을 보고 완성하세요';
        
        if (this.quizScoreBadge) {
            if (this.quizState.isInfiniteLoop) {
                this.quizScoreBadge.textContent = `남은 ${remainingCount}개 (완수 ${graduatedCount}/${initialTotal})`;
            } else {
                this.quizScoreBadge.textContent = `문제 ${graduatedCount + 1} / ${initialTotal}`;
            }
        }
        
        const progressPct = Math.min(100, (graduatedCount / initialTotal) * 100);
        const quizLinearProgress = document.getElementById('quizLinearProgress');
        if (quizLinearProgress) quizLinearProgress.style.width = `${progressPct}%`;

        if (this.quizKorean) this.quizKorean.textContent = q.korean;
        if (this.quizFeedback) {
            this.quizFeedback.classList.add('hidden');
            this.quizFeedback.innerHTML = '';
        }

        // Action Buttons
        if (this.btnCheckQuiz) this.btnCheckQuiz.classList.remove('hidden');
        if (this.btnNextQuiz) this.btnNextQuiz.classList.add('hidden');

        // Hide all areas first
        this.quizArrangeArea?.classList.add('hidden');
        this.quizFlashArea?.classList.add('hidden');
        this.quizWriteArea?.classList.add('hidden');
        this.quizBlankArea?.classList.add('hidden');

        if (this.quizState.type === 'chunk') {
            // ================= 1. 청크 블록 조립 모드 =================
            this.quizArrangeArea?.classList.remove('hidden');
            if (this.selectedWordsBox) this.selectedWordsBox.innerHTML = '';
            this.quizState.selectedWords = [];

            // Split into 2~4 clean meaning chunks
            const cleanChunks = this.splitIntoMeaningfulChunks(q.english);
            
            // Add 1 smart distractor chunk if possible
            const allTokens = q.english.split(' ');
            const distractorChunk = this.createDistractorChunk(q.english, cleanChunks);
            const poolChunks = [...cleanChunks];
            if (distractorChunk && !poolChunks.includes(distractorChunk)) {
                poolChunks.push(distractorChunk);
            }

            const shuffled = [...poolChunks].sort(() => Math.random() - 0.5);

            if (this.wordPool) {
                this.wordPool.innerHTML = '';
                shuffled.forEach((chunk) => {
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'word-chip text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-2xl bg-white border border-outline-variant/40 hover:border-primary text-on-surface shadow-2xs active:scale-95 transition-all cursor-pointer';
                    chip.textContent = chunk;
                    chip.addEventListener('click', () => {
                        chip.classList.add('opacity-30', 'pointer-events-none');
                        this.quizState.selectedWords.push({ text: chunk, el: chip });
                        this.renderSelectedWords(cleanChunks.length);
                    });
                    this.wordPool.appendChild(chip);
                });
            }
            this.renderSelectedWords(cleanChunks.length);

        } else if (this.quizState.type === 'flash') {
            // ================= 2. 3초 플래시 스피킹 모드 =================
            this.quizFlashArea?.classList.remove('hidden');
            if (this.flashRevealedTargetBox) this.flashRevealedTargetBox.classList.add('hidden');
            if (this.flashSelfEvalButtons) this.flashSelfEvalButtons.classList.add('hidden');
            if (this.btnCheckQuiz) {
                this.btnCheckQuiz.classList.remove('hidden');
                this.btnCheckQuiz.textContent = '정답 확인 & 채점하기';
            }

            this.startFlashCountdown(q.english);

        } else if (this.quizState.type === 'dictation') {
            // ================= 3. 스마트 하이브리드 받아쓰기 모드 =================
            this.quizWriteArea?.classList.remove('hidden');
            if (this.writeAnswerInput) {
                this.writeAnswerInput.value = '';
                this.writeAnswerInput.focus();
            }
            if (this.btnCheckQuiz) {
                this.btnCheckQuiz.classList.remove('hidden');
                this.btnCheckQuiz.textContent = '정답 확인 (Enter)';
            }
        }
    }

    createDistractorChunk(fullEng, chunks) {
        if (!chunks || chunks.length === 0) return null;
        // Generate a subtle grammatical distractor (e.g. wrong preposition, changed tense)
        const sample = chunks[Math.floor(Math.random() * chunks.length)];
        let dist = sample
            .replace(/\bin the mood\b/i, 'on the mood')
            .replace(/\bon the fence\b/i, 'in the fence')
            .replace(/\bhave to\b/i, 'having to')
            .replace(/\bwhether to\b/i, 'if to')
            .replace(/\blook forward to\b/i, 'look forward for')
            .replace(/\bused to\b/i, 'was used to');
        if (dist !== sample) return dist;
        return null;
    }

    renderSelectedWords(targetChunkCount) {
        if (!this.selectedWordsBox) return;
        this.selectedWordsBox.innerHTML = '';
        if (this.quizState.selectedWords.length === 0) {
            this.selectedWordsBox.innerHTML = '<span class="text-xs text-outline font-medium">아래 의미 청크(Chunk)를 탭하여 순서대로 놓으세요</span>';
            return;
        }

        this.quizState.selectedWords.forEach((item, idx) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'word-chip-selected text-xs sm:text-sm font-bold px-3 py-2 rounded-xl bg-primary text-on-primary shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer animate-fade-in';
            chip.innerHTML = `<span>${item.text}</span> <span class="text-xs opacity-75">&times;</span>`;
            chip.addEventListener('click', () => {
                this.quizState.selectedWords.splice(idx, 1);
                item.el.classList.remove('opacity-30', 'pointer-events-none');
                this.renderSelectedWords(targetChunkCount);
            });
            this.selectedWordsBox.appendChild(chip);
        });

        // Auto-check if count reached target
        if (this.quizState.selectedWords.length >= targetChunkCount) {
            setTimeout(() => this.checkQuizAnswer(), 200);
        }
    }

    startFlashCountdown(targetEnglish) {
        if (this.flashTimerInterval) clearInterval(this.flashTimerInterval);

        let timeLeft = 3.0;
        if (this.flashTimerSecText) this.flashTimerSecText.textContent = '3.0s';
        if (this.flashTimerBar) this.flashTimerBar.style.width = '100%';

        const stepMs = 100;
        this.flashTimerInterval = setInterval(() => {
            timeLeft = Math.max(0, timeLeft - (stepMs / 1000));
            if (this.flashTimerSecText) this.flashTimerSecText.textContent = `${timeLeft.toFixed(1)}s`;
            if (this.flashTimerBar) {
                const pct = (timeLeft / 3.0) * 100;
                this.flashTimerBar.style.width = `${pct}%`;
                if (pct <= 30) {
                    this.flashTimerBar.className = 'h-full bg-error transition-all duration-100 rounded-full';
                } else {
                    this.flashTimerBar.className = 'h-full bg-gradient-to-r from-primary to-secondary transition-all duration-100 rounded-full';
                }
            }

            if (timeLeft <= 0) {
                clearInterval(this.flashTimerInterval);
                this.flashTimerInterval = null;
                // Auto-reveal on timer end if user hasn't revealed yet
                this.revealFlashAnswer();
            }
        }, stepMs);
    }

    revealFlashAnswer() {
        if (this.flashTimerInterval) {
            clearInterval(this.flashTimerInterval);
            this.flashTimerInterval = null;
        }

        const q = this.quizState.queue[0];
        if (!q) return;

        if (this.flashTargetEnglish) this.flashTargetEnglish.textContent = q.english;
        this.flashRevealedTargetBox?.classList.remove('hidden');
        this.flashSelfEvalButtons?.classList.remove('hidden');
        this.btnCheckQuiz?.classList.add('hidden');

        // Play audio for reinforcement
        this.playCurrentQuizTTS();
    }

    handleFlashSelfEvaluation(evalType) {
        const q = this.quizState.queue[0];
        if (!q) return;

        const todayStr = getTodayString();
        this.triggerHaptic(evalType === 'known' ? 'light' : 'medium');

        if (evalType === 'known') {
            // Success: Graduate this question!
            this.quizState.score++;
            this.quizState.graduatedIds.add(q.id);
            this.quizState.queue.shift(); // Remove from front

            const currentStage = q.stage || 1;
            if (q.lastGraduationDate !== todayStr && currentStage < 5) {
                q.stage = currentStage + 1;
                q.lastGraduationDate = todayStr;
                this.quizState.graduatedCount = (this.quizState.graduatedCount || 0) + 1;
            }
            const nextIntervalDays = STAGE_CONFIG[q.stage]?.interval || 1;
            q.nextReviewDate = addDaysToDate(todayStr, nextIntervalDays);
            q.lastStudiedAt = todayStr;
            if (!q.firstStudiedAt) q.firstStudiedAt = todayStr;
            if (q.stage >= 5) q.memorized = true;
            if ((q.wrongCount || 0) > 0) q.wrongCount = Math.max(0, q.wrongCount - 1);
            this.saveState();

        } else if (evalType === 'unsure') {
            // Unsure: Re-queue 2~3 slots later
            this.quizState.queue.shift();
            const insertIdx = Math.min(this.quizState.queue.length, 2);
            this.quizState.queue.splice(insertIdx, 0, q);
            q.lastStudiedAt = todayStr;
            this.saveState();

        } else {
            // Unknown: Re-queue at the back & mark wrong
            this.quizState.queue.shift();
            this.quizState.queue.push(q);
            q.wrongCount = (q.wrongCount || 0) + 1;
            q.memorized = false;
            q.stage = Math.max(1, (q.stage || 1) - 1);
            q.lastStudiedAt = todayStr;
            q.nextReviewDate = todayStr;
            if (!this.quizState.wrongItems) this.quizState.wrongItems = [];
            if (!this.quizState.wrongItems.some(x => x.id === q.id)) {
                this.quizState.wrongItems.push(q);
            }
            this.saveState();
        }

        this.renderQuizQuestion();
    }

    playCurrentQuizTTS() {
        const q = this.quizState?.queue?.[0];
        if (q && q.english) {
            this.playTTS(q.english);
        }
    }

    generateGrammarNuanceTip(userText, targetText, q) {
        if (!targetText) return '';
        const lower = targetText.toLowerCase();

        const IDIOM_TIPS = [
            { pattern: /on the fence/i, tip: "💡 <strong>on the fence</strong> : 담장 위에 걸터앉아 결정을 못 내리는 상태 (전치사 <code>on</code> 사용)" },
            { pattern: /bite the bullet/i, tip: "💡 <strong>bite the bullet</strong> : 울며 겨자 먹기로 이를 악물고 결단을 내리다" },
            { pattern: /call it a day/i, tip: "💡 <strong>call it a day</strong> : 오늘 하루의 일을 이만 마무리하다 (숙어)" },
            { pattern: /in the mood/i, tip: "💡 <strong>in the mood (for/to)</strong> : ~할 기분이다 (전치사 <code>in</code> 사용)" },
            { pattern: /spill the beans/i, tip: "💡 <strong>spill the beans</strong> : 비밀을 무심코 털어놓다 / 누설하다" },
            { pattern: /break a leg/i, tip: "💡 <strong>break a leg</strong> : 행운을 빌어! (공연/시험 전 격려 표현)" },
            { pattern: /under the weather/i, tip: "💡 <strong>under the weather</strong> : 몸 상태가 찌뿌둥하거나 컨디션이 안 좋다" },
            { pattern: /hit the sack/i, tip: "💡 <strong>hit the sack</strong> : 잠자리에 들다 / 자러 가다" },
            { pattern: /ring a bell/i, tip: "💡 <strong>ring a bell</strong> : 들어본 적 있는 것 같다 / 낯이 익다" },
            { pattern: /cut corners/i, tip: "💡 <strong>cut corners</strong> : 절차나 비용을 무리하게 아끼다 / 날림으로 하다" },
            { pattern: /play dumb/i, tip: "💡 <strong>play dumb</strong> : 시치미를 떼다 / 모르는 척하다" },
            { pattern: /have a seat/i, tip: "💡 <strong>have a seat</strong> : 자리에 앉으세요 (sit down보다 정중한 표현)" },
            { pattern: /no way/i, tip: "💡 <strong>no way</strong> : 절대 안 돼 / 말도 안 돼 (강한 부정/놀람)" },
            { pattern: /look forward to/i, tip: "💡 <strong>look forward to + ~ing/명사</strong> : ~을 손꼽아 고대하다 (to가 전치사이므로 뒤에 동명사)" },
            { pattern: /used to/i, tip: "💡 <strong>used to + 동사원형</strong> : 과거에 ~하곤 했다 (과거 습관)" },
            { pattern: /whether to/i, tip: "💡 <strong>whether to + 동사원형</strong> : ~할지 말지 여부 (to부정사구)" },
            { pattern: /as soon as/i, tip: "💡 <strong>as soon as + 주어 + 동사</strong> : ~하자마자 (시간 접속사)" },
            { pattern: /be able to/i, tip: "💡 <strong>be able to + 동사원형</strong> : ~할 수 있다 (can의 대용 표현)" },
            { pattern: /feel like/i, tip: "💡 <strong>feel like + ~ing</strong> : ~하고 싶은 기분이다" }
        ];

        for (const item of IDIOM_TIPS) {
            if (item.pattern.test(lower)) {
                return item.tip;
            }
        }

        const prepositions = ['at', 'in', 'on', 'for', 'with', 'about', 'by', 'from', 'into', 'to', 'through'];
        const targetWords = lower.replace(/[^\w\s]/g, '').split(/\s+/);
        const userWords = (userText || '').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);

        const missingPreps = prepositions.filter(p => targetWords.includes(p) && !userWords.includes(p));
        if (missingPreps.length > 0) {
            return `💡 <strong>전치사 포인트</strong> : 전치사 [<code>${missingPreps.join(', ')}</code>]는 앞뒤 동사/명사와의 짝꿍 어휘(Collocation)로 덩어리째 외우는 것이 효과적입니다.`;
        }

        const firstTwo = targetText.split(' ').slice(0, 2).join(' ');
        return `💡 <strong>문장 구조 힌트</strong> : [<code>${firstTwo}...</code>]로 시작하는 자연스러운 일상 구어체 표현입니다.`;
    }

    generateQuizCorrectionDiffHtml(userText, targetText, q) {
        const uWords = (userText || '').trim().split(/\s+/).filter(Boolean);
        const tWords = (targetText || '').trim().split(/\s+/).filter(Boolean);

        const clean = str => str.toLowerCase().replace(/[^\w]/g, '');

        const userTokensHtml = [];
        const targetTokensHtml = [];
        let matchCount = 0;

        let uIdx = 0;
        let tIdx = 0;

        while (uIdx < uWords.length || tIdx < tWords.length) {
            const uW = uWords[uIdx];
            const tW = tWords[tIdx];

            if (uW && tW && clean(uW) === clean(tW)) {
                userTokensHtml.push(`<span class="text-on-surface font-semibold">${uW}</span>`);
                targetTokensHtml.push(`<span class="text-emerald-700 font-bold">${tW}</span>`);
                matchCount++;
                uIdx++;
                tIdx++;
            } else if (!uW && tW) {
                targetTokensHtml.push(`<span class="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-300 font-black shadow-2xs" title="누락된 단어">+ ${tW}</span>`);
                tIdx++;
            } else if (uW && !tW) {
                userTokensHtml.push(`<span class="bg-error-container/40 text-error line-through px-1.5 py-0.5 rounded-md border border-error/30 font-bold" title="불필요한 단어">${uW}</span>`);
                uIdx++;
            } else {
                const nextUinT = tWords.slice(tIdx + 1, tIdx + 4).findIndex(w => clean(w) === clean(uW));
                const nextTinU = uWords.slice(uIdx + 1, uIdx + 4).findIndex(w => clean(w) === clean(tW));

                if (nextUinT !== -1) {
                    targetTokensHtml.push(`<span class="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-300 font-black shadow-2xs" title="누락된 단어">+ ${tW}</span>`);
                    tIdx++;
                } else if (nextTinU !== -1) {
                    userTokensHtml.push(`<span class="bg-error-container/40 text-error line-through px-1.5 py-0.5 rounded-md border border-error/30 font-bold" title="오답 단어">${uW}</span>`);
                    uIdx++;
                } else {
                    userTokensHtml.push(`<span class="bg-error-container/40 text-error line-through px-1.5 py-0.5 rounded-md border border-error/30 font-bold" title="오답 단어">${uW}</span>`);
                    targetTokensHtml.push(`<span class="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-300 font-black shadow-2xs" title="정답 단어">${tW}</span>`);
                    uIdx++;
                    tIdx++;
                }
            }
        }

        const maxLen = Math.max(tWords.length, 1);
        const matchPct = Math.round((matchCount / maxLen) * 100);
        const grammarTip = this.generateGrammarNuanceTip(userText, targetText, q);

        return `
            <div class="w-full bg-surface-container-low p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3 text-left text-xs sm:text-sm">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-black text-on-surface flex items-center gap-1">
                        🔍 1:1 시각적 디프 대조
                    </span>
                    <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${matchPct >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-error-container/30 text-error'}">
                        일치율: ${matchPct}%
                    </span>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-[11px] font-bold text-error flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">edit_note</span> 내가 말하거나 쓴 답변:
                    </span>
                    <div class="p-2.5 bg-white rounded-xl border border-error/20 flex flex-wrap gap-1.5 items-center leading-relaxed">
                        ${userTokensHtml.length > 0 ? userTokensHtml.join(' ') : '<span class="text-outline text-xs">(미입력)</span>'}
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">check_circle</span> 올바른 정답 문장:
                    </span>
                    <div class="p-2.5 bg-white rounded-xl border border-emerald-200 flex flex-wrap gap-1.5 items-center leading-relaxed">
                        ${targetTokensHtml.join(' ')}
                    </div>
                </div>
                ${grammarTip ? `
                    <div class="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-900 leading-relaxed">
                        ${grammarTip}
                    </div>
                ` : ''}
            </div>
        `;
    }

    checkQuizAnswer() {
        const q = this.quizState.queue[0];
        if (!q) return;

        if (this.quizState.type === 'flash') {
            this.revealFlashAnswer();
            return;
        }

        let userAns = '';
        let isCorrect = false;
        const cleanStr = str => str.toLowerCase().replace(/[^\w]/g, '').trim();

        if (this.quizState.type === 'chunk') {
            userAns = this.quizState.selectedWords.map(w => w.text).join(' ');
            isCorrect = cleanStr(userAns) === cleanStr(q.english);
        } else if (this.quizState.type === 'dictation') {
            userAns = this.writeAnswerInput ? this.writeAnswerInput.value.trim() : '';
            isCorrect = cleanStr(userAns) === cleanStr(q.english);
        }

        this.quizFeedback?.classList.remove('hidden');
        const todayStr = getTodayString();

        if (isCorrect) {
            this.triggerHaptic('light');
            this.quizState.score++;
            this.quizState.graduatedIds.add(q.id);
            this.quizState.queue.shift(); // Remove graduated from queue

            const currentStage = q.stage || 1;
            let stageAdvancementMsg = '';

            if (q.lastGraduationDate !== todayStr && currentStage < 5) {
                q.stage = currentStage + 1;
                q.lastGraduationDate = todayStr;
                this.quizState.graduatedCount = (this.quizState.graduatedCount || 0) + 1;
                const newStageInfo = STAGE_CONFIG[q.stage];
                stageAdvancementMsg = ` (${newStageInfo.emoji} ${newStageInfo.name} ${q.stage}단계 승급!)`;
            }

            const nextIntervalDays = STAGE_CONFIG[q.stage]?.interval || 1;
            q.nextReviewDate = addDaysToDate(todayStr, nextIntervalDays);
            q.lastStudiedAt = todayStr;
            if (!q.firstStudiedAt) q.firstStudiedAt = todayStr;
            if (q.stage >= 5) q.memorized = true;
            if ((q.wrongCount || 0) > 0) q.wrongCount = Math.max(0, q.wrongCount - 1);

            this.quizFeedback.className = 'quiz-feedback correct p-4 rounded-2xl text-center font-bold text-sm flex flex-col items-center justify-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300';
            this.quizFeedback.innerHTML = `
                <div class="flex items-center gap-1.5 text-emerald-800 font-black text-base">
                    <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">stars</span>
                    <span>완벽합니다! 정답입니다${stageAdvancementMsg}</span>
                </div>
                <div class="text-xs text-emerald-700 font-semibold">${q.english}</div>
            `;
            this.saveState();

            // Auto-advance smoothly after 750ms
            if (this.quizAutoAdvanceTimer) clearTimeout(this.quizAutoAdvanceTimer);
            this.quizAutoAdvanceTimer = setTimeout(() => {
                if (this.quizState && this.quizState.active) {
                    this.nextQuizQuestion();
                }
            }, 850);

        } else {
            this.triggerHaptic('medium');
            let diffHtml = this.generateQuizCorrectionDiffHtml(userAns, q.english, q);

            this.quizFeedback.className = 'quiz-feedback incorrect p-4 rounded-3xl text-center font-bold text-sm flex flex-col items-center gap-2.5 bg-rose-50 text-rose-950 border border-rose-200';
            this.quizFeedback.innerHTML = `
                <div class="flex items-center gap-1.5 text-error font-extrabold text-sm">
                    <span class="material-symbols-outlined text-[20px]">cancel</span>
                    <span>아쉽네요! 정답과 1:1 디프 교정을 확인해보세요:</span>
                </div>
                ${diffHtml}
            `;

            // Loop Re-queuing logic:
            this.quizState.queue.shift(); // Remove from front
            this.quizState.queue.push(q);  // Re-queue at the back for infinite mastery loop!

            q.wrongCount = (q.wrongCount || 0) + 1;
            q.memorized = false;
            q.stage = Math.max(1, (q.stage || 1) - 1);
            q.nextReviewDate = todayStr;
            q.lastStudiedAt = todayStr;
            if (!q.firstStudiedAt) q.firstStudiedAt = todayStr;

            if (!this.quizState.wrongItems) this.quizState.wrongItems = [];
            if (!this.quizState.wrongItems.some(x => x.id === q.id)) {
                this.quizState.wrongItems.push(q);
            }
            this.saveState();
        }

        this.btnCheckQuiz?.classList.add('hidden');
        this.btnNextQuiz?.classList.remove('hidden');
    }

    nextQuizQuestion() {
        if (this.quizAutoAdvanceTimer) {
            clearTimeout(this.quizAutoAdvanceTimer);
            this.quizAutoAdvanceTimer = null;
        }
        if (this.flashTimerInterval) {
            clearInterval(this.flashTimerInterval);
            this.flashTimerInterval = null;
        }

        if (this.quizState.queue.length === 0) {
            this.showQuizResultModal();
        } else {
            this.renderQuizQuestion();
        }
    }

    showQuizResultModal() {
        const score = this.quizState?.score || 0;
        const initialTotal = this.quizState?.initialTotal || 1;
        const wrongItems = this.quizState?.wrongItems || [];
        const graduatedCount = this.quizState?.graduatedCount || 0;

        const modal = document.getElementById('quizResultModal');
        const scoreEl = document.getElementById('quizResultScore');
        const gradEl = document.getElementById('quizResultGraduated');
        const wrongEl = document.getElementById('quizResultWrong');
        const wrongSection = document.getElementById('quizResultWrongSection');
        const wrongList = document.getElementById('quizResultWrongList');
        const wrongCountText = document.getElementById('quizResultWrongListCount');
        const perfectBanner = document.getElementById('quizResultPerfectBanner');
        const btnGoToWrongReview = document.getElementById('btnGoToWrongReview');

        if (scoreEl) scoreEl.textContent = `${score}점 (완수 ${graduatedCount}/${initialTotal})`;
        if (gradEl) gradEl.textContent = `${graduatedCount}개`;
        if (wrongEl) wrongEl.textContent = `${wrongItems.length}개`;
        if (wrongCountText) wrongCountText.textContent = wrongItems.length;

        if (wrongItems.length > 0) {
            wrongSection?.classList.remove('hidden');
            perfectBanner?.classList.add('hidden');
            if (btnGoToWrongReview) {
                btnGoToWrongReview.classList.remove('hidden');
                btnGoToWrongReview.innerHTML = `
                    <span class="material-symbols-outlined text-[18px]">view_headline</span>
                    <span>오답 ${wrongItems.length}개 콤팩트 모드로 집중 복습하기</span>
                `;
            }
            if (wrongList) {
                wrongList.innerHTML = wrongItems.map(item => `
                    <div class="py-2 px-1 flex flex-col gap-0.5 text-left">
                        <span class="text-xs font-extrabold text-on-surface">${item.english}</span>
                        <span class="text-[11px] text-on-surface-variant">${item.korean}</span>
                    </div>
                `).join('');
            }
        } else {
            wrongSection?.classList.add('hidden');
            perfectBanner?.classList.remove('hidden');
            if (btnGoToWrongReview) {
                btnGoToWrongReview.innerHTML = `
                    <span class="material-symbols-outlined text-[18px]">view_headline</span>
                    <span>콤팩트 목록으로 이동하기</span>
                `;
            }
        }

        modal?.classList.remove('hidden');
    }

    closeQuizResultModal() {
        const modal = document.getElementById('quizResultModal');
        modal?.classList.add('hidden');
    }

    /* Continuous Compact View Audio Loop */
    playAllCompactAudio() {
        if (this.isPlayingAll) {
            this.stopPlayAllCompactAudio();
            return;
        }

        const items = this.getFilteredSentences();
        if (!items || items.length === 0) {
            this.showToast('재생할 문장이 없습니다.', 'warning');
            return;
        }

        this.isPlayingAll = true;
        this.playAllIndex = 0;
        this.updatePlayAllUI(true);
        this.playNextSentenceInSequence(items);
    }

    stopPlayAllCompactAudio() {
        this.isPlayingAll = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (this.playAllTimer) {
            clearTimeout(this.playAllTimer);
            this.playAllTimer = null;
        }
        this.updatePlayAllUI(false);
    }

    updatePlayAllUI(isPlaying) {
        const icon = document.getElementById('iconPlayAll');
        const text = document.getElementById('textPlayAll');
        const btn = document.getElementById('btnCompactPlayAll');
        if (!btn) return;
        if (isPlaying) {
            btn.className = 'px-3 py-2 rounded-xl border border-error/40 bg-error/10 text-error hover:bg-error/20 transition-all font-bold text-xs flex items-center gap-1 flex-shrink-0 active:scale-95 cursor-pointer animate-pulse';
            if (icon) icon.textContent = 'stop_circle';
            if (text) text.textContent = '정지';
        } else {
            btn.className = 'px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all font-bold text-xs flex items-center gap-1 flex-shrink-0 active:scale-95 cursor-pointer';
            if (icon) icon.textContent = 'play_circle';
            if (text) text.textContent = '연속 듣기';
        }
    }

    playNextSentenceInSequence(items) {
        if (!this.isPlayingAll) return;
        if (this.playAllIndex >= items.length) {
            this.stopPlayAllCompactAudio();
            this.showToast('연속 재생이 완료되었습니다. 👏', 'success');
            return;
        }

        const item = items[this.playAllIndex];
        this.speakText(item.english, this.ttsRate || 1.0, () => {
            if (!this.isPlayingAll) return;
            this.playAllTimer = setTimeout(() => {
                this.playAllIndex++;
                this.playNextSentenceInSequence(items);
            }, 1200);
        });
    }

    /* Ultra-High Quality Native MP3 & Neural Speech Synthesis */
    async speakText(text, customRate = null, onEnded = null) {
        if (!text || !text.trim()) return;
        const cleanText = text.trim();
        const rate = customRate !== null ? customRate : (this.ttsRate || 1.0);

        // Stop any currently playing audio
        if (this.currentAudioPlayer) {
            this.currentAudioPlayer.pause();
            this.currentAudioPlayer.currentTime = 0;
            this.currentAudioPlayer = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        // 1. Try Native Studio MP3 Audio via /api/tts
        try {
            const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&lang=en`;
            const audio = new Audio(ttsUrl);
            audio.playbackRate = rate;
            this.currentAudioPlayer = audio;

            audio.onended = () => {
                this.currentAudioPlayer = null;
                if (onEnded) onEnded();
            };

            audio.onerror = () => {
                // Fallback to Web Speech API
                this.currentAudioPlayer = null;
                this.speakWithWebSpeech(cleanText, rate, onEnded);
            };

            await audio.play();
            return;
        } catch (err) {
            console.warn('Native MP3 audio stream failed, falling back to Web Speech:', err);
            this.speakWithWebSpeech(cleanText, rate, onEnded);
        }
    }

    /* Fallback: Web Speech API with Premium Natural Neural Voice Auto-Selector */
    speakWithWebSpeech(text, rate = 1.0, onEnded = null) {
        if (!('speechSynthesis' in window)) {
            this.showToast('이 브라우저는 음성 재생을 지원하지 않습니다.', 'warning');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = rate;

        // Auto-select Premium Natural Voice if available
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
            const naturalVoice = voices.find(v => 
                (v.lang.startsWith('en') || v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) &&
                (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online') || v.name.includes('Neural') || v.name.includes('Jenny') || v.name.includes('Samantha') || v.name.includes('Guy'))
            ) || voices.find(v => v.lang.startsWith('en'));

            if (naturalVoice) {
                utterance.voice = naturalVoice;
            }
        }

        if (onEnded) {
            utterance.onend = onEnded;
            utterance.onerror = onEnded;
        }
        window.speechSynthesis.speak(utterance);
    }

    /* Download single sentence as crystal-clear native MP3 */
    downloadSentenceMp3(sentence) {
        const eng = typeof sentence === 'string' ? sentence : (sentence?.english || '');
        if (!eng || !eng.trim()) return;

        const cleanName = eng.trim().replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 35);
        const downloadUrl = `/api/tts?text=${encodeURIComponent(eng.trim())}&lang=en&download=1&filename=${encodeURIComponent(cleanName + '.mp3')}`;
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${cleanName}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.showToast(`🎵 [${eng.slice(0, 20)}...] 원어민 MP3 음성을 다운로드합니다!`, 'success');
    }

    /* Export full deck / filtered sentences as a ZIP of native MP3s + playlist TXT */
    async downloadDeckAudioZip() {
        const sentences = this.getFilteredSentences();
        if (!sentences || sentences.length === 0) {
            this.showToast('다운로드할 문장이 없습니다.', 'warning');
            return;
        }

        if (typeof JSZip === 'undefined') {
            this.showToast('ZIP 생성 라이브러리를 로드 중입니다. 잠시 후 다시 시도해 주세요.', 'info');
            return;
        }

        const activeDeck = this.decks.find(d => d.id === this.activeDeckId) || { name: '전체 문장' };
        const deckName = activeDeck.name || '단어장';
        const total = sentences.length;

        this.showToast(`📦 [${deckName}] ${total}개 문장의 원어민 MP3 압축팩 생성을 시작합니다...`, 'info');

        try {
            const zip = new JSZip();
            const folder = zip.folder(`${deckName}_원어민MP3`);
            let readmeContent = `=== TUK (툭) 원어민 영어 문장 MP3 팩 ===\n덱 이름: ${deckName}\n총 문장 수: ${total}개\n생성 일자: ${new Date().toLocaleDateString()}\n\n[ 문장 목록 ]\n`;

            for (let i = 0; i < total; i++) {
                const s = sentences[i];
                const num = String(i + 1).padStart(3, '0');
                const eng = (s.english || '').trim();
                const kor = (s.korean || '').trim();
                const cleanEng = eng.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
                const filename = `${num}_${cleanEng}.mp3`;

                readmeContent += `${num}. [EN] ${eng}\n     [KO] ${kor}\n\n`;

                try {
                    const res = await fetch(`/api/tts?text=${encodeURIComponent(eng)}&lang=en`);
                    if (res.ok) {
                        const blob = await res.blob();
                        folder.file(filename, blob);
                    }
                } catch (e) {
                    console.warn(`Failed to fetch MP3 for sentence #${i+1}:`, e);
                }
            }

            folder.file('README_문장목록.txt', readmeContent);

            const content = await zip.generateAsync({ type: 'blob' });
            const zipUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = zipUrl;
            a.download = `[TUK]_${deckName}_원어민음성_${total}개.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(zipUrl), 30000);

            this.showToast(`🎉 [${deckName}] ${total}개 문장 MP3 ZIP 다운로드가 완료되었습니다!`, 'success');
        } catch (err) {
            console.error('ZIP generation error:', err);
            this.showToast('MP3 ZIP 파일 생성 중 오류가 발생했습니다.', 'error');
        }
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
            } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg'].includes(ext) || (file.type && file.type.startsWith('image/'))) {
                if (typeof Tesseract === 'undefined') {
                    alert('OCR(문자 인식) 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
                    this.youtubeResultList.innerHTML = '';
                    return;
                }

                this.youtubeResultList.innerHTML = `
                    <div class="scrap-loading flex flex-col items-center justify-center p-8 text-center gap-3">
                        <i class="fa-solid fa-camera spinner text-3xl text-primary animate-pulse"></i>
                        <p class="font-bold text-base text-on-surface">사진 [${file.name || '캡처 이미지'}]을 고화질 분석 중입니다...</p>
                        <p id="ocrProgressText" class="text-xs text-on-surface-variant font-medium">이미지 선명도 최적화 및 OCR 엔진 준비 중...</p>
                        <div class="w-56 h-2 bg-surface-container-high rounded-full overflow-hidden mt-1">
                            <div id="ocrProgressBar" class="h-full bg-primary transition-all duration-200" style="width: 5%"></div>
                        </div>
                    </div>
                `;

                const progressText = document.getElementById('ocrProgressText');
                const progressBar = document.getElementById('ocrProgressBar');

                // 1. High-Precision Image Preprocessing (Upscaling + Contrast Thresholding)
                const preprocessedBlob = await this.preprocessImageForOcr(file);

                const result = await Tesseract.recognize(
                    preprocessedBlob || file,
                    'eng+kor',
                    {
                        logger: m => {
                            if (m.status === 'recognizing text' && m.progress !== undefined) {
                                const percent = Math.round(m.progress * 100);
                                if (progressText) progressText.innerText = `고정밀 텍스트 판독 중... (${percent}%)`;
                                if (progressBar) progressBar.style.width = `${Math.max(5, percent)}%`;
                            } else if (m.status) {
                                if (progressText) progressText.innerText = `${m.status}...`;
                            }
                        }
                    }
                );

                const rawText = result && result.data ? result.data.text : '';
                const extracted = await this.extractSentencesFromOcrText(rawText);
                if (extracted && extracted.length > 0) {
                    this.renderScrapedResults(extracted, `📸 고정밀 사진 OCR (${file.name || '이미지'})`);
                    this.showToast(`📸 이미지에서 ${extracted.length}개의 영어 문장/표현을 완벽하게 추출했습니다!`, 'success');
                } else {
                    alert('사진에서 명확한 영어 문장을 찾지 못했습니다. 글자가 더 선명한 이미지로 다시 시도해 주세요.');
                    this.youtubeResultList.innerHTML = '';
                }
            } else {
                alert('지원되지 않는 파일 형식입니다. (사진/이미지, 엑셀, CSV, PDF, TXT, JSON, EPUB 지원)');
                this.youtubeResultList.innerHTML = '';
            }
        } catch (err) {
            console.error('File parsing error:', err);
            alert(`파일 분석 중 오류가 발생했습니다: ${err.message}`);
            this.youtubeResultList.innerHTML = '';
        }
    }

    /* Helper: Preprocess Image for maximum OCR Accuracy (Upscale + Grayscale + Contrast Stretch) */
    async preprocessImageForOcr(file) {
        try {
            const img = await new Promise((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = URL.createObjectURL(file);
            });

            const scale = Math.max(1.5, Math.min(2.5, 2000 / Math.max(img.width, img.height)));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Grayscale & Contrast stretching
            for (let i = 0; i < data.length; i += 4) {
                let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                if (gray > 185) {
                    gray = 255;
                } else if (gray < 85) {
                    gray = 0;
                } else {
                    gray = ((gray - 85) / 100) * 255;
                }
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);

            return await new Promise(res => canvas.toBlob(res, 'image/png'));
        } catch (e) {
            console.warn('Image preprocessing skipped:', e);
            return file;
        }
    }

    /* Helper: Extract structured English/Korean sentence pairs from OCR text with High Precision */
    async extractSentencesFromOcrText(rawText) {
        if (!rawText || !rawText.trim()) return [];

        const ignoreWords = new Set([
            'lulu2sunny', 'fri', 'am', 'pm', 'ebs', 'review', 'vocabulary tips', 'http', 'https', 'www', 'youtube', 'instagram', 'naver', 'com', 'doi', 'fy', 'oie', 'ee', 'mon', 'tue', 'wed', 'thu', 'sat', 'sun', 'tol', 'bs', 'amma', 'bsoie', 'bs oie'
        ]);

        const lines = rawText.split('\n');
        const results = [];
        const seen = new Set();

        const cleanEnglish = (str) => {
            if (!str) return '';
            let s = str
                .replace(/^[«»•\*\-\+\=\#\d\.\)\:\;\,\s\~\|\/\?]+/, '')
                .replace(/[«»•\*\-\+\=\#\:\;\,\s\~\|\/]+$/, '')
                .replace(/\s+/g, ' ')
                .trim();

            // Strip Korean/digit prefix if mixed e.g. "HE, E25 I didn't know..." -> "I didn't know..."
            s = s.replace(/^(HE|E25|7H|THX|CH|ACFE|Hl|XIE)[\s,]+/gi, '');
            s = s.replace(/^(HE|E25|7H|THX|CH|ACFE|Hl|XIE)[\s,]+/gi, '');
            s = s.replace(/^[가-힣0-9\s,\.\(\)\[\]\{\}\#\*\:\;\~\|]+(?=[a-zA-Z])/i, '').trim();

            // Remove noise single-letter prefix (e.g. 'e ', 'eo ', 'oe ', 'o ', 'ㅎㅇ ')
            s = s.replace(/^(eo|oe|[b-hj-zB-HJ-Z])\s+/i, '').trim();
            s = s.replace(/^[«»•\*\-\+\=\#\d\.\)\:\;\,\s\~\|\/\?]+/, '').trim();

            // Fix OCR start glitches
            if (s.startsWith('|t ') || s.startsWith('lt ') || s.startsWith('!t ')) s = 'It ' + s.slice(3).trim();
            if (s.startsWith('| ') || s.startsWith('/ ') || s.startsWith('l ') || s.startsWith('! ')) s = 'I ' + s.slice(2).trim();
            if (/^felt refreshingly/i.test(s)) s = 'It felt' + s.slice(4);

            // Fix common phrase typos
            s = s.replace(/\b6009\s+back\s+memories\b/i, 'bring back memories');
            s = s.replace(/\b6019\s+back\s+memories\b/i, 'bring back memories');
            s = s.replace(/\blast\s+yea\b/i, 'last year');
            s = s.replace(/\bsince\s*[,.]+\s*\?/i, 'since...?');
            s = s.replace(/\s+(LHS|LIZA|LISA|135|[0-9]+)$/i, '').trim();

            // Punctuation fix
            s = s.replace(/[,;]+$/, '');
            if (s.endsWith(',.') || s.endsWith(',,')) s = s.replace(/[,.]+$/, '.');
            if (s.endsWith(',?') || s.endsWith(',.?') || s.endsWith(',,.?')) s = s.replace(/[,.?]+$/, '?');
            if (s.startsWith('cf.') || s.startsWith('cf,')) s = s.replace(/^cf[,\.\s]+/i, '').trim();

            // Filter out consonant-only gibberish or header artifacts
            if (!/[aeiouyAEIOUY]/.test(s) && s.length > 2) return '';
            if (s.length <= 3 && !['go', 'in', 'on', 'at', 'to', 'out', 'how', 'not', 'day', 'and'].includes(s.toLowerCase())) return '';

            // Capitalize first letter if it looks like a full sentence
            if (/^[a-z]/.test(s) && (s.length > 20 || s.includes('.') || s.includes('?'))) {
                s = s.charAt(0).toUpperCase() + s.slice(1);
            }

            return s;
        };

        const cleanKorean = (str) => {
            if (!str) return '';
            let k = str
                .replace(/^[«»•\*\-\+\=\#\d\.\)\:\;\,\s\~\|\/\?]+/, '')
                .replace(/[«»•\*\-\+\=\#\:\;\,\s\~\|\/]+$/, '')
                .replace(/^[a-zA-Z\s,\.\(\)\-]+(?=[가-힣])/i, '')
                .replace(/^[ㄱ-ㅎㅏ-ㅣ\s]+/, '')
                .replace(/[ㄱ-ㅎㅏ-ㅣ\s]+$/, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (k.length >= 3 && /^[가-힣]\s+[가-힣]/.test(k)) {
                const words = k.split(/\s{2,}/);
                if (words.length === 1) {
                    k = k.replace(/\s+/g, '');
                } else {
                    k = words.map(w => w.replace(/\s+/g, '')).join(' ');
                }
            }

            // If only 1 consonant or symbol remains, clear it
            if (!/[가-힣]{2,}/.test(k)) return '';

            return k;
        };

        const addPair = (eng, kor = '') => {
            const cleanEng = cleanEnglish(eng);
            const cleanKor = cleanKorean(kor);

            if (!cleanEng || cleanEng.length < 3) return;
            const words = cleanEng.match(/[a-zA-Z]{2,}/g) || [];
            if (words.length === 0) return;

            // Filter URL / metadata patterns
            if (/http|www|\.com|\.naver|youtube|instagram|lulu2sunny/i.test(cleanEng)) return;
            if (/\b202\d{5}\b|\b202\d\b/.test(cleanEng)) return;

            const lowerKey = cleanEng.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (ignoreWords.has(lowerKey) || ignoreWords.has(cleanEng.toLowerCase())) return;
            if (words.length === 1 && ignoreWords.has(words[0].toLowerCase())) return;

            if (seen.has(lowerKey)) return;
            seen.add(lowerKey);

            results.push({ english: cleanEng, korean: cleanKor });
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            // Normalize line OCR glitches
            line = line.replace(/(^|[\s\(\[\{])\|\s+([a-zA-Z])/g, '$1I $2');
            line = line.replace(/6009\s+back\s+memories/i, 'bring back memories');
            line = line.replace(/6019\s+back\s+memories/i, 'bring back memories');

            // Handle parenthesized sub-items e.g. "(outing 나들이)" or "(cf. drive around ...)"
            const parenMatches = line.match(/\(([^)]+)\)/g);
            if (parenMatches) {
                for (const p of parenMatches) {
                    const inner = p.replace(/[\(\)]/g, '').trim();
                    const innerEng = inner.match(/[a-zA-Z|][a-zA-Z0-9\s,.'’!?~–—\/\-]{2,}[a-zA-Z0-9.!?]/g);
                    if (innerEng) {
                        for (const ie of innerEng) {
                            const korPart = inner.replace(ie, '').trim();
                            addPair(ie, korPart);
                        }
                    }
                }
                line = line.replace(/\([^)]*\)/g, ' ').trim();
            }

            // Check if line contains transition e.g. "feel different 느낌이 다르다 → feel refreshingly different 느낌이 색다르다"
            if (line.includes('→') || line.includes('—') || line.includes('->')) {
                const subParts = line.split(/[→—\->]/);
                for (const sp of subParts) {
                    const spEng = sp.match(/[a-zA-Z|][a-zA-Z0-9\s,.'’!?~–—\/\-]{2,}[a-zA-Z0-9.!?]/g);
                    if (spEng) {
                        for (const se of spEng) {
                            const spKor = sp.replace(se, '').trim();
                            addPair(se, spKor);
                        }
                    }
                }
                continue;
            }

            // Find all English segments in the line
            const engMatches = line.match(/[a-zA-Z|][a-zA-Z0-9\s,.'’!?~–—\/\-]{2,}[a-zA-Z0-9.!?]/g);
            if (engMatches && engMatches.length > 0) {
                for (const eng of engMatches) {
                    let korPart = line.replace(eng, '').trim();
                    if (!korPart && i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim();
                        if (/[가-힣]{2,}/.test(nextLine) && !/[a-zA-Z]{3,}/.test(nextLine)) {
                            korPart = nextLine;
                        }
                    }
                    addPair(eng, korPart);
                }
            }
        }

        // Fill in missing Korean meanings using auto-translation
        const finalResults = [];
        for (const item of results.slice(0, 50)) {
            let kor = item.korean;
            if (!kor || kor.length < 2 || !/[가-힣]{2,}/.test(kor)) {
                kor = await this.autoTranslateText(item.english, 'en', 'ko');
            }
            finalResults.push({
                english: item.english,
                korean: kor || item.english,
                category: '사진 OCR'
            });
        }

        return finalResults;
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
            <div class="flex flex-col gap-2 w-full sm:w-auto">
                <label class="cursor-pointer flex items-center gap-2 text-sm font-bold text-on-surface">
                    <input type="checkbox" id="bulkSelectAll" checked class="w-4 h-4 rounded text-primary border-outline-variant focus:ring-primary">
                    <span><strong>${sourceName}</strong>: 총 <span class="bulk-count text-primary">${items.length}</span>개 선택됨</span>
                </label>
                <div class="flex items-center gap-2 text-xs text-on-surface-variant flex-wrap">
                    <span class="flex items-center gap-1 font-semibold"><span class="material-symbols-outlined text-[15px] text-primary">folder</span>저장 덱:</span>
                    <select id="resultTargetDeckSelect" class="bg-surface border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:ring-2 focus:ring-primary">
                        ${deckOptsHtml}
                    </select>
                </div>
            </div>
            <div class="bulk-btns w-full sm:w-auto flex-shrink-0">
                <button id="btnBulkAdd" class="w-full sm:w-auto px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
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
            el.className = 'result-item-card bg-surface rounded-2xl p-3.5 sm:p-4 border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between transition-all hover:border-primary/40 relative overflow-hidden';
            el.dataset.idx = idx;

            el.innerHTML = `
                <div class="flex gap-2.5 items-start sm:items-center flex-grow min-w-0">
                    <input type="checkbox" class="item-checkbox mt-1 sm:mt-0 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer flex-shrink-0" data-idx="${idx}" checked>
                    <div class="flex flex-col gap-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.2 rounded flex-shrink-0">#${idx + 1}</span>
                            <p class="font-bold text-sm sm:text-base text-on-surface leading-snug break-words">${this.escapeHtml(item.english)}</p>
                        </div>
                        <p class="text-xs text-on-surface-variant font-medium">${this.escapeHtml(item.korean || '[번역 없음]')}</p>
                    </div>
                </div>
                <button class="btn-add-single w-full sm:w-auto px-3.5 py-1.5 bg-surface-container hover:bg-primary hover:text-on-primary text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 flex-shrink-0 whitespace-nowrap active:scale-95 cursor-pointer" data-idx="${idx}">
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
                updateBulkCount();
            });

            listContainer.appendChild(el);
        });

        this.youtubeResultList.appendChild(listContainer);

        const updateBulkCount = () => {
            const checkedCards = listContainer.querySelectorAll('.result-item-card:not(.hidden) .item-checkbox:checked');
            const countBadge = actionBar.querySelector('.bulk-count');
            if (countBadge) countBadge.textContent = checkedCards.length;
        };

        // Select All Handler
        const selectAllChk = actionBar.querySelector('#bulkSelectAll');
        selectAllChk.addEventListener('change', () => {
            const visibleCards = listContainer.querySelectorAll('.result-item-card:not(.hidden)');
            visibleCards.forEach(card => {
                const chk = card.querySelector('.item-checkbox');
                if (chk) {
                    chk.checked = selectAllChk.checked;
                    if (selectAllChk.checked) card.classList.add('selected');
                    else card.classList.remove('selected');
                }
            });
            updateBulkCount();
        });

        // Bulk Add Handler
        const btnBulkAdd = actionBar.querySelector('#btnBulkAdd');
        btnBulkAdd.addEventListener('click', () => {
            const checkboxes = listContainer.querySelectorAll('.result-item-card:not(.hidden) .item-checkbox:checked');
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
                    this.addSentence(item.english, item.korean || item.english, '스크랩', 'youtube', chosenDeckId, item.idiom || '');
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
            this.studyViewMode = 'list';
            this.switchTab('tab-cards');
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

        // Update Horizontal Deck Quick Chips
        this.renderDeckQuickChips();
    }

    renderDeckQuickChips() {
        if (!this.smartDeckChipsList) return;
        this.smartDeckChipsList.innerHTML = '';

        const targetDeckId = (this.activeDeckId && this.activeDeckId !== 'all')
            ? this.activeDeckId
            : (this.decks[0]?.id || 'deck_default');

        this.decks.forEach(deck => {
            const isSelected = deck.id === targetDeckId;
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = isSelected
                ? 'deck-quick-chip px-2.5 py-1 rounded-xl text-xs font-extrabold bg-primary text-white shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1 flex-shrink-0'
                : 'deck-quick-chip px-2.5 py-1 rounded-xl text-xs font-semibold bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30 hover:border-primary/50 transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1 flex-shrink-0';

            chip.innerHTML = `<span>${this.escapeHtml(deck.name)}</span>`;

            chip.addEventListener('click', () => {
                this.triggerHaptic('light');
                this.activeDeckId = deck.id;
                this.saveState();
                this.updateDeckUI();
                if (this.selectSmartDeck) this.selectSmartDeck.value = deck.id;
            });

            this.smartDeckChipsList.appendChild(chip);
        });

        // Sync hidden selectSmartDeck
        if (this.selectSmartDeck) {
            this.selectSmartDeck.value = targetDeckId;
        }
    }

    showInlineNewDeckForm() {
        if (!this.inlineNewDeckForm || !this.btnInlineNewDeckTrigger) return;
        this.btnInlineNewDeckTrigger.classList.add('hidden');
        this.inlineNewDeckForm.classList.remove('hidden');
        this.inlineNewDeckForm.classList.add('flex');
        if (this.inlineNewDeckInput) {
            this.inlineNewDeckInput.value = '';
            this.inlineNewDeckInput.focus();
        }
    }

    hideInlineNewDeckForm() {
        if (!this.inlineNewDeckForm || !this.btnInlineNewDeckTrigger) return;
        this.inlineNewDeckForm.classList.remove('flex');
        this.inlineNewDeckForm.classList.add('hidden');
        this.btnInlineNewDeckTrigger.classList.remove('hidden');
        if (this.inlineNewDeckInput) this.inlineNewDeckInput.value = '';
    }

    handleConfirmInlineNewDeck() {
        const rawName = this.inlineNewDeckInput?.value?.trim() || '';
        if (!rawName) {
            this.showToast('새 덱 이름을 입력해주세요.', 'warning');
            this.inlineNewDeckInput?.focus();
            return;
        }

        const newDeck = this.createDeck(rawName, '직접 생성한 단어장');
        if (newDeck) {
            this.activeDeckId = newDeck.id;
            this.hideInlineNewDeckForm();
            this.showToast(`🎉 "${newDeck.name}" 덱이 생성되었습니다!`, 'success');
            this.updateDeckUI();
        }
    }

    async checkClipboardRadar() {
        try {
            if (!navigator.clipboard || !navigator.clipboard.readText) return;
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                this.dismissClipboardRadar();
                return;
            }

            const trimmed = text.trim();
            // Ignore if dismissed or too short/huge
            if (trimmed === this.lastDetectedClipboard || trimmed.length < 2 || trimmed.length > 5000) {
                return;
            }

            // Check if text has English, Korean, or is YouTube URL
            const hasEnglish = /[a-zA-Z]{2,}/.test(trimmed);
            const hasKorean = /[\uac00-\ud7a3]/.test(trimmed);
            const isYoutube = /(?:youtube\.com|youtu\.be)/i.test(trimmed);

            if (!hasEnglish && !hasKorean && !isYoutube) {
                return;
            }

            // Don't prompt if already entered in smartCaptureInput
            if (this.smartCaptureInput && this.smartCaptureInput.value.trim() === trimmed) {
                return;
            }

            // Show banner
            this.pendingClipboardText = trimmed;
            if (this.clipboardRadarPreview) {
                const previewStr = trimmed.length > 35 ? (trimmed.slice(0, 35) + '...') : trimmed;
                this.clipboardRadarPreview.textContent = `"${previewStr}"`;
            }
            if (this.clipboardRadarBanner) {
                this.clipboardRadarBanner.classList.remove('hidden');
                this.clipboardRadarBanner.classList.add('flex');
            }
        } catch (err) {
            // Silently ignore browser permission restrictions
        }
    }

    applyClipboardRadarText() {
        if (!this.pendingClipboardText) return;
        const text = this.pendingClipboardText;
        if (this.smartCaptureInput) {
            this.smartCaptureInput.value = text;
            this.processSmartInput(text);
            this.smartCaptureInput.focus();
        }
        this.dismissClipboardRadar();
        this.showToast('📋 클립보드 문장을 가져왔습니다!', 'success');
    }

    dismissClipboardRadar() {
        if (this.pendingClipboardText) {
            this.lastDetectedClipboard = this.pendingClipboardText;
        }
        if (this.clipboardRadarBanner) {
            this.clipboardRadarBanner.classList.remove('flex');
            this.clipboardRadarBanner.classList.add('hidden');
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

        // Paste listener for images & screenshots (Ctrl+V)
        this.smartCaptureInput?.addEventListener('paste', (e) => {
            const items = (e.clipboardData || window.clipboardData)?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const blob = items[i].getAsFile();
                        if (blob) {
                            this.showToast('📸 캡처된 이미지를 감지했습니다! OCR 텍스트 인식을 시작합니다.', 'info');
                            this.handleFileUpload(blob);
                            return;
                        }
                    }
                }
            }
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

        // Inline New Deck Event Listeners
        this.btnInlineNewDeckTrigger?.addEventListener('click', () => this.showInlineNewDeckForm());
        this.btnConfirmInlineNewDeck?.addEventListener('click', () => this.handleConfirmInlineNewDeck());
        this.btnCancelInlineNewDeck?.addEventListener('click', () => this.hideInlineNewDeckForm());
        this.inlineNewDeckInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleConfirmInlineNewDeck();
            } else if (e.key === 'Escape') {
                this.hideInlineNewDeckForm();
            }
        });

        // Clipboard Smart Radar Event Listeners
        this.btnClipboardRadarApply?.addEventListener('click', () => this.applyClipboardRadarText());
        this.clipboardRadarClickArea?.addEventListener('click', () => this.applyClipboardRadarText());
        this.btnClipboardRadarDismiss?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dismissClipboardRadar();
        });

        // Window Focus Event Listener for Clipboard Radar
        window.addEventListener('focus', () => {
            if (this.currentActiveTab === 'tab-add') {
                this.checkClipboardRadar();
            }
        });
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
            // Check for image in clipboard if supported
            if (navigator.clipboard && navigator.clipboard.read) {
                try {
                    const items = await navigator.clipboard.read();
                    for (const item of items) {
                        const imageType = item.types.find(type => type.startsWith('image/'));
                        if (imageType) {
                            const blob = await item.getType(imageType);
                            this.showToast('📸 클립보드에서 이미지를 감지했습니다! OCR 텍스트 인식을 시작합니다.', 'info');
                            this.handleFileUpload(new File([blob], 'clipboard_capture.png', { type: imageType }));
                            return;
                        }
                    }
                } catch (readErr) {
                    console.log('Clipboard.read image check bypassed:', readErr);
                }
            }

            if (!navigator.clipboard || !navigator.clipboard.readText) {
                this.showToast('클립보드 읽기 권한이 필요합니다. 인풋창에 Ctrl+V로 붙여넣어주세요.', 'warning');
                return;
            }
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                this.showToast('클립보드에 복사된 텍스트나 이미지가 없습니다.', 'warning');
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

    /* Quiz Voice STT Input */
    toggleQuizVoiceInput() {
        if (this.isQuizVoiceListening) {
            this.stopQuizVoiceInput();
        } else {
            this.startQuizVoiceInput();
        }
    }

    startQuizVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.showToast('현재 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome/Edge를 권장합니다.', 'error');
            return;
        }

        try {
            this.quizVoiceRecognition = new SpeechRecognition();
            this.quizVoiceRecognition.lang = 'en-US';
            this.quizVoiceRecognition.continuous = false;
            this.quizVoiceRecognition.interimResults = true;
            this.quizVoiceRecognition.maxAlternatives = 1;

            this.quizVoiceRecognition.onstart = () => {
                this.isQuizVoiceListening = true;
                this.triggerHaptic('medium');
                if (this.btnQuizVoiceMic) {
                    this.btnQuizVoiceMic.classList.add('bg-error', 'text-white', 'animate-pulse');
                    this.btnQuizVoiceMic.classList.remove('bg-primary/10', 'text-primary');
                }
                if (this.quizVoiceStatus) {
                    this.quizVoiceStatus.classList.remove('hidden');
                }
            };

            this.quizVoiceRecognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(r => r[0].transcript)
                    .join('');
                if (this.writeAnswerInput) {
                    this.writeAnswerInput.value = transcript;
                }
            };

            this.quizVoiceRecognition.onerror = (err) => {
                console.warn('Quiz Voice STT error:', err);
                this.stopQuizVoiceInput();
                if (err.error !== 'no-speech') {
                    this.showToast('음성 인식 오류: ' + err.error, 'warning');
                }
            };

            this.quizVoiceRecognition.onend = () => {
                this.stopQuizVoiceInput();
            };

            this.quizVoiceRecognition.start();
        } catch (e) {
            console.error('Failed to start quiz voice recognition:', e);
            this.stopQuizVoiceInput();
        }
    }

    stopQuizVoiceInput() {
        this.isQuizVoiceListening = false;
        if (this.quizVoiceRecognition) {
            try { this.quizVoiceRecognition.stop(); } catch (e) {}
        }
        if (this.btnQuizVoiceMic) {
            this.btnQuizVoiceMic.classList.remove('bg-error', 'text-white', 'animate-pulse');
            this.btnQuizVoiceMic.classList.add('bg-primary/10', 'text-primary');
        }
        if (this.quizVoiceStatus) {
            this.quizVoiceStatus.classList.add('hidden');
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
        if (!text || !text.trim()) return '';
        const query = text.trim();
        const hasKorean = /[\uac00-\ud7a3]/.test(query);

        let sourceLang = sl;
        let targetLang = tl;
        if (sl === 'auto') {
            sourceLang = hasKorean ? 'ko' : 'en';
            targetLang = hasKorean ? 'en' : 'ko';
        }

        // 1. Try MyMemory API (Fast, free, reliable)
        try {
            const pair = `${sourceLang}|${targetLang}`;
            const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${pair}`;
            const res = await fetch(myMemoryUrl);
            if (res.ok) {
                const data = await res.json();
                if (data && data.responseData && data.responseData.translatedText) {
                    const tr = data.responseData.translatedText.trim();
                    if (!tr.startsWith('MYMEMORY WARNING') && !tr.toLowerCase().includes('quota exceeded')) {
                        return tr;
                    }
                }
            }
        } catch (e) {
            console.warn('MyMemory translate error:', e);
        }

        // 2. Try Server endpoint /api/translate
        try {
            const serverUrl = `/api/translate?q=${encodeURIComponent(query)}&sl=${sourceLang}&tl=${targetLang}`;
            const res = await fetch(serverUrl);
            if (res.ok) {
                const data = await res.json();
                if (data && data.translated) {
                    return data.translated.trim();
                }
            }
        } catch (e) {
            console.warn('Server translate error:', e);
        }

        // 3. Fallback: Google GTX endpoint
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data[0]) {
                    return data[0].map(item => item[0]).join('').trim();
                }
            }
        } catch (e) {
            console.warn('Google translate error:', e);
        }

        return '';
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
       Lifesaver Emergency Review & Smart Statistics Dashboard
       ========================================================================== */
    startLifesaverReview() {
        const selectedDeckId = this.statsDeckSelect ? this.statsDeckSelect.value : (this.activeDeckId || 'all');
        const targetSentences = (selectedDeckId === 'all')
            ? this.sentences
            : this.sentences.filter(s => (s.deckId || 'deck_default') === selectedDeckId);

        const today = getTodayString();
        // Priority 1: Overdue reviews among PREVIOUSLY STUDIED sentences
        let urgent = targetSentences.filter(s => {
            const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
            return isStudied && s.nextReviewDate && s.nextReviewDate <= today && (!s.memorized || (s.stage || 1) < 5);
        });

        if (urgent.length === 0) {
            // Priority 2: Previously studied with wrongCount > 0
            urgent = targetSentences.filter(s => {
                const isStudied = (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0;
                return isStudied && (!s.memorized || (s.wrongCount || 0) > 0);
            });
        }

        if (urgent.length === 0) {
            // Priority 3: Fallback to today's focus sentences (intake new sentences to study)
            urgent = this.getTodayFocusSentences();
        }

        if (urgent.length === 0) {
            this.showToast('학습할 문장이 없습니다. 새 문장을 등록해보세요!', 'info');
            return;
        }

        this.sessionQueue = urgent.map(s => s.id);
        this.sessionTotalCount = this.sessionQueue.length;
        this.sessionCompletedCount = 0;
        this.sessionCompletedIds = [];
        this.currentCardIndex = 0;
        this.switchTab('tab-cards');
        this.switchStudyViewMode('card');
        this.renderFlashcard();
        this.showToast(`🚨 ${urgent.length}개 문장 집중 학습을 시작합니다!`, 'warning');
    }

    renderStatsDashboard() {
        const selectedDeckId = this.statsDeckSelect ? this.statsDeckSelect.value : (this.activeDeckId || 'all');
        const targetSentences = (selectedDeckId === 'all')
            ? this.sentences
            : this.sentences.filter(s => (s.deckId || 'deck_default') === selectedDeckId);

        const total = targetSentences.length;
        const today = getTodayString();

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

        // ======================================================================
        // 1. 🧠 두뇌 기억 건강도 & 망각 위험 긴급 구조대
        // (주의: 학습한 이력이 있는 문장만 '복습 대상' 및 '기억 감쇠'로 판정)
        // ======================================================================
        const studiedSentences = targetSentences.filter(s => (s.studyCount || 0) > 0 || Boolean(s.lastStudiedAt) || (s.wrongCount || 0) > 0);
        const overdueList = studiedSentences.filter(s => s.nextReviewDate && s.nextReviewDate <= today && (!s.memorized || (s.stage || 1) < 5));
        const overdueCount = overdueList.length;

        // Calculate Brain Memory Health Score (0 ~ 100)
        let healthScore = 100;
        if (studiedSentences.length > 0) {
            let totalStudiedScore = 0;
            studiedSentences.forEach(s => {
                let sScore = 30; // base score for studied stage 1
                const stage = s.stage || (s.memorized ? 5 : ((s.intervalStep || 0) > 0 ? Math.min(s.intervalStep + 1, 4) : 1));
                if (stage === 5) sScore = 100;
                else if (stage === 4) sScore = 85;
                else if (stage === 3) sScore = 70;
                else if (stage === 2) sScore = 50;
                else if (stage === 1) sScore = 30;

                // Overdue penalty applies only to studied sentences
                if (s.nextReviewDate && s.nextReviewDate < today) {
                    sScore = Math.max(10, sScore - 25);
                } else if (s.nextReviewDate === today) {
                    sScore = Math.max(15, sScore - 10);
                }

                // Wrong count penalty
                if ((s.wrongCount || 0) >= 3) {
                    sScore = Math.max(5, sScore - 20);
                } else if ((s.wrongCount || 0) >= 1) {
                    sScore = Math.max(10, sScore - 10);
                }

                totalStudiedScore += sScore;
            });
            healthScore = Math.round(totalStudiedScore / studiedSentences.length);
        }

        // Update Health Score & Grade
        const scoreEl = document.getElementById('dashHealthScoreNum');
        if (scoreEl) scoreEl.textContent = `${healthScore}점`;

        const healthBar = document.getElementById('dashHealthBar');
        if (healthBar) {
            healthBar.style.width = `${Math.max(5, healthScore)}%`;
            if (healthScore >= 80) {
                healthBar.className = 'h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-primary rounded-full transition-all duration-700';
            } else if (healthScore >= 60) {
                healthBar.className = 'h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700';
            } else {
                healthBar.className = 'h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-700';
            }
        }

        const gradeBadge = document.getElementById('dashHealthGradeBadge');
        if (gradeBadge) {
            if (healthScore >= 85) {
                gradeBadge.className = 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs shadow-2xs';
                gradeBadge.textContent = '🛡️ 최상위 안전 상태';
            } else if (healthScore >= 70) {
                gradeBadge.className = 'px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-xs shadow-2xs';
                gradeBadge.textContent = '🟢 안정적 기억 유지';
            } else if (healthScore >= 50) {
                gradeBadge.className = 'px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs shadow-2xs';
                gradeBadge.textContent = '🟡 주의: 복습 권장';
            } else {
                gradeBadge.className = 'px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-xs shadow-2xs animate-pulse';
                gradeBadge.textContent = '🚨 긴급: 망각 위험 경보';
            }
        }

        // Average Recall Speed (Latency)
        const avgRecallEl = document.getElementById('dashAvgRecallSpeed');
        if (avgRecallEl) {
            const latencies = studiedSentences
                .map(s => s.lastLatencySec || s.avgLatencySec)
                .filter(v => typeof v === 'number' && v > 0);
            
            const avgSec = latencies.length > 0
                ? (latencies.reduce((a, b) => a + b, 0) / latencies.length)
                : (healthScore >= 80 ? 2.3 : (healthScore >= 60 ? 3.4 : 4.8));

            if (avgSec <= 2.5) {
                avgRecallEl.textContent = `⚡ 평균 인출 ${avgSec.toFixed(1)}초 (자동화)`;
            } else if (avgSec <= 4.5) {
                avgRecallEl.textContent = `⏱️ 평균 인출 ${avgSec.toFixed(1)}초 (양호)`;
            } else {
                avgRecallEl.textContent = `⏳ 평균 인출 ${avgSec.toFixed(1)}초 (망설임)`;
            }
        }

        // Lifesaver Box & Overdue Alert
        const overdueBadge = document.getElementById('dashOverdueCountBadge');
        if (overdueBadge) overdueBadge.textContent = `${overdueCount}개`;

        const lifesaverBox = document.getElementById('dashLifesaverBox');
        const lifesaverText = document.getElementById('dashLifesaverText');
        const lifesaverBtn = document.getElementById('btnStartLifesaverReview');

        if (lifesaverBox && lifesaverText && lifesaverBtn) {
            const iconEl = lifesaverBox.querySelector('.material-symbols-outlined');
            const iconWrapper = iconEl ? iconEl.parentElement : null;
            const strongEl = lifesaverBox.querySelector('strong');

            if (overdueCount === 0) {
                lifesaverBox.className = 'bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 transition-all';
                if (iconEl) {
                    iconEl.textContent = 'verified';
                    iconEl.className = 'material-symbols-outlined text-[18px] text-emerald-600';
                }
                if (iconWrapper) {
                    iconWrapper.className = 'w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0';
                }
                if (strongEl) {
                    strongEl.className = 'text-xs font-black text-emerald-900';
                    strongEl.textContent = '모든 학습 문장 안전 유지 중';
                }
                lifesaverText.className = 'text-[11px] text-emerald-700/90 mt-0.5';
                lifesaverText.textContent = '망각 위기 문장이 없습니다! 여유가 있으실 때 오늘의 목표를 학습해보세요.';
                if (overdueBadge) overdueBadge.className = 'bg-emerald-500 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full';
                lifesaverBtn.className = 'w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap';
                lifesaverBtn.innerHTML = '<span class="material-symbols-outlined text-[15px]">school</span><span>오늘의 목표 학습하기</span>';
            } else {
                lifesaverBox.className = 'bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-fade-in';
                if (iconEl) {
                    iconEl.textContent = 'notification_important';
                    iconEl.className = 'material-symbols-outlined text-[18px] text-rose-600';
                }
                if (iconWrapper) {
                    iconWrapper.className = 'w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0';
                }
                if (strongEl) {
                    strongEl.className = 'text-xs font-black text-rose-900';
                    strongEl.textContent = '망각 위기 골든타임';
                }
                lifesaverText.className = 'text-[11px] text-rose-700/90 mt-0.5';
                lifesaverText.textContent = `복습 주기가 도래하여 오늘 복습하지 않으면 잊혀질 위기 문장이 ${overdueCount}개 있습니다.`;
                if (overdueBadge) overdueBadge.className = 'bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full animate-bounce';
                lifesaverBtn.className = 'w-full sm:w-auto px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap';
                lifesaverBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">healing</span><span>망각 위기 긴급 복습 (${overdueCount}개)</span>`;
            }
        }

        // ======================================================================
        // 2. 🌳 5단계 장기기억 안착 피라미드 (Funnel)
        // ======================================================================
        let stageCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        targetSentences.forEach(s => {
            let st = s.stage;
            if (!st) {
                if (s.memorized && ((s.intervalStep || 0) >= 4 || (s.studyCount || 0) >= 4)) st = 5;
                else if ((s.intervalStep || 0) >= 3) st = 4;
                else if ((s.intervalStep || 0) >= 2) st = 3;
                else if ((s.intervalStep || 0) >= 1 || (s.studyCount || 0) > 0) st = 2;
                else st = 1;
            }
            stageCounts[st] = (stageCounts[st] || 0) + 1;
        });

        const totalBadge = document.getElementById('dashMasteryTotalBadge');
        if (totalBadge) totalBadge.textContent = `총 ${total}문장 분석`;

        for (let i = 1; i <= 5; i++) {
            const count = stageCounts[i] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const countEl = document.getElementById(`dashStageCount${i}`);
            if (countEl) countEl.textContent = `${count}개`;

            const barEl = document.getElementById(`dashStageBar${i}`);
            if (barEl) barEl.style.width = `${pct}%`;
        }

        // ======================================================================
        // 3. 🔮 향후 7일간 복습 부하 예측 차트 & 완독 D-Day (통합 카드)
        // ======================================================================
        const ungraduated = targetSentences.filter(s => !s.memorized || (s.stage || 1) < 5).length;
        const dailyPace = (this.goal && this.goal.dailyCount) ? parseInt(this.goal.dailyCount, 10) : 10;

        const ddayBadge = document.getElementById('dashDailyPaceBadge');
        if (ddayBadge) ddayBadge.textContent = `하루 ${dailyPace}개 기준`;

        const ddayNumEl = document.getElementById('dashDDayNumber');
        const ddayDateEl = document.getElementById('dashDDayDateStr');
        const remainingEl = document.getElementById('dashRemainingToGraduate');

        if (remainingEl) remainingEl.textContent = `${ungraduated}개`;

        let finishDateStr = '';
        if (ungraduated === 0 && total > 0) {
            if (ddayNumEl) ddayNumEl.textContent = '완독 🎉';
            if (ddayDateEl) ddayDateEl.textContent = '100% 장기기억 달성';
        } else {
            const daysNeeded = Math.max(1, Math.ceil(ungraduated / dailyPace));
            const finishDate = new Date();
            finishDate.setDate(finishDate.getDate() + daysNeeded);
            finishDateStr = `${finishDate.getFullYear()}.${String(finishDate.getMonth() + 1).padStart(2, '0')}.${String(finishDate.getDate()).padStart(2, '0')}`;

            if (ddayNumEl) ddayNumEl.textContent = `D-${daysNeeded}`;
            if (ddayDateEl) ddayDateEl.textContent = finishDateStr;
        }

        // 7-Day Forecast Chart (Only for studied cards that have future review schedules)
        const forecastContainer = document.getElementById('dashForecastChartContainer');
        const peakBadge = document.getElementById('dashPeakForecastBadge');
        const insightText = document.getElementById('dashForecastInsightText');

        if (forecastContainer) {
            forecastContainer.innerHTML = '';
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const forecastDays = [];
            let totalUpcoming = 0;

            for (let offset = 1; offset <= 7; offset++) {
                const targetD = new Date();
                targetD.setDate(targetD.getDate() + offset);
                const dStr = targetD.toISOString().split('T')[0];
                const dayName = offset === 1 ? '내일' : (offset === 2 ? '모레' : dayNames[targetD.getDay()]);
                const monthDay = `${targetD.getMonth() + 1}/${targetD.getDate()}`;
                
                const dueCount = studiedSentences.filter(s => s.nextReviewDate === dStr).length;
                totalUpcoming += dueCount;

                forecastDays.push({
                    offset,
                    dateStr: dStr,
                    dayName,
                    monthDay,
                    count: dueCount
                });
            }

            const maxCount = Math.max(...forecastDays.map(f => f.count), 1);

            forecastDays.forEach(f => {
                const heightPct = Math.max(14, Math.round((f.count / maxCount) * 100));
                const isHeavy = f.count >= 10;
                const isMedium = f.count >= 5;

                const col = document.createElement('div');
                col.className = 'flex flex-col items-center justify-end h-full gap-1 group';
                col.innerHTML = `
                    <span class="text-[9px] font-extrabold ${f.count > 0 ? (isHeavy ? 'text-rose-600' : 'text-primary') : 'text-outline-variant'}">
                        ${f.count}개
                    </span>
                    <div class="w-full max-w-[24px] bg-surface-container rounded-lg flex items-end overflow-hidden p-0.5 h-16 shadow-2xs">
                        <div class="w-full rounded transition-all duration-700 ${f.count === 0
                            ? 'bg-outline-variant/30 h-1'
                            : isHeavy
                                ? 'bg-gradient-to-t from-rose-500 to-amber-500'
                                : isMedium
                                    ? 'bg-gradient-to-t from-primary to-secondary'
                                    : 'bg-gradient-to-t from-primary/70 to-primary/40'
                        }" style="height: ${f.count === 0 ? '4px' : `${heightPct}%`}"></div>
                    </div>
                    <div class="flex flex-col items-center leading-none">
                        <span class="text-[9px] font-bold ${f.offset === 1 ? 'text-primary font-black' : 'text-on-surface'}">${f.dayName}</span>
                        <span class="text-[8px] text-outline-variant mt-0.5">${f.monthDay}</span>
                    </div>
                `;
                forecastContainer.appendChild(col);
            });

            if (peakBadge) {
                peakBadge.textContent = `7일간 총 ${totalUpcoming}개 예정`;
            }

            if (insightText) {
                const peakItem = [...forecastDays].sort((a, b) => b.count - a.count)[0];
                if (totalUpcoming === 0) {
                    insightText.innerHTML = `
                        <span class="material-symbols-outlined text-[13px] text-primary">tips_and_updates</span>
                        <span>예정된 복습이 여유롭습니다. 새 문장을 등록해보세요!</span>
                    `;
                } else if (peakItem && peakItem.count >= 10) {
                    insightText.innerHTML = `
                        <span class="material-symbols-outlined text-[13px] text-rose-500">warning</span>
                        <span>${peakItem.dayName}(${peakItem.monthDay})에 복습 ${peakItem.count}개 집중 예정</span>
                    `;
                } else {
                    insightText.innerHTML = `
                        <span class="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                        <span>7일간 하루 평균 ${(totalUpcoming / 7).toFixed(1)}개로 균형 있게 분산됨</span>
                    `;
            }
        }
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
