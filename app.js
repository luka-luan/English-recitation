const state = {
  sentences: [],
  hideMode: "none",
  mediaStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  recognition: null,
  finalTranscript: "",
  interimTranscript: "",
  comparison: null,
  reciteCounts: [],
  importingUrl: false,
  recordingUrl: "",
  isRecording: false,
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  sourceUrl: document.querySelector("#sourceUrl"),
  importUrlBtn: document.querySelector("#importUrlBtn"),
  pasteBox: document.querySelector("#pasteBox"),
  parseBtn: document.querySelector("#parseBtn"),
  translateBtn: document.querySelector("#translateBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  jumpRecordBtn: document.querySelector("#jumpRecordBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  importStatus: document.querySelector("#importStatus"),
  articleList: document.querySelector("#articleList"),
  sentenceCount: document.querySelector("#sentenceCount"),
  wordCount: document.querySelector("#wordCount"),
  compactToggle: document.querySelector("#compactToggle"),
  nextHintBtn: document.querySelector("#nextHintBtn"),
  nextHintText: document.querySelector("#nextHintText"),
  cameraPreview: document.querySelector("#cameraPreview"),
  cameraSelect: document.querySelector("#cameraSelect"),
  micSelect: document.querySelector("#micSelect"),
  refreshDevicesBtn: document.querySelector("#refreshDevicesBtn"),
  recordSection: document.querySelector("#recordSection"),
  cameraBtn: document.querySelector("#cameraBtn"),
  recordBtn: document.querySelector("#recordBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  recordStatus: document.querySelector("#recordStatus"),
  downloadLink: document.querySelector("#downloadLink"),
  manualTranscript: document.querySelector("#manualTranscript"),
  scoreManualBtn: document.querySelector("#scoreManualBtn"),
  liveTranscript: document.querySelector("#liveTranscript"),
  replayDock: document.querySelector("#replayDock"),
  replayVideo: document.querySelector("#replayVideo"),
  replayBackBtn: document.querySelector("#replayBackBtn"),
  floatingResult: document.querySelector("#floatingResult"),
  floatingRange: document.querySelector("#floatingRange"),
  floatingMeta: document.querySelector("#floatingMeta"),
  floatingTranscript: document.querySelector("#floatingTranscript"),
  floatingJumpBtn: document.querySelector("#floatingJumpBtn"),
};

const sampleText = `The first step toward confidence is not speaking perfectly. It is being willing to speak before everything feels ready.

When we memorize a passage, we are training more than memory. We are training attention, rhythm, and courage.

A sentence becomes easier to remember when we understand its shape. We notice where it rises, where it turns, and where it lands.

If we make a mistake, we do not need to panic. We can pause, breathe, and return to the next clear word.`;

els.fileInput.addEventListener("change", handleFileChange);
els.importUrlBtn.addEventListener("click", handleUrlImport);
els.sourceUrl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleUrlImport();
});
els.parseBtn.addEventListener("click", () => parseArticle(els.pasteBox.value));
els.translateBtn.addEventListener("click", translateMissingLines);
els.sampleBtn.addEventListener("click", () => {
  els.pasteBox.value = sampleText;
  parseArticle(sampleText);
});
els.jumpRecordBtn.addEventListener("click", () => {
  els.recordSection.scrollIntoView({ behavior: "smooth", block: "start" });
  els.cameraBtn.focus({ preventScroll: true });
});
els.resetBtn.addEventListener("click", resetAll);
els.compactToggle.addEventListener("change", () => {
  els.articleList.classList.toggle("compact", els.compactToggle.checked);
});
els.cameraBtn.addEventListener("click", startCamera);
els.refreshDevicesBtn.addEventListener("click", populateDeviceOptions);
els.recordBtn.addEventListener("click", startRecitation);
els.stopBtn.addEventListener("click", stopRecitation);
els.scoreManualBtn.addEventListener("click", scoreManualTranscript);
els.nextHintBtn.addEventListener("click", showNextWordHint);
els.cameraPreview.addEventListener("pointerdown", startCameraDrag);
els.replayVideo.addEventListener("pointerdown", startReplayDrag);
els.replayBackBtn.addEventListener("click", skipReplayBack);
els.floatingJumpBtn.addEventListener("click", jumpToRecognizedRange);

document.querySelectorAll("[data-hide-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.hideMode = button.dataset.hideMode;
    document.querySelectorAll("[data-hide-mode]").forEach((item) => item.classList.toggle("active", item === button));
    renderArticle();
  });
});

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  setImportStatus(`正在读取 ${file.name}...`);
  try {
    const text = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      ? await readPdf(file)
      : await file.text();
    els.pasteBox.value = text.trim();
    parseArticle(text);
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

  if (isLikelyVideoUrl(url)) {
    const loaded = await importVideoSubtitles(url);
    if (loaded) return;
  }

  setImportStatus("正在尝试读取链接...");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`链接返回 ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text();
    const text = contentType.includes("html") ? htmlToReadableText(raw) : raw;
    els.pasteBox.value = text.trim();
    parseArticle(text);
  } catch {
    const loaded = await importVideoSubtitles(url, "网页读取失败，正在尝试用本地 yt-dlp 识别字幕...");
    if (loaded) return;
    setImportStatus("链接读取失败，也没有提取到视频字幕。可以复制正文/字幕文本到输入框，或导入 .srt/.vtt 字幕文件。");
  }
}

async function importVideoSubtitles(url, message = "正在用本地 yt-dlp 提取视频字幕...") {
  setUrlLoading(true);
  setImportStatus(message);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 100000);
  const progressId = window.setTimeout(() => {
    setImportStatus("还在提取字幕，YouTube 有时需要 10-60 秒，请稍等...");
  }, 8000);

  try {
    const response = await fetch("/api/subtitles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "字幕提取失败。");
    els.pasteBox.value = data.text.trim();
    parseArticle(data.text);
    setImportStatus(`已从视频字幕生成 ${state.sentences.length} 句。字幕轨道：${data.track}`);
    return true;
  } catch (error) {
    const message = error.name === "AbortError"
      ? "字幕提取超时了。可以再试一次，或换一个带字幕的视频。"
      : `${error.message} 可以换一个带字幕的视频，或导入 .srt/.vtt 字幕文件。`;
    setImportStatus(message);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
    window.clearTimeout(progressId);
    setUrlLoading(false);
  }
}

function setUrlLoading(isLoading) {
  state.importingUrl = isLoading;
  els.importUrlBtn.disabled = isLoading;
  els.sourceUrl.disabled = isLoading;
  els.importUrlBtn.textContent = isLoading ? "提取中..." : "读取链接";
  els.importUrlBtn.setAttribute("aria-busy", String(isLoading));
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

function parseArticle(rawText) {
  const cleanedText = cleanImportedText(rawText);
  const text = normalizeWhitespace(cleanedText);
  if (!text) {
    setImportStatus("请先导入或粘贴一篇英文文章。");
    return;
  }

  state.sentences = buildSmartSentencePairs(cleanedText);
  state.reciteCounts = Array(state.sentences.length).fill(0);
  state.comparison = null;
  state.finalTranscript = "";
  state.interimTranscript = "";
  els.liveTranscript.textContent = "等待开始背诵。";
  els.floatingResult.hidden = true;
  renderArticle();
  els.recordBtn.disabled = !state.mediaStream;
  setImportStatus(`已生成 ${state.sentences.length} 句。已自动识别英文和中文。`);
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
    return;
  }

  els.articleList.className = `article-list${els.compactToggle.checked ? " compact" : ""}`;
  els.articleList.innerHTML = "";

  state.sentences.forEach((sentence, index) => {
    const card = document.createElement("article");
    card.className = "sentence-card";
    card.id = `sentence-${index + 1}`;

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

    body.append(english, translation);
    card.append(number, body);
    els.articleList.append(card);
  });

  updateMetrics();
  applyHideMode();
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
      const classes = ["word"];
      if (wordState) classes.push(wordState);
      if (shouldHideToken(surfaceWordOrder, "word")) classes.push("hidden-text");
      return `<span class="${classes.join(" ")}" data-word-order="${surfaceWordOrder}">${escapeHtml(record.value)}</span>`;
    })
    .join("");
}

function shouldHideToken(wordOrder, type) {
  if (state.hideMode === "en") return true;
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
    els.recordBtn.disabled = !state.sentences.length;
    els.cameraBtn.textContent = "摄像头已开启";
    setRecordStatus(`摄像头和麦克风已就绪。当前麦克风：${activeAudioLabel()}。`);
  } catch (error) {
    document.body.classList.remove("camera-active");
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
  state.isRecording = true;
  renderArticle();
  els.downloadLink.hidden = true;
  els.floatingResult.hidden = true;
  els.replayDock.hidden = true;
  els.nextHintText.textContent = "开始背后，可点击提示下 4 词。";

  const mimeType = getSupportedMimeType();
  state.mediaRecorder = new MediaRecorder(state.mediaStream, mimeType ? { mimeType } : undefined);
  state.mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) state.recordedChunks.push(event.data);
  });
  state.mediaRecorder.addEventListener("stop", finishRecording);
  state.mediaRecorder.start();

  startSpeechRecognition();
  els.recordBtn.disabled = true;
  els.stopBtn.disabled = false;
  setRecordStatus("正在录制和识别。背完后点“结束并评分”。");
}

function stopRecitation() {
  state.isRecording = false;
  if (state.mediaRecorder?.state === "recording") state.mediaRecorder.stop();
  if (state.recognition) state.recognition.stop();
  stopMediaStream();
  els.recordBtn.disabled = true;
  els.stopBtn.disabled = true;
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
  els.cameraBtn.textContent = "开启摄像头";
  els.recordBtn.disabled = true;
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

function finishRecording() {
  const blob = new Blob(state.recordedChunks, { type: state.mediaRecorder?.mimeType || "video/webm" });
  if (state.recordingUrl) URL.revokeObjectURL(state.recordingUrl);
  const url = URL.createObjectURL(blob);
  state.recordingUrl = url;
  els.downloadLink.href = url;
  els.downloadLink.download = `recitation-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`;
  els.downloadLink.hidden = false;
  els.downloadLink.textContent = "下载录像";
  els.replayVideo.src = url;
  els.replayDock.hidden = false;
}

function skipReplayBack() {
  if (!Number.isFinite(els.replayVideo.duration) && !els.replayVideo.currentTime) return;
  els.replayVideo.currentTime = Math.max(0, els.replayVideo.currentTime - 5);
}

function startSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setRecordStatus("当前浏览器不支持语音识别。录像仍会保存，但无法自动评分。建议用 Chrome。");
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.addEventListener("result", (event) => {
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
  });

  recognition.addEventListener("end", () => {
    if (state.isRecording && state.mediaRecorder?.state === "recording") {
      try {
        recognition.start();
      } catch {
        // Some browsers briefly reject restart while the previous recognition session closes.
      }
    }
  });

  recognition.addEventListener("error", (event) => {
    setRecordStatus(`语音识别暂停：${event.error}。录像仍在继续。`);
  });

  state.recognition = recognition;
  recognition.start();
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
      renderResult();
      setRecordStatus("还没有识别到可评分的英文。可以回看录像，或把转写粘到手动评分框。");
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

  if (showResult) {
    incrementReciteCounts(activeRange);
  }

  state.comparison = { correctExpectedIndexes, missedExpectedIndexes, extras, accuracy, activeRange };
  renderArticle();
  updateMetrics();

  if (showResult) {
    renderResult();
    const rangeLabel = sentenceRangeLabel(activeRange);
    setRecordStatus(`评分完成：${accuracy}% 准确率。${rangeLabel}绿色是背对的词，红色是这一段里漏掉或顺序不对的词。`);
  }
}

function scoreManualTranscript() {
  if (!state.sentences.length) {
    setRecordStatus("请先导入文章。");
    return;
  }

  state.finalTranscript = els.manualTranscript.value.trim();
  state.interimTranscript = "";
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

function incrementReciteCounts(activeRange) {
  const sentenceRange = activeSentenceRange(activeRange);
  if (!sentenceRange) return;
  for (let sentence = sentenceRange.start; sentence <= sentenceRange.end; sentence += 1) {
    const index = sentence - 1;
    state.reciteCounts[index] = (state.reciteCounts[index] || 0) + 1;
  }
}

function activeSentenceRange(activeRange) {
  const ranges = sentenceWordRanges().filter((item) => activeRange.start < item.end && activeRange.end > item.start);
  if (!ranges.length) return null;
  return {
    start: ranges[0].sentenceIndex + 1,
    end: ranges[ranges.length - 1].sentenceIndex + 1,
  };
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
    els.nextHintText.textContent = "请先导入文章。";
    return;
  }

  const records = expectedSurfaceWordRecords();
  const startIndex = currentHintWordIndex();
  const nextWords = records
    .filter((record) => record.end > startIndex)
    .slice(0, 4)
    .map((record) => record.text);

  if (!nextWords.length) {
    els.nextHintText.textContent = "已经到文章末尾。";
    return;
  }

  els.nextHintText.textContent = `下 4 词：${nextWords.join(" ")}`;
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
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type));
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
  if (state.recordingUrl) URL.revokeObjectURL(state.recordingUrl);
  state.recordingUrl = "";
  state.sentences = [];
  state.reciteCounts = [];
  state.comparison = null;
  state.finalTranscript = "";
  state.interimTranscript = "";
  els.pasteBox.value = "";
  els.fileInput.value = "";
  els.liveTranscript.textContent = "等待开始背诵。";
  els.nextHintText.textContent = "根据实时识别位置提示。";
  els.replayVideo.removeAttribute("src");
  els.replayVideo.load();
  els.replayDock.hidden = true;
  els.floatingResult.hidden = true;
  els.floatingTranscript.textContent = "暂无转写。";
  els.floatingJumpBtn.hidden = false;
  setImportStatus("");
  setRecordStatus("");
  renderArticle();
}

renderArticle();
populateDeviceOptions();
