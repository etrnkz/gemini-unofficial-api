# Protocol

The client uses two endpoints:

## StreamGenerate

Used for text generation (guest mode and logged-in). Sends a POST to:

```
https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate
```

Parameters: `bl`, `hl`, `_reqid`, `rt=c`

The body contains a large fixed-position JSON array with the prompt and model config, serialized as `f.req`. Response is line-delimited JSON with the prefix `)]}'`.

## batchexecute

Used for all other operations (chats, gems, memory, settings, etc.). Sends a POST to:

```
https://gemini.google.com/_/BardChatUi/data/batchexecute
```

Parameters: `rpcids`, `bl`, `hl`, `_reqid`, `rt=c`, `source-path`

Each RPC call has a 6-character ID (e.g. `MaZiqc` for list chats, `CNgdBe` for list gems, `hNvQHb` for read chat, `otAQ7b` for list models). The body is `f.req=[[[rpcId, payload, null, 'generic']]]` with an `at` parameter containing the `SNlM0e` token.

> **Note:** the `f.req` value is **triple-nested**. The flat form `[[rpcId, ...]]` is rejected with HTTP 400, while `[[[rpcId, ...]]]` is accepted and returns `wrb.fr` results.

Requires `SNlM0e` token from the authenticated page HTML — only present when valid Google cookies are sent. The token prefix differs between sessions: guest sessions get `AOOh0...`, authenticated sessions get `AIaPT3...`.

## File upload

```
POST https://content-push.googleapis.com/upload
```

Headers: `X-Tenant-Id: bard-storage`, `Push-ID`

Body: multipart form with the file as a Blob. Returns a file ID string like `/contrib_service/ttl_1d/...`.

## Response structure

### Text extraction

The primary response array (`inner[4]`) holds text parts. Each part is `[id, [textDeltas]]`. The last delta in the last part is the final response text.

### Media extraction

`inner[12]` contains media references:

| Index | Content |
|-------|---------|
| `[0]` | Image-to-image generated images |
| `[1]` | Web search image results |
| `[6]` | Video references |
| `[7]` | Generated images |

Each media entry follows a pattern: `[id, [url, alt, ...]]` where the URL is typically at `[3][3]` of the inner structure.

## Video support

Video files use the same upload and StreamGenerate pipeline as images. The file is uploaded to `content-push.googleapis.com`, and the returned file ID is attached to the message payload in the same position as image file IDs. The model processes the video and returns analysis as text. Video references in the response are extracted from `inner[12][6]` and include URL, thumbnail, and duration when available.

## Video generation (Veo)

Video *generation* is a separate, asynchronous flow that requires an authenticated account with video generation entitlement.

1. **Request** — a `StreamGenerate` call with a video-generation prompt, sent using the **Flash-Lite model hash** (`8c46e95b1a07cecc`) in `inner[79]`. The numeric `mode` aliases map to chat models and reject video prompts with *"Sorry, something went wrong"*.

   The response contains a placeholder:
   > `I'm generating your video. This could take a few minutes, so check back to see when your video is ready.`

   The chat id is at `inner[1][0]` and the task id at `inner[2]["21"][0]`.

2. **Poll** — the chat is re-read with the `hNvQHb` RPC until the video appears. The video media entry lives at `body[3][2][0][0][0][0][0]`:

   | Index | Content |
   |-------|---------|
   | `[2]` | Filename (e.g. `video.mp4`) |
   | `[7][0]` | Direct CDN URL (`lh3.googleusercontent.com/gg/...`) |
   | `[7][1]` | Download URL (`contribution.usercontent.google.com/download?...`) |
   | `[11]` | MIME type (`video/mp4`) |

3. **Download** — the download URL requires the same Google session cookie; without it the server redirects to the Google Accounts sign-in page. The CDN host does not support HTTP range requests, so a failed transfer cannot be resumed.

### Model hashes

The `otAQ7b` RPC returns the server-side model table. Model identifiers are hashes, not names:

| Name | Hash |
|------|------|
| Flash-Lite | `8c46e95b1a07cecc` |
| Flash | `56fdd199312815e2` |
| Pro | `e6fa609c3fa255c0` |
| Argon | `95a4c0abcba24364` |
