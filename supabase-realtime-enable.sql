-- Включение Realtime для таблицы trips (подписка на INSERT/UPDATE/DELETE)
-- Выполнить в Supabase: Dashboard → SQL Editor → New query

ALTER PUBLICATION supabase_realtime ADD TABLE trips;
