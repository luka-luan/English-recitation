#!/usr/bin/env python3
import json
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
MAX_BODY_BYTES = 2 * 1024 * 1024
YTDLP_TIMEOUT_SECONDS = 90
STATE_PATH = ROOT / ".data" / "reciter-state.json"


class ReciterHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urlparse(path)
        clean_path = unquote(parsed.path).lstrip("/") or "index.html"
        return str((ROOT / clean_path).resolve())

    def do_POST(self):
        api_path = urlparse(self.path).path
        if api_path == "/api/state":
            try:
                payload = self.read_json_body()
                state = sanitize_state(payload)
                save_state(state)
                self.write_json(200, {"ok": True, **state})
            except Exception as error:
                self.write_json(500, {"ok": False, "message": f"统计保存失败：{error}"})
            return

        if api_path != "/api/subtitles":
            self.send_error(404, "Not found")
            return

        try:
            payload = self.read_json_body()
            url = payload.get("url", "").strip()
            if not is_supported_url(url):
                self.write_json(400, {"ok": False, "message": "请提供有效的视频链接。"})
                return

            result = extract_subtitles(url)
            self.write_json(200, {"ok": True, **result})
        except SubtitleError as error:
            self.write_json(error.status, {"ok": False, "message": str(error)})
        except Exception as error:
            self.write_json(500, {"ok": False, "message": f"字幕提取失败：{error}"})

    def read_json_body(self):
        length = int(self.headers.get("content-length", "0"))
        if length > MAX_BODY_BYTES:
            raise SubtitleError("请求太大。", 413)
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8") or "{}")

    def write_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("cache-control", "no-store, max-age=0")
        if self.path.startswith("/api/"):
            self.send_header("access-control-allow-origin", "http://127.0.0.1:4173")
        super().end_headers()

    def do_GET(self):
        if urlparse(self.path).path == "/api/state":
            self.write_json(200, {"ok": True, **load_state()})
            return
        super().do_GET()


class SubtitleError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def is_supported_url(url):
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def sanitize_state(payload):
    daily_stats = payload.get("dailyStats") if isinstance(payload, dict) else {}
    if not isinstance(daily_stats, dict):
        daily_stats = {}

    clean_stats = {}
    for date, value in daily_stats.items():
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(date)):
            continue
        if not isinstance(value, dict):
            continue
        clean_stats[str(date)] = {
            "sentences": safe_count(value.get("sentences")),
            "sessions": safe_count(value.get("sessions")),
            "words": safe_count(value.get("words")),
        }

    start_date = payload.get("dailyStatsStartDate") if isinstance(payload, dict) else ""
    if not isinstance(start_date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", start_date):
        start_date = sorted(clean_stats)[0] if clean_stats else ""

    return {
        "dailyStats": clean_stats,
        "dailyStatsStartDate": start_date,
        "articleProgress": sanitize_article_progress(payload.get("articleProgress") if isinstance(payload, dict) else {}),
        "urlHistory": sanitize_url_history(payload.get("urlHistory") if isinstance(payload, dict) else []),
    }


def sanitize_url_history(source):
    if not isinstance(source, list):
        return []

    clean_urls = []
    for value in source:
        url = str(value).strip()
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            continue
        if url in clean_urls:
            continue
        clean_urls.append(url[:2000])
        if len(clean_urls) >= 30:
            break

    return clean_urls


def sanitize_article_progress(source):
    if not isinstance(source, dict):
        return {}

    clean_progress = {}
    for key, value in source.items():
        if len(clean_progress) >= 20:
            break
        if not re.fullmatch(r"article-[a-z0-9]{6,16}", str(key)):
            continue
        if not isinstance(value, dict):
            continue

        clean_progress[str(key)] = {
            "reciteCounts": sanitize_count_list(value.get("reciteCounts"), 5000),
            "wordHistory": sanitize_word_history(value.get("wordHistory"), 30000),
            "updatedAt": sanitize_iso_text(value.get("updatedAt")),
        }

    return dict(sorted(
        clean_progress.items(),
        key=lambda item: item[1].get("updatedAt", ""),
        reverse=True,
    )[:20])


def sanitize_count_list(source, limit):
    if not isinstance(source, list):
        return []
    return [safe_count(item) for item in source[:limit]]


def sanitize_word_history(source, limit):
    if not isinstance(source, list):
        return []

    clean = []
    for item in source[:limit]:
        if not isinstance(item, dict):
            clean.append({"correct": 0, "missed": 0})
            continue
        clean.append({
            "correct": safe_count(item.get("correct")),
            "missed": safe_count(item.get("missed")),
        })
    return clean


def sanitize_iso_text(value):
    if not isinstance(value, str):
        return ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T[0-9:.]+Z?", value):
        return ""
    return value[:40]


def safe_count(value):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0
    return max(0, number)


def load_state():
    try:
        if not STATE_PATH.exists():
            return {"dailyStats": {}, "dailyStatsStartDate": "", "articleProgress": {}, "urlHistory": []}
        return sanitize_state(json.loads(STATE_PATH.read_text(encoding="utf-8")))
    except Exception:
        return {"dailyStats": {}, "dailyStatsStartDate": "", "articleProgress": {}, "urlHistory": []}


def save_state(state):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def extract_subtitles(url):
    ytdlp = shutil.which("yt-dlp")
    if not ytdlp:
        raise SubtitleError("本机还没有安装 yt-dlp。", 500)

    with tempfile.TemporaryDirectory(prefix="reciter-subs-") as temp_dir:
        output_template = str(Path(temp_dir) / "%(title).80s-%(id)s.%(ext)s")
        command = [
            ytdlp,
            "--ignore-config",
            "--no-playlist",
            "--skip-download",
            "--write-subs",
            "--write-auto-subs",
            "--sub-langs",
            "en.*,zh.*,zh-Hans,zh-Hant,zh-CN,zh-TW,zh,en",
            "--sub-format",
            "vtt/srt/best",
            "--convert-subs",
            "srt",
            "--output",
            output_template,
            url,
        ]

        completed = subprocess.run(
            command,
            cwd=temp_dir,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=YTDLP_TIMEOUT_SECONDS,
            check=False,
        )

        subtitle_files = sorted(Path(temp_dir).glob("*.srt")) + sorted(Path(temp_dir).glob("*.vtt"))
        if completed.returncode != 0 and not subtitle_files:
            raise SubtitleError(clean_ytdlp_output(completed.stdout), 502)
        if not subtitle_files:
            raise SubtitleError("没有找到可下载字幕。可以换一个带字幕的视频，或粘贴字幕文本。", 404)

        selected = choose_subtitle(subtitle_files)
        text = selected.read_text(encoding="utf-8", errors="ignore")
        return {
            "text": text,
            "track": selected.name,
            "tracks": [path.name for path in subtitle_files],
        }


def choose_subtitle(paths):
    priority = ["zh-Hans", "zh-CN", ".zh.", "zh-Hant", "zh-TW", ".en.", "en-US", "en-GB"]
    lowered = {path: path.name.lower() for path in paths}
    for token in priority:
        token = token.lower()
        for path, name in lowered.items():
            if token in name:
                return path
    return paths[0]


def clean_ytdlp_output(output):
    lowered = output.lower()
    if "sign in to confirm you’re not a bot" in lowered or "sign in to confirm you're not a bot" in lowered:
        return "YouTube 要求验证这次访问，服务器暂时无法提取该视频字幕。这是 YouTube 对云服务器的限制，可以稍后重试或导入 .srt/.vtt 字幕。"
    if "no subtitles" in lowered or "there are no subtitles" in lowered:
        return "该视频没有可下载的字幕轨道。"

    lines = [line.strip() for line in output.splitlines() if line.strip()]
    useful = [line for line in lines if line.lower().startswith(("error:", "warning:", "[youtube]", "[bilibili]", "[info]"))]
    message = "\n".join(useful[-6:] or lines[-6:])
    message = re.sub(r"\s+", " ", message).strip()
    return message or "yt-dlp 没有返回可用字幕。"


def main():
    parser = argparse.ArgumentParser(description="英语背诵工作台本地服务")
    parser.add_argument("--host", default=os.environ.get("RECITER_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("RECITER_PORT", "4173")))
    args = parser.parse_args()

    os.chdir(ROOT)
    mimetypes.add_type("text/javascript", ".js")
    server = ThreadingHTTPServer((args.host, args.port), ReciterHandler)
    display_host = "127.0.0.1" if args.host in {"0.0.0.0", "::"} else args.host
    print(f"英语背诵工作台已启动：http://{display_host}:{args.port}/", flush=True)
    if args.host == "0.0.0.0":
        print("同一 Wi-Fi 下可用本机局域网 IP 访问，例如：http://你的电脑IP:4173/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
