-- ==============================================================================
-- FileLink Database Schema & RLS Policies
-- Developed by ALTRIVELLE TECHNOLOGIES
-- Migration: 20261018000000_init_filelink.sql
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    storage_used BIGINT NOT NULL DEFAULT 0,
    storage_quota BIGINT NOT NULL DEFAULT 104857600, -- 100 MB default quota
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. PROJECTS TABLE
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. FILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. SHARE_LINKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    max_downloads INTEGER DEFAULT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_file_id ON public.share_links(file_id);
CREATE INDEX IF NOT EXISTS idx_share_links_user_id ON public.share_links(user_id);

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------------------------

-- Trigger function: Update updated_at column
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER tr_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER tr_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger function: Create profile automatically on user signup
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
        104857600 -- 100 MB initial quota
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connect auth.users to public.profiles
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function: Recalculate storage_used for profile on file changes
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

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- PROFILES POLICIES
CREATE POLICY "Profiles: Users can read their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Profiles: Users can update their own profile info"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- PROJECTS POLICIES
CREATE POLICY "Projects: Users can view own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Projects: Users can create own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Projects: Users can update own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Projects: Users can delete own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

-- FILES POLICIES
CREATE POLICY "Files: Users can view own files"
    ON public.files FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Files: Public files can be viewed"
    ON public.files FOR SELECT
    USING (is_public = true);

CREATE POLICY "Files: Users can insert own files"
    ON public.files FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Files: Users can update own files"
    ON public.files FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Files: Users can delete own files"
    ON public.files FOR DELETE
    USING (auth.uid() = user_id);

-- SHARE_LINKS POLICIES
CREATE POLICY "Share Links: Users can view own share links"
    ON public.share_links FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Share Links: Users can insert own share links"
    ON public.share_links FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Share Links: Users can update own share links"
    ON public.share_links FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Share Links: Users can delete own share links"
    ON public.share_links FOR DELETE
    USING (auth.uid() = user_id);

-- Anonymous / recipient policy to read an active share token without seeing other records
CREATE POLICY "Share Links: Public can view active valid token"
    ON public.share_links FOR SELECT
    USING (
        is_revoked = false
        AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
        AND (max_downloads IS NULL OR download_count < max_downloads)
    );

-- ------------------------------------------------------------------------------
-- 7. SECURE RPC FOR TOKEN RESOLUTION & DOWNLOAD COUNT INCREMENT
-- ------------------------------------------------------------------------------
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

-- Function to record download increment securely
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

-- ------------------------------------------------------------------------------
-- 8. SUPABASE STORAGE BUCKET & STORAGE POLICIES
-- ------------------------------------------------------------------------------
-- Note: Insert bucket if not exists in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'filelink-files',
    'filelink-files',
    false, -- Private bucket! Never public
    26214400, -- 25 MB limit
    NULL -- All types or restricted if desired
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 26214400;

-- Storage Policy: Users can upload objects into their own owner folder: <user_id>/...
CREATE POLICY "FileLink: Allow authenticated users to upload to their folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'filelink-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage Policy: Users can view/read their own files
CREATE POLICY "FileLink: Allow authenticated users to read their own files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'filelink-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage Policy: Users can update their own files
CREATE POLICY "FileLink: Allow authenticated users to update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'filelink-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'filelink-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage Policy: Users can delete their own files
CREATE POLICY "FileLink: Allow authenticated users to delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'filelink-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
