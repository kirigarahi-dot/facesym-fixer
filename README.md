# FaceSymmetry Fixer (Render-ready Minimal API)

This is a minimal Express API intended to keep your **system prompt secret**.
It reads the prompt text from a **Render Secret File** instead of committing it to GitHub.

## Quick Start (Local)

```bash
npm install
cp .env.example .env
# Optional locally: create Portrait_Consultant_AI.txt and set PROMPT_PATH in .env
npm start
# -> http://localhost:8787/
```

## Render Deployment (with Secret Files)

1. Push this repo to GitHub (do **NOT** include your prompt file).
2. On Render: **New → Web Service → Connect GitHub repo**
   - Build Command: `npm install`
   - Start Command: `node server.js`
3. In the service **Settings → Secret Files**:
   - Add a file and paste your full prompt content.
   - Set **Mount Path** to: `/etc/secrets/Portrait_Consultant_AI.txt`
4. (Optional) In **Environment** add:
   - `PORT=8787`
   - `PROMPT_PATH=/etc/secrets/Portrait_Consultant_AI.txt` (only if you changed path)
5. Deploy. You will get `https://xxxx.onrender.com`.
   - POST `https://xxxx.onrender.com/fix` with JSON:
     ```json
     {
       "image_base64": "<base64>",
       "payload": {
         "strength": "medium",
         "priority": ["eyes","mouth"],
         "preserve": ["skin_texture","mole"],
         "notes": "口角の左右差が気になります"
       }
     }
     ```

## Why Secret Files?
- Keeps your system prompt out of Git history.
- Supports long Japanese text and line breaks as-is.
- Easy to rotate/update without code changes.

## iOS Client Reminder
Point your Swift `APIClient` endpoint to the Render URL:
```swift
private let endpoint = URL(string: "https://xxxx.onrender.com/fix")!
```

## Tiny RPG API
`POST /rpg` で簡易RPGを遊べます。

- `action=start` : 戦闘開始
- `action=attack` : 攻撃
- `action=potion` : 回復
- `action=flee` : 逃走

例:
```bash
curl -X POST http://localhost:8787/rpg \
  -H "Content-Type: application/json" \
  -d '{"action":"start"}'
```
