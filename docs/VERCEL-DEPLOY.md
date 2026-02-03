# Деплой TripLedger на Vercel

## Шаг 1: Загрузить проект на GitHub

Если репозиторий ещё не создан:

```powershell
cd "c:\Users\a.zaynullin\YandexDisk-arthur27z\Python Projects\trip-ledger"
git init
git add .
git commit -m "Initial commit"
# Создайте репозиторий на github.com, затем:
git remote add origin https://github.com/ВАШ_USERNAME/trip-ledger.git
git branch -M main
git push -u origin main
```

## Шаг 2: Подключить Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Войдите через **GitHub**
3. Нажмите **Add New** → **Project**
4. Выберите репозиторий `trip-ledger`
5. В **Environment Variables** добавьте:
   - `VITE_SUPABASE_URL` — URL вашего Supabase проекта
   - `VITE_SUPABASE_ANON_KEY` — anon key из Supabase
6. Нажмите **Deploy**

## Шаг 3: Готово

После деплоя получите ссылку вида `trip-ledger-xxx.vercel.app`.

Каждый push в `main` будет автоматически пересобирать и деплоить приложение.
