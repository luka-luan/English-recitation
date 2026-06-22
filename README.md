# 英语背诵工作台

一个支持跨设备同步的英语背诵应用，用来导入文章、按句背诵、录制摄像头画面，并把转写和原文做单词级对照。

## 使用

### 本机使用

```bash
cd /Users/yuzhuluan/Documents/codex/english-reciter
python3 server.py
```

然后打开：

```text
http://127.0.0.1:4173/
```

`127.0.0.1` 只代表自己的电脑，不能直接发给别人访问。

### 手机和其他电脑使用

推荐先用 GitHub Pages 发布一个公开 HTTPS 链接：

```text
https://luka-luan.github.io/English-recitation/
```

GitHub Pages 是日常主站。登录同一个云同步邮箱后，文章、每日统计、背诵次数和红绿纠错记录会通过 Supabase 自动同步。

第一次启用新版云同步时，在 Supabase SQL Editor 运行仓库里的 [`supabase-v2.sql`](./supabase-v2.sql)。然后在 Supabase Authentication 的 URL Configuration 中加入：

```text
https://luka-luan.github.io/English-recitation/**
https://english-recitation.onrender.com/**
http://127.0.0.1:4173/**
```

登录使用邮箱数字验证码（兼容 6–10 位）。在 Supabase Authentication → Email Templates 中，把 **Magic Link** 和 **Confirm signup** 模板都替换为 [`supabase-email-otp-template.html`](./supabase-email-otp-template.html) 的内容。模板必须包含 `{{ .Token }}`，不要保留 `{{ .ConfirmationURL }}`，否则邮件仍会发送跳转链接。

手机可以把 GitHub Pages 页面“添加到主屏幕”，安装后名称显示为“英语背诵”。

如果要保留完整后端功能，可以部署到 Render：

1. 在 Render 新建 Web Service，连接这个 GitHub 仓库。
2. Render 会读取 `render.yaml`。
3. 部署成功后会得到一个 `https://...onrender.com` 网址，可以直接发给别人。

Render 仅作为公网字幕备用接口。它要求先登录 Supabase，免费服务可能休眠，而且部分 YouTube 视频会限制云服务器访问。本机 `127.0.0.1` 仍是最可靠的字幕导入入口。

## 功能

- 导入 `.txt`、`.md`、`.pdf`、`.srt` 和 `.vtt` 文件，也可以直接粘贴文章。
- 自动把英文文章拆成“第 1 句、第 2 句……”。
- 自动识别常见中英混排：英文在前中文在后、中文在前英文在后、中英交替行。
- 可以尝试读取文章网页或字幕链接；视频平台链接受浏览器跨域限制时，需要导入字幕文件或粘贴字幕文本。
- 安装 `yt-dlp` 后，可以输入视频链接，由本地服务提取视频自带字幕。
- 电脑导入的文章会立即进入云端文章库，手机可以搜索并继续背诵。
- 每次评分保存为唯一会话；断网时先排队，联网后自动补传且不会重复计数。
- 支持显示英文、隐藏英文。
- 支持摄像头和麦克风录制，结束后可下载 `.webm` 录像。
- 使用浏览器语音识别实时转写，并在结束后标出正确、漏背和多背的词。
- 如果语音识别不可用，可以把转写文本粘贴到手动评分框。

## 注意

- 摄像头、麦克风和语音识别建议在 Chrome 或 Edge 中使用。
- PDF 解析依赖在线加载 PDF.js；如果网络不可用，可以先复制 PDF 文字再粘贴。
- 自动翻译依赖浏览器是否提供内置 Translator API；不可用时可导入自带中文的文本或字幕。
