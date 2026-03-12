insert into public.rooms (
  name,
  slug,
  location,
  color_hex,
  min_age_months,
  max_age_months,
  capacity
) values
  ('4-5', 'nursery', 'Lower Hall', '#F97316', 48, 71, 12),
  ('6-7', 'toddlers', 'Lower Hall', '#FB923C', 72, 95, 16),
  ('8-9', 'preschool', 'East Wing', '#FDBA74', 96, 119, 18),
  ('10', 'elementary', 'Upstairs', '#EA580C', 120, 131, 24)
on conflict (slug) do update
set
  name = excluded.name,
  location = excluded.location,
  color_hex = excluded.color_hex,
  min_age_months = excluded.min_age_months,
  max_age_months = excluded.max_age_months,
  capacity = excluded.capacity;
