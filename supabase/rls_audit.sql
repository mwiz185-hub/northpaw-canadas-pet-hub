-- =====================================================================
-- NorthPaw RLS Audit + Auto-Fix
-- Run this in Supabase Dashboard -> SQL Editor
--
-- Section 1 reports any public table missing RLS.
-- Section 2 enables RLS on every public table (idempotent, safe to re-run).
-- Section 3 adds a deny-all fallback policy ONLY to tables that have RLS
--           enabled but ZERO policies (so an attacker can't read them).
--           You should then write real policies for those tables.
-- Section 4 re-reports so you can confirm the fix.
-- =====================================================================

-- 1. Report tables missing RLS
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies p
     WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY rls_enabled, tablename;

-- 2. Enable RLS on every public table (no-op if already enabled)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;',
                   r.schemaname, r.tablename);
    RAISE NOTICE 'Enabled RLS on %.%', r.schemaname, r.tablename;
  END LOOP;
END $$;

-- 3. Add deny-all fallback on RLS-enabled tables with zero policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT t.schemaname, t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
      )
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR ALL USING (false) WITH CHECK (false);',
      r.tablename || '_deny_all_fallback',
      r.schemaname, r.tablename
    );
    RAISE NOTICE 'Added deny-all fallback to %.% (write real policies before using this table)',
                 r.schemaname, r.tablename;
  END LOOP;
END $$;

-- 4. Final report
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies p
     WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
