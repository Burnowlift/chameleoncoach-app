ALTER TABLE public.rm_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rm_history;