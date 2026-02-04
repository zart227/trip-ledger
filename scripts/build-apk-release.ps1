# TripLedger - Sbornka release APK s podpis'yu
# Trebuet android/keystore.properties (skopiruyte iz keystore.properties.example)
# Zapusk: .\scripts\build-apk-release.ps1 ili npm run apk:release
# Kodirovka: Windows-1251

$ErrorActionPreference = "Stop"
$sdkPath = "C:\Android\sdk"
$projectRoot = Split-Path $PSScriptRoot -Parent

# Proverka: zapusk iz korrektnoy papki proekta
if (-not (Test-Path (Join-Path $projectRoot "package.json")) -or -not (Test-Path (Join-Path $projectRoot "android"))) {
    Write-Host "Oshibka: zapustite iz papki proekta trip-ledger (gde est package.json i android)" -ForegroundColor Red
    exit 1
}

$keystoreProps = Join-Path $projectRoot "android\keystore.properties"

if (-not (Test-Path $keystoreProps)) {
    Write-Host "Oshibka: android\keystore.properties ne najden." -ForegroundColor Red
    Write-Host "1. Skopiruyte android\keystore.properties.example v keystore.properties" -ForegroundColor White
    Write-Host "2. Sozdayte keystore: keytool -genkey -v -keystore android\trip-ledger-release.keystore -alias tripledger -keyalg RSA -keysize 2048 -validity 10000" -ForegroundColor White
    Write-Host "3. Zapolnite keystore.properties parolami i putem k keystore" -ForegroundColor White
    exit 1
}

# Poisk Java (takiye zhe kak v build-apk.ps1)
$javaHome = $null
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    $javaHome = $env:JAVA_HOME
}
if (-not $javaHome) {
    $javaExe = Get-Command java -ErrorAction SilentlyContinue
    if ($javaExe) { $javaHome = Split-Path (Split-Path $javaExe.Source -Parent) -Parent }
}
if (-not $javaHome) {
    $paths = @("C:\Program Files\Eclipse Adoptium\jdk-17*", "C:\Program Files\Microsoft\jdk-17*", "C:\Program Files\Java\jdk-17*")
    foreach ($p in $paths) {
        $found = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found -and (Test-Path (Join-Path $found.FullName "bin\java.exe"))) { $javaHome = $found.FullName; break }
    }
}
if (-not $javaHome) {
    Write-Host "JAVA_HOME ne najden." -ForegroundColor Red
    exit 1
}

$androidHome = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $sdkPath }
if (-not (Test-Path $androidHome)) {
    Write-Host "ANDROID_HOME ne najden: $androidHome" -ForegroundColor Red
    exit 1
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:Path = "$javaHome\bin;$androidHome\platform-tools;$env:Path"
$env:GRADLE_OPTS = "-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"

$localProps = Join-Path $projectRoot "android\local.properties"
@"
sdk.dir=$($androidHome -replace '\\', '/')
"@ | Set-Content $localProps -Encoding UTF8

Write-Host "Sbornka release APK..." -ForegroundColor Cyan
Set-Location $projectRoot

# Udalenie oshibochnoy vlozhennoy papki trip-ledger (esli sozdana nevernym putem)
$erroneousDir = Join-Path $projectRoot "trip-ledger"
if (Test-Path $erroneousDir) {
    Remove-Item $erroneousDir -Recurse -Force
    Write-Host "Udalena oshibochnaya papka trip-ledger\" -ForegroundColor Yellow
}

npm run build:android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Push-Location android
& .\gradlew.bat assembleRelease
$gradleExit = $LASTEXITCODE
Pop-Location

if ($gradleExit -ne 0) { exit $gradleExit }

$releaseDir = Join-Path $projectRoot "android\app\build\outputs\apk\release"
$apk = Get-ChildItem $releaseDir -Filter "*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($apk) {
    $dest = Join-Path $projectRoot "TripLedger-release.apk"
    Copy-Item $apk.FullName $dest -Force
    Write-Host "Release APK sozdan: TripLedger-release.apk" -ForegroundColor Green
}
exit $gradleExit
