# Altrivelle Linker

![Altrivelle Linker](public/assets/altrivelle-linker-logo.png)

> **Developed by ALTRIVELLE TECHNOLOGIES**  
> *"Think Beyond. Build Forward."*  
> **Tagline:** One Link. Smarter Sharing.  
> **Core Message:** Send files. Receive files. Control access. Automate everything.  
> **Designated Administrator:** `sriharibshk@gmail.com`

---

## 🌟 1. Overview & Vision

**Altrivelle Linker** is an innovative, production-oriented, open-source-ready file-sharing and file-transfer platform developed by **ALTRIVELLE TECHNOLOGIES**. Engineered with a zero-trust storage model, modern animated light theme by default, and intelligent transfer routing, Altrivelle Linker unites personal file sharing, client file collection, developer automation, and peer-to-peer transfers into a single unified application.

Whether deployed to **Vercel** with **Supabase**, self-hosted on bare-metal Docker instances, or utilized as a team workspace, Altrivelle Linker gives users total control over their data residency, access windows, and integrity provenance.

---

## 🔧 2. Production Share Resolution & Schema Cache Fix

### Root Cause Diagnosis
When public share pages displayed the error:
```text
Could not find the function public.resolve_share_token(p_token) in the schema cache
```
Two factors contributed to this behavior:
1. **Local Development API Runner:** In local Vite development (`npm run dev`), browser requests to `/api/share/:token` were not intercepted by serverless functions, causing the client to fall back to direct Supabase RPC `resolve_share_token`.
2. **Missing Remote RPC & Schema Cache:** The remote Supabase PostgreSQL database had not executed `resolve_share_token`, or lacked explicit execution grants (`GRANT EXECUTE ... TO anon`), preventing PostgREST from registering the RPC in its API schema cache.

### Solution Applied
1. **Built-in Vite API Dev Server Middleware:** `vite.config.js` now includes a development middleware that automatically routes `/api/share/:token` and `/api/health` directly using the serverless handler and service role key in local dev.
2. **Multi-Tier Resilient Fallback in `src/services/share.service.js`:**
   - **Tier 1:** Serverless Edge API (`/api/share/:token`).
   - **Tier 2:** Supabase RPC (`resolve_share_token`).
   - **Tier 3:** Direct Supabase query (`share_links` and `files`) with expiration, revocation, and download limits checks.
   - **Tier 4:** Graceful user-friendly status cards—never exposing raw PostgreSQL or PostgREST error codes to recipients.
3. **Dedicated Migration (`supabase/migrations/20261018000001_resolve_share_token_and_admin.sql`):**
   Execute this snippet in the [Supabase SQL Editor](https://supabase.com/dashboard/project/rdmapdajjygalfsntvkl/sql):

```sql
-- Create or Replace secure token resolver RPC
CREATE OR REPLACE FUNCTION public.resolve_share_token(p_token text)
RETURNS TABLE (
    valid boolean,
    reason text,
    file_id uuid,
    file_name text,
    size_bytes bigint,
    mime_type text,
    storage_path text,
    expires_at timestamptz,
    has_password boolean,
    download_count integer,
    max_downloads integer,
    developer_credit text
) AS $$
DECLARE
    v_link RECORD;
    v_file RECORD;
BEGIN
    SELECT * INTO v_link FROM public.share_links WHERE token = p_token;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Share link not found or invalid token'::text, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, NULL::timestamptz, false, 0, NULL::integer, 'ALTRIVELLE TECHNOLOGIES'::text;
        RETURN;
    END IF;

    IF v_link.is_revoked THEN
        RETURN QUERY SELECT false, 'This share link has been revoked by the owner'::text, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, NULL::timestamptz, false, v_link.download_count, v_link.max_downloads, 'ALTRIVELLE TECHNOLOGIES'::text;
        RETURN;
    END IF;

    IF v_link.expires_at IS NOT NULL AND v_link.expires_at <= timezone('utc'::text, now()) THEN
        RETURN QUERY SELECT false, 'This share link has expired'::text, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, v_link.expires_at, false, v_link.download_count, v_link.max_downloads, 'ALTRIVELLE TECHNOLOGIES'::text;
        RETURN;
    END IF;

    IF v_link.max_downloads IS NOT NULL AND v_link.download_count >= v_link.max_downloads THEN
        RETURN QUERY SELECT false, 'Download limit reached for this share link'::text, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, v_link.expires_at, false, v_link.download_count, v_link.max_downloads, 'ALTRIVELLE TECHNOLOGIES'::text;
        RETURN;
    END IF;

    SELECT * INTO v_file FROM public.files WHERE id = v_link.file_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'The shared file no longer exists'::text, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, NULL::timestamptz, false, v_link.download_count, v_link.max_downloads, 'ALTRIVELLE TECHNOLOGIES'::text;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        true, 'OK'::text, v_file.id, v_file.name, v_file.size_bytes, v_file.mime_type, v_file.storage_path,
        v_link.expires_at, (v_link.password_hash IS NOT NULL AND v_link.password_hash <> ''),
        v_link.download_count, v_link.max_downloads, 'ALTRIVELLE TECHNOLOGIES'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_share_download(text) TO anon, authenticated, service_role;

-- Allow reading files via active, non-expired share link
DROP POLICY IF EXISTS "Files: read via valid share link" ON public.files;
CREATE POLICY "Files: read via valid share link" ON public.files FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.share_links sl
        WHERE sl.file_id = public.files.id
          AND sl.is_revoked = false
          AND (sl.expires_at IS NULL OR sl.expires_at > timezone('utc'::text, now()))
    )
);

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
```

---

## 👑 3. Designated Administrator System (`sriharibshk@gmail.com`)

The application features a secure, dedicated **Administrator Governance Console** accessible exclusively by `sriharibshk@gmail.com`:
- **Role Enforcement:** Server-side trigger automatically assigns `role = 'admin'` to `sriharibshk@gmail.com`.
- **Admin Console Navigation:** Displays an exclusive `ADMIN` badge in the sidebar for the designated owner.
- **Platform Telemetry Overview:** Live indicators for registered user accounts, storage allocated vs used, active vs expired links, and private bucket health.
- **User Account Management:** Inspect user profiles, plan tiers, and adjust storage quotas on demand.
- **Content Moderation:** Comprehensive registry of all public share links with instant "Revoke Link" kill-switches.
- **Security Audit Trail:** Real-time log of security events, administrative adjustments, and cryptographic integrity checks.

---

## 🎨 4. Design Standards & Default Light Theme

Per Altrivelle design standards:
- **Default Appearance:** **Light Theme** is loaded for all first-time visitors with zero flash of dark mode.
- **Persistent Toggle:** Smooth animated switch to optional Dark Mode, preserved across sessions in `localStorage`.
- **Aesthetic:** Clean white surfaces, soft border gradients, electric-blue accents, dark navy typography, and fluid micro-interactions.
- **Official Brand Mark:** Interconnected chain-link monogram embedded inside the stylized 'A', located at `public/assets/altrivelle-linker-logo.png`.

---

## 🚀 5. Flagship Innovations

### ⚡ Innovation 1: Adaptive Transfer System
- **Mode A: Persistent Cloud Sharing:** Uploaded to private Supabase Storage with cryptographic tokens, signed download URLs, and asynchronous 24/7 access.
- **Mode B: Ephemeral Self-Destruct:** Time-bound shares with automatic file destruction after a chosen window or immediately after the first download.
- **Mode C: Direct Device-to-Device (P2P WebRTC):** Browser-to-browser direct transfer via WebRTC DataChannels and public STUN servers. Gigabyte-scale files flow directly between peers with **zero cloud storage residency**.

### 🛡 Innovation 2: Trust Passport &trade;
Every shared asset features a transparent security and access manifest:
- **Cryptographic SHA-256 Checksum:** Verifiable file integrity computed client-side.
- **Storage Class & Encryption Manifest:** Explicit verification of TLS in-transit and AES-256 at-rest protection.
- **Access Quotas & Expiration Countdown:** Live tracker of download limits and access lifecycle.
- **Provenance & Revocation:** Instant owner kill-switch that invalidates share tokens immediately.

### 📥 Innovation 3: FileLink DropBox — File Requests
Collect documents, client deliverables, student homework, or creative assets without requiring contributors to create accounts:
- Unique, unguessable file request URLs (`/r/:token`).
- Configurable submission quotas, allowed file extensions, and file size limits.
- Isolated recipient storage: submissions land in private, owner-isolated buckets.

### 🤖 Innovation 4: Developer Flow — CLI, API & Webhooks
- **Official CLI Binary (`altrivelle`):** Upload, list, share, and revoke directly from your terminal (`bin/altrivelle.js`).
- **REST API v1:** Clean endpoints for programmatic share creation, metadata lookup, and link revocation (`/api/v1/shares`, `/api/health`).
- **Signed Webhooks:** HMAC-SHA256 authenticated event notifications.

### 🧭 Innovation 5: Share Risk Advisor
A deterministic analyzer that evaluates share settings before publication:
- Flags sensitive filenames (`password`, `secret`, `financial`, `payroll`, `tax`).
- Scans for executable and script extensions (`.exe`, `.sh`, `.bat`, `.ps1`).
- Assesses exposure risk and suggests mitigations in real time.

---

## 💎 6. Brand Identity — ALTRIVELLE TECHNOLOGIES

The application systematically attributes **ALTRIVELLE TECHNOLOGIES** across every interface:
- **Responsive Footer:** `© 2026 Altrivelle Linker. All rights reserved. Developed by ALTRIVELLE TECHNOLOGIES.`
- **Auth & Showcase:** Subtle company attribution on login/signup, settings, and about modals.
- **Public Share Pages:** Every recipient download portal includes verified developer attribution.
- **Official Logo Asset:** `public/assets/altrivelle-linker-logo.png`.

---

## ⚙️ 7. Quick Start & Local Setup

### 1. Install & Test
```bash
npm install
npm test
npm run dev
```

### 2. Configure Database
1. Open your [Supabase SQL Editor](https://supabase.com/dashboard/project/rdmapdajjygalfsntvkl/sql).
2. Run `supabase/migrations/20261018000001_resolve_share_token_and_admin.sql`.
3. All tables, functions, triggers, and Row Level Security policies will be active.

### 3. CLI Client
Run the local CLI binary:
```bash
node bin/altrivelle.js status
node bin/altrivelle.js list
```

---

## 🌐 8. Vercel Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "feat: Altrivelle Linker production repair and admin upgrade"
   git push origin main
   ```
2. **Environment Variables in Vercel:**
   - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `your_supabase_anon_key`
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `your_supabase_service_role_key`

---

## 🧪 9. Automated Test Verification

```text
 ✓ test/unit.test.js (7 tests)
   ✓ generates cryptographically unguessable random tokens of desired length
   ✓ evaluates share security with deterministic Share Risk Advisor
   ✓ correctly recommends transfer modes in Adaptive Transfer Engine
   ✓ defines valid subscription plans with server-side limit thresholds
   ✓ validates designated platform administrator identity
   ✓ calculates link expiration presets correctly
   ✓ safely handles invalid or missing share tokens without throwing uncaught errors

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

---

## ⚖️ 10. Open-Source Licensing

Altrivelle Linker is distributed under the **MIT License** at the discretion of **ALTRIVELLE TECHNOLOGIES**.

&copy; 2026 Altrivelle Linker. All rights reserved.  
**Developed by ALTRIVELLE TECHNOLOGIES.**  
*“One Link. Smarter Sharing.”*
