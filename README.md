# VoiceVault (Next.js + Vercel Postgres)

Anonymous voice notes — full-stack Next.js app designed for Vercel.

## Features
- Create a Vault (unique `user_link`) and receive `admin_token` stored locally.
- Record in browser, apply simple anonymization (pitch shift), send as base64 to server.
- Vault owner dashboard: list, play, delete, and share messages. Share captures playing audio.
- Uses `@vercel/postgres` for persistence — no native modules.

## Setup (local)
1. `npm install`
2. Setup Postgres and set `POSTGRES_URL` environment variable (or add Vercel Postgres).
3. Run migrations:
   ```bash
   psql "$POSTGRES_URL" -f migrations/schema.sql
