-- Resize content_embedding from vector(768) to vector(3072)
-- to match gemini-embedding-001 output (3072 dimensions)
ALTER TABLE "Role" ALTER COLUMN "content_embedding" TYPE vector(3072) USING "content_embedding"::text::vector(3072);

-- Update the match_roles function to use 3072 dimensions
CREATE OR REPLACE FUNCTION match_roles (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text,
  title text,
  metadata jsonb,
  full_jd_text text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    roles.id,
    roles.title,
    roles.metadata,
    roles.full_jd_text,
    1 - (roles.content_embedding <=> query_embedding) as similarity
  FROM "Role" as roles
  WHERE 1 - (roles.content_embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
