# TripLedger

PWA для учёта рейсов машин при сменной работе 7:00–7:00.

**Демо:** [trip-ledger-omega.vercel.app](https://trip-ledger-omega.vercel.app/)

Поддерживает офлайн-режим, Supabase, экспорт/импорт JSON и текстовые отчёты для мессенджеров.

## Возможности

- **Рейсы** — начало/завершение рейса: ввод госномера и тонажа или быстрый выбор из машин смены
- **Статистика** — рейсы по каждой машине с временами въезда/выезда
- **Отчёты** — отчёт за смену (7:00–7:00), текст для мессенджеров
- **Экспорт/импорт JSON** — резервные копии и обмен данными
- **Синхронизация** — Supabase (при настройке)

## Установка

```bash
npm install
```

## Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. В SQL Editor выполните `supabase-schema.sql`
3. Скопируйте `.env.example` в `.env`
4. Укажите `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`

## Запуск

```bash
npm run dev
```

Сборка для продакшена:

```bash
npm run build
```

## Деплой на Vercel

1. Загрузите проект на [GitHub](https://github.com/new)
2. На [vercel.com](https://vercel.com) войдите через GitHub → **Add New** → **Project**
3. Выберите репозиторий
4. Добавьте переменные: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
5. **Deploy** — получите ссылку вида `trip-ledger-xxx.vercel.app`

Подробнее: [docs/VERCEL-DEPLOY.md](docs/VERCEL-DEPLOY.md)

## Установка на телефон

### Вариант 1: PWA (без установки файла)

1. Разместите приложение на хостинге (Vercel, Netlify и т.п.) или запустите `npm run dev:mobile` и откройте URL с телефона в той же Wi‑Fi сети
2. В браузере телефона: меню → «Добавить на главный экран»
3. Иконка появится на главном экране, приложение будет работать как установленное

#### iPhone (Safari)

**Важно:** используйте только Safari — другие браузеры на iPhone не умеют добавлять приложение на главный экран.

1. Откройте сайт [trip-ledger-omega.vercel.app](https://trip-ledger-omega.vercel.app) в Safari
2. Внизу экрана нажмите кнопку **«Поделиться»** (квадратик со стрелкой вверх)
3. В открывшемся меню найдите и нажмите **«На экран „Домой“»**
4. Подтвердите — нажмите **«Добавить»** справа вверху

Готово. Иконка появится на главном экране, и приложение будет открываться как обычная программа.

### Вариант 2: APK (файл для передачи)

Можно собрать APK **без полной Android Studio** — достаточно Java и Android SDK Command-line Tools.

#### Облегчённая установка (без Android Studio)

Запустите скрипт — он скачает, распакует и установит всё необходимое:

```powershell
# С автоматической установкой Java (если её нет):
.\scripts\setup-android-sdk.ps1 -InstallJava

# Или без Java (если уже установлена):
.\scripts\setup-android-sdk.ps1
```

Скрипт: скачивает Android Command-line Tools (~143 MB), распаковывает в `C:\Android\sdk`, устанавливает platform-tools, build-tools, platforms и добавляет `ANDROID_HOME` и `JAVA_HOME` в переменные среды. При ошибке загрузки — скачайте [commandlinetools-win](https://developer.android.com/studio#command-tools) вручную и распакуйте в `C:\Android\sdk\cmdline-tools\latest\`, затем снова запустите скрипт.

**Если Gradle пишет «JAVA_HOME is not set»** — запустите скрипт ещё раз (он установит `JAVA_HOME`), либо вручную: найдите папку JDK (например `C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot`) и добавьте переменную `JAVA_HOME`.

После выполнения перезапустите терминал и соберите APK:

```bash
npm run apk
```

#### Альтернатива: Android Studio

Если предпочитаете полную IDE — установите [Android Studio](https://developer.android.com/studio), она уже включает Java и SDK.

---

APK будет в `android/app/build/outputs/apk/debug/TripLedger-debug.apk`. Передайте файл на телефон (мессенджер, Bluetooth, USB) и включите «Установка из неизвестных источников» для установки.

#### Релизная версия (подписанный APK)

Для распространения нужна подписанная сборка:

1. **Создайте keystore** (один раз):
   ```powershell
   keytool -genkey -v -keystore android/trip-ledger-release.keystore -alias tripledger -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Настройте подпись** — скопируйте `android/keystore.properties.example` в `android/keystore.properties` и укажите пароли и путь к keystore.

3. **Соберите релиз**:
   ```bash
   npm run apk:release
   ```

Готовый APK: `TripLedger-release.apk`

## Репозиторий

Рекомендуемое имя репозитория: `trip-ledger`
