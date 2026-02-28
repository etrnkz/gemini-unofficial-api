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

Each RPC call has a 6-character ID (e.g. `MaZiqc` for list chats, `CNgdBe` for list gems). The body is `f.req=[[rpcId, payload, null, 'generic']]` with an `at` parameter containing the `SNlM0e` token.

Requires `SNlM0e` token from the authenticated page HTML — only present when valid Google cookies are sent.

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
