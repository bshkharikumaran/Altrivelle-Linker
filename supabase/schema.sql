-- ==============================================================================
-- Altrivelle Linker — Complete Supabase PostgreSQL Schema & Security Matrix
-- Developed by ALTRIVELLE TECHNOLOGIES
-- "One Link. Smarter Sharing."
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'community', -- 'community', 'pro', 'team', 'self_hosted'
    role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin'
    storage_used BIGINT NOT NULL DEFAULT 0,
    storage_quota BIGINT NOT NULL DEFAULT 104857600, -- 100 MB default
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#2563eb',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- 4. FILES TABLE
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    sha256_hash TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);

-- 5. FILE VERSIONS TABLE (Provenance & Rollback)
CREATE TABLE IF NOT EXISTS public.file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    sha256_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON public.file_versions(file_id);

-- 6. SHARE LINKS TABLE
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    transfer_mode TEXT NOT NULL DEFAULT 'persistent', -- 'persistent', 'ephemeral'
    expires_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    max_downloads INTEGER DEFAULT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);

-- 7. FILE REQUESTS TABLE (DropBox)
CREATE TABLE IF NOT EXISTS public.file_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    token TEXT NOT NULL UNIQUE,
    max_size_bytes BIGINT NOT NULL DEFAULT 26214400,
    max_submissions INTEGER DEFAULT 20,
    submissions_count INTEGER NOT NULL DEFAULT 0,
    allowed_types TEXT DEFAULT 'all',
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.file_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_file_requests_token ON public.file_requests(token);

-- 8. FILE SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.file_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.file_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contributor_name TEXT NOT NULL DEFAULT 'Anonymous',
    contributor_email TEXT,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.file_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_file_submissions_request ON public.file_submissions(request_id);

-- 9. WEBHOOKS TABLE
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT ARRAY['file.uploaded', 'share.created'],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- 10. WEBHOOK DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    status TEXT NOT NULL DEFAULT 'pending', -- 'success', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- 11. AUTOMATIC TRIGGERS & FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER tr_projects_updated_at
    BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER tr_files_updated_at
    BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, storage_used, storage_quota)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        0,
        104857600
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatic calculation of storage used
CREATE OR REPLACE FUNCTION public.sync_user_storage_used()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    total_bytes BIGINT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.user_id;
    ELSE
        target_user_id := NEW.user_id;
    END IF;

    SELECT COALESCE(SUM(size_bytes), 0) INTO total_bytes
    FROM public.files
    WHERE user_id = target_user_id;

    UPDATE public.profiles
    SET storage_used = total_bytes,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_sync_storage_on_file_change
    AFTER INSERT OR UPDATE OF size_bytes OR DELETE ON public.files
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_storage_used();

-- Increment request submission counter
CREATE OR REPLACE FUNCTION public.increment_request_submission(p_request_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.file_requests
    SET submissions_count = submissions_count + 1
    WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment share download counter
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

-- Secure token resolver RPC
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

-- Explicitly grant execute rights to anon, authenticated and service_role
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_share_download(text) TO anon, authenticated, service_role;

-- Automatically ensure designated admin has admin role
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

-- 12. ROW LEVEL SECURITY POLICIES
-- Profiles
DROP POLICY IF EXISTS "Profiles: read own" ON public.profiles;
CREATE POLICY "Profiles: read own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: admin read all" ON public.profiles;
CREATE POLICY "Profiles: admin read all" ON public.profiles FOR SELECT
    USING (auth.jwt() ->> 'email' = 'sriharibshk@gmail.com');

-- Projects
DROP POLICY IF EXISTS "Projects: user access" ON public.projects;
CREATE POLICY "Projects: user access" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Files
DROP POLICY IF EXISTS "Files: user access" ON public.files;
CREATE POLICY "Files: user access" ON public.files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Files: public view" ON public.files;
CREATE POLICY "Files: public view" ON public.files FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Files: read via valid share link" ON public.files;
CREATE POLICY "Files: read via valid share link" ON public.files FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.share_links sl WHERE sl.file_id = public.files.id AND sl.is_revoked = false AND (sl.expires_at IS NULL OR sl.expires_at > timezone('utc'::text, now()))));

DROP POLICY IF EXISTS "Files: admin read all" ON public.files;
CREATE POLICY "Files: admin read all" ON public.files FOR SELECT
    USING (auth.jwt() ->> 'email' = 'sriharibshk@gmail.com');

-- File Versions
DROP POLICY IF EXISTS "Versions: user access" ON public.file_versions;
CREATE POLICY "Versions: user access" ON public.file_versions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Share Links
DROP POLICY IF EXISTS "Shares: user access" ON public.share_links;
CREATE POLICY "Shares: user access" ON public.share_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Shares: public token lookup" ON public.share_links;
CREATE POLICY "Shares: public token lookup" ON public.share_links FOR SELECT
    USING (is_revoked = false AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now())));

DROP POLICY IF EXISTS "Shares: admin all" ON public.share_links;
CREATE POLICY "Shares: admin all" ON public.share_links FOR ALL
    USING (auth.jwt() ->> 'email' = 'sriharibshk@gmail.com');

-- File Requests
CREATE POLICY "Requests: user access" ON public.file_requests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Requests: public submit view" ON public.file_requests FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now())));

-- File Submissions
CREATE POLICY "Submissions: owner access" ON public.file_submissions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Submissions: anonymous insert" ON public.file_submissions FOR INSERT WITH CHECK (true);

-- Webhooks
CREATE POLICY "Webhooks: user access" ON public.webhooks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

-- 13. STORAGE BUCKET CREATION
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'filelink-files',
    'filelink-files',
    false, -- Private bucket
    524288000, -- 500 MB limit
    NULL
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage Policies
DROP POLICY IF EXISTS "Altrivelle: Upload to owner folder" ON storage.objects;
CREATE POLICY "Altrivelle: Upload to owner folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'filelink-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Altrivelle: Read owner objects" ON storage.objects;
CREATE POLICY "Altrivelle: Read owner objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'filelink-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Altrivelle: Delete owner objects" ON storage.objects;
CREATE POLICY "Altrivelle: Delete owner objects" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'filelink-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Altrivelle: Allow file requests upload" ON storage.objects;
CREATE POLICY "Altrivelle: Allow file requests upload" ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'filelink-files' AND (storage.foldername(name))[2] = 'requests');
