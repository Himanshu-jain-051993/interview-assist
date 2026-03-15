-- Create the semantic search function (uses gemini-embedding-001: 3072 dims)
create or replace function match_roles (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id text,
  title text,
  metadata jsonb,
  full_jd_text text,
  similarity float
)
language sql stable
as $$
  select
    "Role".id,
    "Role".title,
    "Role".metadata,
    "Role".full_jd_text,
    1 - ("Role".content_embedding <=> query_embedding) as similarity
  from "Role"
  where 1 - ("Role".content_embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
