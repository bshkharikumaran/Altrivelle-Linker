-- ==============================================================================
-- Migration: 20261018000001_resolve_share_token_and_admin.sql
-- Altrivelle Linker — Schema Cache Repair, Share Resolution RPC, and Admin Role
-- Developed by ALTRIVELLE TECHNOLOGIES
-- "One Link. Smarter Sharing."
-- ==============================================================================

-- 1. Ensure 'role' column exists in public.profiles and designate sriharibshk@gmail.com as Admin
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'sriharibshk@gmail.com';

-- Automatically guarantee sriharibshk@gmail.com always receives admin role
CREATE OR REPLACE FUNCTION public.handle_admin_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email = 'sriharibshk@gmail.com' THEN
        NEW.role := 'admin';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ensure_admin_role ON public.profiles;
CREATE TRIGGER tr_ensure_admin_role
    BEFORE INSERT OR UPDATE OF email ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_admin_role_assignment();

-- 2. Create or Replace secure token resolver RPC
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
    SELECT * INTO v_link
    FROM public.share_links
    WHERE token = p_token;

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

    SELECT * INTO v_file
    FROM public.files
    WHERE id = v_link.file_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'The shared file no longer exists'::text, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, NULL::timestamptz, false, v_link.download_count, v_link.max_downloads, 'ALTRIVELLE TECHNOLOGIES'::text;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        true,
        'OK'::text,
        v_file.id,
        v_file.name,
        v_file.size_bytes,
        v_file.mime_type,
        v_file.storage_path,
        v_link.expires_at,
        (v_link.password_hash IS NOT NULL AND v_link.password_hash <> ''),
        v_link.download_count,
        v_link.max_downloads,
        'ALTRIVELLE TECHNOLOGIES'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Secure download counter increment
CREATE OR REPLACE FUNCTION public.increment_share_download(p_token text)
RETURNS boolean AS $$
BEGIN
    UPDATE public.share_links
    SET download_count = download_count + 1
    WHERE token = p_token
      AND is_revoked = false
      AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
      AND (max_downloads IS NULL OR download_count < max_downloads);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Explicitly grant execute rights to anon, authenticated and service_role
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_share_download(text) TO anon, authenticated, service_role;

-- 5. RLS Policy: Allow reading files if an active, non-expired share link exists for it
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

-- 6. Allow Admins to view all profiles, files, and share links
DROP POLICY IF EXISTS "Profiles: admin read all" ON public.profiles;
CREATE POLICY "Profiles: admin read all" ON public.profiles FOR SELECT
USING (
    auth.jwt() ->> 'email' = 'sriharibshk@gmail.com'
);

DROP POLICY IF EXISTS "Files: admin read all" ON public.files;
CREATE POLICY "Files: admin read all" ON public.files FOR SELECT
USING (
    auth.jwt() ->> 'email' = 'sriharibshk@gmail.com'
);

DROP POLICY IF EXISTS "Shares: admin all" ON public.share_links;
CREATE POLICY "Shares: admin all" ON public.share_links FOR ALL
USING (
    auth.jwt() ->> 'email' = 'sriharibshk@gmail.com'
);

-- 7. Trigger PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
