/*
  Create helper function for client-side migrations via RPC.
  Defines public.exec_sql(sql text) that runs arbitrary SQL.
*/
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO anon, authenticated;