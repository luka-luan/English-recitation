#!/usr/bin/env python3
import json
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
MAX_BODY_BYTES = 16 * 1024
YTDLP_TIMEOUT_SECONDS = 90


class ReciterHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urlparse(path)
        clean_path = unquote(parsed.path).lstrip("/") or "index.html"
        return str((ROOT / clean_path).resolve())

    def do_POST(self):
        if urlparse(self.path).path != "/api/subtitles":
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
        if self.path.startswith("/api/"):
            self.send_header("access-control-allow-origin", "http://127.0.0.1:4173")
        super().end_headers()


class SubtitleError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def is_supported_url(url):
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


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
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    useful = [line for line in lines if line.lower().startswith(("error:", "warning:", "[youtube]", "[bilibili]", "[info]"))]
    message = "\n".join(useful[-6:] or lines[-6:])
    message = re.sub(r"\s+", " ", message).strip()
    return message or "yt-dlp 没有返回可用字幕。"


def main():
    os.chdir(ROOT)
    mimetypes.add_type("text/javascript", ".js")
    server = ThreadingHTTPServer(("127.0.0.1", 4173), ReciterHandler)
    print("英语背诵工作台已启动：http://127.0.0.1:4173/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
