# TripLedger - Polnaya avtomaticheskaya ustanovka Java i Android SDK (bez Android Studio)
# Zapusk: .\scripts\setup-android-sdk.ps1
# S flagom Java: .\scripts\setup-android-sdk.ps1 -InstallJava
# Kodirovka: Windows-1251

param(
    [switch]$InstallJava
)

$ErrorActionPreference = "Stop"
$sdkPath = "C:\Android\sdk"
$cmdlineUrl = "https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip"
$cmdlineZip = "$env:TEMP\commandlinetools-win-latest.zip"

Write-Host "=== TripLedger: Avtomaticheskaya ustanovka Java i Android SDK ===" -ForegroundColor Cyan

# 1. Java
Write-Host "`n1. Proverka Java..." -ForegroundColor Yellow
$javaOk = $false
try {
    $null = java -version 2>&1
    $javaOk = $true
    Write-Host "   Java najdena" -ForegroundColor Green
} catch {}

if (-not $javaOk -and $InstallJava) {
    Write-Host "   Ustanovka Java cherez winget..." -ForegroundColor Yellow
    winget install EclipseAdoptium.Temurin.17.JDK --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Host "   Java ustanovlena. Perezapustite terminal i zapustite skript snova." -ForegroundColor Green
    exit 0
}
if (-not $javaOk) {
    Write-Host "   Java ne najdena!" -ForegroundColor Red
    Write-Host "   Zapustite s flagom: .\scripts\setup-android-sdk.ps1 -InstallJava" -ForegroundColor White
    Write-Host "   Ili: winget install EclipseAdoptium.Temurin.17.JDK" -ForegroundColor White
    exit 1
}

# 1b. JAVA_HOME (nuzhen dlya Gradle)
$javaExe = (Get-Command java -ErrorAction SilentlyContinue).Source
if ($javaExe) {
    $javaHome = Split-Path (Split-Path $javaExe -Parent) -Parent
    $env:JAVA_HOME = $javaHome
}

# 2. Sozdanie papki SDK
Write-Host "`n2. Podgotovka papki SDK..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $sdkPath | Out-Null
$env:ANDROID_HOME = $sdkPath
Write-Host "   $sdkPath" -ForegroundColor Green

# 3. Proverka ili zagruzka cmdline-tools
$cmdlinePath = Join-Path $sdkPath "cmdline-tools\latest\bin\sdkmanager.bat"
if (Test-Path $cmdlinePath) {
    Write-Host "`n3. Command-line tools uzhe ustanovleny" -ForegroundColor Green
} else {
    Write-Host "`n3. Zagruzka Android Command-line Tools (~143 MB)..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $cmdlineUrl -OutFile $cmdlineZip -UseBasicParsing
    } catch {
        Write-Host "   Oshibka zagruzki. Proverte internet." -ForegroundColor Red
        Write-Host "   Ruchnaya zagruzka: $cmdlineUrl" -ForegroundColor White
        exit 1
    }

    Write-Host "   Raspakovka..." -ForegroundColor Yellow
    Expand-Archive -Path $cmdlineZip -DestinationPath $sdkPath -Force
    Remove-Item $cmdlineZip -Force -ErrorAction SilentlyContinue

    # Zip soderzhit cmdline-tools\bin, lib... Nuzhno: cmdline-tools\latest\bin
    $ctPath = Join-Path $sdkPath "cmdline-tools"
    $latestPath = Join-Path $ctPath "latest"
    if (Test-Path (Join-Path $ctPath "bin")) {
        New-Item -ItemType Directory -Force -Path $latestPath | Out-Null
        Get-ChildItem $ctPath -Exclude "latest" | Move-Item -Destination $latestPath -Force
    } elseif (Test-Path (Join-Path $ctPath "cmdline-tools\bin")) {
        $inner = Join-Path $ctPath "cmdline-tools"
        New-Item -ItemType Directory -Force -Path $latestPath | Out-Null
        Get-ChildItem $inner | Move-Item -Destination $latestPath -Force
        Remove-Item $inner -Force -ErrorAction SilentlyContinue
    }

    if (-not (Test-Path $cmdlinePath)) {
        Write-Host "   Oshibka struktury. Proverte: $sdkPath\cmdline-tools\" -ForegroundColor Red
        exit 1
    }
    Write-Host "   Command-line tools ustanovleny" -ForegroundColor Green
}

# 4. Prinyatie litsenziy i ustanovka komponentov SDK
Write-Host "`n4. Prinyatie litsenziy..." -ForegroundColor Yellow
$licensesInput = "y`n" * 10
$licensesInput | & $cmdlinePath --sdk_root=$sdkPath --licenses 2>$null
Write-Host "   Ustanovka platform-tools, build-tools, platforms..." -ForegroundColor Yellow
& $cmdlinePath --sdk_root=$sdkPath "platform-tools" "build-tools;34.0.0" "platforms;android-34"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Oshibka ustanovki komponentov." -ForegroundColor Red
    exit 1
}

# 5. ANDROID_HOME i JAVA_HOME v peremennye sredy
$changed = $false
if ([Environment]::GetEnvironmentVariable("ANDROID_HOME", "User") -ne $sdkPath) {
    [Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
    Write-Host "`n5. ANDROID_HOME = $sdkPath" -ForegroundColor Green
    $changed = $true
}
if ($javaHome -and [Environment]::GetEnvironmentVariable("JAVA_HOME", "User") -ne $javaHome) {
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "User")
    Write-Host "   JAVA_HOME = $javaHome" -ForegroundColor Green
    $changed = $true
}
if (-not $changed) {
    Write-Host "`n5. Peremennye sredy uzhe nastroyeny" -ForegroundColor Green
}

Write-Host "`n=== Gotovo! ===" -ForegroundColor Green
Write-Host "Perezapustite terminal (ili VS Code), zatem: npm run apk" -ForegroundColor White
