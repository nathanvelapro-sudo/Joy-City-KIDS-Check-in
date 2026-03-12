insert into public.rooms (
  name,
  slug,
  location,
  color_hex,
  min_age_months,
  max_age_months,
  capacity
) values
  ('Nursery', 'nursery', 'Lower Hall', '#F97316', 0, 24, 12),
  ('Toddlers', 'toddlers', 'Lower Hall', '#FB923C', 25, 48, 16),
  ('Preschool', 'preschool', 'East Wing', '#FDBA74', 49, 72, 18),
  ('Elementary', 'elementary', 'Upstairs', '#EA580C', 73, 144, 24)
on conflict (slug) do update
set
  name = excluded.name,
  location = excluded.location,
  color_hex = excluded.color_hex,
  min_age_months = excluded.min_age_months,
  max_age_months = excluded.max_age_months,
  capacity = excluded.capacity;

