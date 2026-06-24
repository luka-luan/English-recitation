const state = {
  sentences: [],
  hideMode: "none",
  englishHidden: false,
  chineseHidden: false,
  mediaStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  recordingMimeType: "",
  recognition: null,
  recognitionWatchdog: null,
  recognitionRestarting: false,
  recognitionRestartCount: 0,
  lastRecognitionAt: 0,
  finalTranscript: "",
  interimTranscript: "",
  comparison: null,
  reciteCounts: [],
  wordHistory: [],
  articleKey: "",
  articleProgress: {},
  importingUrl: false,
  recordingUrl: "",
  isRecording: false,
  dailyStats: {},
  dailyStatsExpanded: false,
  dailyStatsStartDate: "",
  selectedDailyStatsDate: "",
  lastRecognizedRange: null,
  pendingStatsRange: null,
  currentSessionCounted: false,
  replayHighlightSentence: 0,
  replayAutoScrollAt: 0,
  replayCues: [],
  recordingStartedAt: 0,
  replayAudioPrimeTimers: [],
  urlHistory: [],
  cloudClient: null,
  cloudSession: null,
  cloudReady: false,
  cloudSaving: false,
  cloudApplying: false,
  cloudV2Ready: false,
  articles: [],
  cloudSessions: [],
  pendingSessions: [],
  currentArticleMeta: null,
};

const SUPABASE_URL = "https://owwvxgqiarhqmepajorf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_q-HR6ZeIAZBzYPOvRkfmmw_TSjMw8ev";
const SUPABASE_DATA_TABLE = "reciter_data";
const SUPABASE_ARTICLES_TABLE = "reciter_articles";
const SUPABASE_SESSIONS_TABLE = "reciter_sessions";
const PUBLIC_SUBTITLE_API = "https://english-recitation.onrender.com/api/subtitles";
const DAILY_STATS_KEY = "english-reciter-daily-stats-v1";
const DAILY_STATS_START_KEY = "english-reciter-daily-stats-start-v1";
const ARTICLE_PROGRESS_KEY = "english-reciter-article-progress-v1";
const CURRENT_ARTICLE_TEXT_KEY = "english-reciter-current-article-v1";
const URL_HISTORY_KEY = "english-reciter-url-history-v1";
const PRACTICE_BACKUP_KEY = "english-reciter-practice-backup-v1";
const ARTICLE_LIBRARY_KEY = "english-reciter-article-library-v2";
const PENDING_SESSIONS_KEY = "english-reciter-pending-sessions-v2";
const CLOUD_V2_MIGRATED_KEY = "english-reciter-cloud-v2-migrated";
const CLOUD_OTP_EMAIL_KEY = "english-reciter-cloud-otp-email";
const CLOUD_OTP_SENT_AT_KEY = "english-reciter-cloud-otp-sent-at";
let dailyStatsSaveTimer = 0;
let cloudSaveTimer = 0;
let cloudArticleSaveTimer = 0;
let queuedArticleSave = null;
let cloudOtpCountdownTimer = 0;

const els = {
  fileInput: document.querySelector("#fileInput"),
  sourceUrl: document.querySelector("#sourceUrl"),
  importUrlBtn: document.querySelector("#importUrlBtn"),
  recentUrlSelect: document.querySelector("#recentUrlSelect"),
  recentUrlOptions: document.querySelector("#recentUrlOptions"),
  pasteBox: document.querySelector("#pasteBox"),
  parseBtn: document.querySelector("#parseBtn"),
  translateBtn: document.querySelector("#translateBtn"),
  importStatus: document.querySelector("#importStatus"),
  articleList: document.querySelector("#articleList"),
  sentenceCount: document.querySelector("#sentenceCount"),
  wordCount: document.querySelector("#wordCount"),
  compactToggle: document.querySelector("#compactToggle"),
  dailyStatsList: document.querySelector("#dailyStatsList"),
  exportDataBtn: document.querySelector("#exportDataBtn"),
  importDataBtn: document.querySelector("#importDataBtn"),
  dataImportInput: document.querySelector("#dataImportInput"),
  cameraPreview: document.querySelector("#cameraPreview"),
  cameraSelect: document.querySelector("#cameraSelect"),
  micSelect: document.querySelector("#micSelect"),
  refreshDevicesBtn: document.querySelector("#refreshDevicesBtn"),
  recordSection: document.querySelector("#recordSection"),
  recordStatus: document.querySelector("#recordStatus"),
  downloadLink: document.querySelector("#downloadLink"),
  manualTranscript: document.querySelector("#manualTranscript"),
  scoreManualBtn: document.querySelector("#scoreManualBtn"),
  liveTranscript: document.querySelector("#liveTranscript"),
  replayDock: document.querySelector("#replayDock"),
  replayVideo: document.querySelector("#replayVideo"),
  replayBackBtn: document.querySelector("#replayBackBtn"),
  deleteReplayBtn: document.querySelector("#deleteReplayBtn"),
  floatingResult: document.querySelector("#floatingResult"),
  floatingRange: document.querySelector("#floatingRange"),
  floatingMeta: document.querySelector("#floatingMeta"),
  floatingTranscript: document.querySelector("#floatingTranscript"),
  floatingJumpBtn: document.querySelector("#floatingJumpBtn"),
  floatingHintBtn: document.querySelector("#floatingHintBtn"),
  floatingHintText: document.querySelector("#floatingHintText"),
  toggleEnglishBtn: document.querySelector("#toggleEnglishBtn"),
  toggleChineseBtn: document.querySelector("#toggleChineseBtn"),
  hintTwoBtn: document.querySelector("#hintTwoBtn"),
  floatingCameraBtn: document.querySelector("#floatingCameraBtn"),
  floatingRecordBtn: document.querySelector("#floatingRecordBtn"),
  floatingStopBtn: document.querySelector("#floatingStopBtn"),
  floatingExportBtn: document.querySelector("#floatingExportBtn"),
  cloudStatus: document.querySelector("#cloudStatus"),
  cloudSignedOut: document.querySelector("#cloudSignedOut"),
  cloudSignedIn: document.querySelector("#cloudSignedIn"),
  cloudEmail: document.querySelector("#cloudEmail"),
  cloudLoginBtn: document.querySelector("#cloudLoginBtn"),
  cloudEmailStep: document.querySelector("#cloudEmailStep"),
  cloudOtpStep: document.querySelector("#cloudOtpStep"),
  cloudOtp: document.querySelector("#cloudOtp"),
  cloudVerifyBtn: document.querySelector("#cloudVerifyBtn"),
  cloudResendBtn: document.querySelector("#cloudResendBtn"),
  cloudChangeEmailBtn: document.querySelector("#cloudChangeEmailBtn"),
  cloudPullBtn: document.querySelector("#cloudPullBtn"),
  cloudPushBtn: document.querySelector("#cloudPushBtn"),
  cloudLogoutBtn: document.querySelector("#cloudLogoutBtn"),
  cloudUserLabel: document.querySelector("#cloudUserLabel"),
  articleSearch: document.querySelector("#articleSearch"),
  articleLibrary: document.querySelector("#articleLibrary"),
  articleLibraryCount: document.querySelector("#articleLibraryCount"),
};

els.fileInput.addEventListener("change", handleFileChange);
els.importUrlBtn.addEventListener("click", handleUrlImport);
els.sourceUrl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleUrlImport();
});
els.recentUrlSelect.addEventListener("change", handleRecentUrlSelect);
els.parseBtn.addEventListener("click", () => parseArticle(els.pasteBox.value));
els.translateBtn.addEventListener("click", translateMissingLines);
els.compactToggle.addEventListener("change", () => {
  els.articleList.classList.toggle("compact", els.compactToggle.checked);
});
els.refreshDevicesBtn.addEventListener("click", populateDeviceOptions);
els.scoreManualBtn.addEventListener("click", scoreManualTranscript);
els.cameraPreview.addEventListener("pointerdown", startCameraDrag);
els.replayVideo.addEventListener("pointerdown", startReplayDrag);
els.replayVideo.addEventListener("play", primeReplayAudioOnPlay);
els.replayVideo.addEventListener("play", updateReplayHighlight);
els.replayVideo.addEventListener("timeupdate", updateReplayHighlight);
els.replayVideo.addEventListener("seeked", updateReplayHighlight);
els.replayVideo.addEventListener("ended", clearReplayHighlight);
els.replayVideo.addEventListener("ended", clearReplayAudioPrimeTimers);
els.replayBackBtn.addEventListener("click", skipReplayBack);
els.deleteReplayBtn.addEventListener("click", () => clearReplayRecording({ status: "已删除当前录像。" }));
els.floatingJumpBtn.addEventListener("click", jumpToRecognizedRange);
els.floatingHintBtn.addEventListener("click", showNextWordHint);
els.floatingCameraBtn.addEventListener("click", toggleFloatingCamera);
els.floatingRecordBtn.addEventListener("click", startRecitation);
els.floatingStopBtn.addEventListener("click", stopRecitation);
els.floatingExportBtn.addEventListener("click", exportPracticeData);
els.cloudLoginBtn.addEventListener("click", () => sendCloudOtp());
els.cloudEmail.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendCloudOtp();
});
els.cloudOtp.addEventListener("input", handleCloudOtpInput);
els.cloudOtp.addEventListener("keydown", (event) => {
  if (event.key === "Enter") verifyCloudOtp();
});
els.cloudVerifyBtn.addEventListener("click", verifyCloudOtp);
els.cloudResendBtn.addEventListener("click", () => sendCloudOtp({ resend: true }));
els.cloudChangeEmailBtn.addEventListener("click", () => clearCloudOtpState());
els.cloudPullBtn.addEventListener("click", pullCloudData);
els.cloudPushBtn.addEventListener("click", () => pushCloudData(true));
els.cloudLogoutBtn.addEventListener("click", signOutCloud);
els.dailyStatsList.addEventListener("click", handleDailyStatsClick);
els.exportDataBtn.addEventListener("click", exportPracticeData);
els.importDataBtn.addEventListener("click", () => els.dataImportInput.click());
els.dataImportInput.addEventListener("change", handlePracticeDataImport);
els.articleSearch.addEventListener("input", renderArticleLibrary);
els.articleLibrary.addEventListener("click", handleArticleLibraryClick);

document.querySelectorAll("[data-hide-mode]").forEach((button) => {
  button.addEventListener("click", () => setHideMode(button.dataset.hideMode));
});

els.toggleEnglishBtn.addEventListener("click", toggleEnglishVisibility);
els.toggleChineseBtn.addEventListener("click", toggleChineseVisibility);
els.hintTwoBtn.addEventListener("click", toggleHintTwoMode);

function setHideMode(mode) {
  state.hideMode = mode;
  state.englishHidden = mode === "en";
  state.chineseHidden = mode === "zh";
  document.querySelectorAll("[data-hide-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.hideMode === mode);
  });
  syncDisplayToggleButtons();
  renderArticle();
  syncFloatingControls();
}

function toggleEnglishVisibility() {
  if (state.hideMode === "hint2") state.hideMode = "none";
  state.englishHidden = !state.englishHidden;
  syncHideModeFromToggles();
}

function toggleChineseVisibility() {
  if (state.hideMode === "hint2") state.hideMode = "none";
  state.chineseHidden = !state.chineseHidden;
  syncHideModeFromToggles();
}

function toggleHintTwoMode() {
  if (state.hideMode === "hint2") {
    state.hideMode = "none";
    state.englishHidden = false;
  } else {
    state.hideMode = "hint2";
    state.englishHidden = false;
  }
  syncDisplayToggleButtons();
  renderArticle();
  syncFloatingControls();
}

function syncHideModeFromToggles() {
  state.hideMode = state.englishHidden ? "en" : state.chineseHidden ? "zh" : "none";
  syncDisplayToggleButtons();
  renderArticle();
  syncFloatingControls();
}

function syncDisplayToggleButtons() {
  els.toggleEnglishBtn.textContent = state.englishHidden ? "显英文" : "隐英文";
  els.toggleChineseBtn.textContent = state.chineseHidden ? "显中文" : "隐中文";
  els.hintTwoBtn.classList.toggle("active", state.hideMode === "hint2");
  els.toggleEnglishBtn.classList.toggle("active", state.englishHidden);
  els.toggleChineseBtn.classList.toggle("active", state.chineseHidden);
}

function toggleFloatingCamera() {
  if (state.mediaStream) closeCamera();
  else startCamera();
}

function syncFloatingControls() {
  const hasArticle = Boolean(state.sentences.length);
  const hasCamera = Boolean(state.mediaStream);
  syncDisplayToggleButtons();
  els.floatingCameraBtn.textContent = hasCamera ? "关摄像头" : "开摄像头";
  els.floatingCameraBtn.disabled = state.isRecording;
  els.floatingRecordBtn.disabled = !hasArticle || !hasCamera || state.isRecording;
  els.floatingStopBtn.disabled = !state.isRecording;
  els.floatingHintBtn.disabled = !hasArticle;
}

function setNextHintText(message) {
  els.floatingHintText.textContent = message;
  els.floatingHintText.title = message;
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  setImportStatus(`正在读取 ${file.name}...`);
  try {
    const text = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      ? await readPdf(file)
      : await file.text();
    els.pasteBox.value = text.trim();
    parseArticle(text, {
      title: file.name.replace(/\.[^.]+$/, ""),
      sourceUrl: "",
    });
  } catch (error) {
    setImportStatus(error.message || "文件读取失败。");
  }
}

async function handleUrlImport() {
  if (state.importingUrl) return;

  const url = els.sourceUrl.value.trim();
  if (!url) {
    setImportStatus("请先粘贴文章网页、字幕文件或视频链接。");
    return;
  }
  rememberUrl(url);

  if (isLikelyVideoUrl(url)) {
    await importVideoSubtitles(url);
    return;
  }

  setImportStatus("正在尝试读取链接...");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`链接返回 ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text();
    const text = contentType.includes("html") ? htmlToReadableText(raw) : raw;
    els.pasteBox.value = text.trim();
    parseArticle(text, { title: compactUrlLabel(url), sourceUrl: url });
  } catch {
    const loaded = await importVideoSubtitles(url, "网页读取失败，正在尝试用本地 yt-dlp 识别字幕...");
    if (loaded) return;
    setImportStatus("链接读取失败，也没有提取到视频字幕。可以复制正文/字幕文本到输入框，或导入 .srt/.vtt 字幕文件。");
  }
}

async function importVideoSubtitles(url, message = "正在用本地 yt-dlp 提取视频字幕...") {
  setUrlLoading(true);
  const isLocal = isLoopbackHost() || ["4173", "4174"].includes(window.location.port);
  const apiUrl = isLocal || window.location.hostname.endsWith("onrender.com")
    ? "/api/subtitles"
    : PUBLIC_SUBTITLE_API;
  setImportStatus(isLocal ? message : "正在通过字幕服务提取，首次唤醒可能需要约一分钟...");
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 100000);
  const progressId = window.setTimeout(() => {
    setImportStatus("还在提取字幕，YouTube 有时需要 10-60 秒，请稍等...");
  }, 8000);

  try {
    const headers = { "content-type": "application/json" };
    const accessToken = state.cloudSession?.access_token;
    if (!isLocal && accessToken) headers.authorization = `Bearer ${accessToken}`;
    let { response, data } = await requestSubtitleApi(apiUrl, url, headers, controller.signal);
    if ((!response.ok || !data?.ok) && !isLocal) {
      const publicError = data?.message || "公网字幕服务读取失败。";
      setImportStatus("公网字幕受限，正在改用这台电脑的本地字幕服务...");
      try {
        const localResult = await requestSubtitleApi(
          "http://127.0.0.1:4173/api/subtitles",
          url,
          { "content-type": "application/json" },
          window.AbortSignal?.timeout ? window.AbortSignal.timeout(95000) : controller.signal,
        );
        if (localResult.response.ok && localResult.data?.ok) {
          response = localResult.response;
          data = localResult.data;
        } else {
          throw new Error(localResult.data?.message || publicError);
        }
      } catch {
        throw new Error(`${publicError} 请确认电脑上的 http://127.0.0.1:4173/ 正在运行。`);
      }
    }
    if (!data) throw new Error("当前网址没有可用的后端字幕服务。");
    if (!response.ok || !data.ok) throw new Error(data.message || "字幕提取失败。");
    els.pasteBox.value = data.text.trim();
    parseArticle(data.text, {
      title: data.title || compactUrlLabel(url),
      sourceUrl: data.source_url || url,
    });
    setImportStatus(`已从视频字幕生成 ${state.sentences.length} 句。字幕轨道：${data.track}`);
    return true;
  } catch (error) {
    const message = error.name === "AbortError"
      ? "字幕提取超时了。可以再试一次，或换一个带字幕的视频。"
      : `${error.message}${isLocal ? "" : " 可以在电脑打开 http://127.0.0.1:4173/ 用本机网络导入。"}`;
    setImportStatus(message);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
    window.clearTimeout(progressId);
    setUrlLoading(false);
  }
}

async function requestSubtitleApi(apiUrl, sourceUrl, headers, signal) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ url: sourceUrl }),
    signal,
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

function setUrlLoading(isLoading) {
  state.importingUrl = isLoading;
  els.importUrlBtn.disabled = isLoading;
  els.sourceUrl.disabled = isLoading;
  els.recentUrlSelect.disabled = isLoading;
  els.importUrlBtn.textContent = isLoading ? "提取中..." : "读取链接";
  els.importUrlBtn.setAttribute("aria-busy", String(isLoading));
}

function handleRecentUrlSelect() {
  const url = els.recentUrlSelect.value;
  if (!url) return;
  els.sourceUrl.value = url;
  els.recentUrlSelect.value = "";
  els.sourceUrl.focus();
}

async function readPdf(file) {
  const pdfjs = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = pdfItemsToLines(content.items);
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

function pdfItemsToLines(items) {
  const rows = [];

  items
    .map((item) => ({
      text: item.str,
      x: Math.round(item.transform?.[4] || 0),
      y: Math.round(item.transform?.[5] || 0),
    }))
    .filter((item) => item.text.trim())
    .sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x))
    .forEach((item) => {
      const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
      if (row) row.items.push(item);
      else rows.push({ y: item.y, items: [item] });
    });

  return rows
    .map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "))
    .join("\n");
}

async function getPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;

  try {
    const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
    return pdfjs;
  } catch {
    throw new Error("PDF 解析组件没有加载成功。可以先把 PDF 文字复制出来粘贴，或联网后重试。");
  }
}

function parseArticle(rawText, options = {}) {
  const shouldPersist = options.persist !== false;
  const shouldReport = options.status !== false;
  const cleanedText = cleanImportedText(rawText);
  const text = normalizeWhitespace(cleanedText);
  if (!text) {
    setImportStatus("请先导入或粘贴一篇英文文章。");
    return;
  }

  state.sentences = buildSmartSentencePairs(cleanedText);
  state.articleKey = articleKeyForSentences(state.sentences);
  const existingArticle = state.articles.find((item) => item.articleKey === state.articleKey);
  const now = new Date().toISOString();
  state.currentArticleMeta = {
    articleKey: state.articleKey,
    title: options.title || existingArticle?.title || articleTitleFromText(cleanedText),
    sourceUrl: options.sourceUrl ?? existingArticle?.sourceUrl ?? "",
    content: cleanedText,
    createdAt: existingArticle?.createdAt || now,
    updatedAt: options.preserveTimestamps ? existingArticle?.updatedAt || now : now,
    lastOpenedAt: options.preserveTimestamps ? existingArticle?.lastOpenedAt || now : now,
  };
  applyStoredArticleProgress();
  state.comparison = null;
  state.finalTranscript = "";
  state.interimTranscript = "";
  state.lastRecognizedRange = null;
  state.pendingStatsRange = null;
  state.currentSessionCounted = false;
  els.liveTranscript.textContent = "等待开始背诵。";
  els.floatingResult.hidden = true;
  if (shouldPersist) {
    localStorage.setItem(CURRENT_ARTICLE_TEXT_KEY, cleanedText);
    saveCurrentArticleToLibrary();
    savePracticeBackup();
  }
  renderArticle();
  renderArticleLibrary();
  syncFloatingControls();
  if (shouldReport) setImportStatus(`已生成 ${state.sentences.length} 句。已自动识别英文和中文。`);
}

function articleTitleFromText(text) {
  const firstLine = text.split(/\n+/).map((line) => line.trim()).find(Boolean) || "未命名文章";
  return firstLine.replace(/^\d+[.)、\s]+/, "").slice(0, 64);
}

function normalizeArticleLibrary(source) {
  if (!Array.isArray(source)) return [];
  const unique = new Map();
  source.forEach((item) => {
    if (!item || !isArticleKey(item.articleKey) || typeof item.content !== "string" || !item.content.trim()) return;
    const normalized = {
      articleKey: item.articleKey,
      title: String(item.title || articleTitleFromText(item.content)).slice(0, 160),
      sourceUrl: String(item.sourceUrl || "").slice(0, 2000),
      content: item.content.trim(),
      createdAt: String(item.createdAt || item.updatedAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || new Date().toISOString()),
      lastOpenedAt: String(item.lastOpenedAt || item.updatedAt || new Date().toISOString()),
      baselineReciteCounts: normalizeCountArray(item.baselineReciteCounts),
      baselineWordHistory: normalizeWordHistory(item.baselineWordHistory),
    };
    const current = unique.get(normalized.articleKey);
    if (!current || normalized.updatedAt >= current.updatedAt) unique.set(normalized.articleKey, normalized);
  });
  return [...unique.values()].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

function loadArticleLibrary() {
  try {
    return normalizeArticleLibrary(JSON.parse(localStorage.getItem(ARTICLE_LIBRARY_KEY) || "[]"));
  } catch {
    return [];
  }
}

function persistArticleLibrary() {
  state.articles = normalizeArticleLibrary(state.articles);
  localStorage.setItem(ARTICLE_LIBRARY_KEY, JSON.stringify(state.articles));
}

function saveCurrentArticleToLibrary() {
  if (!state.currentArticleMeta || !state.articleKey) return;
  const existing = state.articles.find((item) => item.articleKey === state.articleKey);
  const record = {
    ...existing,
    ...state.currentArticleMeta,
    baselineReciteCounts: existing?.baselineReciteCounts || normalizeCountArray(state.reciteCounts),
    baselineWordHistory: existing?.baselineWordHistory || normalizeWordHistory(state.wordHistory),
  };
  state.articles = normalizeArticleLibrary([record, ...state.articles]);
  persistArticleLibrary();
  scheduleCloudArticleSave(record);
}

function renderArticleLibrary() {
  const query = (els.articleSearch.value || "").trim().toLowerCase();
  const articles = normalizeArticleLibrary(state.articles).filter((item) => {
    const haystack = `${item.title} ${item.sourceUrl}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  els.articleLibraryCount.textContent = `${state.articles.length} 篇`;
  if (!articles.length) {
    els.articleLibrary.innerHTML = `<p class="library-empty">${query ? "没有匹配文章" : "导入后会保存在这里"}</p>`;
    return;
  }
  els.articleLibrary.innerHTML = articles.map((item) => `
    <div class="library-item${item.articleKey === state.articleKey ? " active" : ""}">
      <button class="library-open" type="button" data-open-article="${escapeHtml(item.articleKey)}" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</button>
      <small>${escapeHtml(item.sourceUrl ? compactUrlLabel(item.sourceUrl) : formatCloudTime(item.updatedAt))}</small>
      <button class="library-delete" type="button" data-delete-article="${escapeHtml(item.articleKey)}" title="删除文章" aria-label="删除文章">×</button>
    </div>
  `).join("");
}

async function handleArticleLibraryClick(event) {
  const openButton = event.target.closest("[data-open-article]");
  if (openButton) {
    const item = state.articles.find((article) => article.articleKey === openButton.dataset.openArticle);
    if (!item) return;
    item.lastOpenedAt = new Date().toISOString();
    persistArticleLibrary();
    els.pasteBox.value = item.content;
    parseArticle(item.content, { title: item.title, sourceUrl: item.sourceUrl });
    setImportStatus(`已打开《${item.title}》。`);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-article]");
  if (!deleteButton) return;
  const item = state.articles.find((article) => article.articleKey === deleteButton.dataset.deleteArticle);
  if (!item || !window.confirm(`删除《${item.title}》及其云端背诵记录？`)) return;
  await deleteArticleEverywhere(item.articleKey);
}

function buildSmartSentencePairs(rawText) {
  const lines = rawText.split(/\n+/).map((line) => stripLineNumber(line.trim())).filter(Boolean);
  const pairs = [];
  let pendingZh = "";
  let pendingEn = "";

  for (const line of lines) {
    const runs = splitByScriptRuns(line);
    for (const run of runs) {
      if (run.type === "zh") {
        const zh = cleanupChinese(run.text);
        if (!zh) continue;
        const last = pairs[pairs.length - 1];
        if (last && !last.zh) last.zh = zh;
        else pendingZh = joinTranslation(pendingZh, zh);
        continue;
      }

      if (run.type === "en") {
        const text = cleanupEnglish(run.text);
        if (!text) continue;
        pendingEn = joinEnglish(pendingEn, text);
        const completeSentences = splitCompleteSentences(pendingEn);
        completeSentences.ready.forEach((english, index) => {
          pairs.push({ english, zh: index === 0 ? pendingZh : "" });
          pendingZh = "";
        });
        pendingEn = completeSentences.rest;
      }
    }
  }

  if (pendingEn.trim()) {
    splitIntoSentences(pendingEn).forEach((english, index) => {
      pairs.push({ english, zh: index === 0 ? pendingZh : "" });
      pendingZh = "";
    });
  }

  return pairs.length ? pairs : splitIntoSentences(normalizeWhitespace(rawText)).map((english) => ({ english, zh: "" }));
}

function splitByScriptRuns(line) {
  const runs = [];
  let current = null;

  Array.from(line).forEach((char) => {
    const type = charType(char);
    if (type === "neutral") {
      if (current) current.text += char;
      return;
    }

    if (!current || current.type !== type) {
      current = { type, text: "" };
      runs.push(current);
    }
    current.text += char;
  });

  return runs.filter((run) => run.text.trim());
}

function charType(char) {
  if (/[A-Za-z]/.test(char)) return "en";
  if (/[\u3400-\u9fff]/.test(char)) return "zh";
  return "neutral";
}

function splitCompleteSentences(text) {
  const sentences = splitIntoSentences(text);
  if (!sentences.length) return { ready: [], rest: text };
  const last = sentences[sentences.length - 1];
  const hasFinalPunctuation = /[.!?]["')\]]?$/.test(last);
  return {
    ready: hasFinalPunctuation ? sentences : sentences.slice(0, -1),
    rest: hasFinalPunctuation ? "" : last,
  };
}

function stripLineNumber(line) {
  return line
    .replace(/^\s*(?:\d+|[一二三四五六七八九十百千]+)[.)、:：]\s*/, "")
    .replace(/^\s*第\s*(?:\d+|[一二三四五六七八九十百千]+)\s*句[.)、:：]?\s*/, "")
    .replace(/^\s*sentence\s*\d+[.)、:：]?\s*/i, "")
    .trim();
}

function cleanupEnglish(text) {
  return text.replace(/\s+/g, " ").replace(/^[^A-Za-z]+/, "").trim();
}

function cleanupChinese(text) {
  return text.replace(/\s+/g, "").replace(/^[：:，,。.\s]+/, "").trim();
}

function joinEnglish(left, right) {
  return [left, right].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function joinTranslation(left, right) {
  return [left, right].filter(Boolean).join(" ").trim();
}

function cleanImportedText(text) {
  return stripSubtitleNoise(text)
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function stripSubtitleNoise(text) {
  const cleanLines = text
    .split(/\r?\n/)
    .map((line) => line
      .replace(/<\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}>/g, "")
      .replace(/<\/?[^>]+>/g, "")
      .trim())
    .filter((trimmed) => {
      if (!trimmed) return true;
      if (/^\d+$/.test(trimmed)) return false;
      if (/^\([^A-Za-z\u3400-\u9fff]*(?:music|sound|noise|applause|laughter|boom|birds)[^A-Za-z\u3400-\u9fff]*\)$/i.test(trimmed)) return false;
      if (/^\[[^\]]*(?:music|sound|noise|applause|laughter|boom|birds)[^\]]*\]$/i.test(trimmed)) return false;
      if (/^(WEBVTT|Kind:|Language:)/i.test(trimmed)) return false;
      if (/^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}/.test(trimmed)) return false;
      if (/^\d{1,2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}[,.]\d{1,3}/.test(trimmed)) return false;
      return true;
    });

  return dedupeNearbyLines(cleanLines).join("\n");
}

function dedupeNearbyLines(lines) {
  const output = [];
  for (const line of lines) {
    if (line && output.slice(-3).includes(line)) continue;
    output.push(line);
  }
  return output;
}

function htmlToReadableText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, nav, header, footer, aside, noscript").forEach((node) => node.remove());
  return (doc.body?.innerText || doc.documentElement.textContent || "").trim();
}

function isLikelyVideoUrl(url) {
  return /(?:youtube\.com|youtu\.be|bilibili\.com|vimeo\.com|youku\.com|ixigua\.com|douyin\.com|tiktok\.com)/i.test(url);
}

function splitIntoSentences(text) {
  if (window.Intl?.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    return Array.from(segmenter.segment(text), (item) => item.segment.trim()).filter(Boolean);
  }

  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function renderArticle() {
  if (!state.sentences.length) {
    els.articleList.className = "article-list empty";
    els.articleList.innerHTML = `
      <div class="empty-state">
        <h2>导入一篇文章开始练习</h2>
        <p>导入后，每一句英文都会按序号显示；如果原文含中文，会以普通文本显示在英文下方。背诵结束后会按单词标出正确、漏背和多背。</p>
      </div>
    `;
    updateMetrics();
    syncFloatingControls();
    return;
  }

  els.articleList.className = `article-list${els.compactToggle.checked ? " compact" : ""}`;
  els.articleList.innerHTML = "";

  state.sentences.forEach((sentence, index) => {
    const card = document.createElement("article");
    card.className = "sentence-card";
    card.id = `sentence-${index + 1}`;
    card.classList.toggle("replay-current", state.replayHighlightSentence === index + 1);

    const number = document.createElement("span");
    number.className = "sentence-index";
    number.textContent = String(index + 1);

    const body = document.createElement("div");
    body.className = "sentence-body";

    const english = document.createElement("p");
    english.className = "english";
    english.dataset.role = "english";
    english.innerHTML = renderEnglishSentence(sentence.english, index);
    const count = state.reciteCounts[index] || 0;
    if (count > 0) {
      const countBadge = document.createElement("span");
      countBadge.className = "recite-count";
      countBadge.textContent = `x${count}`;
      english.append(" ", countBadge);
    }

    const translation = document.createElement("p");
    translation.className = "translation-text";
    translation.dataset.role = "translation";
    translation.textContent = sentence.zh || "";
    translation.hidden = !sentence.zh;
    translation.classList.toggle("hidden-text", state.chineseHidden);

    body.append(english, translation);
    card.append(number, body);
    els.articleList.append(card);
  });

  updateMetrics();
  applyHideMode();
  syncFloatingControls();
}

function renderEnglishSentence(text, sentenceIndex) {
  const tokenRecords = tokenizeExpectedSentence(text, sentenceIndex);
  let surfaceWordOrder = 0;

  return tokenRecords
    .map((record) => {
      if (record.type === "space") return record.value;
      if (record.type === "punct") {
        const hiddenClass = shouldHideToken(surfaceWordOrder, "punct") ? " hidden-text" : "";
        return `<span class="punct${hiddenClass}" data-after-word="${surfaceWordOrder}">${escapeHtml(record.value)}</span>`;
      }

      surfaceWordOrder += 1;
      const wordState = state.comparison ? comparisonStateForWord(record.wordIndexes) : "";
      const history = cumulativeWordInfo(record.wordIndexes);
      const classes = ["word"];
      const attrs = [`data-word-order="${surfaceWordOrder}"`];
      if (history) {
        classes.push("word-history", history.className);
        attrs.push(`style="--history-bg: ${history.background}"`);
        attrs.push(`title="${escapeHtml(history.title)}"`);
      }
      if (wordState) classes.push(wordState);
      if (shouldHideToken(surfaceWordOrder, "word")) classes.push("hidden-text");
      return `<span class="${classes.join(" ")}" ${attrs.join(" ")}>${escapeHtml(record.value)}</span>`;
    })
    .join("");
}

function shouldHideToken(wordOrder, type) {
  if (state.englishHidden) return true;
  if (state.hideMode !== "hint2") return false;
  if (type === "word") return wordOrder > 2;
  return wordOrder >= 2;
}

function comparisonStateForWord(wordIndexes) {
  const range = state.comparison?.activeRange;
  if (range && wordIndexes.every((wordIndex) => wordIndex < range.start || wordIndex >= range.end)) return "";
  if (wordIndexes.every((wordIndex) => state.comparison.correctExpectedIndexes.has(wordIndex))) return "correct";
  if (wordIndexes.some((wordIndex) => state.comparison.missedExpectedIndexes?.has(wordIndex))) return "missed";
  return "";
}

function cumulativeWordInfo(wordIndexes) {
  const totals = wordIndexes.reduce((sum, wordIndex) => {
    const item = state.wordHistory[wordIndex] || {};
    return {
      correct: sum.correct + safeStatCount(item.correct),
      missed: sum.missed + safeStatCount(item.missed),
    };
  }, { correct: 0, missed: 0 });
  const total = totals.correct + totals.missed;
  if (!total) return null;

  const isMostlyMissed = totals.missed > totals.correct;
  const maxSide = Math.max(totals.correct, totals.missed);
  const confidence = Math.abs(totals.correct - totals.missed) / total;
  const alpha = Math.min(0.48, 0.12 + Math.log1p(maxSide) * 0.08 + confidence * 0.12);
  const color = isMostlyMissed ? "255, 59, 48" : "52, 199, 89";
  return {
    className: isMostlyMissed ? "history-missed" : "history-correct",
    background: `rgba(${color}, ${alpha.toFixed(2)})`,
    title: `累计：对 ${totals.correct} 次，错 ${totals.missed} 次`,
  };
}

function tokenizeExpectedSentence(text, sentenceIndex) {
  const records = [];
  const regex = /[A-Za-z]+(?:'[A-Za-z]+)?|\s+|[^A-Za-z\s]+/g;
  let match;
  let localWordIndex = 0;
  const offset = state.sentences.slice(0, sentenceIndex).reduce((sum, item) => sum + wordsFromText(item.english).length, 0);

  while ((match = regex.exec(text))) {
    const value = match[0];
    if (/^\s+$/.test(value)) {
      records.push({ type: "space", value });
    } else if (/^[A-Za-z]/.test(value)) {
      const normalizedWords = expandContraction(value.toLowerCase());
      records.push({
        type: "word",
        value,
        wordIndexes: normalizedWords.map((_, index) => offset + localWordIndex + index),
      });
      localWordIndex += normalizedWords.length;
    } else {
      records.push({ type: "punct", value });
    }
  }

  return records;
}

function applyHideMode() {
  // Hide mode is applied while rendering each sentence.
}

function updateMetrics() {
  const words = state.sentences.flatMap((item) => wordsFromText(item.english));
  els.sentenceCount.textContent = String(state.sentences.length);
  els.wordCount.textContent = String(words.length);
}

async function translateMissingLines() {
  if (!state.sentences.length) {
    setImportStatus("请先生成逐句稿。");
    return;
  }

  setImportStatus("正在检查浏览器是否支持本地翻译...");
  const translator = await createTranslator();

  if (!translator) {
    setImportStatus("当前浏览器没有可用的内置翻译。可导入自带中文的文本，或在支持 Translator API 的 Chrome 中重试。");
    return;
  }

  let translated = 0;
  for (const sentence of state.sentences) {
    if (sentence.zh.trim()) continue;
    sentence.zh = await translator.translate(sentence.english);
    translated += 1;
    setImportStatus(`已翻译 ${translated} 句...`);
  }

  renderArticle();
  setImportStatus(`已补全 ${translated} 句中文翻译。`);
}

async function createTranslator() {
  try {
    if ("Translator" in window && typeof window.Translator.create === "function") {
      return await window.Translator.create({ sourceLanguage: "en", targetLanguage: "zh" });
    }

    if (window.ai?.translator?.create) {
      return await window.ai.translator.create({ sourceLanguage: "en", targetLanguage: "zh" });
    }
  } catch {
    return null;
  }

  return null;
}

async function startCamera() {
  if (!hasCameraApi()) {
    setRecordStatus("当前内置浏览器没有开放摄像头录制 API。请用 Chrome、Edge 或 Safari 打开 http://127.0.0.1:4173/ 再点“开启摄像头”。");
    return;
  }

  try {
    stopMediaStream();
    const constraints = selectedMediaConstraints();
    state.mediaStream = await window.navigator.mediaDevices.getUserMedia(constraints);
    els.cameraPreview.srcObject = state.mediaStream;
    document.body.classList.add("camera-active");
    await els.cameraPreview.play();
    await populateDeviceOptions();
    syncFloatingControls();
    setRecordStatus(`摄像头和麦克风已就绪。当前麦克风：${activeAudioLabel()}。`);
  } catch (error) {
    document.body.classList.remove("camera-active");
    syncFloatingControls();
    if (error.name === "NotAllowedError") {
      setRecordStatus("权限被系统或浏览器拒绝：请在 macOS 隐私设置里允许当前浏览器使用摄像头和麦克风，然后刷新本页重试。");
    } else if (error.name === "NotFoundError") {
      setRecordStatus("没有检测到可用的摄像头或麦克风。");
    } else if (error.name === "NotReadableError") {
      setRecordStatus("摄像头或麦克风正在被其它应用占用，请关闭会议软件/录屏软件后重试。");
    } else {
      setRecordStatus(`无法开启摄像头或麦克风：${error.name || "未知错误"}。建议用 Chrome、Edge 或 Safari 打开本页重试。`);
    }
  }
}

function closeCamera() {
  if (state.isRecording || state.mediaRecorder?.state === "recording") {
    stopRecitation();
    return;
  }

  stopMediaStream();
  syncFloatingControls();
  setRecordStatus("摄像头和麦克风已关闭。");
}

function hasCameraApi() {
  return Boolean(window.isSecureContext && window.navigator?.mediaDevices?.getUserMedia);
}

function selectedMediaConstraints() {
  const videoDeviceId = els.cameraSelect.value;
  const audioDeviceId = els.micSelect.value;
  return {
    video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
    audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
  };
}

async function populateDeviceOptions() {
  if (!window.navigator?.mediaDevices?.enumerateDevices) {
    setRecordStatus("当前浏览器无法列出摄像头和麦克风设备。");
    return;
  }

  try {
    const devices = await window.navigator.mediaDevices.enumerateDevices();
    fillDeviceSelect(els.cameraSelect, devices.filter((device) => device.kind === "videoinput"), "默认摄像头");
    fillDeviceSelect(els.micSelect, devices.filter((device) => device.kind === "audioinput"), "默认麦克风");
    setRecordStatus("设备列表已刷新。若看不到名称，先点一次“开启摄像头”并允许权限。");
  } catch (error) {
    setRecordStatus(`设备列表读取失败：${error.name || "未知错误"}。`);
  }
}

function fillDeviceSelect(select, devices, defaultLabel) {
  const current = select.value;
  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  select.append(defaultOption);

  devices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `${defaultLabel} ${index + 1}`;
    select.append(option);
  });

  if (Array.from(select.options).some((option) => option.value === current)) {
    select.value = current;
  }
}

function activeAudioLabel() {
  const track = state.mediaStream?.getAudioTracks()[0];
  return track?.label || els.micSelect.selectedOptions[0]?.textContent || "默认麦克风";
}

function startRecitation() {
  if (!state.sentences.length) {
    setRecordStatus("请先导入文章。");
    return;
  }

  if (!state.mediaStream) {
    setRecordStatus("请先开启摄像头。");
    return;
  }

  state.recordedChunks = [];
  state.finalTranscript = "";
  state.interimTranscript = "";
  state.comparison = null;
  state.lastRecognizedRange = null;
  state.pendingStatsRange = null;
  state.currentSessionCounted = false;
  clearReplayHighlight();
  state.replayCues = [];
  state.recordingStartedAt = 0;
  state.recognitionRestarting = false;
  state.recognitionRestartCount = 0;
  state.lastRecognitionAt = Date.now();
  state.isRecording = true;
  clearReplayRecording();
  renderArticle();
  els.floatingResult.hidden = true;
  setNextHintText("开始背后，可点击提示。");

  if (!window.MediaRecorder) {
    state.isRecording = false;
    setRecordStatus("当前浏览器不支持录像 API。请升级 iPadOS，或换 Chrome、Edge、Safari 后重试。");
    syncFloatingControls();
    return;
  }

  const mimeType = getSupportedMimeType();
  try {
    state.mediaRecorder = new MediaRecorder(state.mediaStream, mimeType ? { mimeType } : undefined);
  } catch (error) {
    state.isRecording = false;
    state.mediaRecorder = null;
    setRecordStatus(`当前浏览器无法创建录像：${error.name || "未知错误"}。请换 Safari/Chrome 或重启浏览器后重试。`);
    syncFloatingControls();
    return;
  }

  state.recordingMimeType = state.mediaRecorder.mimeType || mimeType || "";
  state.mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) state.recordedChunks.push(event.data);
  });
  state.mediaRecorder.addEventListener("stop", finishRecording, { once: true });
  try {
    state.mediaRecorder.start(1000);
  } catch {
    state.mediaRecorder.start();
  }
  state.recordingStartedAt = performance.now();

  startSpeechRecognition();
  startRecognitionWatchdog();
  syncFloatingControls();
  setRecordStatus("正在录制和识别。若浏览器暂停转写，会自动恢复。");
}

function stopRecitation() {
  state.pendingStatsRange = state.comparison?.activeRange || state.lastRecognizedRange || null;
  state.isRecording = false;
  stopRecognitionWatchdog();
  if (state.mediaRecorder?.state === "recording") {
    try {
      state.mediaRecorder.requestData();
    } catch {
      // Safari may not support requestData in every recording state.
    }
    state.mediaRecorder.stop();
  }
  stopSpeechRecognition();
  stopMediaStream();
  syncFloatingControls();
  setRecordStatus("正在整理最后的语音识别结果...");
  window.setTimeout(() => compareTranscript(), 600);
}

function stopMediaStream() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
  }
  state.mediaStream = null;
  els.cameraPreview.pause();
  els.cameraPreview.srcObject = null;
  document.body.classList.remove("camera-active");
  syncFloatingControls();
}

function startCameraDrag(event) {
  if (!document.body.classList.contains("camera-active")) return;
  event.preventDefault();
  els.cameraPreview.setPointerCapture(event.pointerId);
  els.cameraPreview.classList.add("dragging");

  const rect = els.cameraPreview.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;

  const move = (moveEvent) => {
    const nextLeft = moveEvent.clientX - offsetX;
    const nextTop = moveEvent.clientY - offsetY;
    placeCameraPreview(nextLeft, nextTop);
  };

  const stop = () => {
    els.cameraPreview.classList.remove("dragging");
    els.cameraPreview.removeEventListener("pointermove", move);
    els.cameraPreview.removeEventListener("pointerup", stop);
    els.cameraPreview.removeEventListener("pointercancel", stop);
  };

  els.cameraPreview.addEventListener("pointermove", move);
  els.cameraPreview.addEventListener("pointerup", stop);
  els.cameraPreview.addEventListener("pointercancel", stop);
}

function placeCameraPreview(left, top) {
  placeFloatingElement(els.cameraPreview, left, top);
}

function placeFloatingElement(element, left, top) {
  const rect = element.getBoundingClientRect();
  const padding = 10;
  const clampedLeft = Math.min(Math.max(padding, left), window.innerWidth - rect.width - padding);
  const clampedTop = Math.min(Math.max(padding, top), window.innerHeight - rect.height - padding);
  element.style.left = `${clampedLeft}px`;
  element.style.top = `${clampedTop}px`;
  element.style.right = "auto";
  element.style.bottom = "auto";
}

async function finishRecording() {
  const blobType = state.mediaRecorder?.mimeType || state.recordingMimeType || getRecordingFallbackMimeType();
  const blob = new Blob(state.recordedChunks, { type: blobType });
  state.mediaRecorder = null;

  if (!blob.size) {
    clearReplayRecording();
    setRecordStatus("本次录像没有生成有效视频，请重新录制。");
    return;
  }

  const url = URL.createObjectURL(blob);
  state.recordingUrl = url;
  state.recordingMimeType = blob.type || blobType;
  els.downloadLink.href = url;
  els.downloadLink.download = `recitation-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${recordingFileExtension(blob.type || blobType)}`;
  els.downloadLink.hidden = false;
  els.downloadLink.textContent = "下载录像";

  try {
    await loadReplayVideo(url);
    resetReplayAudioState();
    primeReplayAudioForSafari();
    els.replayDock.hidden = false;
    updateReplayHighlight();
  } catch {
    clearReplayRecording();
    setRecordStatus("本次录像生成失败，请重新录制。");
  }
}

function skipReplayBack() {
  if (!Number.isFinite(els.replayVideo.duration) && !els.replayVideo.currentTime) return;
  els.replayVideo.currentTime = Math.max(0, els.replayVideo.currentTime - 5);
}

function startSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    stopRecognitionWatchdog();
    setRecordStatus("当前浏览器不支持语音识别。录像仍会保存，但无法自动评分。建议用 Chrome。");
    return;
  }

  stopSpeechRecognition();
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  const markRecognitionActive = () => {
    state.lastRecognitionAt = Date.now();
  };

  recognition.addEventListener("result", (event) => {
    markRecognitionActive();
    let finalText = "";
    let interimText = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) finalText += `${transcript} `;
      else interimText += transcript;
    }

    state.finalTranscript += finalText;
    state.interimTranscript = interimText;
    updateLiveTranscript();
    compareTranscript(false);
    captureReplayCue();
  });

  recognition.addEventListener("speechstart", markRecognitionActive);
  recognition.addEventListener("soundstart", markRecognitionActive);
  recognition.addEventListener("audiostart", markRecognitionActive);

  recognition.addEventListener("end", () => {
    if (state.isRecording && state.mediaRecorder?.state === "recording") {
      restartSpeechRecognition("语音识别刚刚自动停了一下，正在恢复");
    }
  });

  recognition.addEventListener("error", (event) => {
    markRecognitionActive();
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      stopRecognitionWatchdog();
      setRecordStatus("语音识别权限被拒绝。录像仍会保存，但无法自动评分。请检查浏览器麦克风权限。");
      return;
    }
    setRecordStatus(`语音识别暂停：${event.error}。录像仍在继续。`);
  });

  state.recognition = recognition;
  try {
    recognition.start();
    state.lastRecognitionAt = Date.now();
    state.recognitionRestarting = false;
  } catch {
    state.recognitionRestarting = false;
    restartSpeechRecognition("语音识别启动失败，正在重试");
  }
}

function stopSpeechRecognition() {
  if (!state.recognition) return;
  try {
    state.recognition.stop();
  } catch {
    // Browser speech recognition can throw if it has already stopped.
  }
  state.recognition = null;
}

function startRecognitionWatchdog() {
  stopRecognitionWatchdog();
  state.recognitionWatchdog = window.setInterval(() => {
    if (!state.isRecording || state.mediaRecorder?.state !== "recording") return;
    const staleFor = Date.now() - (state.lastRecognitionAt || 0);
    if (staleFor > 12000) {
      restartSpeechRecognition("实时转写刚刚停住了，正在自动恢复");
    }
  }, 4000);
}

function stopRecognitionWatchdog() {
  if (!state.recognitionWatchdog) return;
  window.clearInterval(state.recognitionWatchdog);
  state.recognitionWatchdog = null;
}

function restartSpeechRecognition(message) {
  if (!state.isRecording || state.mediaRecorder?.state !== "recording" || state.recognitionRestarting) return;
  state.recognitionRestarting = true;
  state.recognitionRestartCount += 1;
  state.lastRecognitionAt = Date.now();
  stopSpeechRecognition();
  setRecordStatus(`${message}（第 ${state.recognitionRestartCount} 次）。`);

  window.setTimeout(() => {
    if (!state.isRecording || state.mediaRecorder?.state !== "recording") {
      state.recognitionRestarting = false;
      return;
    }
    startSpeechRecognition();
  }, 450);
}

function updateLiveTranscript() {
  const text = `${state.finalTranscript} ${state.interimTranscript}`.trim();
  els.liveTranscript.textContent = text || "正在等待声音。";
  if (!els.floatingResult.hidden) els.floatingTranscript.textContent = text || "暂无转写。";
}

function compareTranscript(showResult = true) {
  const spokenText = `${state.finalTranscript} ${state.interimTranscript}`.trim();
  const expectedWords = state.sentences.flatMap((item) => wordsFromText(item.english));
  const spokenWords = wordsFromText(spokenText);

  if (!expectedWords.length) return;
  if (!spokenWords.length) {
    if (showResult) {
      const fallbackRange = state.pendingStatsRange || state.comparison?.activeRange || state.lastRecognizedRange;
      if (fallbackRange) {
        if (state.comparison) updateWordHistory(state.comparison);
        incrementReciteCounts(fallbackRange);
        const stats = recordDailyWork(fallbackRange);
        renderArticle();
        updateMetrics();
        renderResult();
        const rangeLabel = sentenceRangeLabel(fallbackRange);
        const statsText = dailyStatsStatusText(stats);
        setRecordStatus(`评分完成：使用最近一次实时识别结果。${rangeLabel}${statsText}`);
        return;
      }

      const stats = recordDailyWork(null);
      renderResult();
      setRecordStatus(`还没有识别到可评分的英文。${dailyStatsStatusText(stats)}可以回看录像，或把转写粘到手动评分框。`);
    }
    return;
  }

  const alignment = localWordAlignment(expectedWords, spokenWords);
  const correctExpectedIndexes = new Set(alignment.map((pair) => pair.expectedIndex));
  const activeRange = alignment.activeRange || { start: 0, end: expectedWords.length };
  const missedExpectedIndexes = new Set();
  for (let index = activeRange.start; index < activeRange.end; index += 1) {
    if (!correctExpectedIndexes.has(index)) missedExpectedIndexes.add(index);
  }
  const matchedSpokenIndexes = new Set(alignment.map((pair) => pair.spokenIndex));
  const extras = spokenWords.filter((_, index) => !matchedSpokenIndexes.has(index));
  const activeWordCount = Math.max(1, activeRange.end - activeRange.start);
  const accuracy = Math.round((correctExpectedIndexes.size / activeWordCount) * 100);
  state.lastRecognizedRange = activeRange;
  state.comparison = { correctExpectedIndexes, missedExpectedIndexes, extras, accuracy, activeRange };

  let stats = null;
  if (showResult) {
    updateWordHistory(state.comparison);
    incrementReciteCounts(activeRange);
    stats = recordDailyWork(activeRange);
  }

  renderArticle();
  updateMetrics();

  if (showResult) {
    renderResult();
    updateReplayHighlight();
    const rangeLabel = sentenceRangeLabel(activeRange);
    const statsText = dailyStatsStatusText(stats);
    setRecordStatus(`评分完成：${accuracy}% 准确率。${rangeLabel}${statsText}绿色是背对的词，红色是这一段里漏掉或顺序不对的词。`);
  }
}

function scoreManualTranscript() {
  if (!state.sentences.length) {
    setRecordStatus("请先导入文章。");
    return;
  }

  state.finalTranscript = els.manualTranscript.value.trim();
  state.interimTranscript = "";
  state.currentSessionCounted = false;
  state.pendingStatsRange = null;
  updateLiveTranscript();
  compareTranscript();
}

function localWordAlignment(expected, spoken) {
  if (!spoken.length) {
    const empty = [];
    empty.activeRange = { start: 0, end: expected.length };
    return empty;
  }

  const rows = expected.length + 1;
  const cols = spoken.length + 1;
  const dp = Array.from({ length: rows }, () => new Int32Array(cols));
  const trace = Array.from({ length: rows }, () => new Uint8Array(cols));
  let bestScore = 0;
  let bestI = 0;
  let bestJ = 0;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const diag = dp[i - 1][j - 1] + (expected[i - 1] === spoken[j - 1] ? 3 : -2);
      const up = dp[i - 1][j] - 1;
      const left = dp[i][j - 1] - 1;
      const score = Math.max(0, diag, up, left);
      dp[i][j] = score;
      trace[i][j] = score === 0 ? 0 : score === diag ? 1 : score === up ? 2 : 3;
      if (score > bestScore) {
        bestScore = score;
        bestI = i;
        bestJ = j;
      }
    }
  }

  if (!bestScore) {
    const empty = [];
    empty.activeRange = { start: 0, end: Math.min(expected.length, Math.max(1, spoken.length)) };
    return empty;
  }

  const pairs = [];
  let i = bestI;
  let j = bestJ;
  while (i > 0 && j > 0 && dp[i][j] > 0) {
    const direction = trace[i][j];
    if (direction === 1) {
      if (expected[i - 1] === spoken[j - 1]) pairs.push({ expectedIndex: i - 1, spokenIndex: j - 1 });
      i -= 1;
      j -= 1;
    } else if (direction === 2) {
      i -= 1;
    } else if (direction === 3) {
      j -= 1;
    } else {
      break;
    }
  }

  pairs.reverse();
  pairs.activeRange = expandRangeToSentenceBoundaries({ start: i, end: bestI });
  return pairs;
}

function expandRangeToSentenceBoundaries(range) {
  const ranges = sentenceWordRanges();
  const firstSentence = ranges.find((item) => range.start < item.end && range.end > item.start);
  const lastSentence = ranges.findLast
    ? ranges.findLast((item) => range.start < item.end && range.end > item.start)
    : [...ranges].reverse().find((item) => range.start < item.end && range.end > item.start);

  return {
    start: firstSentence?.start ?? range.start,
    end: lastSentence?.end ?? range.end,
  };
}

function sentenceWordRanges() {
  let cursor = 0;
  return state.sentences.map((sentence, index) => {
    const length = wordsFromText(sentence.english).length;
    const range = { sentenceIndex: index, start: cursor, end: cursor + length };
    cursor += length;
    return range;
  });
}

function sentenceRangeLabel(activeRange) {
  const ranges = sentenceWordRanges().filter((item) => activeRange.start < item.end && activeRange.end > item.start);
  if (!ranges.length) return "";
  const start = ranges[0].sentenceIndex + 1;
  const end = ranges[ranges.length - 1].sentenceIndex + 1;
  return start === end ? `识别为第 ${start} 句。` : `识别为第 ${start}-${end} 句。`;
}

function renderResult() {
  const transcript = `${state.finalTranscript} ${state.interimTranscript}`.trim();
  els.floatingTranscript.textContent = transcript || "暂无转写。";

  if (state.recordingUrl && els.replayVideo.src !== state.recordingUrl) {
    els.replayVideo.src = state.recordingUrl;
    els.replayDock.hidden = false;
  }

  const activeRange = state.comparison?.activeRange;
  const sentenceRange = activeRange ? activeSentenceRange(activeRange) : null;
  if (sentenceRange) {
    const totalSentences = sentenceRange.end - sentenceRange.start + 1;
    showFloatingResult(sentenceRange, totalSentences);
  } else {
    showFloatingResult(null, 0);
  }
}

function showFloatingResult(sentenceRange, totalSentences) {
  if (!sentenceRange) {
    els.floatingRange.textContent = "未定位到句段";
    els.floatingMeta.textContent = state.comparison
      ? `准确率 ${state.comparison.accuracy ?? "--"}%`
      : "完成后显示句段、句数和准确率。";
    els.floatingJumpBtn.hidden = true;
    els.floatingResult.hidden = false;
    return;
  }

  const rangeText = sentenceRange.start === sentenceRange.end
    ? `第 ${sentenceRange.start} 句`
    : `第 ${sentenceRange.start}-${sentenceRange.end} 句`;
  els.floatingRange.textContent = `本次：${rangeText}`;
  const extras = state.comparison?.extras?.length ? ` · 额外词 ${state.comparison.extras.length} 个` : "";
  els.floatingMeta.textContent = `共背 ${totalSentences} 句 · 准确率 ${state.comparison?.accuracy ?? "--"}%${extras}`;
  els.floatingJumpBtn.textContent = `跳到第 ${sentenceRange.start} 句`;
  els.floatingJumpBtn.dataset.sentence = String(sentenceRange.start);
  els.floatingJumpBtn.hidden = false;
  els.floatingResult.hidden = false;
}

function updateReplayHighlight() {
  const sentenceRange = state.comparison?.activeRange ? activeSentenceRange(state.comparison.activeRange) : null;
  if (!sentenceRange || !state.recordingUrl || !Number.isFinite(els.replayVideo.duration) || els.replayVideo.duration <= 0) {
    clearReplayHighlight();
    return;
  }

  const sentence = replaySentenceForTime(els.replayVideo.currentTime, sentenceRange);
  if (sentence === state.replayHighlightSentence) {
    maybeScrollReplayHighlight(sentence);
    return;
  }

  state.replayHighlightSentence = sentence;
  document.querySelectorAll(".sentence-card.replay-current").forEach((card) => {
    card.classList.remove("replay-current");
  });
  document.querySelector(`#sentence-${sentence}`)?.classList.add("replay-current");
  maybeScrollReplayHighlight(sentence);
}

function maybeScrollReplayHighlight(sentence) {
  if (els.replayVideo.paused || els.replayVideo.ended) return;
  const now = Date.now();
  if (now - state.replayAutoScrollAt < 1800) return;
  state.replayAutoScrollAt = now;
  document.querySelector(`#sentence-${sentence}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearReplayHighlight() {
  state.replayHighlightSentence = 0;
  state.replayAutoScrollAt = 0;
  document.querySelectorAll(".sentence-card.replay-current").forEach((card) => {
    card.classList.remove("replay-current");
  });
}

function captureReplayCue() {
  if (!state.isRecording || !state.recordingStartedAt || !state.comparison?.activeRange) return;
  const sentenceRange = activeSentenceRange(state.comparison.activeRange);
  if (!sentenceRange) return;
  const sentence = sentenceRange.end;
  const time = Math.max(0, (performance.now() - state.recordingStartedAt) / 1000);
  const lastCue = state.replayCues[state.replayCues.length - 1];
  if (lastCue && lastCue.sentence === sentence && time - lastCue.time < 0.8) return;
  if (lastCue && time < lastCue.time) return;
  state.replayCues.push({ time, sentence });
}

function replaySentenceForTime(currentTime, sentenceRange) {
  const cues = state.replayCues
    .filter((cue) => cue.sentence >= sentenceRange.start && cue.sentence <= sentenceRange.end)
    .sort((left, right) => left.time - right.time);

  if (cues.length) {
    let current = sentenceRange.start;
    for (const cue of cues) {
      if (cue.time > currentTime + 0.25) break;
      current = cue.sentence;
    }
    return Math.min(sentenceRange.end, Math.max(sentenceRange.start, current));
  }

  const sentenceCount = Math.max(1, sentenceRange.end - sentenceRange.start + 1);
  const progress = Math.min(0.999, Math.max(0, currentTime / els.replayVideo.duration));
  return Math.min(sentenceRange.end, sentenceRange.start + Math.floor(progress * sentenceCount));
}

function incrementReciteCounts(activeRange) {
  const sentenceRange = activeSentenceRange(activeRange);
  if (!sentenceRange) return;
  for (let sentence = sentenceRange.start; sentence <= sentenceRange.end; sentence += 1) {
    const index = sentence - 1;
    state.reciteCounts[index] = (state.reciteCounts[index] || 0) + 1;
  }
  saveArticleProgress();
}

function updateWordHistory(comparison) {
  const range = comparison?.activeRange;
  if (!range) return;
  ensureWordHistoryLength();

  for (let index = range.start; index < range.end; index += 1) {
    const item = state.wordHistory[index] || { correct: 0, missed: 0 };
    if (comparison.correctExpectedIndexes?.has(index)) item.correct = safeStatCount(item.correct) + 1;
    else item.missed = safeStatCount(item.missed) + 1;
    state.wordHistory[index] = item;
  }

  saveArticleProgress();
}

function ensureWordHistoryLength() {
  const expectedLength = expectedWordCount();
  state.wordHistory = normalizeWordHistory(state.wordHistory, expectedLength);
}

function activeSentenceRange(activeRange) {
  const ranges = sentenceWordRanges().filter((item) => activeRange.start < item.end && activeRange.end > item.start);
  if (!ranges.length) return null;
  return {
    start: ranges[0].sentenceIndex + 1,
    end: ranges[ranges.length - 1].sentenceIndex + 1,
  };
}

function recordDailyWork(activeRange) {
  if (state.currentSessionCounted) {
    return { sentences: 0, sessions: 0, counted: false };
  }

  const sentenceRange = activeRange ? activeSentenceRange(activeRange) : null;
  const sentenceCount = sentenceRange ? sentenceRange.end - sentenceRange.start + 1 : 0;
  const wordCount = activeRange ? Math.max(0, activeRange.end - activeRange.start) : 0;
  const today = localDateKey();
  const current = state.dailyStats[today] || { sentences: 0, sessions: 0, words: 0 };
  state.dailyStats[today] = {
    sentences: current.sentences + sentenceCount,
    sessions: current.sessions + 1,
    words: (current.words || 0) + wordCount,
  };
  state.currentSessionCounted = true;
  pruneDailyStats();
  saveDailyStats();
  queuePracticeSession(activeRange);
  renderDailyStats();
  return { sentences: sentenceCount, sessions: 1, words: wordCount, counted: true };
}

function dailyStatsStatusText(stats) {
  if (!stats?.counted) return "";
  return `今日统计已更新：本次 +${stats.sentences} 句，+1 次。`;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function datesBetween(startKey, endKey) {
  const dates = [];
  let cursor = dateFromKey(startKey);
  const end = dateFromKey(endKey);
  if (cursor > end) cursor = end;

  while (cursor <= end) {
    dates.push(localDateKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function loadDailyStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DAILY_STATS_KEY) || "{}");
    return normalizeDailyStats(parsed);
  } catch {
    return {};
  }
}

function normalizeDailyStats(source) {
  if (!source || typeof source !== "object") return {};
  return Object.fromEntries(Object.entries(source)
    .filter(([date, value]) => isDateKey(date) && value && typeof value === "object")
    .map(([date, value]) => [date, {
      sentences: safeStatCount(value.sentences),
      sessions: safeStatCount(value.sessions),
      words: safeStatCount(value.words),
    }]));
}

function safeStatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function loadUrlHistory() {
  try {
    return normalizeUrlHistory(JSON.parse(localStorage.getItem(URL_HISTORY_KEY) || "[]"));
  } catch {
    return [];
  }
}

function normalizeUrlHistory(source) {
  if (!Array.isArray(source)) return [];
  const unique = [];
  source.forEach((value) => {
    const url = String(value || "").trim();
    if (!isRememberableUrl(url) || unique.includes(url)) return;
    unique.push(url);
  });
  return unique.slice(0, 30);
}

function isRememberableUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function rememberUrl(url) {
  const cleanUrl = String(url || "").trim();
  if (!isRememberableUrl(cleanUrl)) return;
  state.urlHistory = normalizeUrlHistory([cleanUrl, ...state.urlHistory]);
  saveUrlHistory();
  renderUrlHistory();
}

function saveUrlHistory() {
  localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(normalizeUrlHistory(state.urlHistory)));
  savePracticeBackup();
  scheduleDailyStatsServerSave();
}

function renderUrlHistory() {
  const urls = normalizeUrlHistory(state.urlHistory);
  els.recentUrlOptions.innerHTML = urls
    .map((url) => `<option value="${escapeHtml(url)}">${escapeHtml(compactUrlLabel(url))}</option>`)
    .join("");

  els.recentUrlSelect.hidden = !urls.length;
  els.recentUrlSelect.innerHTML = [
    `<option value="">最近链接</option>`,
    ...urls.map((url) => `<option value="${escapeHtml(url)}">${escapeHtml(compactUrlLabel(url))}</option>`),
  ].join("");
}

function compactUrlLabel(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = `${parsed.pathname}${parsed.search}`.replace(/\/$/, "");
    return path ? `${host}${path}`.slice(0, 92) : host;
  } catch {
    return url.slice(0, 92);
  }
}

function loadArticleProgress() {
  try {
    return normalizeArticleProgress(JSON.parse(localStorage.getItem(ARTICLE_PROGRESS_KEY) || "{}"));
  } catch {
    return {};
  }
}

function normalizeArticleProgress(source) {
  if (!source || typeof source !== "object") return {};
  return Object.fromEntries(Object.entries(source)
    .filter(([key, value]) => isArticleKey(key) && value && typeof value === "object")
    .map(([key, value]) => [key, {
      reciteCounts: normalizeCountArray(value.reciteCounts),
      wordHistory: normalizeWordHistory(value.wordHistory),
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    }]));
}

function normalizeCountArray(source, length = 0) {
  const sourceArray = Array.isArray(source) ? source : [];
  const targetLength = length || sourceArray.length;
  return Array.from({ length: targetLength }, (_, index) => safeStatCount(sourceArray[index]));
}

function normalizeWordHistory(source, length = 0) {
  const sourceArray = Array.isArray(source) ? source : [];
  const targetLength = length || sourceArray.length;
  return Array.from({ length: targetLength }, (_, index) => ({
    correct: safeStatCount(sourceArray[index]?.correct),
    missed: safeStatCount(sourceArray[index]?.missed),
  }));
}

function isArticleKey(value) {
  return typeof value === "string" && /^article-[a-z0-9]{6,16}$/.test(value);
}

function articleKeyForSentences(sentences) {
  const source = sentences
    .map((sentence) => sentence.english)
    .join("\n")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return `article-${hashString(source)}`;
}

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function expectedWordCount() {
  return state.sentences.reduce((sum, sentence) => sum + wordsFromText(sentence.english).length, 0);
}

function applyStoredArticleProgress() {
  const progress = state.articleProgress[state.articleKey] || {};
  state.reciteCounts = normalizeCountArray(progress.reciteCounts, state.sentences.length);
  state.wordHistory = normalizeWordHistory(progress.wordHistory, expectedWordCount());
}

function saveArticleProgress() {
  if (!state.articleKey) return;
  state.articleProgress[state.articleKey] = {
    reciteCounts: normalizeCountArray(state.reciteCounts, state.sentences.length),
    wordHistory: normalizeWordHistory(state.wordHistory, expectedWordCount()),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(ARTICLE_PROGRESS_KEY, JSON.stringify(state.articleProgress));
  saveCurrentArticleToLibrary();
  savePracticeBackup();
  scheduleDailyStatsServerSave();
}

function practiceDataPayload(options = {}) {
  const payload = {
    app: "english-reciter",
    version: 2,
    exportedAt: new Date().toISOString(),
    dailyStats: normalizeDailyStats(state.dailyStats),
    dailyStatsStartDate: isDateKey(state.dailyStatsStartDate) ? state.dailyStatsStartDate : localDateKey(),
    articleProgress: normalizeArticleProgress(state.articleProgress),
    urlHistory: normalizeUrlHistory(state.urlHistory),
    currentArticleText: localStorage.getItem(CURRENT_ARTICLE_TEXT_KEY) || "",
    cloudV2Migrated: localStorage.getItem(CLOUD_V2_MIGRATED_KEY) === "1",
  };
  if (options.includeLibrary) payload.articleLibrary = normalizeArticleLibrary(state.articles);
  return payload;
}

function savePracticeBackup() {
  localStorage.setItem(PRACTICE_BACKUP_KEY, JSON.stringify(practiceDataPayload({ includeLibrary: true })));
  scheduleCloudSave();
}

function exportPracticeData() {
  const payload = practiceDataPayload({ includeLibrary: true });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `english-reciter-data-${localDateKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setImportStatus("已导出背诵数据。换网址或换浏览器时，可以用“导入数据”恢复。");
}

async function handlePracticeDataImport(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    if (payload?.app !== "english-reciter") throw new Error("文件不是英语背诵数据。");
    importPracticeData(payload);
  } catch (error) {
    setImportStatus(error.message || "导入失败，请确认选择的是之前导出的 JSON 文件。");
  }
}

function importPracticeData(payload, options = {}) {
  const importedStats = normalizeDailyStats(payload.dailyStats);
  const importedProgress = normalizeArticleProgress(payload.articleProgress);
  const importedUrls = normalizeUrlHistory(payload.urlHistory);
  const importedArticles = normalizeArticleLibrary(payload.articleLibrary);
  if (payload.cloudV2Migrated === true) localStorage.setItem(CLOUD_V2_MIGRATED_KEY, "1");
  state.dailyStats = mergeDailyStats(state.dailyStats, importedStats);
  state.articleProgress = mergeArticleProgress(state.articleProgress, importedProgress);
  state.urlHistory = mergeUrlHistory(state.urlHistory, importedUrls);
  state.articles = mergeArticleLibraries(state.articles, importedArticles);
  state.dailyStatsStartDate = earliestDateKey([
    state.dailyStatsStartDate,
    isDateKey(payload.dailyStatsStartDate) ? payload.dailyStatsStartDate : "",
    ...Object.keys(state.dailyStats),
  ]) || localDateKey();

  localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(state.dailyStats));
  localStorage.setItem(DAILY_STATS_START_KEY, state.dailyStatsStartDate);
  localStorage.setItem(ARTICLE_PROGRESS_KEY, JSON.stringify(state.articleProgress));
  localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(state.urlHistory));
  persistArticleLibrary();
  savePracticeBackup();

  const currentArticleText = typeof payload.currentArticleText === "string" ? payload.currentArticleText.trim() : "";
  if (currentArticleText) {
    localStorage.setItem(CURRENT_ARTICLE_TEXT_KEY, currentArticleText);
    if (!state.sentences.length) {
      els.pasteBox.value = currentArticleText;
      parseArticle(currentArticleText, { persist: false, status: false });
      saveCurrentArticleToLibrary();
    }
  }

  if (state.articleKey) {
    applyStoredArticleProgress();
    renderArticle();
  }
  renderDailyStats();
  renderUrlHistory();
  renderArticleLibrary();
  scheduleDailyStatsServerSave();
  if (options.status !== false) setImportStatus(options.statusMessage || "已导入并合并背诵数据。");
}

function importPracticeDataFromHash() {
  const match = window.location.hash.match(/^#restore=([A-Za-z0-9_-]+)$/);
  if (!match) return false;

  try {
    const jsonText = decodeBase64Url(match[1]);
    const payload = JSON.parse(jsonText);
    if (payload?.app !== "english-reciter") throw new Error("迁移链接里的数据格式不对。");
    importPracticeData(payload);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setImportStatus("已从迁移链接恢复背诵数据。");
    return true;
  } catch (error) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setImportStatus(error.message || "迁移链接读取失败。");
    return false;
  }
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function initCloudSync() {
  setCloudStatus("正在连接 Supabase 云同步...");
  updateCloudUi();

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    state.cloudClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
    state.cloudReady = true;

    const { data, error } = await state.cloudClient.auth.getSession();
    if (error) throw error;
    await applyCloudSession(data.session);
    if (!data.session) restoreCloudOtpState();

    state.cloudClient.auth.onAuthStateChange(async (_event, session) => {
      await applyCloudSession(session);
    });
  } catch (error) {
    state.cloudReady = false;
    setCloudStatus(`云同步暂不可用：${cloudErrorMessage(error)}`);
    updateCloudUi();
  }
}

async function applyCloudSession(session) {
  state.cloudSession = session || null;
  updateCloudUi();

  if (!state.cloudSession) {
    setCloudStatus("未登录云同步。本地数据仍会正常保存。");
    return;
  }

  clearCloudOtpState({ keepEmail: true, keepStatus: true });

  setCloudStatus("已登录，正在合并云端数据...");
  await pullCloudData({ silentWhenEmpty: true });
  await syncCloudV2();
}

async function sendCloudOtp(options = {}) {
  if (!state.cloudClient) {
    setCloudStatus("云同步还没有准备好，请稍后再试。");
    return;
  }

  const email = (options.resend ? getPendingCloudEmail() : els.cloudEmail.value).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setCloudStatus("请先输入邮箱。");
    return;
  }

  els.cloudLoginBtn.disabled = true;
  els.cloudResendBtn.disabled = true;
  setCloudStatus(options.resend ? "正在重新发送验证码..." : "正在发送验证码...");
  try {
    const { error } = await state.cloudClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
    setPendingCloudOtp(email);
    showCloudOtpStep(email);
    startCloudOtpCountdown();
    setCloudStatus(`验证码已发送到 ${email}，请在原页面输入邮件中的数字。`);
  } catch (error) {
    setCloudStatus(`发送失败：${cloudOtpErrorMessage(error)}`);
  } finally {
    els.cloudLoginBtn.disabled = false;
    updateCloudOtpCountdown();
  }
}

function handleCloudOtpInput() {
  const digits = els.cloudOtp.value.replace(/\D/g, "").slice(0, 10);
  if (els.cloudOtp.value !== digits) els.cloudOtp.value = digits;
  els.cloudVerifyBtn.disabled = digits.length < 6;
}

async function verifyCloudOtp() {
  if (!state.cloudClient) return;
  const email = getPendingCloudEmail();
  const token = els.cloudOtp.value.replace(/\D/g, "").slice(0, 10);
  if (!email) {
    clearCloudOtpState();
    setCloudStatus("请先填写邮箱并发送验证码。");
    return;
  }
  if (token.length < 6) {
    setCloudStatus("请输入邮件中的完整验证码。");
    return;
  }

  els.cloudVerifyBtn.disabled = true;
  setCloudStatus("正在验证...");
  try {
    const { data, error } = await state.cloudClient.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
    if (!data?.session) throw new Error("没有获得登录会话");
    clearCloudOtpState({ keepEmail: true, keepStatus: true });
    if (data.session.access_token !== state.cloudSession?.access_token) await applyCloudSession(data.session);
    setCloudStatus("验证码正确，已在当前页面登录并同步。");
  } catch (error) {
    els.cloudVerifyBtn.disabled = false;
    setCloudStatus(`验证失败：${cloudOtpErrorMessage(error)}`);
  }
}

function setPendingCloudOtp(email) {
  try {
    sessionStorage.setItem(CLOUD_OTP_EMAIL_KEY, email);
    sessionStorage.setItem(CLOUD_OTP_SENT_AT_KEY, String(Date.now()));
  } catch {
    // The form still works if sessionStorage is unavailable.
  }
}

function getPendingCloudEmail() {
  try {
    return sessionStorage.getItem(CLOUD_OTP_EMAIL_KEY) || els.cloudEmail.value.trim();
  } catch {
    return els.cloudEmail.value.trim();
  }
}

function getCloudOtpSentAt() {
  try {
    return Number(sessionStorage.getItem(CLOUD_OTP_SENT_AT_KEY) || 0);
  } catch {
    return 0;
  }
}

function showCloudOtpStep(email) {
  els.cloudEmail.value = email;
  els.cloudEmailStep.hidden = true;
  els.cloudOtpStep.hidden = false;
  els.cloudOtp.value = "";
  els.cloudVerifyBtn.disabled = true;
  window.setTimeout(() => els.cloudOtp.focus(), 0);
}

function clearCloudOtpState(options = {}) {
  window.clearInterval(cloudOtpCountdownTimer);
  cloudOtpCountdownTimer = 0;
  try {
    sessionStorage.removeItem(CLOUD_OTP_EMAIL_KEY);
    sessionStorage.removeItem(CLOUD_OTP_SENT_AT_KEY);
  } catch {
    // Ignore storage restrictions.
  }
  els.cloudOtp.value = "";
  els.cloudOtpStep.hidden = true;
  els.cloudEmailStep.hidden = false;
  els.cloudVerifyBtn.disabled = true;
  els.cloudResendBtn.disabled = false;
  els.cloudResendBtn.textContent = "重新发送";
  if (!options.keepEmail) els.cloudEmail.value = "";
  if (!options.keepStatus && !state.cloudSession) setCloudStatus("未登录云同步。本地数据仍会正常保存。");
}

function restoreCloudOtpState() {
  const email = getPendingCloudEmail();
  const sentAt = getCloudOtpSentAt();
  if (!email || !sentAt || Date.now() - sentAt > 10 * 60 * 1000) return;
  showCloudOtpStep(email);
  startCloudOtpCountdown();
  setCloudStatus(`等待输入发送到 ${email} 的邮箱验证码。`);
}

function startCloudOtpCountdown() {
  window.clearInterval(cloudOtpCountdownTimer);
  updateCloudOtpCountdown();
  cloudOtpCountdownTimer = window.setInterval(updateCloudOtpCountdown, 1000);
}

function updateCloudOtpCountdown() {
  const remaining = Math.max(0, 60 - Math.floor((Date.now() - getCloudOtpSentAt()) / 1000));
  els.cloudResendBtn.disabled = remaining > 0;
  els.cloudResendBtn.textContent = remaining > 0 ? `重新发送（${remaining}）` : "重新发送";
  if (!remaining && cloudOtpCountdownTimer) {
    window.clearInterval(cloudOtpCountdownTimer);
    cloudOtpCountdownTimer = 0;
  }
}

function cloudOtpErrorMessage(error) {
  const message = error?.message || String(error || "未知错误");
  if (/expired|invalid.*otp|token.*invalid/i.test(message)) return "验证码错误或已过期，请重新发送。";
  if (/rate limit|too many|security purposes/i.test(message)) return "发送太频繁，请稍后再试。";
  return cloudErrorMessage(error);
}

async function refreshCloudSession() {
  if (!state.cloudClient) return;
  try {
    const { data, error } = await state.cloudClient.auth.getSession();
    if (error) return;
    const session = data?.session || null;
    if (!session || session.access_token === state.cloudSession?.access_token) return;
    await applyCloudSession(session);
    setCloudStatus("邮箱确认成功，原页面已自动登录并同步。");
  } catch {
    // Keep waiting for the auth session to appear in this browser.
  }
}

async function signOutCloud() {
  if (!state.cloudClient) return;
  await state.cloudClient.auth.signOut();
  state.cloudSession = null;
  updateCloudUi();
  setCloudStatus("已退出云同步。本地数据仍保留在这个浏览器。");
}

async function pullCloudData(options = {}) {
  if (!state.cloudClient || !state.cloudSession?.user) {
    setCloudStatus("请先登录云同步。");
    return;
  }

  const userId = state.cloudSession.user.id;
  els.cloudPullBtn.disabled = true;
  try {
    const { data, error } = await state.cloudClient
      .from(SUPABASE_DATA_TABLE)
      .select("payload, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    if (data?.payload?.app === "english-reciter") {
      state.cloudApplying = true;
      importPracticeData(data.payload, {
        status: false,
        statusMessage: "已从云端合并背诵数据。",
      });
      state.cloudApplying = false;
      setCloudStatus(`已合并云端数据，最后同步：${formatCloudTime(data.updated_at)}。`);
    } else if (!options.silentWhenEmpty) {
      setCloudStatus("云端还没有数据，当前浏览器数据可以上传。");
    }

    await pushCloudData(false);
  } catch (error) {
    state.cloudApplying = false;
    setCloudStatus(`读取云端失败：${cloudErrorMessage(error)}`);
  } finally {
    els.cloudPullBtn.disabled = false;
  }
}

async function pushCloudData(showStatus = false) {
  if (!state.cloudClient || !state.cloudSession?.user || state.cloudSaving) return;

  state.cloudSaving = true;
  updateCloudUi();
  if (showStatus) setCloudStatus("正在上传当前背诵数据...");

  try {
    const userId = state.cloudSession.user.id;
    const { error } = await state.cloudClient
      .from(SUPABASE_DATA_TABLE)
      .upsert({
        user_id: userId,
        payload: practiceDataPayload(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (error) throw error;
    setCloudStatus(`已同步到云端：${formatCloudTime(new Date().toISOString())}。`);
  } catch (error) {
    setCloudStatus(`上传云端失败：${cloudErrorMessage(error)}`);
  } finally {
    state.cloudSaving = false;
    updateCloudUi();
  }
}

function scheduleCloudSave() {
  if (!state.cloudReady || !state.cloudSession?.user || state.cloudApplying) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => pushCloudData(false), 1200);
}

function updateCloudUi() {
  const signedIn = Boolean(state.cloudSession?.user);
  els.cloudSignedOut.hidden = signedIn;
  els.cloudSignedIn.hidden = !signedIn;
  els.cloudUserLabel.textContent = signedIn ? state.cloudSession.user.email || "已登录" : "";
  els.cloudPushBtn.disabled = !signedIn || state.cloudSaving;
  els.cloudPullBtn.disabled = !signedIn || state.cloudSaving;
  els.cloudLogoutBtn.disabled = state.cloudSaving;
}

function setCloudStatus(message) {
  els.cloudStatus.textContent = message;
}

function formatCloudTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cloudErrorMessage(error) {
  const message = error?.message || String(error || "未知错误");
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return "网络连接失败";
  if (/relation .* does not exist|reciter_data/i.test(message)) return "还没有创建 reciter_data 数据表";
  if (/permission|policy|row-level|RLS/i.test(message)) return "数据表权限策略还没有配置好";
  return message;
}

function scheduleCloudArticleSave(record = state.currentArticleMeta) {
  if (!record || state.cloudApplying) return;
  queuedArticleSave = { ...record };
  window.clearTimeout(cloudArticleSaveTimer);
  cloudArticleSaveTimer = window.setTimeout(async () => {
    const next = queuedArticleSave;
    queuedArticleSave = null;
    if (next) await pushCloudArticle(next);
  }, 500);
}

async function pushCloudArticle(record) {
  if (!state.cloudClient || !state.cloudSession?.user || !record?.articleKey || !state.cloudV2Ready) return;
  const userId = state.cloudSession.user.id;
  const existing = state.articles.find((item) => item.articleKey === record.articleKey) || record;
  try {
    const { data, error: readError } = await state.cloudClient
      .from(SUPABASE_ARTICLES_TABLE)
      .select("article_key")
      .eq("user_id", userId)
      .eq("article_key", record.articleKey)
      .maybeSingle();
    if (readError) throw readError;

    const metadata = {
      title: record.title || articleTitleFromText(record.content),
      source_url: record.sourceUrl || "",
      content: record.content,
      updated_at: record.updatedAt || new Date().toISOString(),
      last_opened_at: record.lastOpenedAt || new Date().toISOString(),
    };
    const query = data
      ? state.cloudClient.from(SUPABASE_ARTICLES_TABLE).update(metadata)
        .eq("user_id", userId).eq("article_key", record.articleKey)
      : state.cloudClient.from(SUPABASE_ARTICLES_TABLE).insert({
        user_id: userId,
        article_key: record.articleKey,
        ...metadata,
        baseline_recite_counts: existing.baselineReciteCounts || normalizeCountArray(state.reciteCounts),
        baseline_word_history: existing.baselineWordHistory || normalizeWordHistory(state.wordHistory),
        created_at: record.createdAt || new Date().toISOString(),
      });
    const { error } = await query;
    if (error) throw error;
  } catch (error) {
    if (isCloudV2Missing(error)) state.cloudV2Ready = false;
    setCloudStatus(`文章暂未同步：${cloudErrorMessage(error)}`);
  }
}

async function syncCloudV2() {
  if (!state.cloudClient || !state.cloudSession?.user) return;
  const userId = state.cloudSession.user.id;
  try {
    const [articleResult, sessionResult] = await Promise.all([
      state.cloudClient.from(SUPABASE_ARTICLES_TABLE).select("*").eq("user_id", userId),
      state.cloudClient.from(SUPABASE_SESSIONS_TABLE).select("*").eq("user_id", userId),
    ]);
    if (articleResult.error) throw articleResult.error;
    if (sessionResult.error) throw sessionResult.error;
    state.cloudV2Ready = true;
    state.cloudApplying = true;

    const cloudArticles = articleResult.data.map(articleFromCloudRow);
    state.articles = mergeArticleLibraries(state.articles, cloudArticles);
    persistArticleLibrary();
    state.cloudSessions = normalizeCloudSessions(sessionResult.data);

    await migrateLegacyDataToV2();
    await flushPendingSessions();
    rebuildDailyStatsFromSessions();
    restoreCurrentArticleFromLibrary();
    renderArticleLibrary();
    state.cloudApplying = false;
    scheduleCloudArticleSave();
    setCloudStatus(`云同步完成：${state.articles.length} 篇文章，${state.cloudSessions.length} 次记录。`);
  } catch (error) {
    state.cloudApplying = false;
    state.cloudV2Ready = false;
    const message = isCloudV2Missing(error)
      ? "请先在 Supabase SQL Editor 运行 supabase-v2.sql"
      : cloudErrorMessage(error);
    setCloudStatus(`新版云同步未启用：${message}。旧版备份仍然保留。`);
  }
}

function articleFromCloudRow(row) {
  return {
    articleKey: row.article_key,
    title: row.title,
    sourceUrl: row.source_url,
    content: row.content,
    baselineReciteCounts: normalizeCountArray(row.baseline_recite_counts),
    baselineWordHistory: normalizeWordHistory(row.baseline_word_history),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at,
  };
}

function mergeArticleLibraries(localArticles, cloudArticles) {
  return normalizeArticleLibrary([...cloudArticles, ...localArticles].reduce((result, item) => {
    const existingIndex = result.findIndex((candidate) => candidate.articleKey === item.articleKey);
    if (existingIndex < 0) result.push(item);
    else if (String(item.updatedAt) > String(result[existingIndex].updatedAt)) result[existingIndex] = item;
    return result;
  }, []));
}

function normalizeCloudSessions(source) {
  if (!Array.isArray(source)) return [];
  const unique = new Map();
  source.forEach((item) => {
    if (!item?.id || !/^\d{4}-\d{2}-\d{2}$/.test(item.practice_date || item.practiceDate || "")) return;
    const session = {
      id: String(item.id),
      articleKey: String(item.article_key ?? item.articleKey ?? ""),
      practiceDate: item.practice_date || item.practiceDate,
      sentenceStart: nullableCount(item.sentence_start ?? item.sentenceStart),
      sentenceEnd: nullableCount(item.sentence_end ?? item.sentenceEnd),
      wordStart: nullableCount(item.word_start ?? item.wordStart),
      wordEnd: nullableCount(item.word_end ?? item.wordEnd),
      sentenceCount: safeStatCount(item.sentence_count ?? item.sentenceCount),
      wordCount: safeStatCount(item.word_count ?? item.wordCount),
      attempts: Math.max(1, safeStatCount(item.attempts || 1)),
      correctIndexes: normalizeIndexArray(item.correct_indexes ?? item.correctIndexes),
      missedIndexes: normalizeIndexArray(item.missed_indexes ?? item.missedIndexes),
      accuracy: nullableCount(item.accuracy),
      transcript: String(item.transcript || "").slice(0, 12000),
      createdAt: String(item.created_at || item.createdAt || new Date().toISOString()),
    };
    unique.set(session.id, session);
  });
  return [...unique.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function nullableCount(value) {
  return value === null || value === undefined || value === "" ? null : safeStatCount(value);
}

function normalizeIndexArray(source) {
  if (!Array.isArray(source)) return [];
  return [...new Set(source.map(safeStatCount))].slice(0, 10000);
}

function sessionToCloudRow(session) {
  return {
    user_id: state.cloudSession.user.id,
    id: session.id,
    article_key: session.articleKey,
    practice_date: session.practiceDate,
    sentence_start: session.sentenceStart,
    sentence_end: session.sentenceEnd,
    word_start: session.wordStart,
    word_end: session.wordEnd,
    sentence_count: session.sentenceCount,
    word_count: session.wordCount,
    attempts: session.attempts,
    correct_indexes: session.correctIndexes,
    missed_indexes: session.missedIndexes,
    accuracy: session.accuracy,
    transcript: session.transcript,
    created_at: session.createdAt,
  };
}

async function migrateLegacyDataToV2() {
  if (!state.cloudV2Ready) return;
  if (localStorage.getItem(CLOUD_V2_MIGRATED_KEY) === "1") return;
  for (const article of state.articles) await pushCloudArticle(article);

  const pendingByDate = {};
  state.pendingSessions.forEach((session) => {
    const current = pendingByDate[session.practiceDate] || { sentences: 0, sessions: 0, words: 0 };
    pendingByDate[session.practiceDate] = {
      sentences: current.sentences + session.sentenceCount,
      sessions: current.sessions + session.attempts,
      words: current.words + session.wordCount,
    };
  });
  const legacySessions = Object.entries(normalizeDailyStats(state.dailyStats)).map(([date, value]) => {
    const pending = pendingByDate[date] || { sentences: 0, sessions: 0, words: 0 };
    return {
    id: `legacy-${date}`,
    articleKey: "",
    practiceDate: date,
    sentenceStart: null,
    sentenceEnd: null,
    wordStart: null,
    wordEnd: null,
    sentenceCount: Math.max(0, value.sentences - pending.sentences),
    wordCount: Math.max(0, value.words - pending.words),
    attempts: Math.max(0, value.sessions - pending.sessions),
    correctIndexes: [],
    missedIndexes: [],
    accuracy: null,
    transcript: "",
    createdAt: `${date}T00:00:00.000Z`,
  };
  }).filter((session) => session.sentenceCount || session.wordCount || session.attempts);
  if (legacySessions.length) {
    const { error } = await state.cloudClient
      .from(SUPABASE_SESSIONS_TABLE)
      .upsert(legacySessions.map(sessionToCloudRow), { onConflict: "user_id,id", ignoreDuplicates: true });
    if (error) throw error;
    state.cloudSessions = normalizeCloudSessions([...state.cloudSessions, ...legacySessions]);
  }
  localStorage.setItem(CLOUD_V2_MIGRATED_KEY, "1");
  await pushCloudData(false);
}

function loadPendingSessions() {
  try {
    return normalizeCloudSessions(JSON.parse(localStorage.getItem(PENDING_SESSIONS_KEY) || "[]"));
  } catch {
    return [];
  }
}

function persistPendingSessions() {
  localStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(state.pendingSessions));
}

function queuePracticeSession(activeRange) {
  const sentenceRange = activeRange ? activeSentenceRange(activeRange) : null;
  const comparison = state.comparison;
  const session = {
    id: window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    articleKey: state.articleKey || "",
    practiceDate: localDateKey(),
    sentenceStart: sentenceRange?.start ?? null,
    sentenceEnd: sentenceRange?.end ?? null,
    wordStart: activeRange?.start ?? null,
    wordEnd: activeRange?.end ?? null,
    sentenceCount: sentenceRange ? sentenceRange.end - sentenceRange.start + 1 : 0,
    wordCount: activeRange ? Math.max(0, activeRange.end - activeRange.start) : 0,
    attempts: 1,
    correctIndexes: comparison ? [...comparison.correctExpectedIndexes] : [],
    missedIndexes: comparison ? [...comparison.missedExpectedIndexes] : [],
    accuracy: comparison?.accuracy ?? null,
    transcript: `${state.finalTranscript} ${state.interimTranscript}`.trim(),
    createdAt: new Date().toISOString(),
  };
  state.pendingSessions = normalizeCloudSessions([...state.pendingSessions, session]);
  state.cloudSessions = normalizeCloudSessions([...state.cloudSessions, session]);
  persistPendingSessions();
  flushPendingSessions();
}

async function flushPendingSessions() {
  if (!state.cloudV2Ready || !state.cloudClient || !state.cloudSession?.user || !state.pendingSessions.length) return;
  const pending = [...state.pendingSessions];
  const { error } = await state.cloudClient
    .from(SUPABASE_SESSIONS_TABLE)
    .upsert(pending.map(sessionToCloudRow), { onConflict: "user_id,id", ignoreDuplicates: true });
  if (error) {
    setCloudStatus(`背诵记录等待联网同步：${cloudErrorMessage(error)}`);
    return;
  }
  const sentIds = new Set(pending.map((item) => item.id));
  state.pendingSessions = state.pendingSessions.filter((item) => !sentIds.has(item.id));
  persistPendingSessions();
}

function rebuildDailyStatsFromSessions() {
  if (!state.cloudV2Ready) return;
  const stats = {};
  normalizeCloudSessions([...state.cloudSessions, ...state.pendingSessions]).forEach((session) => {
    const current = stats[session.practiceDate] || { sentences: 0, sessions: 0, words: 0 };
    stats[session.practiceDate] = {
      sentences: current.sentences + session.sentenceCount,
      sessions: current.sessions + session.attempts,
      words: current.words + session.wordCount,
    };
  });
  state.dailyStats = stats;
  localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
  renderDailyStats();
}

function restoreCurrentArticleFromLibrary() {
  if (!state.articles.length) return;
  const localCurrent = state.articles.find((item) => item.articleKey === state.articleKey);
  const newest = state.articles[0];
  const current = !localCurrent || String(newest.lastOpenedAt) > String(localCurrent.lastOpenedAt)
    ? newest
    : localCurrent;
  const sessions = state.cloudSessions.filter((item) => item.articleKey === current.articleKey);
  state.articleProgress[current.articleKey] = progressFromArticleSessions(current, sessions);
  localStorage.setItem(ARTICLE_PROGRESS_KEY, JSON.stringify(state.articleProgress));
  els.pasteBox.value = current.content;
  parseArticle(current.content, { title: current.title, sourceUrl: current.sourceUrl, persist: true, status: false });
}

function progressFromArticleSessions(article, sessions) {
  const reciteCounts = normalizeCountArray(article.baselineReciteCounts);
  const wordHistory = normalizeWordHistory(article.baselineWordHistory);
  sessions.forEach((session) => {
    if (session.sentenceStart && session.sentenceEnd) {
      for (let number = session.sentenceStart; number <= session.sentenceEnd; number += 1) {
        reciteCounts[number - 1] = safeStatCount(reciteCounts[number - 1]) + 1;
      }
    }
    session.correctIndexes.forEach((index) => {
      const item = wordHistory[index] || { correct: 0, missed: 0 };
      item.correct = safeStatCount(item.correct) + 1;
      wordHistory[index] = item;
    });
    session.missedIndexes.forEach((index) => {
      const item = wordHistory[index] || { correct: 0, missed: 0 };
      item.missed = safeStatCount(item.missed) + 1;
      wordHistory[index] = item;
    });
  });
  return { reciteCounts, wordHistory, updatedAt: new Date().toISOString() };
}

async function deleteArticleEverywhere(articleKey) {
  state.articles = state.articles.filter((item) => item.articleKey !== articleKey);
  delete state.articleProgress[articleKey];
  state.cloudSessions = state.cloudSessions.filter((item) => item.articleKey !== articleKey);
  state.pendingSessions = state.pendingSessions.filter((item) => item.articleKey !== articleKey);
  persistArticleLibrary();
  persistPendingSessions();
  localStorage.setItem(ARTICLE_PROGRESS_KEY, JSON.stringify(state.articleProgress));
  if (state.cloudV2Ready && state.cloudSession?.user) {
    await Promise.all([
      state.cloudClient.from(SUPABASE_SESSIONS_TABLE).delete()
        .eq("user_id", state.cloudSession.user.id).eq("article_key", articleKey),
      state.cloudClient.from(SUPABASE_ARTICLES_TABLE).delete()
        .eq("user_id", state.cloudSession.user.id).eq("article_key", articleKey),
    ]);
  }
  if (state.articleKey === articleKey) resetAll();
  rebuildDailyStatsFromSessions();
  savePracticeBackup();
  await pushCloudData(false);
  renderArticleLibrary();
  setImportStatus("文章及其云端背诵记录已删除。");
}

function isCloudV2Missing(error) {
  return /reciter_articles|reciter_sessions|schema cache|does not exist/i.test(error?.message || "");
}

function limitArticleProgress(progress) {
  return Object.fromEntries(Object.entries(normalizeArticleProgress(progress))
    .sort((left, right) => String(right[1].updatedAt).localeCompare(String(left[1].updatedAt))));
}

function saveDailyStats() {
  localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(state.dailyStats));
  savePracticeBackup();
  scheduleDailyStatsServerSave();
}

function loadDailyStatsStartDate() {
  const stored = localStorage.getItem(DAILY_STATS_START_KEY);
  if (isDateKey(stored)) return stored;
  const firstRecordedDate = Object.keys(state.dailyStats).filter(isDateKey).sort()[0];
  return firstRecordedDate || localDateKey();
}

function saveDailyStatsStartDate() {
  if (!isDateKey(state.dailyStatsStartDate)) state.dailyStatsStartDate = localDateKey();
  localStorage.setItem(DAILY_STATS_START_KEY, state.dailyStatsStartDate);
  scheduleDailyStatsServerSave();
}

function canSyncDailyStatsToServer() {
  return isLoopbackHost();
}

function isStaticPublicHost() {
  return /(?:^|\.)(github\.io|pages\.dev|netlify\.app|vercel\.app)$/i.test(window.location.hostname);
}

function isLoopbackHost() {
  return /^(?:127\.0\.0\.1|localhost|\[::1\])$/.test(window.location.hostname);
}

function scheduleDailyStatsServerSave() {
  if (!canSyncDailyStatsToServer()) return;
  window.clearTimeout(dailyStatsSaveTimer);
  dailyStatsSaveTimer = window.setTimeout(saveDailyStatsToServer, 250);
}

async function saveDailyStatsToServer() {
  if (!canSyncDailyStatsToServer()) return;
  try {
    await fetch("/api/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dailyStats: state.dailyStats,
        dailyStatsStartDate: state.dailyStatsStartDate,
        articleProgress: state.articleProgress,
        urlHistory: state.urlHistory,
      }),
    });
  } catch {
    // LocalStorage already has a copy; the next successful page load can sync it again.
  }
}

async function loadDailyStatsFromServer() {
  if (!canSyncDailyStatsToServer()) return;
  try {
    const response = await fetch("/api/state");
    if (!response.ok) return;
    const data = await response.json();
    const serverStats = normalizeDailyStats(data.dailyStats);
    state.dailyStats = mergeDailyStats(state.dailyStats, serverStats);
    state.articleProgress = mergeArticleProgress(state.articleProgress, normalizeArticleProgress(data.articleProgress));
    state.urlHistory = mergeUrlHistory(state.urlHistory, normalizeUrlHistory(data.urlHistory));
    state.dailyStatsStartDate = earliestDateKey([
      state.dailyStatsStartDate,
      isDateKey(data.dailyStatsStartDate) ? data.dailyStatsStartDate : "",
      ...Object.keys(state.dailyStats),
    ]) || localDateKey();
    pruneDailyStats();
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(state.dailyStats));
    localStorage.setItem(DAILY_STATS_START_KEY, state.dailyStatsStartDate);
    localStorage.setItem(ARTICLE_PROGRESS_KEY, JSON.stringify(state.articleProgress));
    localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(state.urlHistory));
    renderUrlHistory();
    if (state.articleKey) {
      applyStoredArticleProgress();
      renderArticle();
    }
    renderDailyStats();
    scheduleDailyStatsServerSave();
  } catch {
    // Keep the browser copy if the local server is temporarily unavailable.
  }
}

function mergeDailyStats(localStats, serverStats) {
  const merged = { ...normalizeDailyStats(serverStats) };
  Object.entries(normalizeDailyStats(localStats)).forEach(([date, value]) => {
    const current = merged[date] || { sentences: 0, sessions: 0, words: 0 };
    merged[date] = {
      sentences: Math.max(current.sentences || 0, value.sentences || 0),
      sessions: Math.max(current.sessions || 0, value.sessions || 0),
      words: Math.max(current.words || 0, value.words || 0),
    };
  });
  return merged;
}

function mergeArticleProgress(localProgress, serverProgress) {
  const merged = { ...normalizeArticleProgress(serverProgress) };
  Object.entries(normalizeArticleProgress(localProgress)).forEach(([key, value]) => {
    const current = merged[key];
    if (!current || String(value.updatedAt).localeCompare(String(current.updatedAt)) >= 0) {
      merged[key] = value;
    }
  });
  return limitArticleProgress(merged);
}

function mergeUrlHistory(localUrls, importedUrls) {
  return normalizeUrlHistory([...normalizeUrlHistory(importedUrls), ...normalizeUrlHistory(localUrls)]);
}

function earliestDateKey(keys) {
  return keys.filter(isDateKey).sort()[0] || "";
}

function pruneDailyStats() {
  const keepDates = new Set(Array.from({ length: 365 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return localDateKey(date);
  }));

  Object.keys(state.dailyStats).forEach((date) => {
    if (!keepDates.has(date)) delete state.dailyStats[date];
  });
}

function renderDailyStats() {
  const today = localDateKey();

  const summaryRows = Array.from({ length: 2 }, (_, offset) => {
    const date = addDays(new Date(), -offset);
    const key = localDateKey(date);
    const value = state.dailyStats[key] || { sentences: 0, sessions: 0 };
    const label = offset === 0 ? "今天" : offset === 1 ? "昨天" : `${date.getMonth() + 1}/${date.getDate()}`;
    return { key, value, label };
  });

  const visibleRows = summaryRows.map(renderDailyStatRow).join("");
  const calendarDays = dailyStatsCalendarDays();
  const maxSentences = Math.max(1, ...calendarDays.map(({ value }) => value.sentences || 0));
  const leadingBlanks = dateFromKey(calendarDays[0]?.key || today).getDay();
  const blanks = Array.from({ length: leadingBlanks }, () => `<span class="calendar-blank"></span>`).join("");
  const selectedKey = state.selectedDailyStatsDate || today;
  const calendarCells = calendarDays.map(({ key, value }) => renderDailyCalendarCell(key, value, maxSentences, selectedKey)).join("");
  const selectedValue = state.dailyStats[selectedKey] || { sentences: 0, sessions: 0 };
  const toggleText = state.dailyStatsExpanded ? "收起日历统计" : "查看日历统计";
  els.dailyStatsList.innerHTML = `
    ${visibleRows}
    <button class="daily-stats-toggle" type="button" data-daily-stats-toggle>
      ${toggleText}
    </button>
    <div class="daily-stats-calendar" ${state.dailyStatsExpanded ? "" : "hidden"}>
      <div class="daily-calendar-title">
        <span>最近练习日历</span>
        <small>颜色越深，背的句子越多</small>
      </div>
      <div class="daily-calendar-weekdays" aria-hidden="true">
        <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
      </div>
      <div class="daily-calendar-grid" aria-label="每日背诵热力图">
        ${blanks}${calendarCells}
      </div>
      <div class="daily-calendar-legend" aria-hidden="true">
        <span>少</span>
        <i></i><i></i><i></i><i></i>
        <span>多</span>
      </div>
      <p class="daily-calendar-detail" data-daily-calendar-detail>
        ${formatCalendarDetail(selectedKey, selectedValue)}
      </p>
    </div>
  `;
}

function renderDailyStatRow({ key, value, label }) {
  return `
    <div class="daily-stat-row" data-date="${key}">
      <span>${label}</span>
      <strong>${value.sentences || 0} 句</strong>
      <em>${value.sessions || 0} 次 · ${value.words || 0} 词</em>
    </div>
  `;
}

function dailyStatsCalendarDays() {
  const today = localDateKey();
  const minimumStart = localDateKey(addDays(new Date(), -27));
  const storedStart = isDateKey(state.dailyStatsStartDate) ? state.dailyStatsStartDate : today;
  const start = storedStart < minimumStart ? storedStart : minimumStart;
  return datesBetween(start, today).map((key) => ({
    key,
    value: state.dailyStats[key] || { sentences: 0, sessions: 0 },
  }));
}

function renderDailyCalendarCell(key, value, maxSentences, selectedKey) {
  const sentences = value.sentences || 0;
  const level = sentences ? Math.max(0.2, sentences / maxSentences) : 0;
  const label = `${formatCalendarDateLabel(key)}，${sentences} 句，${value.sessions || 0} 次，${value.words || 0} 词`;
  const levelStyle = sentences ? `style="--level: ${level.toFixed(2)}"` : "";
  const todayClass = key === localDateKey() ? " today" : "";
  return `
    <button
      class="daily-calendar-cell${key === selectedKey ? " selected" : ""}${todayClass}"
      type="button"
      data-calendar-date="${key}"
      ${levelStyle}
      aria-label="${label}"
      title="${label}"
    >
      <span>${shortCalendarCellLabel(key)}</span>
    </button>
  `;
}

function formatCalendarDetail(key, value) {
  return `${formatCalendarDateLabel(key)}：${value.sentences || 0} 句，${value.sessions || 0} 次，${value.words || 0} 词`;
}

function shortCalendarCellLabel(key) {
  const date = dateFromKey(key);
  return date.getDate() === 1 ? `${date.getMonth() + 1}/1` : String(date.getDate());
}

function formatCalendarDateLabel(key) {
  const date = dateFromKey(key);
  const today = localDateKey();
  const yesterday = localDateKey(addDays(new Date(), -1));
  if (key === today) return "今天";
  if (key === yesterday) return "昨天";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function handleDailyStatsClick(event) {
  const toggle = event.target.closest("[data-daily-stats-toggle]");
  if (toggle) {
    state.dailyStatsExpanded = !state.dailyStatsExpanded;
    if (!state.selectedDailyStatsDate) state.selectedDailyStatsDate = localDateKey();
    renderDailyStats();
    return;
  }

  const cell = event.target.closest("[data-calendar-date]");
  if (!cell) return;
  state.selectedDailyStatsDate = cell.dataset.calendarDate;
  document.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.classList.toggle("selected", button === cell);
  });
  const detail = els.dailyStatsList.querySelector("[data-daily-calendar-detail]");
  const value = state.dailyStats[state.selectedDailyStatsDate] || { sentences: 0, sessions: 0 };
  if (detail) detail.textContent = formatCalendarDetail(state.selectedDailyStatsDate, value);
}

function jumpToRecognizedRange(event) {
  const source = event?.currentTarget || els.floatingJumpBtn;
  const sentence = Number(source.dataset.sentence || els.floatingJumpBtn.dataset.sentence);
  if (!sentence) return;
  const target = document.querySelector(`#sentence-${sentence}`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("target-sentence");
  window.setTimeout(() => target.classList.remove("target-sentence"), 1800);
}

function startReplayDrag(event) {
  if (els.replayDock.hidden) return;
  event.preventDefault();
  els.replayDock.setPointerCapture(event.pointerId);
  els.replayDock.classList.add("dragging");

  const rect = els.replayDock.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;

  const move = (moveEvent) => {
    const nextLeft = moveEvent.clientX - offsetX;
    const nextTop = moveEvent.clientY - offsetY;
    placeFloatingElement(els.replayDock, nextLeft, nextTop);
  };

  const stop = () => {
    els.replayDock.classList.remove("dragging");
    els.replayDock.removeEventListener("pointermove", move);
    els.replayDock.removeEventListener("pointerup", stop);
    els.replayDock.removeEventListener("pointercancel", stop);
  };

  els.replayDock.addEventListener("pointermove", move);
  els.replayDock.addEventListener("pointerup", stop);
  els.replayDock.addEventListener("pointercancel", stop);
}

function showNextWordHint() {
  if (!state.sentences.length) {
    setNextHintText("请先导入文章。");
    return;
  }

  const records = expectedSurfaceWordRecords();
  const startIndex = currentHintWordIndex();
  const nextWords = records
    .filter((record) => record.end > startIndex)
    .slice(0, 4)
    .map((record) => record.text);

  if (!nextWords.length) {
    setNextHintText("已经到文章末尾。");
    return;
  }

  setNextHintText(`下 4 词：${nextWords.join(" ")}`);
}

function currentHintWordIndex() {
  const matchedIndexes = state.comparison?.correctExpectedIndexes;
  if (matchedIndexes?.size) return Math.max(...matchedIndexes) + 1;
  if (state.comparison?.activeRange) return state.comparison.activeRange.start;
  return 0;
}

function expectedSurfaceWordRecords() {
  const records = [];
  let cursor = 0;
  const regex = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

  state.sentences.forEach((sentence) => {
    let match;
    while ((match = regex.exec(sentence.english))) {
      const text = match[0];
      const expandedLength = expandContraction(text.toLowerCase()).length;
      records.push({ text, start: cursor, end: cursor + expandedLength });
      cursor += expandedLength;
    }
  });

  return records;
}

function wordsFromText(text) {
  return (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [])
    .flatMap((word) => expandContraction(word));
}

function expandContraction(word) {
  return word
    .replace(/'m$/, " am")
    .replace(/'re$/, " are")
    .replace(/'ve$/, " have")
    .replace(/n't$/, " not")
    .replace(/'ll$/, " will")
    .replace(/'d$/, " would")
    .split(" ");
}

function getSupportedMimeType() {
  if (!window.MediaRecorder?.isTypeSupported) return "";

  const safariTypes = [
    "video/mp4;codecs=h264,aac",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
  ];
  const webTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const types = isAppleMobileSafari() ? [...safariTypes, ...webTypes] : [...webTypes, ...safariTypes];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function getRecordingFallbackMimeType() {
  return isAppleMobileSafari() ? "video/mp4" : "video/webm";
}

function recordingFileExtension(mimeType) {
  return /mp4/i.test(mimeType || "") ? "mp4" : "webm";
}

function resetReplayAudioState() {
  try {
    els.replayVideo.muted = false;
    els.replayVideo.volume = 1;
    els.replayVideo.defaultPlaybackRate = 1;
    els.replayVideo.playbackRate = 1;
  } catch {
    // Some iPadOS media properties are restricted; keep playback available.
  }
}

function primeReplayAudioOnPlay() {
  resetReplayAudioState();
  primeReplayAudioForSafari();
  if (!isAppleMobileSafari()) return;

  clearReplayAudioPrimeTimers();
  [350, 1200, 3000, 7000].forEach((delay) => {
    const timer = window.setTimeout(() => {
      if (!els.replayVideo.paused && !els.replayVideo.ended) primeReplayAudioForSafari();
    }, delay);
    state.replayAudioPrimeTimers.push(timer);
  });
}

function primeReplayAudioForSafari() {
  if (!isAppleMobileSafari() || !state.recordingUrl) return;

  const currentTime = Number.isFinite(els.replayVideo.currentTime) ? els.replayVideo.currentTime : 0;
  resetReplayAudioState();
  try {
    els.replayVideo.playbackRate = 1.01;
  } catch {
    return;
  }
  window.requestAnimationFrame(() => {
    resetReplayAudioState();
    if (Number.isFinite(currentTime) && currentTime > 0) {
      try {
        els.replayVideo.currentTime = Math.min(currentTime, els.replayVideo.duration || currentTime);
      } catch {
        // iPad Safari can reject seeking while metadata is still settling.
      }
    }
  });
}

function clearReplayAudioPrimeTimers() {
  state.replayAudioPrimeTimers.forEach((timer) => window.clearTimeout(timer));
  state.replayAudioPrimeTimers = [];
}

function isAppleMobileSafari() {
  const ua = navigator.userAgent || "";
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  return isAppleMobile && isSafari;
}

function clearReplayRecording({ status = "" } = {}) {
  clearReplayHighlight();
  clearReplayAudioPrimeTimers();
  state.replayCues = [];
  state.recordingStartedAt = 0;
  if (state.recordingUrl) URL.revokeObjectURL(state.recordingUrl);
  state.recordingUrl = "";
  state.recordingMimeType = "";
  state.recordedChunks = [];
  els.replayVideo.pause();
  els.replayVideo.removeAttribute("src");
  els.replayVideo.load();
  els.replayDock.hidden = true;
  els.downloadLink.removeAttribute("href");
  els.downloadLink.removeAttribute("download");
  els.downloadLink.hidden = true;
  if (status) setRecordStatus(status);
}

function loadReplayVideo(url) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      els.replayVideo.removeEventListener("loadedmetadata", handleReady);
      els.replayVideo.removeEventListener("canplay", handleReady);
      els.replayVideo.removeEventListener("error", handleError);
    };
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleReady = () => finish(resolve);
    const handleError = () => finish(reject);
    const timer = window.setTimeout(handleError, 6000);

    els.replayVideo.pause();
    els.replayVideo.removeAttribute("src");
    els.replayVideo.load();
    resetReplayAudioState();
    els.replayVideo.addEventListener("loadedmetadata", handleReady);
    els.replayVideo.addEventListener("canplay", handleReady);
    els.replayVideo.addEventListener("error", handleError);
    els.replayVideo.src = url;
    els.replayVideo.load();
  });
}

function setImportStatus(message) {
  els.importStatus.textContent = message;
}

function setRecordStatus(message) {
  els.recordStatus.textContent = message;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function resetAll() {
  stopMediaStream();
  clearReplayRecording();
  state.sentences = [];
  state.reciteCounts = [];
  state.wordHistory = [];
  state.articleKey = "";
  state.currentArticleMeta = null;
  state.comparison = null;
  state.finalTranscript = "";
  state.interimTranscript = "";
  state.lastRecognizedRange = null;
  state.pendingStatsRange = null;
  state.currentSessionCounted = false;
  els.pasteBox.value = "";
  localStorage.removeItem(CURRENT_ARTICLE_TEXT_KEY);
  els.fileInput.value = "";
  els.liveTranscript.textContent = "等待开始背诵。";
  setNextHintText("根据背诵位置提示");
  els.floatingResult.hidden = true;
  els.floatingTranscript.textContent = "暂无转写。";
  els.floatingJumpBtn.hidden = false;
  setImportStatus("");
  setRecordStatus("");
  renderArticle();
  renderArticleLibrary();
  syncFloatingControls();
}

state.articleProgress = loadArticleProgress();
state.urlHistory = loadUrlHistory();
state.dailyStats = loadDailyStats();
state.articles = loadArticleLibrary();
state.pendingSessions = loadPendingSessions();
state.dailyStatsStartDate = loadDailyStatsStartDate();
state.selectedDailyStatsDate = localDateKey();
pruneDailyStats();
localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(state.dailyStats));
localStorage.setItem(DAILY_STATS_START_KEY, state.dailyStatsStartDate);
savePracticeBackup();
renderDailyStats();
renderUrlHistory();
renderArticleLibrary();
const savedArticleText = localStorage.getItem(CURRENT_ARTICLE_TEXT_KEY);
if (savedArticleText) {
  els.pasteBox.value = savedArticleText;
  parseArticle(savedArticleText, { persist: true, status: false, preserveTimestamps: true });
  setImportStatus("已恢复上次导入的文章和累计纠错记录。");
} else {
  renderArticle();
}
importPracticeDataFromHash();
loadDailyStatsFromServer();
initCloudSync();
populateDeviceOptions();
syncFloatingControls();
window.addEventListener("pagehide", savePracticeBackup);
window.addEventListener("online", async () => {
  await flushPendingSessions();
  await syncCloudV2();
});
window.addEventListener("focus", refreshCloudSession);
window.addEventListener("storage", (event) => {
  if (event.key?.startsWith("sb-")) refreshCloudSession();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.cloudSession?.user) syncCloudV2();
});
if ("serviceWorker" in navigator && !isLoopbackHost()) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
