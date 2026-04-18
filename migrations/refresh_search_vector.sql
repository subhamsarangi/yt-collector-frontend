-- Refresh search_vector when transcript or summary is updated
-- This ensures full-text search includes newly added transcripts

create or replace function refresh_search_vector()
returns trigger language plpgsql as $
begin
  -- Force recomputation by touching the row
  -- Since search_vector is STORED GENERATED, updating any source column triggers recomputation
  if new.transcript is distinct from old.transcript or new.summary is distinct from old.summary then
    -- Update updated_at to trigger the set_updated_at trigger
    new.updated_at = now();
  end if;
  return new;
end;
$;

-- Drop old trigger if exists
drop trigger if exists refresh_search_vector_trigger on videos;

-- Create trigger
create trigger refresh_search_vector_trigger
before update on videos
for each row
execute function refresh_search_vector();
