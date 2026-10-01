-- Manual verification queries after applying 052_vehicle_minimum_fares_and_overrides.sql
-- Do NOT run against production without review.

-- 1) Column exists
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'route_minimum_fares';

-- 2) Priority: override > vehicle > legacy
-- select public.resolve_applicable_minimum_fare(
--   'Ahmedabad', 'Gujarat', 'Rajkot', 'Gujarat', 'Sedan', null
-- );

-- 3) Validate block
-- select public.validate_requirement_price(
--   'Ahmedabad', 'Gujarat', 'Rajkot', 'Gujarat', 'Sedan', 1500, null
-- );

-- 4) Validate allow
-- select public.validate_requirement_price(
--   'Ahmedabad', 'Gujarat', 'Rajkot', 'Gujarat', 'Sedan', 2000, null
-- );

-- 5) Pending request count
-- select count(*) from public.fare_override_requests where status = 'pending';

-- 6) Active overrides
-- select count(*) from public.user_fare_overrides where status = 'approved';
