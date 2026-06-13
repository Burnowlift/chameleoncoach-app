ALTER TABLE public.training_blocks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_blocks;