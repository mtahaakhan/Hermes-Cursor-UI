$ErrorActionPreference = "Stop"

$repoUrl = if ($env:HERMES_CURSOR_REPO) { $env:HERMES_CURSOR_REPO } else { "https://github.com/mtahaakhan/Hermes-Cursor-UI.git" }
$ref = if ($env:HERMES_CURSOR_REF) { $env:HERMES_CURSOR_REF } else { "main" }
$hermesRoot = if ($env:HERMES_HOME) { $env:HERMES_HOME } else { Join-Path $HOME ".hermes" }
$installDir = if ($env:HERMES_CURSOR_HOME) { $env:HERMES_CURSOR_HOME } else { Join-Path $hermesRoot "cursor-ui" }
$binDir = if ($env:HERMES_CURSOR_BIN_DIR) { $env:HERMES_CURSOR_BIN_DIR } else { Join-Path $HOME ".local\bin" }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "git is required." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "Node.js/npm is required for installation." }

if (Test-Path $installDir) {
    if (-not (Test-Path (Join-Path $installDir ".git"))) { throw "$installDir exists but is not a git checkout." }
    $originUrl = git -C $installDir remote get-url origin
    if ($originUrl -ne $repoUrl) { throw "$installDir uses origin '$originUrl', expected '$repoUrl'." }
    $dirty = git -C $installDir status --porcelain
    if ($dirty) { throw "$installDir has local changes; commit or remove them before updating." }
    $currentBranch = git -C $installDir branch --show-current
    if ($currentBranch -ne $ref) { throw "$installDir is on '$currentBranch', expected '$ref'." }
    Write-Host "Updating Hermes Cursor UI..."
    git -C $installDir pull --ff-only origin $ref
} else {
    Write-Host "Installing Hermes Cursor UI into $installDir..."
    New-Item -ItemType Directory -Force -Path (Split-Path $installDir) | Out-Null
    git clone --depth 1 --branch $ref $repoUrl $installDir
}

Push-Location $installDir
try {
    Write-Host "Installing browser dependencies..."
    npm ci
    Write-Host "Building production browser assets..."
    npm run build --workspace apps/desktop
} finally {
    Pop-Location
}

New-Item -ItemType Directory -Force -Path $binDir | Out-Null
$wrapper = Join-Path $binDir "hermes-cursor.cmd"
$launcher = Join-Path $installDir "bin\hermes-cursor.cmd"
Set-Content -Path $wrapper -Encoding ASCII -Value "@echo off`r`ncall `"$launcher`" %*`r`n"

& $wrapper --help *> $null
if ($LASTEXITCODE -ne 0) { throw "Hermes was not found. Install Hermes, then rerun this installer." }

Write-Host ""
Write-Host "Hermes Cursor UI is installed."
Write-Host "Run: hermes-cursor"
if (-not (($env:PATH -split ';') -contains $binDir)) {
    Write-Host "Add $binDir to PATH if the command is not found."
}
