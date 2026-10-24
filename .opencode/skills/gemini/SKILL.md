---
name: gemini
description: Ask Google Gemini for second opinions, complex reasoning, code reviews, image/video analysis, or generate videos with Google Veo. Works with or without Google login cookies.
---

# Google Gemini

Unofficial Google Gemini integration for OpenCode.

## Capabilities
- Ask Gemini questions, second opinions, and reasoning tasks (`gemini-3.5-flash`, `gemini-3.1-pro`, `gemini-auto`, `gemini-flash-lite`).
- Send files (images, videos, PDFs, code, audio) to Gemini for multimodal analysis.
- Generate high-quality 720p videos using Google Veo when authenticated with cookies.
- Multi-account management and automatic account rotation.

## Tools
- `gemini_ask`: Send a prompt to Gemini.
- `gemini_ask_with_file`: Send a prompt with a local file attachment.
- `gemini_generate_video`: Generate a video with Google Veo and poll until ready.
- `gemini_download_file`: Download media or CDN files to disk.
- `gemini_list_models`: View supported models.
- `gemini_list_accounts`: View configured accounts.
- `gemini_switch_account`: Switch active account.

## Setup
Save your Google cookies in `cookies.json`:
```json
{
  "__Secure-1PSID": "...",
  "__Secure-1PSIDTS": "..."
}
```
Or use guest mode without any cookies.
