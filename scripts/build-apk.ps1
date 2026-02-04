# TripLedger - Sbornka APK s avtopoiskom Java i Android SDK
# Zapusk: .\scripts\build-apk.ps1 ili npm run apk
# Kodirovka: Windows-1251

$ErrorActionPreference = "Stop"
$sdkPath = "C:\Android\sdk"
$projectRoot = Split-Path $PSScriptRoot -Parent

# Proverka: zapusk iz korrektnoy papki proekta
if (-not (Test-Path (Join-Path $projectRoot "package.json")) -or -not (Test-Path (Join-Path $projectRoot "android"))) {
    Write-Host "Oshibka: zapustite iz papki proekta trip-ledger (gde est package.json i android)" -ForegroundColor Red
    exit 1
}

# Poisk Java
$javaHome = $null
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    $javaHome = $env:JAVA_HOME
}
if (-not $javaHome) {
    $javaExe = Get-Command java -ErrorAction SilentlyContinue
    if ($javaExe) {
        $javaHome = Split-Path (Split-Path $javaExe.Source -Parent) -Parent
    }
}
if (-not $javaHome) {
    $paths = @(
        "C:\Program Files\Eclipse Adoptium\jdk-17*",
        "C:\Program Files\Microsoft\jdk-17*",
        "C:\Program Files\Java\jdk-17*",
        "C:\Program Files\Eclipse Adoptium\jdk-21*",
        "C:\Program Files\Microsoft\jdk-21*"
    )
    foreach ($p in $paths) {
        $found = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found -and (Test-Path (Join-Path $found.FullName "bin\java.exe"))) {
            $javaHome = $found.FullName
            break
        }
    }
}

if (-not $javaHome) {
    Write-Host "JAVA_HOME ne najden. Ustanovite Java 17:" -ForegroundColor Red
    Write-Host "  winget install EclipseAdoptium.Temurin.17.JDK" -ForegroundColor White
    Write-Host "  Ili zapustite: .\scripts\setup-android-sdk.ps1 -InstallJava" -ForegroundColor White
    exit 1
}

# Android SDK
$androidHome = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $sdkPath }
if (-not (Test-Path $androidHome)) {
    Write-Host "ANDROID_HOME ne najden: $androidHome" -ForegroundColor Red
    Write-Host "Zapustite: .\scripts\setup-android-sdk.ps1" -ForegroundColor White
    exit 1
}

# Ustanovka peremennyh dlya tekushchey sessii
$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:Path = "$javaHome\bin;$androidHome\platform-tools;$env:Path"
# Ispolzovanie sertifikatov Windows vmesto Java cacerts (obhod PKIX v korporativnyh setyah)
$env:GRADLE_OPTS = "-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"

# local.properties dlya Gradle
$localProps = Join-Path $projectRoot "android\local.properties"
@"
sdk.dir=$($androidHome -replace '\\', '/')
"@ | Set-Content $localProps -Encoding UTF8

Write-Host "JAVA_HOME=$javaHome" -ForegroundColor Cyan
Write-Host "ANDROID_HOME=$androidHome" -ForegroundColor Cyan

# Sbornka
Set-Location $projectRoot

# Udalenie oshibochnoy vlozhennoy papki trip-ledger (esli sozdana nevernym putem)
$erroneousDir = Join-Path $projectRoot "trip-ledger"
if (Test-Path $erroneousDir) {
    Remove-Item $erroneousDir -Recurse -Force
    Write-Host "Udalena oshibochnaya papka trip-ledger\" -ForegroundColor Yellow
}

npm run build:android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
# assembleDebug - bez podpisi (release trebuet keystore)
Push-Location android
& .\gradlew.bat assembleDebug
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { exit $gradleExit }
$apkPath = Join-Path $projectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Copy-Item $apkPath (Join-Path $projectRoot "trip-ledger-debug.apk") -Force
    Write-Host "APK sozdan: trip-ledger-debug.apk" -ForegroundColor Green
}
exit $gradleExit
