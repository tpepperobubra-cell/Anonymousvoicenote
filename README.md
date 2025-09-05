# VoiceVault (Next.js)

Anonymous voice messages app — Next.js full-stack version.

Run locally:
1. `npm install`
2. `npm run dev`
3. Open http://localhost:3000

Features:
- Create Vault (unique link + admin token)
- Record in browser and apply simple anonymization (pitch shift)
- Send anonymous voice messages to a vault
- Vault owner lists & plays messages
- **Share** button records the playing audio (preferred: audio capture via audioElement.captureStream; fallback: screen capture) and lets user download or share

Deploy:
- Works on Vercel (serverless functions may need adjustments for SQLite; consider using a managed DB for production).
