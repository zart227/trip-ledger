# Сборка APK без Android Studio

Установка только Java и Android SDK (command-line tools) — без полной IDE.

## Шаг 1: Java 17

**Вариант A — winget (рекомендуется):**
```powershell
winget install EclipseAdoptium.Temurin.17.JDK
```

**Вариант B — вручную:**  
Скачайте с [adoptium.net](https://adoptium.net/temurin/releases/?version=17&os=windows) и установите.

После установки перезапустите терминал. Проверка:
```powershell
java -version
```

## Шаг 2: Android SDK (только command-line)

1. Откройте [developer.android.com/studio](https://developer.android.com/studio)
2. Прокрутите до раздела **«Command line tools only»**
3. Скачайте **commandlinetools-win-..._latest.zip** для Windows
4. Распакуйте архив
5. Создайте папку, например `C:\Android\sdk`
6. Внутри создайте структуру:
   - `C:\Android\sdk\cmdline-tools\latest\`
7. Переместите содержимое распакованного архива (папки `bin`, `lib` и файлы) в `C:\Android\sdk\cmdline-tools\latest\`

## Шаг 3: Установка компонентов SDK

Откройте PowerShell и выполните:

```powershell
$env:ANDROID_HOME = "C:\Android\sdk"
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root=$env:ANDROID_HOME "platform-tools" "build-tools;34.0.0" "platforms;android-34"
```

При запросе лицензии введите `y` и Enter.

## Шаг 4: Переменные окружения

**Временно (только для текущей сессии):**
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"   # путь может отличаться
$env:ANDROID_HOME = "C:\Android\sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin"
```

**Постоянно:**  
Параметры системы → Дополнительно → Переменные среды → Создать:
- `JAVA_HOME` = путь к JDK 17
- `ANDROID_HOME` = `C:\Android\sdk`
- В `Path` добавьте: `%ANDROID_HOME%\platform-tools` и `%ANDROID_HOME%\cmdline-tools\latest\bin`

## Шаг 5: Сборка APK

```powershell
cd trip-ledger
npm run apk
```

APK будет в `android\app\build\outputs\apk\debug\TripLedger-debug.apk`
