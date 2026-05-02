import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  CirclePlus,
  KeyRound,
  MapPin,
  RefreshCcw,
  Search,
  Send,
  Shield,
  Sparkles,
  Vote,
  WandSparkles,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const LEVELS = {
  level1: {
    image: "/scienceworld-level1.png",
    labels: {
      en: "Level 1",
      fr: "Niveau 1",
    },
    captions: {
      en: "Main stage, sponsor booths, and high-traffic audience areas",
      fr: "Scène principale, kiosques partenaires et zones à forte affluence",
    },
  },
  level2: {
    image: "/scienceworld-level2.png",
    labels: {
      en: "Level 2",
      fr: "Niveau 2",
    },
    captions: {
      en: "Feature exhibition, labs, snack area, and roaming pulses",
      fr: "Exposition vedette, laboratoires, aire de collations et interactions mobiles",
    },
  },
};

const CATEGORIES = ["Question", "Praise", "Need Help", "Long Line", "Fun"];
const RAW_BANNED_WORDS = [
  "spam",
  "stupid",
  "idiot",
  "hate",
  "kill",
  "salty",
  "damn",
  "hell",
  "crap",
  "shit",
  "bullshit",
  "piss",
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "fuck",
  "fucking",
  "motherfucker",
  "dick",
  "dickhead",
  "prick",
  "douche",
  "douchebag",
  "jackass",
  "dumbass",
  "moron",
  "loser",
  "jerk",
  "tool",
  "clown",
  "creep",
  "trash",
  "garbage",
  "shut up",
  "screw you",
  "toxic",
  "fake",
  "annoying",
  "bloody",
  "twat",
  "wanker",
  "arse",
  "arsehole",
  "bollocks",
  "slag",
  "nitwit",
  "dimwit",
  "dipshit",
  "jerkwad",
  "scumbag",
  "sleazebag",
  "low-life",
  "deadbeat",
  "freeloader",
  "leech",
  "rat",
  "snake",
  "backstabber",
  "two-faced",
  "phony",
  "poser",
  "wannabe",
  "bigmouth",
  "loudmouth",
  "smartass",
  "wiseass",
  "know-it-all",
  "drama queen",
  "crybaby",
  "coward",
  "brat",
  "spoiled",
  "entitled",
  "lazy",
  "bum",
  "slacker",
  "mess",
  "wreck",
  "trainwreck",
  "clueless",
  "oblivious",
  "dense",
  "pathetic",
  "ridiculous",
  "dumb",
  "brain-dead",
  "mindless",
  "worthless",
];
const BANNED_WORDS = [...new Set(RAW_BANNED_WORDS.map((word) => normalizeText(word)))];
const COLOR_ROTATION = ["cyan", "purple", "amber", "green"];
const SUMMARY_MODELS = [
  {
    value: "gpt-5.4-mini",
    label: "gpt-5.4-mini",
    helpers: {
      en: "Fast and cost-aware for live summaries",
      fr: "Rapide et économique pour les résumés en direct",
    },
  },
  {
    value: "gpt-5.5",
    label: "gpt-5.5",
    helpers: {
      en: "Best quality if speed matters less",
      fr: "Meilleure qualité si la rapidité compte moins",
    },
  },
  {
    value: "gpt-4.1",
    label: "gpt-4.1",
    helpers: {
      en: "Stable non-reasoning fallback",
      fr: "Solution de rechange stable sans raisonnement",
    },
  },
];

const LANGUAGE_STORAGE_KEY = "stagepulse-language-v1";
const VIEW_MODE_STORAGE_KEY = "stagepulse-view-mode-v1";
const LOCALE_BY_LANGUAGE = {
  en: "en-CA",
  fr: "fr-CA",
};

const COMMON_LANGUAGE_HINTS = {
  en: [
    "the",
    "and",
    "is",
    "are",
    "with",
    "this",
    "that",
    "line",
    "help",
    "question",
  ],
  fr: [
    " le ",
    " la ",
    " les ",
    " des ",
    " une ",
    " est ",
    " avec ",
    " pour ",
    "question",
    "aide",
  ],
};

const CATEGORY_LABELS = {
  en: {
    Question: "Question",
    Praise: "Praise",
    "Need Help": "Need Help",
    "Long Line": "Long Line",
    Fun: "Fun",
  },
  fr: {
    Question: "Question",
    Praise: "Bravo",
    "Need Help": "Besoin d’aide",
    "Long Line": "Longue file",
    Fun: "Amusant",
  },
};

const UI_COPY = {
  en: {
    languageLabel: "Language",
    liveView: "Live",
    dataView: "Data",
    dataViewLabel: "Data view",
    liveViewLabel: "Live view",
    languagePromptTitle: "Choose your language",
    languagePromptBody:
      "Select English or French for this device. You can change it anytime from the top-left corner.",
    chooseEnglish: "English",
    chooseFrench: "Français",
    live: "LIVE",
    adminMode: "Admin mode",
    audienceMode: "Audience mode",
    adminAccessMode: "Admin access",
    brandDescription:
      "Audience members scan a QR code, vote in the live poll, tap a location, and leave questions or pulses without logging in.",
    anonymousBrowser: "Anonymous browser",
    liveComments: "Live comments",
    audiencePoll: "Audience Poll",
    pollDescription:
      "Each browser gets one live vote. Audience members can move their vote, but not stack multiple votes from the same session.",
    mostPopularVote: "Most Popular Vote",
    audienceVotesCaptured: (count) => `${count} audience votes captured`,
    addBooth: "Add Booth",
    clickMapToPlaceBooth: "Click map to place booth",
    searchPlaceholder: "Search comments, booths, categories...",
    addModeInstruction: "Add mode is live. Click anywhere on the current map to place a booth.",
    defaultMapInstruction:
      "Select a booth, write a pulse, and let the audience light up the venue map.",
    newBoothOnLevel: (levelLabel) => `New booth on ${levelLabel}`,
    selectedBooth: (name) => `Selected: ${name}`,
    selectedFallback: "No booth selected",
    currentLevel: "Current level",
    visibleBooths: "Visible booths",
    levelPulses: "Level pulses",
    removeBooth: "Remove Booth",
    newBoothPlaceholder: "Name the new booth, e.g. Elastic Demo Booth",
    cancel: "Cancel",
    createBooth: "Create Booth",
    messagePlaceholder: "Ask a question or leave a pulse here...",
    sendPulse: "Send Pulse",
    stageReadout: "Stage Readout",
    freshMix: "Fresh mix of questions",
    safetyAlertsActive: "Safety alerts active",
    safetyLayerSteady: "Safety layer steady",
    openAiCommentSummary: "OpenAI Comment Summary",
    usingBrowserKey: "Using browser key",
    usingEnvKey: "Using env key",
    noApiKeyConnected: "No API key connected",
    summaryNote:
      "Demo-friendly setup: you can paste a browser key here, but OpenAI recommends keeping production keys on your backend instead of shipping them in the browser.",
    openAiApiKey: "OpenAI API key",
    envKeyPlaceholder: "Optional browser override for the env key",
    browserKeyPlaceholder: "Paste a project key for comment summaries",
    summaryModel: "Summary model",
    autoSummarize: "Auto summarize new comments",
    saveKey: "Save Key",
    clearSavedKey: "Clear Saved Key",
    summarizeNow: "Summarize Now",
    summarizing: "Summarizing",
    generatedSummary: "Generated summary",
    noAiSummaryYet:
      "No AI summary yet. Add a key, then click Summarize Now or turn on auto summarize.",
    adminPollControls: "Admin Poll Controls",
    adminPollNote:
      "Stage laptop only. Audience QR users stay on the vote-only view unless they open the page with ?admin=1.",
    pollQuestionLabel: "Poll question",
    pollQuestionPlaceholder: "What do you want the audience to vote on?",
    optionPlaceholder: (index) => `Option ${index + 1}`,
    remove: "Remove",
    addOption: "Add Option",
    resetVotes: "Reset Votes",
    indexedQuestions: "Indexed Questions",
    indexedQuestionsHelper: "ready for Elastic search",
    duplicateQuestions: "Duplicated Questions",
    duplicateQuestionsHelper: "grouped for speaker clarity",
    blockedWords: "Blocked Words",
    blockedWordsHelper: "moderation log",
    suspiciousBurst: "Suspicious Burst",
    suspiciousBurstHelper: "browser spike alerts",
    repeatClusters: "Repeat Clusters",
    noDuplicateClusters: "No duplicate question clusters yet.",
    matchingQuestions: (count) => `${count} matching questions`,
    elasticLiveLayer: "Elastic Live Layer",
    supabaseSync: "Supabase Sync",
    addSupabaseEnv: "Add Supabase env vars to enable shared live state.",
    loadingSupabase: "Loading booths, questions, and poll votes from Supabase.",
    syncIssue: (message) => `Sync issue: ${message}`,
    realtimeActive: "Realtime sync is active for connected phones and laptops.",
    sharedLoaded: "Shared data loaded. Waiting for realtime confirmation.",
    search: "Search",
    searchDescription: "Questions, booths, zones, categories, and map pulses",
    security: "Security",
    securityDescription: "Banned words, burst detection, and repeated-input alerts",
    observability: "Observability",
    observabilityDescription:
      "Votes, pulse submissions, level switches, and summary events",
    noLoginId: "No-login ID",
    liveFeed: "Live Feed",
    dataViewTitle: "Data View",
    dataViewDescription:
      "Deeper event intelligence, Elastic-facing metrics, repeat clusters, and live venue signals.",
    adminTools: "Admin Tools",
    adminToolsIntro:
      "Admins can view the full audience experience first, then scroll down for poll controls and AI summary tools.",
    jumpToAdmin: "Jump to admin tools",
    matchingResults: (count) => `${count} matching result${count === 1 ? "" : "s"}`,
    livePulsesIndexed: (count) => `${count} live pulses indexed`,
    elasticChecking: (query) => `Elastic fuzzy search is checking "${query}"...`,
    elasticUnavailable:
      (query) => `Elastic search is unavailable, showing live local matches for "${query}".`,
    elasticMatches: (query) => `Elastic + live matches for "${query}"`,
    latestAudienceSignal: "Latest audience signal across the venue",
    noMatchingPulses: "No matching pulses yet.",
    builtBy: "Built by",
    teamName: "Semiahmoo Secondary Team",
    teamMembers: "Team members",
    voteAlreadyOn: (label) => `Your vote is already on ${label}.`,
    voteMovedTo: (label) => `Vote moved to ${label}.`,
    voteSentTo: (label) => `Vote sent to ${label}.`,
    addApiKeyFirst: "Add an OpenAI API key first.",
    noCommentsSummary: "No audience comments yet to summarize.",
    addApiKeySummary: "Add an OpenAI API key or VITE_OPENAI_API_KEY before summarizing.",
    freshSummaryGenerated: "Fresh AI summary generated.",
    openAiSummaryFailed: "OpenAI summary failed. Check the admin panel.",
    browserKeySaved: "Browser key saved on this device.",
    browserKeyCleared: "Browser key cleared. Env key will be used if available.",
    keepTwoPollOptions: "Keep at least two poll options.",
    pollReset: "Poll vote counts reset for the next demo run.",
    pointAlreadyPlaced:
      "This booth point is already placed. Create it or cancel it before placing another.",
    mapPointPlaced: "Map point placed. Name the booth below.",
    addBoothNameFirst: "Click the map and add a booth name first.",
    boothAdded: "New booth added to the live map.",
    onlyCustomBooths: "Only booths added in this demo can be removed.",
    boothRemoved: "Booth removed from the live map.",
    selectBoothFirst: "Select a booth first.",
    writePulseFirst: "Write a pulse or question first.",
    blockedBySafety: "Blocked by live safety filter.",
    pulseSentTo: (category, booth) => `${category} sent to ${booth}.`,
    summaryDeveloperInstruction:
      "You summarize live venue comments for an event admin. Be concise, actionable, and plain text only.",
    summaryPromptIntro:
      "You are summarizing live audience comments for an event admin dashboard called StagePulse Map.",
    summaryPromptInstruction: "Write concise, useful plain text for a stage moderator.",
    summaryPromptSections: "Return exactly these sections:",
    summaryHeading: "Summary:",
    topThemesHeading: "Top themes:",
    bulletPlaceholder: "- item",
    speakerCueHeading: "Speaker cue:",
    safetyNoteHeading: "Safety note:",
    selectedBoothContext: (name) => `Selected booth context: ${name}.`,
    duplicateSignals: (line) => `Duplicate signals: ${line}`,
    recentComments: "Recent comments:",
    noCommentsAvailable: "No comments available.",
    noDuplicateSignal: "No duplicate clusters are currently forming.",
    duplicateLabel: (label, count) => `${label}: ${count} related questions`,
    duplicateClusterElastic: "Elastic search and indexing",
    duplicateClusterNoLogin: "Anonymous no-login flow",
    duplicateClusterDuplicates: "Repeated question grouping",
    duplicateClusterAbuse: "Moderation and abuse control",
    assistantPrimaryFallback: "Live audience interaction",
    assistantFocusDefault:
      "Audience signals are spread across the map, so the speaker can steer the next moment.",
    assistantFocusTop: (label, count) => `${label} is bubbling up across ${count} questions.`,
    assistantRecommendationTop: (sample) => `Suggested next answer: ${sample}`,
    assistantRecommendationDefault:
      "Suggested next answer: explain how anonymous browser IDs keep the experience no-login while Elastic handles search and moderation.",
    assistantSafetyQuiet: "Safety layer is quiet right now.",
    assistantSafetyActive:
      (blocked, burst) =>
        `Safety layer has blocked ${blocked} banned-word attempt${
          blocked === 1 ? "" : "s"
        } and flagged ${burst} burst alert${burst === 1 ? "" : "s"}.`,
  },
  fr: {
    languageLabel: "Langue",
    liveView: "Direct",
    dataView: "Données",
    dataViewLabel: "Vue données",
    liveViewLabel: "Vue direct",
    languagePromptTitle: "Choisissez votre langue",
    languagePromptBody:
      "Sélectionnez l’anglais ou le français pour cet appareil. Vous pourrez la modifier en tout temps dans le coin supérieur gauche.",
    chooseEnglish: "English",
    chooseFrench: "Français",
    live: "EN DIRECT",
    adminMode: "Mode admin",
    audienceMode: "Mode public",
    adminAccessMode: "Accès admin",
    brandDescription:
      "Les participants scannent un code QR, votent au sondage en direct, touchent un emplacement et laissent des questions ou des impulsions sans se connecter.",
    anonymousBrowser: "Navigateur anonyme",
    liveComments: "Commentaires en direct",
    audiencePoll: "Sondage du public",
    pollDescription:
      "Chaque navigateur dispose d’un seul vote en direct. Les participants peuvent déplacer leur vote, mais ne peuvent pas en cumuler plusieurs dans la même session.",
    mostPopularVote: "Vote le plus populaire",
    audienceVotesCaptured: (count) => `${count} votes du public enregistrés`,
    addBooth: "Ajouter un kiosque",
    clickMapToPlaceBooth: "Cliquez sur la carte pour placer le kiosque",
    searchPlaceholder: "Rechercher des commentaires, kiosques ou catégories...",
    addModeInstruction:
      "Le mode ajout est actif. Cliquez n’importe où sur la carte actuelle pour placer un kiosque.",
    defaultMapInstruction:
      "Sélectionnez un kiosque, rédigez une impulsion et laissez le public animer la carte du lieu.",
    newBoothOnLevel: (levelLabel) => `Nouveau kiosque sur ${levelLabel}`,
    selectedBooth: (name) => `Sélectionné : ${name}`,
    selectedFallback: "Aucun kiosque sélectionné",
    currentLevel: "Niveau actuel",
    visibleBooths: "Kiosques visibles",
    levelPulses: "Impulsions du niveau",
    removeBooth: "Supprimer le kiosque",
    newBoothPlaceholder: "Nommez le nouveau kiosque, ex. Kiosque démo Elastic",
    cancel: "Annuler",
    createBooth: "Créer le kiosque",
    messagePlaceholder: "Posez une question ou laissez une impulsion ici...",
    sendPulse: "Envoyer l’impulsion",
    stageReadout: "Lecture de scène",
    freshMix: "Mélange de questions varié",
    safetyAlertsActive: "Alertes de sécurité actives",
    safetyLayerSteady: "Couche de sécurité stable",
    openAiCommentSummary: "Résumé OpenAI des commentaires",
    usingBrowserKey: "Clé du navigateur utilisée",
    usingEnvKey: "Clé d’environnement utilisée",
    noApiKeyConnected: "Aucune clé API connectée",
    summaryNote:
      "Configuration pratique pour la démo : vous pouvez coller une clé de navigateur ici, mais OpenAI recommande de garder les clés de production sur votre backend plutôt que dans le navigateur.",
    openAiApiKey: "Clé API OpenAI",
    envKeyPlaceholder: "Remplacement facultatif de la clé d’environnement",
    browserKeyPlaceholder: "Collez une clé de projet pour les résumés",
    summaryModel: "Modèle de résumé",
    autoSummarize: "Résumer automatiquement les nouveaux commentaires",
    saveKey: "Enregistrer la clé",
    clearSavedKey: "Effacer la clé enregistrée",
    summarizeNow: "Résumer maintenant",
    summarizing: "Résumé en cours",
    generatedSummary: "Résumé généré",
    noAiSummaryYet:
      "Aucun résumé IA pour le moment. Ajoutez une clé, puis cliquez sur Résumer maintenant ou activez le résumé automatique.",
    adminPollControls: "Contrôles admin du sondage",
    adminPollNote:
      "Réservé à l’ordinateur de scène. Les utilisateurs du code QR restent sur la vue de vote seulement, sauf s’ils ouvrent la page avec ?admin=1.",
    pollQuestionLabel: "Question du sondage",
    pollQuestionPlaceholder: "Que voulez-vous demander au public ?",
    optionPlaceholder: (index) => `Option ${index + 1}`,
    remove: "Supprimer",
    addOption: "Ajouter une option",
    resetVotes: "Réinitialiser les votes",
    indexedQuestions: "Questions indexées",
    indexedQuestionsHelper: "prêtes pour la recherche Elastic",
    duplicateQuestions: "Questions en doublon",
    duplicateQuestionsHelper: "regroupées pour le conférencier",
    blockedWords: "Mots bloqués",
    blockedWordsHelper: "journal de modération",
    suspiciousBurst: "Rafale suspecte",
    suspiciousBurstHelper: "alertes d’activité navigateur",
    repeatClusters: "Groupes répétés",
    noDuplicateClusters: "Aucun groupe de questions répétées pour l’instant.",
    matchingQuestions: (count) => `${count} questions correspondantes`,
    elasticLiveLayer: "Couche Elastic en direct",
    supabaseSync: "Synchronisation Supabase",
    addSupabaseEnv:
      "Ajoutez les variables d’environnement Supabase pour activer l’état partagé en direct.",
    loadingSupabase:
      "Chargement des kiosques, des questions et des votes de sondage depuis Supabase.",
    syncIssue: (message) => `Problème de synchronisation : ${message}`,
    realtimeActive: "La synchronisation temps réel est active pour les téléphones et ordinateurs connectés.",
    sharedLoaded: "Les données partagées sont chargées. En attente de la confirmation temps réel.",
    search: "Recherche",
    searchDescription: "Questions, kiosques, zones, catégories et impulsions sur la carte",
    security: "Sécurité",
    securityDescription:
      "Mots interdits, détection de rafales et alertes d’entrées répétées",
    observability: "Observabilité",
    observabilityDescription:
      "Votes, envois d’impulsions, changements de niveau et événements de résumé",
    noLoginId: "ID sans connexion",
    liveFeed: "Fil en direct",
    dataViewTitle: "Vue données",
    dataViewDescription:
      "Informations plus détaillées sur l’événement, métriques liées à Elastic, groupes répétés et signaux en direct du lieu.",
    adminTools: "Outils admin",
    adminToolsIntro:
      "Les admins voient d’abord toute l’expérience publique, puis peuvent descendre vers les contrôles du sondage et les outils de résumé IA.",
    jumpToAdmin: "Aller aux outils admin",
    matchingResults: (count) => `${count} résultat${count === 1 ? "" : "s"} correspondant${count === 1 ? "" : "s"}`,
    livePulsesIndexed: (count) => `${count} impulsions en direct indexées`,
    elasticChecking: (query) => `La recherche floue Elastic vérifie « ${query} »...`,
    elasticUnavailable:
      (query) =>
        `La recherche Elastic est indisponible; affichage des correspondances locales pour « ${query} ».`,
    elasticMatches: (query) => `Correspondances Elastic + direct pour « ${query} »`,
    latestAudienceSignal: "Dernier signal du public dans le lieu",
    noMatchingPulses: "Aucune impulsion correspondante pour le moment.",
    builtBy: "Réalisé par",
    teamName: "Semiahmoo Secondary Team",
    teamMembers: "Membres de l’équipe",
    voteAlreadyOn: (label) => `Votre vote est déjà sur ${label}.`,
    voteMovedTo: (label) => `Vote déplacé vers ${label}.`,
    voteSentTo: (label) => `Vote envoyé vers ${label}.`,
    addApiKeyFirst: "Ajoutez d’abord une clé API OpenAI.",
    noCommentsSummary: "Aucun commentaire du public à résumer pour le moment.",
    addApiKeySummary:
      "Ajoutez une clé API OpenAI ou VITE_OPENAI_API_KEY avant de lancer un résumé.",
    freshSummaryGenerated: "Nouveau résumé IA généré.",
    openAiSummaryFailed: "Le résumé OpenAI a échoué. Vérifiez le panneau admin.",
    browserKeySaved: "Clé du navigateur enregistrée sur cet appareil.",
    browserKeyCleared:
      "Clé du navigateur effacée. La clé d’environnement sera utilisée si elle existe.",
    keepTwoPollOptions: "Conservez au moins deux options de sondage.",
    pollReset: "Le nombre de votes du sondage a été réinitialisé pour la prochaine démo.",
    pointAlreadyPlaced:
      "Ce point de kiosque est déjà placé. Créez-le ou annulez-le avant d’en placer un autre.",
    mapPointPlaced: "Point placé sur la carte. Nommez le kiosque ci-dessous.",
    addBoothNameFirst: "Cliquez sur la carte et ajoutez d’abord un nom de kiosque.",
    boothAdded: "Nouveau kiosque ajouté à la carte en direct.",
    onlyCustomBooths: "Seuls les kiosques ajoutés dans cette démo peuvent être supprimés.",
    boothRemoved: "Kiosque retiré de la carte en direct.",
    selectBoothFirst: "Sélectionnez d’abord un kiosque.",
    writePulseFirst: "Rédigez d’abord une impulsion ou une question.",
    blockedBySafety: "Bloqué par le filtre de sécurité en direct.",
    pulseSentTo: (category, booth) => `${category} envoyé à ${booth}.`,
    summaryDeveloperInstruction:
      "Tu résumes des commentaires en direct pour un tableau de bord d’événement. Sois concis, utile et en texte brut seulement.",
    summaryPromptIntro:
      "Tu résumes des commentaires du public en direct pour un tableau de bord d’administration appelé StagePulse Map.",
    summaryPromptInstruction:
      "Rédige un texte court et utile pour une personne qui anime la scène.",
    summaryPromptSections: "Retourne exactement ces sections :",
    summaryHeading: "Résumé :",
    topThemesHeading: "Thèmes principaux :",
    bulletPlaceholder: "- point",
    speakerCueHeading: "Indice pour l’animateur :",
    safetyNoteHeading: "Note de sécurité :",
    selectedBoothContext: (name) => `Contexte du kiosque sélectionné : ${name}.`,
    duplicateSignals: (line) => `Signaux de doublons : ${line}`,
    recentComments: "Commentaires récents :",
    noCommentsAvailable: "Aucun commentaire disponible.",
    noDuplicateSignal: "Aucun groupe de doublons ne se forme actuellement.",
    duplicateLabel: (label, count) => `${label} : ${count} questions liées`,
    duplicateClusterElastic: "Recherche et indexation Elastic",
    duplicateClusterNoLogin: "Expérience anonyme sans connexion",
    duplicateClusterDuplicates: "Regroupement des questions répétées",
    duplicateClusterAbuse: "Modération et contrôle des abus",
    assistantPrimaryFallback: "Interaction en direct avec le public",
    assistantFocusDefault:
      "Les signaux du public sont répartis sur la carte, ce qui permet d’orienter le prochain moment sur scène.",
    assistantFocusTop: (label, count) => `${label} remonte dans ${count} questions.`,
    assistantRecommendationTop: (sample) => `Prochaine réponse suggérée : ${sample}`,
    assistantRecommendationDefault:
      "Prochaine réponse suggérée : expliquez comment les identifiants de navigateur anonymes gardent l’expérience sans connexion pendant qu’Elastic gère la recherche et la modération.",
    assistantSafetyQuiet: "La couche de sécurité est calme pour le moment.",
    assistantSafetyActive:
      (blocked, burst) =>
        `La couche de sécurité a bloqué ${blocked} tentative${
          blocked === 1 ? "" : "s"
        } avec mots interdits et signalé ${burst} alerte${
          burst === 1 ? "" : "s"
        } de rafale.`,
  },
};

const ENV_OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? "";
const ENV_OPENAI_MODEL = import.meta.env.VITE_OPENAI_SUMMARY_MODEL ?? "gpt-5.4-mini";
const ELASTIC_SEARCH_DEBOUNCE_MS = 260;

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function seedPulse(id, type, text, createdAt, browserId = "demo-seed") {
  return { id, type, text, createdAt, browserId };
}

const INITIAL_BOOTHS = [
];

const INITIAL_POLL = {
  question: "Which area should the speaker highlight next?",
  options: [
    { id: "poll-main-stage", label: "Main Stage", votes: 19 },
    { id: "poll-sponsors", label: "Sponsor Booths", votes: 11 },
    { id: "poll-hackers", label: "Hacker Room", votes: 15 },
    { id: "poll-food", label: "Food Area", votes: 8 },
  ],
};

const DEFAULT_POLL_COPY = {
  en: {
    question: "Which area should the speaker highlight next?",
    options: {
      "poll-main-stage": "Main Stage",
      "poll-sponsors": "Sponsor Booths",
      "poll-hackers": "Hacker Room",
      "poll-food": "Food Area",
    },
  },
  fr: {
    question: "Quelle zone le conférencier devrait-il présenter ensuite ?",
    options: {
      "poll-main-stage": "Scène principale",
      "poll-sponsors": "Kiosques partenaires",
      "poll-hackers": "Salle des hackers",
      "poll-food": "Aire repas",
    },
  },
};

const SEEDED_BOOTH_COPY = {
  en: {
    "main-stage": {
      name: "Peter Brown Family Centre Stage",
      shortName: "Main Stage",
    },
    "connection-zone": {
      name: "Connection Zone",
      shortName: "Sponsor Booths",
    },
    "bits-bytes": {
      name: "Bits and Bytes Lab",
      shortName: "Hacker Room",
    },
    "feature-exhibition": {
      name: "Feature Exhibition",
      shortName: "Feature Exhibition",
    },
    "snack-lab": {
      name: "Snack Lab",
      shortName: "Food Area",
    },
  },
  fr: {
    "main-stage": {
      name: "Scène du Peter Brown Family Centre",
      shortName: "Scène principale",
    },
    "connection-zone": {
      name: "Zone Connexion",
      shortName: "Kiosques partenaires",
    },
    "bits-bytes": {
      name: "Labo Bits and Bytes",
      shortName: "Salle des hackers",
    },
    "feature-exhibition": {
      name: "Exposition vedette",
      shortName: "Exposition vedette",
    },
    "snack-lab": {
      name: "Labo Collations",
      shortName: "Aire repas",
    },
  },
};

const SEEDED_PULSE_COPY = {
  en: {
    "p-main-1": "Can you show how repeated questions are grouped on stage?",
    "p-main-2": "Main stage energy is perfect for the live demo.",
    "p-conn-1": "How does this work without login?",
    "p-bits-1": "Can people ask anonymously without logging in?",
    "p-bits-2": "Need another power strip in the hacker room.",
    "p-feature-1": "Will repeated questions be merged before the speaker answers?",
    "p-snack-1": "Food area line is growing near Snack Lab.",
  },
  fr: {
    "p-main-1": "Pouvez-vous montrer comment les questions répétées sont regroupées sur scène ?",
    "p-main-2": "L’énergie de la scène principale est parfaite pour la démo en direct.",
    "p-conn-1": "Comment cela fonctionne-t-il sans connexion ?",
    "p-bits-1": "Peut-on poser des questions anonymement sans se connecter ?",
    "p-bits-2": "Il faudrait une autre barre d’alimentation dans la salle des hackers.",
    "p-feature-1":
      "Les questions répétées seront-elles regroupées avant la réponse du conférencier ?",
    "p-snack-1": "La file pour les collations s’allonge près du Labo Collations.",
  },
};

const INITIAL_SECURITY_EVENTS = [
  {
    id: "sec-1",
    kind: "blocked-word",
    createdAt: minutesAgo(22),
    browserId: "legacy-402",
    detail: "Blocked a banned word in a stage question.",
  },
  {
    id: "sec-2",
    kind: "blocked-word",
    createdAt: minutesAgo(20),
    browserId: "legacy-403",
    detail: "Blocked a hostile comment in Sponsor Booths.",
  },
  {
    id: "sec-3",
    kind: "blocked-word",
    createdAt: minutesAgo(18),
    browserId: "legacy-404",
    detail: "Blocked abuse language before it reached the map.",
  },
  {
    id: "sec-4",
    kind: "suspicious-burst",
    createdAt: minutesAgo(12),
    browserId: "legacy-405",
    detail: "Four questions arrived from one browser in 18 seconds.",
  },
];

const INITIAL_SUMMARY_STATE = {
  text: "",
  lastSummaryAt: "",
  fingerprint: "",
  model: ENV_OPENAI_MODEL,
  source: "",
};

const INITIAL_OPENAI_SETTINGS = {
  browserKey: "",
  model: ENV_OPENAI_MODEL,
  autoSummarize: false,
};

const INITIAL_POLL_SELECTION = {
  optionId: "",
};

const POLL_CONFIG_STORAGE_KEY = "stagepulse-poll-config-v1";
const STAGEPULSE_META_PREFIX = "__stagepulse__";
const LOCAL_BOOTHS_STORAGE_KEY = "stagepulse-booths-v3";

function getStoredLanguage() {
  if (typeof window === "undefined") return null;

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "fr" ? "fr" : storedLanguage === "en" ? "en" : null;
}

function getStoredViewMode() {
  if (typeof window === "undefined") return "live";

  const storedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return storedViewMode === "data" ? "data" : "live";
}

function readStoredJson(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // MVP: ignore persistence failures silently.
  }
}

function buildPollConfigSnapshot(source = INITIAL_POLL) {
  return {
    question: source.question ?? INITIAL_POLL.question,
    options: Array.isArray(source.options) && source.options.length
      ? source.options.map((option, index) => ({
          id: option.id ?? createId(`poll-option-${index + 1}`),
          label: option.label ?? `Option ${index + 1}`,
        }))
      : INITIAL_POLL.options.map((option) => ({
          id: option.id,
          label: option.label,
        })),
  };
}

function getStoredPollConfig() {
  const storedConfig = readStoredJson(POLL_CONFIG_STORAGE_KEY, null);
  if (storedConfig?.question && Array.isArray(storedConfig.options)) {
    return buildPollConfigSnapshot(storedConfig);
  }

  const legacyPoll = readStoredJson("stagepulse-poll-v3", null);
  if (legacyPoll?.question && Array.isArray(legacyPoll.options)) {
    return buildPollConfigSnapshot(legacyPoll);
  }

  return buildPollConfigSnapshot(INITIAL_POLL);
}

function fallbackShortName(name) {
  return name.length > 18 ? `${name.slice(0, 18)}...` : name;
}

function createTranslationCacheKey(targetLanguage, text) {
  return `${targetLanguage}::${normalizeText(text)}`;
}

function getLevelLabel(level, language) {
  return LEVELS[level]?.labels?.[language] ?? LEVELS[level]?.labels?.en ?? level;
}

function getLevelCaption(level, language) {
  return LEVELS[level]?.captions?.[language] ?? LEVELS[level]?.captions?.en ?? "";
}

function getCategoryLabel(category, language) {
  return CATEGORY_LABELS[language]?.[category] ?? CATEGORY_LABELS.en[category] ?? category;
}

function localizeDefaultPoll(poll, language) {
  const targetCopy = DEFAULT_POLL_COPY[language];
  const defaultQuestions = new Set(
    Object.values(DEFAULT_POLL_COPY).map((pollCopy) => pollCopy.question)
  );
  const defaultOptionLabels = Object.fromEntries(
    Object.keys(targetCopy.options).map((optionId) => [
      optionId,
      new Set(Object.values(DEFAULT_POLL_COPY).map((pollCopy) => pollCopy.options[optionId])),
    ])
  );

  return {
    ...poll,
    question: defaultQuestions.has(poll.question) ? targetCopy.question : poll.question,
    options: poll.options.map((option) => {
      const labels = defaultOptionLabels[option.id];
      if (!labels || !labels.has(option.label)) {
        return option;
      }

      return {
        ...option,
        label: targetCopy.options[option.id] ?? option.label,
      };
    }),
  };
}

function localizeBooths(booths, language) {
  return booths.map((booth) => {
    const localizedBooth = SEEDED_BOOTH_COPY[language]?.[booth.id];

    return {
      ...booth,
      name: localizedBooth?.name ?? booth.name,
      shortName: localizedBooth?.shortName ?? booth.shortName,
      pulses: booth.pulses.map((pulse) => ({
        ...pulse,
        text: SEEDED_PULSE_COPY[language]?.[pulse.id] ?? pulse.text,
      })),
    };
  });
}

function encodeStagePulseMeta(kind, payload) {
  return `${STAGEPULSE_META_PREFIX}${kind}:${JSON.stringify(payload)}`;
}

function decodeStagePulseMeta(value, kind) {
  if (typeof value !== "string") return null;

  const prefix = `${STAGEPULSE_META_PREFIX}${kind}:`;
  if (!value.startsWith(prefix)) return null;

  try {
    return JSON.parse(value.slice(prefix.length));
  } catch {
    return null;
  }
}

function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `spm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function encodeBoothColorField(booth) {
  return encodeStagePulseMeta("booth", {
    level: booth.level,
    color: booth.color,
    custom: booth.custom,
  });
}

function encodeQuestionTextField(question) {
  return encodeStagePulseMeta("question", {
    text: question.text,
    type: question.type,
    browserId: question.browserId,
  });
}

function encodePollVoteOptionField(vote) {
  return encodeStagePulseMeta("vote", {
    browserId: vote.browserId,
    optionId: vote.optionId,
    optionLabel: vote.optionLabel,
  });
}

function parseCoordinate(value, fallback) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function normalizeBoothRow(row, index = 0) {
  if (!row) return null;

  const metadata = decodeStagePulseMeta(row.color, "booth") ?? {};
  const rawColor = metadata.color ?? row.color;
  const name = row.label ?? row.name ?? row.title ?? `Booth ${index + 1}`;

  return {
    id: String(row.id ?? row.booth_id ?? createId("booth")),
    name,
    shortName: row.short_name ?? row.shortName ?? fallbackShortName(name),
    level: metadata.level ?? row.level ?? "level1",
    x: Math.max(8, Math.min(92, parseCoordinate(row.x ?? row.x_percent, 50))),
    y: Math.max(10, Math.min(90, parseCoordinate(row.y ?? row.y_percent, 50))),
    color:
      typeof rawColor === "string" && COLOR_ROTATION.includes(rawColor)
        ? rawColor
        : COLOR_ROTATION[index % COLOR_ROTATION.length],
    custom: Boolean(metadata.custom ?? row.custom ?? row.is_custom ?? true),
    createdAt: row.created_at ?? row.createdAt ?? "",
  };
}

function normalizeQuestionRow(row) {
  if (!row) return null;

  const metadata = decodeStagePulseMeta(row.text, "question") ?? {};
  const text = metadata.text ?? row.text ?? row.message ?? "";

  return {
    id: String(row.id ?? createId("question")),
    boothId: String(row.booth_id ?? row.boothId ?? ""),
    type: metadata.type ?? row.type ?? row.category ?? "Question",
    text,
    browserId: metadata.browserId ?? row.browser_id ?? row.browserId ?? "stagepulse-anon",
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

function normalizePollVoteRow(row) {
  if (!row) return null;

  const metadata = decodeStagePulseMeta(row.option, "vote") ?? {};
  const optionLabel = metadata.optionLabel ?? row.option_label ?? row.optionLabel ?? row.option ?? row.label ?? "";

  return {
    id: String(
      row.id ??
        `${metadata.browserId ?? row.browser_id ?? row.browserId ?? "vote"}-${
          row.created_at ?? row.createdAt ?? Date.now()
        }`
    ),
    optionId:
      metadata.optionId ??
      row.option_id ??
      row.optionId ??
      (optionLabel ? normalizeText(optionLabel).replace(/\s+/g, "-") : createId("poll-option")),
    optionLabel,
    browserId: metadata.browserId ?? row.browser_id ?? row.browserId ?? "",
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function upsertRowById(rows, nextRow) {
  if (!nextRow?.id) return rows;

  const existingIndex = rows.findIndex((row) => row.id === nextRow.id);
  if (existingIndex === -1) {
    return [nextRow, ...rows];
  }

  const nextRows = [...rows];
  nextRows[existingIndex] = { ...nextRows[existingIndex], ...nextRow };
  return nextRows;
}

function removeRowById(rows, rowId) {
  return rows.filter((row) => row.id !== rowId);
}

function buildBoothsFromSupabase(boothRows, questionRows) {
  const pulsesByBooth = new Map();

  for (const question of sortNewestFirst(questionRows)) {
    if (!question.boothId) continue;
    const existing = pulsesByBooth.get(question.boothId) ?? [];
    existing.push({
      id: question.id,
      type: question.type,
      text: question.text,
      browserId: question.browserId,
      createdAt: question.createdAt,
    });
    pulsesByBooth.set(question.boothId, existing);
  }

  return [...boothRows]
    .sort((a, b) => {
      if (a.level !== b.level) return a.level.localeCompare(b.level);
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.id.localeCompare(b.id);
    })
    .map((booth) => ({
      ...booth,
      pulses: pulsesByBooth.get(booth.id) ?? [],
    }));
}

function latestVotesByBrowser(voteRows) {
  const latestVotes = new Map();

  for (const vote of sortNewestFirst(voteRows)) {
    const key = vote.browserId || vote.id;
    if (!latestVotes.has(key)) {
      latestVotes.set(key, vote);
    }
  }

  return latestVotes;
}

function buildSupabasePoll(pollConfig, voteRows) {
  const latestVotes = latestVotesByBrowser(voteRows);
  const counts = new Map();

  for (const vote of latestVotes.values()) {
    const current = counts.get(vote.optionId) ?? 0;
    counts.set(vote.optionId, current + 1);
  }

  const configuredOptions = pollConfig.options.map((option) => ({
    id: option.id,
    label: option.label,
    votes: counts.get(option.id) ?? 0,
  }));

  const knownOptionIds = new Set(configuredOptions.map((option) => option.id));
  const trailingOptions = Array.from(latestVotes.values())
    .filter((vote) => !knownOptionIds.has(vote.optionId))
    .reduce((options, vote) => {
      if (options.some((option) => option.id === vote.optionId)) {
        return options;
      }

      return [
        ...options,
        {
          id: vote.optionId,
          label: vote.optionLabel || "Live Vote",
          votes: counts.get(vote.optionId) ?? 0,
        },
      ];
    }, []);

  return {
    question: pollConfig.question,
    options: [...configuredOptions, ...trailingOptions],
  };
}

function getSupabaseSelectedPollOptionId(voteRows, browserId) {
  return latestVotesByBrowser(voteRows).get(browserId)?.optionId ?? "";
}

function getBrowserId() {
  if (typeof window === "undefined") return "stagepulse-demo";

  const existing = window.localStorage.getItem("stagepulse-browser-id");
  if (existing) return existing;

  const nextId = createId("anon");
  window.localStorage.setItem("stagepulse-browser-id", nextId);
  return nextId;
}

function normalizeText(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectLikelyLanguage(text) {
  const normalized = ` ${normalizeText(text)} `;
  if (!normalized.trim()) return null;

  if (/[àâçéèêëîïôûùüÿœ]/i.test(String(text))) {
    return "fr";
  }

  const englishScore = COMMON_LANGUAGE_HINTS.en.reduce(
    (score, token) => score + (normalized.includes(` ${token} `) ? 1 : 0),
    0
  );
  const frenchScore = COMMON_LANGUAGE_HINTS.fr.reduce(
    (score, token) => score + (normalized.includes(token) ? 1 : 0),
    0
  );

  if (englishScore === frenchScore) return null;
  return englishScore > frenchScore ? "en" : "fr";
}

function similarQuestionKey(text) {
  const normalized = normalizeText(text);

  if (normalized.includes("elastic")) return "elastic-search";
  if (
    normalized.includes("login") ||
    normalized.includes("anonymous") ||
    normalized.includes("connexion") ||
    normalized.includes("connecter") ||
    normalized.includes("anonyme")
  ) {
    return "no-login";
  }
  if (
    normalized.includes("duplicate") ||
    normalized.includes("repeat") ||
    normalized.includes("group") ||
    normalized.includes("doublon") ||
    normalized.includes("repete") ||
    normalized.includes("regroup")
  ) {
    return "duplicate-detection";
  }
  if (
    normalized.includes("spam") ||
    normalized.includes("bot") ||
    normalized.includes("abuse") ||
    normalized.includes("moderation") ||
    normalized.includes("abus") ||
    normalized.includes("pourriel")
  ) {
    return "abuse-protection";
  }

  return normalized.slice(0, 52);
}

function labelQuestionCluster(key, sampleText, language) {
  const copy = UI_COPY[language];

  if (key === "elastic-search") return copy.duplicateClusterElastic;
  if (key === "no-login") return copy.duplicateClusterNoLogin;
  if (key === "duplicate-detection") return copy.duplicateClusterDuplicates;
  if (key === "abuse-protection") return copy.duplicateClusterAbuse;
  return sampleText;
}

function hasBannedWord(text) {
  const normalized = normalizeText(text);
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

function formatClock(isoString, language) {
  return new Date(isoString).toLocaleTimeString(LOCALE_BY_LANGUAGE[language] ?? "en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(isoString, language) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));

  if (language === "fr") {
    if (seconds < 60) return `il y a ${seconds} s`;
    if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
    return `il y a ${Math.floor(seconds / 3600)} h`;
  }

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function displayPollLabel(label, index) {
  return label.trim() || `Option ${index + 1}`;
}

function buildSummaryPrompt(language, pulses, duplicateGroups, selectedBooth) {
  const copy = UI_COPY[language];
  const pulseLines = pulses
    .slice(0, 18)
    .map(
      (pulse, index) =>
        `${index + 1}. [${getCategoryLabel(pulse.type, language)}] ${pulse.boothShortName} / ${
          getLevelLabel(pulse.level, language)
        } / ${formatRelativeTime(pulse.createdAt, language)} - ${pulse.text}`
    )
    .join("\n");

  const duplicateLine = duplicateGroups.length
    ? duplicateGroups
        .slice(0, 4)
        .map((group) => copy.duplicateLabel(group.label, group.count))
        .join("; ")
    : copy.noDuplicateSignal;

  return [
    copy.summaryPromptIntro,
    copy.summaryPromptInstruction,
    copy.summaryPromptSections,
    copy.summaryHeading,
    copy.topThemesHeading,
    copy.bulletPlaceholder,
    copy.bulletPlaceholder,
    copy.speakerCueHeading,
    copy.safetyNoteHeading,
    "",
    copy.selectedBoothContext(selectedBooth?.name ?? copy.selectedFallback),
    copy.duplicateSignals(duplicateLine),
    copy.recentComments,
    pulseLines || copy.noCommentsAvailable,
  ].join("\n");
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts =
    data?.output?.flatMap((item) =>
      Array.isArray(item?.content)
        ? item.content
            .filter((content) => content?.type === "output_text" && typeof content?.text === "string")
            .map((content) => content.text)
        : []
    ) ?? [];

  return parts.join("\n\n").trim();
}

async function indexQuestionToElastic(question) {
  const response = await fetch("/api/index-question", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(question),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Elastic question indexing failed.");
  }

  return data;
}

async function searchQuestionsFromElastic(query) {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Elastic search failed.");
  }

  return Array.isArray(data?.hits) ? data.hits : [];
}

function logSecurityEventToElastic(event) {
  return event;
}

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

function mapElasticHitToPulse(hit) {
  return {
    id: String(hit.id ?? createId("elastic-hit")),
    type: hit.type ?? "Question",
    text: hit.text ?? "",
    browserId: hit.browserId ?? hit.browser_id ?? "elastic",
    createdAt: hit.createdAt ?? hit.created_at ?? new Date().toISOString(),
    boothId: String(hit.boothId ?? hit.booth_id ?? ""),
    boothName: hit.boothName ?? hit.booth_name ?? "Elastic result",
    boothShortName: hit.boothShortName ?? hit.booth_short_name ?? "Elastic result",
    level: hit.level ?? "level1",
    color: hit.color ?? "cyan",
  };
}

function detectSuspiciousBurst(userId, timestamp, submissionWindow) {
  const submissionsInWindow = submissionWindow.filter(
    (entry) => entry.browserId === userId && timestamp - entry.at < 20_000
  );
  return submissionsInWindow.length >= 2;
}

function sendObservabilityMetric(metric) {
  return metric;
}

function App() {
  const toastTimerRef = useRef(null);
  const summaryTimerRef = useRef(null);
  const adminSectionRef = useRef(null);
  const translationJobsRef = useRef(new Set());

  const [language, setLanguage] = useState(() => getStoredLanguage() ?? "en");
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(() => !getStoredLanguage());
  const [viewMode, setViewMode] = useState(() => getStoredViewMode());
  const [browserId] = useState(() => getBrowserId());
  const [adminMode] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("admin") === "1"
  );
  const copy = UI_COPY[language];

  const [activeLevel, setActiveLevel] = useState("level1");
  const [localBooths, setLocalBooths] = useState(() =>
    readStoredJson(LOCAL_BOOTHS_STORAGE_KEY, INITIAL_BOOTHS)
  );
  const [supabaseBooths, setSupabaseBooths] = useState([]);
  const [supabaseQuestions, setSupabaseQuestions] = useState([]);
  const [supabasePollVotes, setSupabasePollVotes] = useState([]);
  const [supabaseLoading, setSupabaseLoading] = useState(isSupabaseConfigured);
  const [supabaseStatus, setSupabaseStatus] = useState(
    isSupabaseConfigured ? "connecting" : "not-configured"
  );
  const [supabaseError, setSupabaseError] = useState("");
  const [securityEvents, setSecurityEvents] = useState(() =>
    readStoredJson("stagepulse-security-v2", INITIAL_SECURITY_EVENTS)
  );
  const [localPoll, setLocalPoll] = useState(() =>
    readStoredJson("stagepulse-poll-v3", INITIAL_POLL)
  );
  const [pollSelection, setPollSelection] = useState(() =>
    readStoredJson("stagepulse-poll-selection-v1", INITIAL_POLL_SELECTION)
  );
  const [pollConfig, setPollConfig] = useState(() => getStoredPollConfig());
  const [openAiSettings, setOpenAiSettings] = useState(() =>
    readStoredJson("stagepulse-openai-v1", INITIAL_OPENAI_SETTINGS)
  );
  const [savedSummary, setSavedSummary] = useState(() =>
    readStoredJson("stagepulse-summary-v1", INITIAL_SUMMARY_STATE)
  );

  const [selectedBoothId, setSelectedBoothId] = useState("");
  const [category, setCategory] = useState("Question");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [elasticResults, setElasticResults] = useState([]);
  const [elasticSearchLoading, setElasticSearchLoading] = useState(false);
  const [elasticSearchError, setElasticSearchError] = useState("");
  const [feedFilter, setFeedFilter] = useState("All");
  const [addBoothMode, setAddBoothMode] = useState(false);
  const [draftBooth, setDraftBooth] = useState(null);
  const [boothName, setBoothName] = useState("");
  const [submissionLog, setSubmissionLog] = useState([]);
  const [toast, setToast] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [translationCache, setTranslationCache] = useState(() =>
    readStoredJson("stagepulse-translation-cache-v1", {})
  );
  const [apiKeyDraft, setApiKeyDraft] = useState(
    readStoredJson("stagepulse-openai-v1", INITIAL_OPENAI_SETTINGS).browserKey ?? ""
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      writeStoredJson(LOCAL_BOOTHS_STORAGE_KEY, localBooths);
    }
  }, [localBooths]);

  useEffect(() => {
    writeStoredJson("stagepulse-security-v2", securityEvents);
  }, [securityEvents]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      writeStoredJson("stagepulse-poll-v3", localPoll);
    }
  }, [localPoll]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      writeStoredJson("stagepulse-poll-selection-v1", pollSelection);
    }
  }, [pollSelection]);

  useEffect(() => {
    writeStoredJson(POLL_CONFIG_STORAGE_KEY, pollConfig);
  }, [pollConfig]);

  useEffect(() => {
    writeStoredJson("stagepulse-openai-v1", openAiSettings);
  }, [openAiSettings]);

  useEffect(() => {
    writeStoredJson("stagepulse-summary-v1", savedSummary);
  }, [savedSummary]);

  useEffect(() => {
    writeStoredJson("stagepulse-translation-cache-v1", translationCache);
  }, [translationCache]);

  useEffect(() => {
    sendObservabilityMetric({ type: "page-load", browserId });

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (summaryTimerRef.current) {
        window.clearTimeout(summaryTimerRef.current);
      }
    };
  }, [browserId]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    if (!pollSelection.optionId) return;

    const selectionStillExists = localPoll.options.some(
      (option) => option.id === pollSelection.optionId
    );

    if (!selectionStillExists) {
      setPollSelection(INITIAL_POLL_SELECTION);
    }
  }, [localPoll.options, pollSelection.optionId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSupabaseLoading(false);
      return;
    }

    let isActive = true;

    async function loadSharedState() {
      setSupabaseLoading(true);
      setSupabaseError("");

      const [boothResult, questionResult, pollVoteResult] = await Promise.all([
        supabase.from("booths").select("*"),
        supabase.from("questions").select("*"),
        supabase.from("poll_votes").select("*"),
      ]);

      if (!isActive) return;

      const firstError = boothResult.error ?? questionResult.error ?? pollVoteResult.error;

      if (firstError) {
        setSupabaseError(firstError.message);
        setSupabaseStatus("error");
        setSupabaseLoading(false);
        return;
      }

      setSupabaseBooths((boothResult.data ?? []).map((row, index) => normalizeBoothRow(row, index)));
      setSupabaseQuestions((questionResult.data ?? []).map((row) => normalizeQuestionRow(row)));
      setSupabasePollVotes((pollVoteResult.data ?? []).map((row) => normalizePollVoteRow(row)));
      setSupabaseStatus("loaded");
      setSupabaseLoading(false);
    }

    void loadSharedState();

    const channel = supabase
      .channel("stagepulse-shared-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booths" },
        (payload) => {
          if (!isActive) return;

          if (payload.eventType === "DELETE") {
            const removedId = String(payload.old?.id ?? "");
            setSupabaseBooths((prev) => removeRowById(prev, removedId));
            return;
          }

          const nextRow = normalizeBoothRow(
            payload.new,
            supabaseBooths.length + supabaseQuestions.length
          );
          setSupabaseBooths((prev) => upsertRowById(prev, nextRow));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        (payload) => {
          if (!isActive) return;

          if (payload.eventType === "DELETE") {
            const removedId = String(payload.old?.id ?? "");
            setSupabaseQuestions((prev) => removeRowById(prev, removedId));
            return;
          }

          const nextRow = normalizeQuestionRow(payload.new);
          setSupabaseQuestions((prev) => upsertRowById(prev, nextRow));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes" },
        (payload) => {
          if (!isActive) return;

          if (payload.eventType === "DELETE") {
            const removedId = String(payload.old?.id ?? "");
            setSupabasePollVotes((prev) => removeRowById(prev, removedId));
            return;
          }

          const nextRow = normalizePollVoteRow(payload.new);
          setSupabasePollVotes((prev) => upsertRowById(prev, nextRow));
        }
      )
      .subscribe((status) => {
        if (!isActive) return;

        if (status === "SUBSCRIBED") {
          setSupabaseStatus("live");
          setSupabaseError("");
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSupabaseStatus("error");
          setSupabaseError("Realtime sync could not stay connected.");
        }
      });

    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const booths = useMemo(
    () =>
      isSupabaseConfigured
        ? buildBoothsFromSupabase(supabaseBooths, supabaseQuestions)
        : localBooths,
    [localBooths, supabaseBooths, supabaseQuestions]
  );
  const displayBooths = useMemo(() => localizeBooths(booths, language), [booths, language]);

  const poll = useMemo(
    () =>
      localizeDefaultPoll(
        isSupabaseConfigured ? buildSupabasePoll(pollConfig, supabasePollVotes) : localPoll,
        language
      ),
    [language, localPoll, pollConfig, supabasePollVotes]
  );

  const selectedPollOptionId = isSupabaseConfigured
    ? getSupabaseSelectedPollOptionId(supabasePollVotes, browserId)
    : pollSelection.optionId;

  useEffect(() => {
    if (!displayBooths.length) return;

    const selectionStillExists = displayBooths.some((booth) => booth.id === selectedBoothId);
    if (selectionStillExists) return;

    const fallbackBooth =
      displayBooths.find((booth) => booth.level === activeLevel) ?? displayBooths[0];
    if (fallbackBooth) {
      setSelectedBoothId(fallbackBooth.id);
      if (fallbackBooth.level !== activeLevel) {
        setActiveLevel(fallbackBooth.level);
      }
    }
  }, [activeLevel, displayBooths, selectedBoothId]);

  const selectedBooth =
    displayBooths.find((booth) => booth.id === selectedBoothId) ?? displayBooths[0] ?? null;
  const visibleBooths = displayBooths.filter((booth) => booth.level === activeLevel);
  const activeLevelMeta = LEVELS[activeLevel];

  const allPulses = useMemo(
    () =>
      displayBooths
        .flatMap((booth) =>
          booth.pulses.map((pulse) => ({
            ...pulse,
            boothId: booth.id,
            boothName: booth.name,
            boothShortName: booth.shortName,
            level: booth.level,
            color: booth.color,
            createdAt: pulse.createdAt ?? minutesAgo(0),
          }))
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [displayBooths]
  );

  const duplicateGroups = useMemo(() => {
    const groups = new Map();

    for (const pulse of allPulses.filter((item) => item.type === "Question")) {
      const key = similarQuestionKey(pulse.text);
      const current = groups.get(key) ?? [];
      current.push(pulse);
      groups.set(key, current);
    }

    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        count: items.length,
        sampleText: items[0] ? getDisplayCommentText(items[0].text) : "",
        label: labelQuestionCluster(
          key,
          items[0] ? getDisplayCommentText(items[0].text) : "Audience question",
          language
        ),
        latestAt: items[0]?.createdAt ?? minutesAgo(0),
      }))
      .filter((group) => group.count > 1)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.latestAt) - new Date(a.latestAt);
      });
  }, [allPulses, language, translationCache]);

  const topDuplicateGroup = duplicateGroups[0] ?? null;
  const duplicateQuestionCount = duplicateGroups.reduce(
    (sum, group) => sum + Math.max(0, group.count - 1),
    0
  );
  const blockedWordCount = securityEvents.filter((event) => event.kind === "blocked-word").length;
  const suspiciousBurstCount = securityEvents.filter(
    (event) => event.kind === "suspicious-burst"
  ).length;
  const indexedQuestions = allPulses.filter((pulse) => pulse.type === "Question").length;
  const totalPulses = allPulses.length;

  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const mostPopularVote =
    [...poll.options].sort((a, b) => b.votes - a.votes)[0] ?? INITIAL_POLL.options[0];
  const mostPopularShare = totalVotes
    ? Math.round((mostPopularVote.votes / totalVotes) * 100)
    : 0;

  const activeApiKey = (openAiSettings.browserKey || ENV_OPENAI_API_KEY).trim();
  const activeApiKeySource = openAiSettings.browserKey
    ? "browser"
    : ENV_OPENAI_API_KEY
      ? "env"
      : "";

  const levelPulseCount = displayBooths
    .filter((booth) => booth.level === activeLevel)
    .reduce((sum, booth) => sum + booth.pulses.length, 0);

  const translatedPulses = useMemo(
    () =>
      allPulses.map((pulse) => ({
        ...pulse,
        displayText: getDisplayCommentText(pulse.text),
      })),
    [allPulses, language, translationCache]
  );

  useEffect(() => {
    if (!activeApiKey) return;

    const translationTargets = translatedPulses
      .slice(0, 30)
      .filter((pulse) => detectLikelyLanguage(pulse.text) && detectLikelyLanguage(pulse.text) !== language);

    for (const pulse of translationTargets) {
      const cacheKey = createTranslationCacheKey(language, pulse.text);
      if (translationCache[cacheKey] || translationJobsRef.current.has(cacheKey)) {
        continue;
      }

      translationJobsRef.current.add(cacheKey);
      void translateCommentText(pulse.text, language)
        .then((translatedText) => {
          setTranslationCache((prev) => ({
            ...prev,
            [cacheKey]: translatedText || pulse.text,
          }));
        })
        .catch(() => {
          setTranslationCache((prev) => ({
            ...prev,
            [cacheKey]: pulse.text,
          }));
        })
        .finally(() => {
          translationJobsRef.current.delete(cacheKey);
        });
    }
  }, [activeApiKey, language, translatedPulses, translationCache]);

  const liveFeed = useMemo(() => {
    const query = normalizeText(searchTerm);
    return translatedPulses.filter((pulse) => {
      const matchesQuery =
        !query ||
        [
          pulse.text,
          pulse.displayText,
          pulse.boothName,
          pulse.boothShortName,
          pulse.type,
          getLevelLabel(pulse.level, language),
        ].some((field) => normalizeText(field).includes(query));

      const matchesFilter = feedFilter === "All" || pulse.type === feedFilter;

      return matchesQuery && matchesFilter;
    });
  }, [feedFilter, language, searchTerm, translatedPulses]);

  useEffect(() => {
    const query = searchTerm.trim();

    if (!query) {
      setElasticResults([]);
      setElasticSearchError("");
      setElasticSearchLoading(false);
      return;
    }

    let isActive = true;

    setElasticSearchLoading(true);
    setElasticSearchError("");

    const timerId = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchQuestionsFromElastic(query);
          if (!isActive) return;
          setElasticResults(results.map((hit) => mapElasticHitToPulse(hit)));
        } catch (error) {
          if (!isActive) return;

          const messageText = getErrorMessage(
            error,
            language === "fr" ? "La recherche Elastic est indisponible." : "Elastic search is unavailable."
          );
          setElasticSearchError(messageText);
          setElasticResults([]);
        } finally {
          if (isActive) {
            setElasticSearchLoading(false);
          }
        }
      })();
    }, ELASTIC_SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      window.clearTimeout(timerId);
    };
  }, [language, searchTerm]);

  const displayedFeed = useMemo(() => {
    if (!searchTerm.trim() || elasticSearchError) {
      return liveFeed;
    }

    const filteredElasticResults =
      feedFilter === "All"
        ? elasticResults
        : elasticResults.filter((pulse) => pulse.type === feedFilter);

    const seenIds = new Set();
    const merged = [];

    for (const pulse of [...filteredElasticResults, ...liveFeed]) {
      if (seenIds.has(pulse.id)) continue;
      seenIds.add(pulse.id);
      merged.push(pulse);
    }

    return merged;
  }, [elasticResults, elasticSearchError, feedFilter, liveFeed, searchTerm]);

  const localAssistantSummary = useMemo(() => {
    const keywordSignals = [
      {
        label: language === "fr" ? "Recherche et modération Elastic" : "Elastic search and moderation",
        count: allPulses.filter((pulse) => normalizeText(pulse.text).includes("elastic")).length,
      },
      {
        label:
          language === "fr" ? "Accès anonyme sans connexion" : "Anonymous no-login access",
        count: allPulses.filter((pulse) => {
          const normalized = normalizeText(pulse.text);
          return (
            normalized.includes("login") ||
            normalized.includes("anonymous") ||
            normalized.includes("connexion") ||
            normalized.includes("anonyme")
          );
        }).length,
      },
      {
        label:
          language === "fr"
            ? "Regroupement des questions pour le conférencier"
            : "Duplicate grouping for the speaker",
        count: allPulses.filter((pulse) => {
          const normalized = normalizeText(pulse.text);
          return (
            normalized.includes("duplicate") ||
            normalized.includes("repeat") ||
            normalized.includes("doublon") ||
            normalized.includes("repete")
          );
        }).length,
      },
      {
        label: language === "fr" ? "Protection contre le spam et les bots" : "Spam and bot protection",
        count: allPulses.filter((pulse) => {
          const normalized = normalizeText(pulse.text);
          return (
            normalized.includes("spam") ||
            normalized.includes("bot") ||
            normalized.includes("abuse") ||
            normalized.includes("moderation") ||
            normalized.includes("abus")
          );
        }).length,
      },
    ]
      .filter((signal) => signal.count > 0)
      .sort((a, b) => b.count - a.count);

    const primarySignal = keywordSignals[0]?.label ?? copy.assistantPrimaryFallback;
    const focusLine = topDuplicateGroup
      ? copy.assistantFocusTop(topDuplicateGroup.label, topDuplicateGroup.count)
      : copy.assistantFocusDefault;

    const recommendation = topDuplicateGroup
      ? copy.assistantRecommendationTop(topDuplicateGroup.sampleText)
      : copy.assistantRecommendationDefault;

    const safetyLine =
      blockedWordCount || suspiciousBurstCount
        ? copy.assistantSafetyActive(blockedWordCount, suspiciousBurstCount)
        : copy.assistantSafetyQuiet;

    return {
      primarySignal,
      focusLine,
      recommendation,
      safetyLine,
    };
  }, [allPulses, blockedWordCount, copy, language, suspiciousBurstCount, topDuplicateGroup]);

  const summaryFingerprint = useMemo(
    () =>
      allPulses
        .slice(0, 18)
        .map((pulse) => `${pulse.id}:${pulse.text}:${pulse.type}:${pulse.createdAt}`)
        .join("|"),
    [allPulses]
  );

  function showToast(text, tone = "default") {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({ text, tone });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  }

  function registerSecurityEvent(event) {
    setSecurityEvents((prev) => [event, ...prev].slice(0, 32));
    logSecurityEventToElastic(event);
  }

  function setPreferredLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setShowLanguagePrompt(false);
  }

  function scrollToAdminSection() {
    adminSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function getDisplayCommentText(text) {
    const cacheKey = createTranslationCacheKey(language, text);
    return translationCache[cacheKey] || text;
  }

  async function translateCommentText(sourceText, targetLanguage) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeApiKey}`,
      },
      body: JSON.stringify({
        model: openAiSettings.model,
        store: false,
        input: [
          {
            role: "developer",
            content:
              targetLanguage === "fr"
                ? "Traduis le commentaire en français canadien naturel. Réponds uniquement avec le texte traduit."
                : "Translate the comment into natural Canadian English. Respond with only the translated text.",
          },
          {
            role: "user",
            content: sourceText,
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || "Comment translation failed.");
    }

    return extractResponseText(data) || sourceText;
  }

  async function insertBoothIntoSupabase(booth) {
    if (!supabase) {
      throw new Error("Supabase client is not configured.");
    }

    const { data, error } = await supabase
      .from("booths")
      .insert({
        id: booth.id,
        label: booth.name,
        x: booth.x,
        y: booth.y,
        color: encodeBoothColorField(booth),
        created_at: booth.createdAt,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return normalizeBoothRow(data, supabaseBooths.length);
  }

  async function insertQuestionIntoSupabase(question) {
    if (!supabase) {
      throw new Error("Supabase client is not configured.");
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        id: question.id,
        booth_id: question.boothId,
        text: encodeQuestionTextField(question),
        created_at: question.createdAt,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return normalizeQuestionRow(data);
  }

  async function insertPollVoteIntoSupabase(vote) {
    if (!supabase) {
      throw new Error("Supabase client is not configured.");
    }

    const { data, error } = await supabase
      .from("poll_votes")
      .insert({
        id: vote.id,
        option: encodePollVoteOptionField(vote),
        created_at: vote.createdAt,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return normalizePollVoteRow(data);
  }

  async function deleteBoothFromSupabase(boothId) {
    if (!supabase) {
      throw new Error("Supabase client is not configured.");
    }

    const { error: questionError } = await supabase
      .from("questions")
      .delete()
      .eq("booth_id", boothId);

    if (questionError) {
      throw questionError;
    }

    const { error: boothError } = await supabase.from("booths").delete().eq("id", boothId);

    if (boothError) {
      throw boothError;
    }
  }

  async function resetSupabasePollVotes() {
    if (!supabase) {
      throw new Error("Supabase client is not configured.");
    }

    const { error } = await supabase.from("poll_votes").delete();

    if (error) {
      throw error;
    }
  }

  async function summarizeComments({ automatic = false } = {}) {
    if (!allPulses.length) {
      setSummaryError(copy.noCommentsSummary);
      if (!automatic) {
        showToast(copy.noCommentsSummary, "warning");
      }
      return;
    }

    if (!activeApiKey) {
      setSummaryError(copy.addApiKeySummary);
      if (!automatic) {
        showToast(copy.addApiKeyFirst, "warning");
      }
      return;
    }

    setSummaryLoading(true);
    setSummaryError("");

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeApiKey}`,
        },
        body: JSON.stringify({
          model: openAiSettings.model,
          store: false,
          input: [
            {
              role: "developer",
              content: copy.summaryDeveloperInstruction,
            },
            {
              role: "user",
              content: buildSummaryPrompt(language, translatedPulses, duplicateGroups, selectedBooth),
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiMessage = data?.error?.message || "OpenAI request failed.";
        throw new Error(apiMessage);
      }

      const summaryText = extractResponseText(data);
      if (!summaryText) {
        throw new Error("OpenAI returned an empty summary.");
      }

      const nextSummary = {
        text: summaryText,
        lastSummaryAt: new Date().toISOString(),
        fingerprint: summaryFingerprint,
        model: openAiSettings.model,
        source: activeApiKeySource || "browser",
      };

      setSavedSummary(nextSummary);
      sendObservabilityMetric({
        type: "openai-summary",
        model: openAiSettings.model,
        browserId,
        createdAt: nextSummary.lastSummaryAt,
      });

      if (!automatic) {
        showToast(copy.freshSummaryGenerated, "success");
      }
    } catch (error) {
      const messageText = getErrorMessage(error, "Unable to summarize comments right now.");
      setSummaryError(messageText);
      if (!automatic) {
        showToast(copy.openAiSummaryFailed, "error");
      }
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    if (!adminMode) return;
    if (!openAiSettings.autoSummarize) return;
    if (!activeApiKey) return;
    if (!summaryFingerprint) return;
    if (summaryFingerprint === savedSummary.fingerprint) return;
    if (summaryLoading) return;

    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
    }

    summaryTimerRef.current = window.setTimeout(() => {
      void summarizeComments({ automatic: true });
    }, 1500);

    return () => {
      if (summaryTimerRef.current) {
        window.clearTimeout(summaryTimerRef.current);
      }
    };
  }, [
    activeApiKey,
    adminMode,
    openAiSettings.autoSummarize,
    savedSummary.fingerprint,
    summaryFingerprint,
    summaryLoading,
  ]);

  function saveBrowserApiKey() {
    setOpenAiSettings((prev) => ({
      ...prev,
      browserKey: apiKeyDraft.trim(),
    }));

    if (apiKeyDraft.trim()) {
      showToast(copy.browserKeySaved, "success");
    } else {
      showToast(copy.browserKeyCleared, "success");
    }
  }

  async function handleVote(optionId) {
    const votedOption = poll.options.find((option) => option.id === optionId);
    const previousOptionId = selectedPollOptionId;

    if (previousOptionId === optionId) {
      showToast(copy.voteAlreadyOn(votedOption?.label ?? copy.optionPlaceholder(0)), "success");
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const insertedVote = await insertPollVoteIntoSupabase({
          id: createUuid(),
          optionId,
          optionLabel: votedOption?.label ?? "Live Vote",
          browserId,
          createdAt: new Date().toISOString(),
        });

        setSupabasePollVotes((prev) => upsertRowById(prev, insertedVote));
      } catch (error) {
        const messageText = getErrorMessage(error, "Unable to send the vote right now.");
        showToast(messageText, "error");
        return;
      }
    } else {
      setLocalPoll((prev) => ({
        ...prev,
        options: prev.options.map((option) =>
          option.id === optionId
            ? { ...option, votes: option.votes + 1 }
            : option.id === previousOptionId
              ? { ...option, votes: Math.max(0, option.votes - 1) }
              : option
        ),
      }));
      setPollSelection({ optionId });
    }

    sendObservabilityMetric({
      type: "poll-vote",
      optionId,
      previousOptionId,
      browserId,
      createdAt: new Date().toISOString(),
    });
    showToast(
      previousOptionId
        ? copy.voteMovedTo(votedOption?.label ?? copy.optionPlaceholder(0))
        : copy.voteSentTo(votedOption?.label ?? copy.optionPlaceholder(0)),
      "success"
    );
  }

  function updatePollQuestion(value) {
    setPollConfig((prev) => ({ ...prev, question: value }));
    if (!isSupabaseConfigured) {
      setLocalPoll((prev) => ({ ...prev, question: value }));
    }
  }

  function updatePollOptionLabel(optionId, value) {
    setPollConfig((prev) => ({
      ...prev,
      options: prev.options.map((option) =>
        option.id === optionId ? { ...option, label: value } : option
      ),
    }));
    if (!isSupabaseConfigured) {
      setLocalPoll((prev) => ({
        ...prev,
        options: prev.options.map((option) =>
          option.id === optionId ? { ...option, label: value } : option
        ),
      }));
    }
  }

  function addPollOption() {
    const nextOption = {
      id: createId("poll"),
      label: language === "fr" ? `Nouvelle option ${pollConfig.options.length + 1}` : `New Option ${pollConfig.options.length + 1}`,
    };

    setPollConfig((prev) => ({
      ...prev,
      options: [...prev.options, nextOption],
    }));

    if (!isSupabaseConfigured) {
      setLocalPoll((prev) => ({
        ...prev,
        options: [...prev.options, { ...nextOption, votes: 0 }],
      }));
    }
  }

  function removePollOption(optionId) {
    if (poll.options.length <= 2) {
      showToast(copy.keepTwoPollOptions, "warning");
      return;
    }

    setPollConfig((prev) => ({
      ...prev,
      options: prev.options.filter((option) => option.id !== optionId),
    }));

    if (!isSupabaseConfigured) {
      setLocalPoll((prev) => ({
        ...prev,
        options: prev.options.filter((option) => option.id !== optionId),
      }));
    }
  }

  async function resetPollVotes() {
    if (isSupabaseConfigured) {
      try {
        await resetSupabasePollVotes();
        setSupabasePollVotes([]);
      } catch (error) {
        const messageText = getErrorMessage(error, "Unable to reset live poll votes.");
        showToast(messageText, "error");
        return;
      }
    } else {
      setLocalPoll((prev) => ({
        ...prev,
        options: prev.options.map((option) => ({ ...option, votes: 0 })),
      }));
      setPollSelection(INITIAL_POLL_SELECTION);
    }

    showToast(copy.pollReset, "success");
  }

  function handleLevelChange(level) {
    setActiveLevel(level);
    setAddBoothMode(false);
    setDraftBooth(null);

    const fallbackBooth = displayBooths.find((booth) => booth.level === level);
    if (fallbackBooth) {
      setSelectedBoothId(fallbackBooth.id);
    }

    sendObservabilityMetric({
      type: "level-switch",
      level,
      browserId,
      createdAt: new Date().toISOString(),
    });
  }

  function handleSearchChange(event) {
    setSearchTerm(event.target.value);
  }

  function handleMapClick(event) {
    if (!addBoothMode) return;
    if (draftBooth) {
      showToast(copy.pointAlreadyPlaced, "warning");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(92, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(10, Math.min(90, Math.round(((event.clientY - rect.top) / rect.height) * 100)));

    setDraftBooth({
      x,
      y,
      level: activeLevel,
      color: COLOR_ROTATION[booths.length % COLOR_ROTATION.length],
    });
    setBoothName("");
    showToast(copy.mapPointPlaced, "success");
  }

  async function createBooth() {
    if (!draftBooth || !boothName.trim()) {
      showToast(copy.addBoothNameFirst, "warning");
      return;
    }

    const createdAt = new Date().toISOString();
    const cleanName = boothName.trim();
    const newBooth = {
      id: createUuid(),
      name: cleanName,
      shortName: cleanName.length > 18 ? `${cleanName.slice(0, 18)}...` : cleanName,
      level: draftBooth.level,
      x: draftBooth.x,
      y: draftBooth.y,
      color: draftBooth.color,
      custom: true,
      createdAt,
    };

    try {
      let createdBoothId = "";

      if (isSupabaseConfigured) {
        const insertedBooth = await insertBoothIntoSupabase(newBooth);
        const welcomePulse = await insertQuestionIntoSupabase({
          id: createUuid(),
          boothId: insertedBooth.id,
          type: "Fun",
          text:
            language === "fr"
              ? "Le nouveau kiosque est actif sur la carte. Déposez ici la première impulsion."
              : "New booth is live on the map. Drop the first pulse here.",
          createdAt,
          browserId: "stagepulse-system",
        });

        setSupabaseBooths((prev) => upsertRowById(prev, insertedBooth));
        setSupabaseQuestions((prev) => upsertRowById(prev, welcomePulse));
        createdBoothId = insertedBooth.id;
      } else {
        const localBooth = {
          ...newBooth,
          id: createId("booth"),
          pulses: [
            {
              id: createId("pulse"),
              type: "Fun",
              text:
                language === "fr"
                  ? "Le nouveau kiosque est actif sur la carte. Déposez ici la première impulsion."
                  : "New booth is live on the map. Drop the first pulse here.",
              createdAt,
              browserId: "stagepulse-system",
            },
          ],
        };

        setLocalBooths((prev) => [...prev, localBooth]);
        createdBoothId = localBooth.id;
      }

      setSelectedBoothId(createdBoothId);
      setAddBoothMode(false);
      setDraftBooth(null);
      setBoothName("");

      sendObservabilityMetric({
        type: "create-booth",
        boothId: createdBoothId,
        level: newBooth.level,
        browserId,
        createdAt,
      });
      showToast(copy.boothAdded, "success");
    } catch (error) {
      const messageText = getErrorMessage(error, "Unable to create the booth right now.");
      showToast(messageText, "error");
    }
  }

  async function removeSelectedBooth() {
    if (!selectedBooth?.custom) {
      showToast(copy.onlyCustomBooths, "warning");
      return;
    }

    const removedBoothId = selectedBooth.id;
    const removedLevel = selectedBooth.level;

    const nextSelection =
      displayBooths.find((booth) => booth.id !== removedBoothId && booth.level === removedLevel) ??
      displayBooths.find((booth) => booth.id !== removedBoothId) ??
      null;

    try {
      if (isSupabaseConfigured) {
        await deleteBoothFromSupabase(removedBoothId);
        setSupabaseBooths((prev) => removeRowById(prev, removedBoothId));
        setSupabaseQuestions((prev) =>
          prev.filter((question) => question.boothId !== removedBoothId)
        );
      } else {
        setLocalBooths((prev) => prev.filter((booth) => booth.id !== removedBoothId));
      }

      if (nextSelection) {
        setSelectedBoothId(nextSelection.id);
        if (activeLevel !== nextSelection.level) {
          setActiveLevel(nextSelection.level);
        }
      }

      sendObservabilityMetric({
        type: "remove-booth",
        boothId: removedBoothId,
        level: removedLevel,
        browserId,
        createdAt: new Date().toISOString(),
      });
      showToast(copy.boothRemoved, "success");
    } catch (error) {
      const messageText = getErrorMessage(error, "Unable to remove this booth right now.");
      showToast(messageText, "error");
    }
  }

  function cancelBoothCreation() {
    setDraftBooth(null);
    setBoothName("");
    setAddBoothMode(false);
  }

  async function submitPulse() {
    const cleanMessage = message.trim();
    if (!selectedBooth) {
      showToast(copy.selectBoothFirst, "warning");
      return;
    }
    if (!cleanMessage) {
      showToast(copy.writePulseFirst, "warning");
      return;
    }

    const createdAt = new Date().toISOString();
    const now = Date.now();

    if (hasBannedWord(cleanMessage)) {
      const event = {
        id: createId("security"),
        kind: "blocked-word",
        boothId: selectedBooth.id,
        boothName: selectedBooth.name,
        browserId,
        createdAt,
        detail: `Blocked content before it reached ${selectedBooth.shortName}.`,
      };

      registerSecurityEvent(event);
      sendObservabilityMetric({
        type: "blocked-word",
        boothId: selectedBooth.id,
        browserId,
        createdAt,
      });
      showToast(copy.blockedBySafety, "warning");
      return;
    }

    const recentEntries = submissionLog.filter(
      (entry) => entry.browserId === browserId && now - entry.at < 20_000
    );
    const repeatedText = recentEntries.some(
      (entry) => normalizeText(entry.text) === normalizeText(cleanMessage)
    );
    const burstDetected = detectSuspiciousBurst(browserId, now, recentEntries);

    const newPulse = {
      type: category,
      text: cleanMessage,
      createdAt,
      browserId,
    };

    let persistedPulse = null;

    try {
      if (isSupabaseConfigured) {
        persistedPulse = await insertQuestionIntoSupabase({
          id: createUuid(),
          boothId: selectedBooth.id,
          type: newPulse.type,
          text: newPulse.text,
          createdAt: newPulse.createdAt,
          browserId: newPulse.browserId,
        });
        setSupabaseQuestions((prev) => upsertRowById(prev, persistedPulse));
      } else {
        const localPulse = {
          id: createId("pulse"),
          ...newPulse,
        };
        persistedPulse = {
          ...localPulse,
          boothId: selectedBooth.id,
        };

        setLocalBooths((prev) =>
          prev.map((booth) =>
            booth.id === selectedBooth.id
              ? { ...booth, pulses: [localPulse, ...booth.pulses] }
              : booth
          )
        );
      }
    } catch (error) {
      const messageText = getErrorMessage(error, "Unable to send the pulse right now.");
      showToast(messageText, "error");
      return;
    }

    setSubmissionLog((prev) =>
      [{ browserId, at: now, text: cleanMessage }, ...prev]
        .filter((entry) => now - entry.at < 30_000)
        .slice(0, 24)
    );
    setMessage("");

    if (category === "Question") {
      const elasticDocument = {
        id: persistedPulse?.id ?? createId("question"),
        text: newPulse.text,
        normalizedText: normalizeText(newPulse.text),
        type: newPulse.type,
        boothId: selectedBooth.id,
        boothName: selectedBooth.name,
        boothShortName: selectedBooth.shortName,
        level: selectedBooth.level,
        browserId,
        createdAt,
      };

      void (async () => {
        try {
          await indexQuestionToElastic(elasticDocument);
          const similarMatches = await searchQuestionsFromElastic(newPulse.text);
          const relatedMatches = similarMatches.filter((item) => item.id !== elasticDocument.id);

          if (relatedMatches.length >= 2) {
            registerSecurityEvent({
              id: createId("security"),
              kind: "suspicious-burst",
              boothId: selectedBooth.id,
              boothName: selectedBooth.name,
              browserId,
              createdAt,
              detail: `Elastic found ${relatedMatches.length} similar earlier questions for this phrase.`,
            });
          }
        } catch {
          // Elastic stays optional for the hackathon flow. Supabase remains the source of truth.
        }
      })();
    }

    if (burstDetected || repeatedText) {
      const event = {
        id: createId("security"),
        kind: "suspicious-burst",
        boothId: selectedBooth.id,
        boothName: selectedBooth.name,
        browserId,
        createdAt,
        detail: repeatedText
          ? "Repeated question pattern detected from one browser."
          : "Multiple pulses arrived from one browser in under 20 seconds.",
      };

      registerSecurityEvent(event);
    }

    sendObservabilityMetric({
      type: "pulse-submitted",
      boothId: selectedBooth.id,
      category,
      browserId,
      createdAt,
    });
    showToast(copy.pulseSentTo(getCategoryLabel(category, language), selectedBooth.shortName), "success");
  }

  const indexedQuestionsCard = (
    <Metric
      icon={<Search size={16} />}
      label={copy.indexedQuestions}
      value={indexedQuestions}
      helper={copy.indexedQuestionsHelper}
    />
  );

  function renderStageReadoutCard() {
    return (
      <section className="ai-card">
        <div className="panel-heading">
          <Bot size={17} />
          <span>{copy.stageReadout}</span>
        </div>
        <h2>{localAssistantSummary.focusLine}</h2>
        <p>{localAssistantSummary.recommendation}</p>
        <div className="assistant-pills">
          <span>{localAssistantSummary.primarySignal}</span>
          <span>
            {duplicateGroups.length
              ? language === "fr"
                ? `${duplicateGroups.length} groupe${duplicateGroups.length === 1 ? "" : "s"} répété${
                    duplicateGroups.length === 1 ? "" : "s"
                  }`
                : `${duplicateGroups.length} repeat cluster${duplicateGroups.length === 1 ? "" : "s"}`
              : copy.freshMix}
          </span>
          <span>
            {blockedWordCount || suspiciousBurstCount
              ? copy.safetyAlertsActive
              : copy.safetyLayerSteady}
          </span>
        </div>
        <small>{localAssistantSummary.safetyLine}</small>
      </section>
    );
  }

  function renderAdminSections() {
    if (!adminMode) return null;

    return (
      <div ref={adminSectionRef} className="admin-scroll-stack">
        <section className="summary-card">
          <div className="panel-heading">
            <WandSparkles size={16} />
            <span>{copy.openAiCommentSummary}</span>
          </div>

          <div className="summary-status">
            <div className="status-pill">
              <KeyRound size={14} />
              <span>
                {activeApiKey
                  ? activeApiKeySource === "browser"
                    ? copy.usingBrowserKey
                    : copy.usingEnvKey
                  : copy.noApiKeyConnected}
              </span>
            </div>
            <div className="status-pill subtle">
              <Activity size={14} />
              <span>{openAiSettings.model}</span>
            </div>
          </div>

          <div className="summary-note">{copy.summaryNote}</div>

          <div className="summary-form">
            <label className="admin-field">
              <span>{copy.openAiApiKey}</span>
              <input
                type="password"
                value={apiKeyDraft}
                onChange={(event) => setApiKeyDraft(event.target.value)}
                placeholder={ENV_OPENAI_API_KEY ? copy.envKeyPlaceholder : copy.browserKeyPlaceholder}
              />
            </label>

            <div className="summary-form-row">
              <label className="admin-field">
                <span>{copy.summaryModel}</span>
                <select
                  value={openAiSettings.model}
                  onChange={(event) =>
                    setOpenAiSettings((prev) => ({
                      ...prev,
                      model: event.target.value,
                    }))
                  }
                >
                  {SUMMARY_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label} - {model.helpers[language]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={openAiSettings.autoSummarize}
                  onChange={(event) =>
                    setOpenAiSettings((prev) => ({
                      ...prev,
                      autoSummarize: event.target.checked,
                    }))
                  }
                />
                <span>{copy.autoSummarize}</span>
              </label>
            </div>

            <div className="admin-actions">
              <button onClick={saveBrowserApiKey}>{copy.saveKey}</button>
              <button
                className="secondary"
                onClick={() => {
                  setApiKeyDraft("");
                  setOpenAiSettings((prev) => ({ ...prev, browserKey: "" }));
                }}
              >
                {copy.clearSavedKey}
              </button>
              <button
                className="secondary"
                onClick={() => void summarizeComments()}
                disabled={summaryLoading}
              >
                {summaryLoading ? (
                  <>
                    <RefreshCcw size={15} className="spin" />
                    {copy.summarizing}
                  </>
                ) : (
                  <>
                    <WandSparkles size={15} />
                    {copy.summarizeNow}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="summary-output">
            <div className="summary-output-top">
              <strong>{copy.generatedSummary}</strong>
              {savedSummary.lastSummaryAt && (
                <span>
                  {formatClock(savedSummary.lastSummaryAt, language)} -{" "}
                  {formatRelativeTime(savedSummary.lastSummaryAt, language)}
                </span>
              )}
            </div>
            {summaryError && <div className="summary-error">{summaryError}</div>}
            <pre>{savedSummary.text || copy.noAiSummaryYet}</pre>
          </div>
        </section>

        <section className="admin-card">
          <div className="panel-heading">
            <Sparkles size={16} />
            <span>{copy.adminPollControls}</span>
          </div>
          <div className="admin-note">{copy.adminPollNote}</div>
          <label className="admin-field">
            <span>{copy.pollQuestionLabel}</span>
            <input
              value={poll.question}
              onChange={(event) => updatePollQuestion(event.target.value)}
              placeholder={copy.pollQuestionPlaceholder}
            />
          </label>
          <div className="admin-option-list">
            {poll.options.map((option, index) => (
              <div key={option.id} className="admin-option-row">
                <input
                  value={option.label}
                  onChange={(event) => updatePollOptionLabel(option.id, event.target.value)}
                  placeholder={copy.optionPlaceholder(index)}
                />
                <span>
                  {option.votes} votes
                </span>
                <button onClick={() => removePollOption(option.id)}>{copy.remove}</button>
              </div>
            ))}
          </div>
          <div className="admin-actions">
            <button onClick={addPollOption}>{copy.addOption}</button>
            <button className="secondary" onClick={resetPollVotes}>
              {copy.resetVotes}
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderDataView() {
    return (
      <section className="data-view-shell">
        <div className="insight-panel data-view-panel">
          <section className="data-view-header">
            <div className="panel-heading">
              <Activity size={16} />
              <span>{copy.dataViewTitle}</span>
            </div>
            <p>{copy.dataViewDescription}</p>
          </section>

          {renderStageReadoutCard()}

          <section className="metric-grid">
            {indexedQuestionsCard}
            <Metric
              icon={<Sparkles size={16} />}
              label={copy.duplicateQuestions}
              value={duplicateQuestionCount}
              helper={copy.duplicateQuestionsHelper}
            />
            <Metric
              icon={<Shield size={16} />}
              label={copy.blockedWords}
              value={blockedWordCount}
              helper={copy.blockedWordsHelper}
              alert
            />
            <Metric
              icon={<AlertTriangle size={16} />}
              label={copy.suspiciousBurst}
              value={suspiciousBurstCount}
              helper={copy.suspiciousBurstHelper}
              warning
            />
          </section>

          <section className="cluster-card">
            <div className="panel-heading">
              <Vote size={16} />
              <span>{copy.repeatClusters}</span>
            </div>
            {duplicateGroups.length === 0 ? (
              <div className="empty-feed">{copy.noDuplicateClusters}</div>
            ) : (
              <div className="cluster-list">
                {duplicateGroups.slice(0, 4).map((group) => (
                  <article key={group.key} className="cluster-item">
                    <strong>{group.label}</strong>
                    <p>{group.sampleText}</p>
                    <small>{copy.matchingQuestions(group.count)}</small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="elastic-card">
            <div className="panel-heading">
              <Activity size={16} />
              <span>{copy.elasticLiveLayer}</span>
            </div>
            <div className="elastic-rows">
              <div>
                <strong>{copy.supabaseSync}</strong>
                <span>
                  {!isSupabaseConfigured
                    ? copy.addSupabaseEnv
                    : supabaseLoading
                      ? copy.loadingSupabase
                      : supabaseError
                        ? copy.syncIssue(supabaseError)
                        : supabaseStatus === "live"
                          ? copy.realtimeActive
                          : copy.sharedLoaded}
                </span>
              </div>
              <div>
                <strong>{copy.search}</strong>
                <span>{copy.searchDescription}</span>
              </div>
              <div>
                <strong>{copy.security}</strong>
                <span>{copy.securityDescription}</span>
              </div>
              <div>
                <strong>{copy.observability}</strong>
                <span>{copy.observabilityDescription}</span>
              </div>
              <div>
                <strong>{copy.noLoginId}</strong>
                <span>{browserId}</span>
              </div>
            </div>
          </section>

          <section className="feed-card">
            <div className="panel-heading">
              <Search size={16} />
              <span>{copy.liveFeed}</span>
            </div>

            <div className="feed-heading">
              <strong>
                {searchTerm
                  ? copy.matchingResults(displayedFeed.length)
                  : copy.livePulsesIndexed(allPulses.length)}
              </strong>
              <span>
                {searchTerm
                  ? elasticSearchLoading
                    ? copy.elasticChecking(searchTerm)
                    : elasticSearchError
                      ? copy.elasticUnavailable(searchTerm)
                      : copy.elasticMatches(searchTerm)
                  : copy.latestAudienceSignal}
              </span>
            </div>

            <div className="feed-filters">
              {["All", ...CATEGORIES].map((item) => (
                <button
                  key={item}
                  className={feedFilter === item ? "active" : ""}
                  onClick={() => setFeedFilter(item)}
                >
                  {item === "All" ? (language === "fr" ? "Tout" : "All") : getCategoryLabel(item, language)}
                </button>
              ))}
            </div>

            <div className="feed-list">
              {displayedFeed.length === 0 ? (
                <div className="empty-feed">{copy.noMatchingPulses}</div>
              ) : (
                displayedFeed.slice(0, 12).map((pulse) => (
                  <article key={pulse.id} className="feed-item">
                    <div className="feed-item-top">
                      <strong>{pulse.displayText ?? pulse.text}</strong>
                      <span className="pulse-kind">{getCategoryLabel(pulse.type, language)}</span>
                    </div>
                    <div className="feed-meta">
                      <span>{pulse.boothShortName}</span>
                      <span>{getLevelLabel(pulse.level, language)}</span>
                      <span>{formatClock(pulse.createdAt, language)}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {renderAdminSections()}
        </div>
      </section>
    );
  }

  return (
    <div className="app-shell">
      <div className="language-corner" aria-label={copy.languageLabel}>
        <button
          className={language === "en" ? "active" : ""}
          onClick={() => setPreferredLanguage("en")}
        >
          EN
        </button>
        <button
          className={language === "fr" ? "active" : ""}
          onClick={() => setPreferredLanguage("fr")}
        >
          FR
        </button>
      </div>

      <div className="view-corner" aria-label={copy.dataViewLabel}>
        <button
          className={viewMode === "live" ? "active" : ""}
          onClick={() => setViewMode("live")}
        >
          {copy.liveView}
        </button>
        <button
          className={viewMode === "data" ? "active" : ""}
          onClick={() => setViewMode("data")}
        >
          {copy.dataView}
        </button>
      </div>

      <header className="topbar">
        <section className="brand-panel">
          <div className="brand-meta">
            <div className="live-pill">
              <span className="live-dot" />
              {copy.live}
            </div>
            <div className="meta-chip">Cloud Summit x Science World</div>
            <div className="meta-chip">{adminMode ? copy.adminAccessMode : copy.audienceMode}</div>
          </div>

          <div className="brand-copy">
            <h1>StagePulse Map</h1>
            <p>{copy.brandDescription}</p>
          </div>

          <div className="brand-footer">
            <div>
              <span>{copy.anonymousBrowser}</span>
              <strong>{browserId.slice(-10)}</strong>
            </div>
            <div className="mini-stat">
              <span>{copy.liveComments}</span>
              <strong>{totalPulses}</strong>
            </div>
          </div>
        </section>

        <section className="poll-panel">
          <div className="panel-heading">
            <Vote size={16} />
            <span>{copy.audiencePoll}</span>
          </div>
          <h2 className="poll-question">{poll.question}</h2>
          <p className="panel-copy">{copy.pollDescription}</p>
          <div className="poll-options">
            {poll.options.map((option, index) => {
              const percent = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
              return (
                <button
                  key={option.id}
                  className={`poll-choice ${
                    selectedPollOptionId === option.id ? "selected" : ""
                  }`}
                  style={{ "--fill": `${percent}%` }}
                  onClick={() => handleVote(option.id)}
                >
                  <span>{displayPollLabel(option.label, index)}</span>
                  <strong>{percent}%</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="popular-card">
          <span>{copy.mostPopularVote}</span>
          <strong>{mostPopularVote.label}</strong>
          <small>
            {mostPopularVote.votes} {language === "fr" ? "votes en direct" : "live votes"} -{" "}
            {mostPopularShare}% {language === "fr" ? "de part" : "share"}
          </small>
          <div className="turnout-pill">{copy.audienceVotesCaptured(totalVotes)}</div>
        </section>
      </header>

      <main className={`workspace ${viewMode === "data" ? "data-mode" : ""}`}>
        {viewMode === "live" ? (
          <>
        <section className="map-card">
          <div className="map-toolbar">
            <div className="level-tabs">
              {Object.entries(LEVELS).map(([level, value]) => (
                <button
                  key={level}
                  className={activeLevel === level ? "active" : ""}
                  onClick={() => handleLevelChange(level)}
                >
                  {value.labels[language]}
                </button>
              ))}
            </div>

            <button
              className={addBoothMode ? "add-booth active" : "add-booth"}
              onClick={() => {
                const nextValue = !addBoothMode;
                setAddBoothMode(nextValue);
                if (!nextValue) {
                  setDraftBooth(null);
                  setBoothName("");
                }
              }}
            >
              <CirclePlus size={16} />
              {addBoothMode ? copy.clickMapToPlaceBooth : copy.addBooth}
            </button>

            <label className="search-box">
              <Search size={16} />
              <input
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={copy.searchPlaceholder}
              />
            </label>
          </div>

          <div className={`map-stage ${activeLevel}`} onClick={handleMapClick}>
            <img src={activeLevelMeta.image} alt={`${getLevelLabel(activeLevel, language)} map`} />

            <div className="map-stage-label">
              <strong>{getLevelLabel(activeLevel, language)}</strong>
              <span>{getLevelCaption(activeLevel, language)}</span>
            </div>

            <div className="map-instruction">
              {addBoothMode
                ? copy.addModeInstruction
                : copy.defaultMapInstruction}
            </div>

            {visibleBooths.map((booth) => (
              <button
                key={booth.id}
                className={`map-pin ${booth.color} ${
                  selectedBoothId === booth.id ? "selected" : ""
                }`}
                style={{ left: `${booth.x}%`, top: `${booth.y}%` }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedBoothId(booth.id);
                  setAddBoothMode(false);
                  setDraftBooth(null);
                }}
                title={booth.name}
              >
                <MapPin size={18} />
                <span>{booth.shortName}</span>
              </button>
            ))}

            {draftBooth && draftBooth.level === activeLevel && (
              <div
                className={`draft-pin ${draftBooth.color}`}
                style={{ left: `${draftBooth.x}%`, top: `${draftBooth.y}%` }}
              >
                <MapPin size={18} />
                New Booth
              </div>
            )}

            {selectedBooth && selectedBooth.level === activeLevel && (
              <div
                className={`map-bubble ${selectedBooth.x > 62 ? "flip" : ""}`}
                style={{ left: `${selectedBooth.x}%`, top: `${selectedBooth.y}%` }}
              >
                <strong>{selectedBooth.shortName}</strong>
                <p>
                  {(selectedBooth.pulses[0]
                    ? getDisplayCommentText(selectedBooth.pulses[0].text)
                    : null) ??
                    (language === "fr"
                      ? "Aucune impulsion pour l’instant. Soyez la première voix du public dans cette zone."
                      : "No pulses yet. Be the first audience voice in this zone.")}
                </p>
                <small>
                  {selectedBooth.pulses[0]
                    ? `${getCategoryLabel(selectedBooth.pulses[0].type, language)} - ${formatClock(
                        selectedBooth.pulses[0].createdAt,
                        language
                      )}`
                    : language === "fr"
                      ? "En attente de la première impulsion"
                      : "Waiting for the first pulse"}
                </small>
              </div>
            )}
          </div>

          <div className="composer">
            <div className="composer-main">
              <div className="selected-zone">
                <CheckCircle2 size={16} />
                {draftBooth
                  ? copy.newBoothOnLevel(getLevelLabel(draftBooth.level, language))
                  : copy.selectedBooth(selectedBooth?.name ?? copy.selectedFallback)}
              </div>

              <div className="context-strip">
                <div>
                  <span>{copy.currentLevel}</span>
                  <strong>{getLevelLabel(activeLevel, language)}</strong>
                </div>
                <div>
                  <span>{copy.visibleBooths}</span>
                  <strong>{visibleBooths.length}</strong>
                </div>
                <div>
                  <span>{copy.levelPulses}</span>
                  <strong>{levelPulseCount}</strong>
                </div>
              </div>

              {adminMode && selectedBooth?.custom && !draftBooth && (
                <div className="new-booth-actions">
                  <button className="secondary" onClick={removeSelectedBooth}>
                    {copy.removeBooth}
                  </button>
                </div>
              )}

              {draftBooth ? (
                <div className="new-booth-form">
                  <input
                    value={boothName}
                    onChange={(event) => setBoothName(event.target.value)}
                    placeholder={copy.newBoothPlaceholder}
                  />
                  <div className="new-booth-actions">
                    <button className="secondary" onClick={cancelBoothCreation}>
                      {copy.cancel}
                    </button>
                    <button onClick={createBooth}>{copy.createBooth}</button>
                  </div>
                </div>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={copy.messagePlaceholder}
                  />
                  <div className="category-row">
                    {CATEGORIES.map((item) => (
                      <button
                        key={item}
                        className={category === item ? "active" : ""}
                        onClick={() => setCategory(item)}
                      >
                        {getCategoryLabel(item, language)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!draftBooth && (
              <button className="send-button" onClick={submitPulse}>
                <Send size={17} />
                {copy.sendPulse}
              </button>
            )}
          </div>
        </section>

        <aside className="insight-panel live-overview-panel">
          {renderStageReadoutCard()}

          <section className="metric-grid metric-grid-single">{indexedQuestionsCard}</section>

          {adminMode && (
            <section className="admin-preview-card">
              <div className="panel-heading">
                <Sparkles size={16} />
                <span>{copy.adminTools}</span>
              </div>
              <p>{copy.adminToolsIntro}</p>
              <button onClick={() => setViewMode("data")}>{copy.dataView}</button>
            </section>
          )}
        </aside>
          </>
        ) : (
          renderDataView()
        )}
      </main>

      <footer className="site-footnote">
        <span>
          {copy.builtBy} <strong>{copy.teamName}</strong>
        </span>
        <span>
          {copy.teamMembers}: <strong>Kairui, Bernie, Dreyson</strong>
        </span>
      </footer>

      {showLanguagePrompt && (
        <div className="language-modal-backdrop" role="presentation">
          <div
            className="language-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-modal-title"
          >
            <h2 id="language-modal-title">{copy.languagePromptTitle}</h2>
            <p>{copy.languagePromptBody}</p>
            <div className="language-modal-actions">
              <button onClick={() => setPreferredLanguage("en")}>{copy.chooseEnglish}</button>
              <button onClick={() => setPreferredLanguage("fr")}>{copy.chooseFrench}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.tone}`}>{toast.text}</div>}
    </div>
  );
}

function Metric({ icon, label, value, helper, alert, warning }) {
  return (
    <div className={`metric ${alert ? "alert" : ""} ${warning ? "warning" : ""}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

export default App;
