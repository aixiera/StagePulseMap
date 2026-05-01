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
    label: "Level 1",
    image: "/scienceworld-level1.png",
    caption: "Main stage, sponsor booths, and high-traffic audience areas",
  },
  level2: {
    label: "Level 2",
    image: "/scienceworld-level2.png",
    caption: "Feature exhibition, labs, snack area, and roaming pulses",
  },
};

const CATEGORIES = ["Question", "Praise", "Need Help", "Long Line", "Fun"];
const BANNED_WORDS = ["spam", "stupid", "idiot", "hate", "kill"];
const COLOR_ROTATION = ["cyan", "purple", "amber", "green"];
const SUMMARY_MODELS = [
  {
    value: "gpt-5.4-mini",
    label: "gpt-5.4-mini",
    helper: "Fast and cost-aware for live summaries",
  },
  {
    value: "gpt-5.5",
    label: "gpt-5.5",
    helper: "Best quality if speed matters less",
  },
  {
    value: "gpt-4.1",
    label: "gpt-4.1",
    helper: "Stable non-reasoning fallback",
  },
];

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
  {
    id: "main-stage",
    name: "Peter Brown Family Centre Stage",
    shortName: "Main Stage",
    level: "level1",
    x: 20,
    y: 63,
    color: "cyan",
    pulses: [
      seedPulse(
        "p-main-1",
        "Question",
        "Can you show how repeated questions are grouped on stage?",
        minutesAgo(3),
        "audience-101"
      ),
      seedPulse(
        "p-main-2",
        "Praise",
        "Main stage energy is perfect for the live demo.",
        minutesAgo(16),
        "audience-102"
      ),
    ],
  },
  {
    id: "connection-zone",
    name: "Connection Zone",
    shortName: "Sponsor Booths",
    level: "level1",
    x: 82,
    y: 54,
    color: "purple",
    pulses: [
      seedPulse(
        "p-conn-1",
        "Question",
        "How does this work without login?",
        minutesAgo(5),
        "audience-114"
      ),
    ],
  },
  {
    id: "bits-bytes",
    name: "Bits and Bytes Lab",
    shortName: "Hacker Room",
    level: "level1",
    x: 14,
    y: 52,
    color: "green",
    pulses: [
      seedPulse(
        "p-bits-1",
        "Question",
        "Can people ask anonymously without logging in?",
        minutesAgo(2),
        "audience-118"
      ),
      seedPulse(
        "p-bits-2",
        "Need Help",
        "Need another power strip in the hacker room.",
        minutesAgo(21),
        "audience-119"
      ),
    ],
  },
  {
    id: "feature-exhibition",
    name: "Feature Exhibition",
    shortName: "Feature Exhibition",
    level: "level2",
    x: 23,
    y: 28,
    color: "purple",
    pulses: [
      seedPulse(
        "p-feature-1",
        "Question",
        "Will repeated questions be merged before the speaker answers?",
        minutesAgo(7),
        "audience-124"
      ),
    ],
  },
  {
    id: "snack-lab",
    name: "Snack Lab",
    shortName: "Food Area",
    level: "level2",
    x: 84,
    y: 68,
    color: "amber",
    pulses: [
      seedPulse(
        "p-snack-1",
        "Long Line",
        "Food area line is growing near Snack Lab.",
        minutesAgo(1),
        "audience-131"
      ),
    ],
  },
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
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function similarQuestionKey(text) {
  const normalized = normalizeText(text);

  if (normalized.includes("elastic")) return "elastic-search";
  if (normalized.includes("login") || normalized.includes("anonymous")) return "no-login";
  if (
    normalized.includes("duplicate") ||
    normalized.includes("repeat") ||
    normalized.includes("group")
  ) {
    return "duplicate-detection";
  }
  if (
    normalized.includes("spam") ||
    normalized.includes("bot") ||
    normalized.includes("abuse") ||
    normalized.includes("moderation")
  ) {
    return "abuse-protection";
  }

  return normalized.slice(0, 52);
}

function labelQuestionCluster(key, sampleText) {
  if (key === "elastic-search") return "Elastic search and indexing";
  if (key === "no-login") return "Anonymous no-login flow";
  if (key === "duplicate-detection") return "Repeated question grouping";
  if (key === "abuse-protection") return "Moderation and abuse control";
  return sampleText;
}

function hasBannedWord(text) {
  const normalized = normalizeText(text);
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

function formatClock(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(isoString) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function displayPollLabel(label, index) {
  return label.trim() || `Option ${index + 1}`;
}

function buildSummaryPrompt(pulses, duplicateGroups, selectedBooth) {
  const pulseLines = pulses
    .slice(0, 18)
    .map(
      (pulse, index) =>
        `${index + 1}. [${pulse.type}] ${pulse.boothShortName} / ${
          LEVELS[pulse.level]?.label ?? pulse.level
        } / ${formatRelativeTime(pulse.createdAt)} - ${pulse.text}`
    )
    .join("\n");

  const duplicateLine = duplicateGroups.length
    ? duplicateGroups
        .slice(0, 4)
        .map((group) => `${group.label}: ${group.count} related questions`)
        .join("; ")
    : "No duplicate clusters are currently forming.";

  return [
    "You are summarizing live audience comments for an event admin dashboard called StagePulse Map.",
    "Write concise, useful plain text for a stage moderator.",
    "Return exactly these sections:",
    "Summary:",
    "Top themes:",
    "- item",
    "- item",
    "Speaker cue:",
    "Safety note:",
    "",
    `Selected booth context: ${selectedBooth?.name ?? "No booth selected"}.`,
    `Duplicate signals: ${duplicateLine}`,
    "Recent comments:",
    pulseLines || "No comments available.",
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

  const [browserId] = useState(() => getBrowserId());
  const [adminMode] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("admin") === "1"
  );

  const [activeLevel, setActiveLevel] = useState("level1");
  const [localBooths, setLocalBooths] = useState(() =>
    readStoredJson("stagepulse-booths-v2", INITIAL_BOOTHS)
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

  const [selectedBoothId, setSelectedBoothId] = useState("main-stage");
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
  const [apiKeyDraft, setApiKeyDraft] = useState(
    readStoredJson("stagepulse-openai-v1", INITIAL_OPENAI_SETTINGS).browserKey ?? ""
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      writeStoredJson("stagepulse-booths-v2", localBooths);
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

  const poll = useMemo(
    () =>
      isSupabaseConfigured ? buildSupabasePoll(pollConfig, supabasePollVotes) : localPoll,
    [localPoll, pollConfig, supabasePollVotes]
  );

  const selectedPollOptionId = isSupabaseConfigured
    ? getSupabaseSelectedPollOptionId(supabasePollVotes, browserId)
    : pollSelection.optionId;

  useEffect(() => {
    if (!booths.length) return;

    const selectionStillExists = booths.some((booth) => booth.id === selectedBoothId);
    if (selectionStillExists) return;

    const fallbackBooth = booths.find((booth) => booth.level === activeLevel) ?? booths[0];
    if (fallbackBooth) {
      setSelectedBoothId(fallbackBooth.id);
      if (fallbackBooth.level !== activeLevel) {
        setActiveLevel(fallbackBooth.level);
      }
    }
  }, [activeLevel, booths, selectedBoothId]);

  const selectedBooth = booths.find((booth) => booth.id === selectedBoothId) ?? booths[0] ?? null;
  const visibleBooths = booths.filter((booth) => booth.level === activeLevel);
  const activeLevelMeta = LEVELS[activeLevel];

  const allPulses = useMemo(
    () =>
      booths
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
    [booths]
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
        sampleText: items[0]?.text ?? "",
        label: labelQuestionCluster(key, items[0]?.text ?? "Audience question"),
        latestAt: items[0]?.createdAt ?? minutesAgo(0),
      }))
      .filter((group) => group.count > 1)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.latestAt) - new Date(a.latestAt);
      });
  }, [allPulses]);

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

  const levelPulseCount = booths
    .filter((booth) => booth.level === activeLevel)
    .reduce((sum, booth) => sum + booth.pulses.length, 0);

  const liveFeed = useMemo(() => {
    const query = normalizeText(searchTerm);
    return allPulses.filter((pulse) => {
      const matchesQuery =
        !query ||
        [
          pulse.text,
          pulse.boothName,
          pulse.boothShortName,
          pulse.type,
          LEVELS[pulse.level]?.label ?? "",
        ].some((field) => normalizeText(field).includes(query));

      const matchesFilter = feedFilter === "All" || pulse.type === feedFilter;

      return matchesQuery && matchesFilter;
    });
  }, [allPulses, searchTerm, feedFilter]);

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

          const messageText = getErrorMessage(error, "Elastic search is unavailable.");
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
  }, [searchTerm]);

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
        label: "Elastic search and moderation",
        count: allPulses.filter((pulse) => normalizeText(pulse.text).includes("elastic")).length,
      },
      {
        label: "Anonymous no-login access",
        count: allPulses.filter((pulse) => {
          const normalized = normalizeText(pulse.text);
          return normalized.includes("login") || normalized.includes("anonymous");
        }).length,
      },
      {
        label: "Duplicate grouping for the speaker",
        count: allPulses.filter((pulse) => {
          const normalized = normalizeText(pulse.text);
          return normalized.includes("duplicate") || normalized.includes("repeat");
        }).length,
      },
      {
        label: "Spam and bot protection",
        count: allPulses.filter((pulse) => {
          const normalized = normalizeText(pulse.text);
          return (
            normalized.includes("spam") ||
            normalized.includes("bot") ||
            normalized.includes("abuse") ||
            normalized.includes("moderation")
          );
        }).length,
      },
    ]
      .filter((signal) => signal.count > 0)
      .sort((a, b) => b.count - a.count);

    const primarySignal = keywordSignals[0]?.label ?? "Live audience interaction";
    const focusLine = topDuplicateGroup
      ? `${topDuplicateGroup.label} is bubbling up across ${topDuplicateGroup.count} questions.`
      : "Audience signals are spread across the map, so the speaker can steer the next moment.";

    const recommendation = topDuplicateGroup
      ? `Suggested next answer: ${topDuplicateGroup.sampleText}`
      : "Suggested next answer: explain how anonymous browser IDs keep the experience no-login while Elastic handles search and moderation.";

    const safetyLine =
      blockedWordCount || suspiciousBurstCount
        ? `Safety layer has blocked ${blockedWordCount} banned-word attempt${
            blockedWordCount === 1 ? "" : "s"
          } and flagged ${suspiciousBurstCount} burst alert${
            suspiciousBurstCount === 1 ? "" : "s"
          }.`
        : "Safety layer is quiet right now.";

    return {
      primarySignal,
      focusLine,
      recommendation,
      safetyLine,
    };
  }, [allPulses, blockedWordCount, suspiciousBurstCount, topDuplicateGroup]);

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
      setSummaryError("No audience comments yet to summarize.");
      if (!automatic) {
        showToast("No audience comments yet to summarize.", "warning");
      }
      return;
    }

    if (!activeApiKey) {
      setSummaryError("Add an OpenAI API key or VITE_OPENAI_API_KEY before summarizing.");
      if (!automatic) {
        showToast("Add an OpenAI API key first.", "warning");
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
              content:
                "You summarize live venue comments for an event admin. Be concise, actionable, and plain text only.",
            },
            {
              role: "user",
              content: buildSummaryPrompt(allPulses, duplicateGroups, selectedBooth),
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
        showToast("Fresh AI summary generated.", "success");
      }
    } catch (error) {
      const messageText = getErrorMessage(error, "Unable to summarize comments right now.");
      setSummaryError(messageText);
      if (!automatic) {
        showToast("OpenAI summary failed. Check the admin panel.", "error");
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
      showToast("Browser key saved on this device.", "success");
    } else {
      showToast("Browser key cleared. Env key will be used if available.", "success");
    }
  }

  async function handleVote(optionId) {
    const votedOption = poll.options.find((option) => option.id === optionId);
    const previousOptionId = selectedPollOptionId;

    if (previousOptionId === optionId) {
      showToast(`Your vote is already on ${votedOption?.label ?? "this option"}.`, "success");
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
        ? `Vote moved to ${votedOption?.label ?? "this option"}.`
        : `Vote sent to ${votedOption?.label ?? "this option"}.`,
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
      label: `New Option ${pollConfig.options.length + 1}`,
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
      showToast("Keep at least two poll options.", "warning");
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

    showToast("Poll vote counts reset for the next demo run.", "success");
  }

  function handleLevelChange(level) {
    setActiveLevel(level);
    setAddBoothMode(false);
    setDraftBooth(null);

    const fallbackBooth = booths.find((booth) => booth.level === level);
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
      showToast("This booth point is already placed. Create it or cancel it before placing another.", "warning");
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
    showToast("Map point placed. Name the booth below.", "success");
  }

  async function createBooth() {
    if (!draftBooth || !boothName.trim()) {
      showToast("Click the map and add a booth name first.", "warning");
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
          text: "New booth is live on the map. Drop the first pulse here.",
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
              text: "New booth is live on the map. Drop the first pulse here.",
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
      showToast("New booth added to the live map.", "success");
    } catch (error) {
      const messageText = getErrorMessage(error, "Unable to create the booth right now.");
      showToast(messageText, "error");
    }
  }

  async function removeSelectedBooth() {
    if (!selectedBooth?.custom) {
      showToast("Only booths added in this demo can be removed.", "warning");
      return;
    }

    const removedBoothId = selectedBooth.id;
    const removedLevel = selectedBooth.level;

    const nextSelection =
      booths.find((booth) => booth.id !== removedBoothId && booth.level === removedLevel) ??
      booths.find((booth) => booth.id !== removedBoothId) ??
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
      showToast("Booth removed from the live map.", "success");
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
      showToast("Select a booth first.", "warning");
      return;
    }
    if (!cleanMessage) {
      showToast("Write a pulse or question first.", "warning");
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
      showToast("Blocked by live safety filter.", "warning");
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
    showToast(`${category} sent to ${selectedBooth.shortName}.`, "success");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <section className="brand-panel">
          <div className="brand-meta">
            <div className="live-pill">
              <span className="live-dot" />
              LIVE
            </div>
            <div className="meta-chip">Cloud Summit x Science World</div>
            <div className="meta-chip">{adminMode ? "Admin mode" : "Audience mode"}</div>
          </div>

          <div className="brand-copy">
            <h1>StagePulse Map</h1>
            <p>
              Audience members scan a QR code, vote in the live poll, tap a location,
              and leave questions or pulses without logging in.
            </p>
          </div>

          <div className="brand-footer">
            <div>
              <span>Anonymous browser</span>
              <strong>{browserId.slice(-10)}</strong>
            </div>
            <div className="mini-stat">
              <span>Live comments</span>
              <strong>{totalPulses}</strong>
            </div>
          </div>
        </section>

        <section className="poll-panel">
          <div className="panel-heading">
            <Vote size={16} />
            <span>Audience Poll</span>
          </div>
          <h2 className="poll-question">{poll.question}</h2>
          <p className="panel-copy">
            Each browser gets one live vote. Audience members can move their vote, but not stack
            multiple votes from the same session.
          </p>
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
          <span>Most Popular Vote</span>
          <strong>{mostPopularVote.label}</strong>
          <small>
            {mostPopularVote.votes} live votes - {mostPopularShare}% share
          </small>
          <div className="turnout-pill">{totalVotes} audience votes captured</div>
        </section>
      </header>

      <main className="workspace">
        <section className="map-card">
          <div className="map-toolbar">
            <div className="level-tabs">
              {Object.entries(LEVELS).map(([level, value]) => (
                <button
                  key={level}
                  className={activeLevel === level ? "active" : ""}
                  onClick={() => handleLevelChange(level)}
                >
                  {value.label}
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
              {addBoothMode ? "Click map to place booth" : "Add Booth"}
            </button>

            <label className="search-box">
              <Search size={16} />
              <input
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search comments, booths, categories..."
              />
            </label>
          </div>

          <div className={`map-stage ${activeLevel}`} onClick={handleMapClick}>
            <img src={activeLevelMeta.image} alt={`${activeLevelMeta.label} map`} />

            <div className="map-stage-label">
              <strong>{activeLevelMeta.label}</strong>
              <span>{activeLevelMeta.caption}</span>
            </div>

            <div className="map-instruction">
              {addBoothMode
                ? "Add mode is live. Click anywhere on the current map to place a booth."
                : "Select a booth, write a pulse, and let the audience light up the venue map."}
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
                  {selectedBooth.pulses[0]?.text ??
                    "No pulses yet. Be the first audience voice in this zone."}
                </p>
                <small>
                  {selectedBooth.pulses[0]
                    ? `${selectedBooth.pulses[0].type} - ${formatClock(
                        selectedBooth.pulses[0].createdAt
                      )}`
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
                  ? `New booth on ${LEVELS[draftBooth.level].label}`
                  : `Selected: ${selectedBooth?.name ?? "No booth selected"}`}
              </div>

              <div className="context-strip">
                <div>
                  <span>Current level</span>
                  <strong>{LEVELS[activeLevel].label}</strong>
                </div>
                <div>
                  <span>Visible booths</span>
                  <strong>{visibleBooths.length}</strong>
                </div>
                <div>
                  <span>Level pulses</span>
                  <strong>{levelPulseCount}</strong>
                </div>
              </div>

              {adminMode && selectedBooth?.custom && !draftBooth && (
                <div className="new-booth-actions">
                  <button className="secondary" onClick={removeSelectedBooth}>
                    Remove Booth
                  </button>
                </div>
              )}

              {draftBooth ? (
                <div className="new-booth-form">
                  <input
                    value={boothName}
                    onChange={(event) => setBoothName(event.target.value)}
                    placeholder="Name the new booth, e.g. Elastic Demo Booth"
                  />
                  <div className="new-booth-actions">
                    <button className="secondary" onClick={cancelBoothCreation}>
                      Cancel
                    </button>
                    <button onClick={createBooth}>Create Booth</button>
                  </div>
                </div>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask a question or leave a pulse here..."
                  />
                  <div className="category-row">
                    {CATEGORIES.map((item) => (
                      <button
                        key={item}
                        className={category === item ? "active" : ""}
                        onClick={() => setCategory(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!draftBooth && (
              <button className="send-button" onClick={submitPulse}>
                <Send size={17} />
                Send Pulse
              </button>
            )}
          </div>
        </section>

        <aside className="insight-panel">
          <section className="ai-card">
            <div className="panel-heading">
              <Bot size={17} />
              <span>Stage Readout</span>
            </div>
            <h2>{localAssistantSummary.focusLine}</h2>
            <p>{localAssistantSummary.recommendation}</p>
            <div className="assistant-pills">
              <span>{localAssistantSummary.primarySignal}</span>
              <span>
                {duplicateGroups.length
                  ? `${duplicateGroups.length} repeat cluster${
                      duplicateGroups.length === 1 ? "" : "s"
                    }`
                  : "Fresh mix of questions"}
              </span>
              <span>
                {blockedWordCount || suspiciousBurstCount
                  ? "Safety alerts active"
                  : "Safety layer steady"}
              </span>
            </div>
            <small>{localAssistantSummary.safetyLine}</small>
          </section>

          {adminMode && (
            <section className="summary-card">
              <div className="panel-heading">
                <WandSparkles size={16} />
                <span>OpenAI Comment Summary</span>
              </div>

              <div className="summary-status">
                <div className="status-pill">
                  <KeyRound size={14} />
                  <span>
                    {activeApiKey
                      ? activeApiKeySource === "browser"
                        ? "Using browser key"
                        : "Using env key"
                      : "No API key connected"}
                  </span>
                </div>
                <div className="status-pill subtle">
                  <Activity size={14} />
                  <span>{openAiSettings.model}</span>
                </div>
              </div>

              <div className="summary-note">
                Demo-friendly setup: you can paste a browser key here, but OpenAI recommends
                keeping production keys on your backend instead of shipping them in the browser.
              </div>

              <div className="summary-form">
                <label className="admin-field">
                  <span>OpenAI API key</span>
                  <input
                    type="password"
                    value={apiKeyDraft}
                    onChange={(event) => setApiKeyDraft(event.target.value)}
                    placeholder={
                      ENV_OPENAI_API_KEY
                        ? "Optional browser override for the env key"
                        : "Paste a project key for comment summaries"
                    }
                  />
                </label>

                <div className="summary-form-row">
                  <label className="admin-field">
                    <span>Summary model</span>
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
                          {model.label} - {model.helper}
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
                    <span>Auto summarize new comments</span>
                  </label>
                </div>

                <div className="admin-actions">
                  <button onClick={saveBrowserApiKey}>Save Key</button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setApiKeyDraft("");
                      setOpenAiSettings((prev) => ({ ...prev, browserKey: "" }));
                    }}
                  >
                    Clear Saved Key
                  </button>
                  <button
                    className="secondary"
                    onClick={() => void summarizeComments()}
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? (
                      <>
                        <RefreshCcw size={15} className="spin" />
                        Summarizing
                      </>
                    ) : (
                      <>
                        <WandSparkles size={15} />
                        Summarize Now
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="summary-output">
                <div className="summary-output-top">
                  <strong>Generated summary</strong>
                  {savedSummary.lastSummaryAt && (
                    <span>
                      {formatClock(savedSummary.lastSummaryAt)} -{" "}
                      {formatRelativeTime(savedSummary.lastSummaryAt)}
                    </span>
                  )}
                </div>
                {summaryError && <div className="summary-error">{summaryError}</div>}
                <pre>
                  {savedSummary.text ||
                    "No AI summary yet. Add a key, then click Summarize Now or turn on auto summarize."}
                </pre>
              </div>
            </section>
          )}

          {adminMode && (
            <section className="admin-card">
              <div className="panel-heading">
                <Sparkles size={16} />
                <span>Admin Poll Controls</span>
              </div>
              <div className="admin-note">
                Stage laptop only. Audience QR users stay on the vote-only view unless they open
                the page with <code>?admin=1</code>.
              </div>
              <label className="admin-field">
                <span>Poll question</span>
                <input
                  value={poll.question}
                  onChange={(event) => updatePollQuestion(event.target.value)}
                  placeholder="What do you want the audience to vote on?"
                />
              </label>
              <div className="admin-option-list">
                {poll.options.map((option, index) => (
                  <div key={option.id} className="admin-option-row">
                    <input
                      value={option.label}
                      onChange={(event) =>
                        updatePollOptionLabel(option.id, event.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                    />
                    <span>{option.votes} votes</span>
                    <button onClick={() => removePollOption(option.id)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="admin-actions">
                <button onClick={addPollOption}>Add Option</button>
                <button className="secondary" onClick={resetPollVotes}>
                  Reset Votes
                </button>
              </div>
            </section>
          )}

          <section className="metric-grid">
            <Metric
              icon={<Search size={16} />}
              label="Indexed Questions"
              value={indexedQuestions}
              helper="ready for Elastic search"
            />
            <Metric
              icon={<Sparkles size={16} />}
              label="Duplicated Questions"
              value={duplicateQuestionCount}
              helper="grouped for speaker clarity"
            />
            <Metric
              icon={<Shield size={16} />}
              label="Blocked Words"
              value={blockedWordCount}
              helper="moderation log"
              alert
            />
            <Metric
              icon={<AlertTriangle size={16} />}
              label="Suspicious Burst"
              value={suspiciousBurstCount}
              helper="browser spike alerts"
              warning
            />
          </section>

          <section className="cluster-card">
            <div className="panel-heading">
              <Vote size={16} />
              <span>Repeat Clusters</span>
            </div>
            {duplicateGroups.length === 0 ? (
              <div className="empty-feed">No duplicate question clusters yet.</div>
            ) : (
              <div className="cluster-list">
                {duplicateGroups.slice(0, 4).map((group) => (
                  <article key={group.key} className="cluster-item">
                    <strong>{group.label}</strong>
                    <p>{group.sampleText}</p>
                    <small>{group.count} matching questions</small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="elastic-card">
            <div className="panel-heading">
              <Activity size={16} />
              <span>Elastic Live Layer</span>
            </div>
            <div className="elastic-rows">
              <div>
                <strong>Supabase Sync</strong>
                <span>
                  {!isSupabaseConfigured
                    ? "Add Supabase env vars to enable shared live state."
                    : supabaseLoading
                      ? "Loading booths, questions, and poll votes from Supabase."
                      : supabaseError
                        ? `Sync issue: ${supabaseError}`
                        : supabaseStatus === "live"
                          ? "Realtime sync is active for connected phones and laptops."
                          : "Shared data loaded. Waiting for realtime confirmation."}
                </span>
              </div>
              <div>
                <strong>Search</strong>
                <span>Questions, booths, zones, categories, and map pulses</span>
              </div>
              <div>
                <strong>Security</strong>
                <span>Banned words, burst detection, and repeated-input alerts</span>
              </div>
              <div>
                <strong>Observability</strong>
                <span>Votes, pulse submissions, level switches, and summary events</span>
              </div>
              <div>
                <strong>No-login ID</strong>
                <span>{browserId}</span>
              </div>
            </div>
          </section>

          <section className="feed-card">
            <div className="panel-heading">
              <Search size={16} />
              <span>Live Feed</span>
            </div>

            <div className="feed-heading">
              <strong>
                {searchTerm
                  ? `${displayedFeed.length} matching result${displayedFeed.length === 1 ? "" : "s"}`
                  : `${allPulses.length} live pulses indexed`}
              </strong>
              <span>
                {searchTerm
                  ? elasticSearchLoading
                    ? `Elastic fuzzy search is checking "${searchTerm}"...`
                    : elasticSearchError
                      ? `Elastic search is unavailable, showing live local matches for "${searchTerm}".`
                      : `Elastic + live matches for "${searchTerm}"`
                  : "Latest audience signal across the venue"}
              </span>
            </div>

            <div className="feed-filters">
              {["All", ...CATEGORIES].map((item) => (
                <button
                  key={item}
                  className={feedFilter === item ? "active" : ""}
                  onClick={() => setFeedFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="feed-list">
              {displayedFeed.length === 0 ? (
                <div className="empty-feed">No matching pulses yet.</div>
              ) : (
                displayedFeed.slice(0, 12).map((pulse) => (
                  <article key={pulse.id} className="feed-item">
                    <div className="feed-item-top">
                      <strong>{pulse.text}</strong>
                      <span className="pulse-kind">{pulse.type}</span>
                    </div>
                    <div className="feed-meta">
                      <span>{pulse.boothShortName}</span>
                      <span>{LEVELS[pulse.level].label}</span>
                      <span>{formatClock(pulse.createdAt)}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </main>

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
