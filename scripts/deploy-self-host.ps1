param(
  [string]$DeployHost = "119.28.190.25",
  [string]$User = "root",
  [int]$Port = 22,
  [string]$AppDir = "/srv/2sh",
  [string]$Archive = "2sh-release.zip",
  [string]$RemoteArchive = "/root/2sh-release.zip",
  [switch]$SkipPackage
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ArchivePath = Join-Path $RepoRoot $Archive
$RemoteTarget = "$User@$DeployHost"

if (-not $SkipPackage) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "package-release.ps1") -Archive $Archive
  if ($LASTEXITCODE -ne 0) {
    throw "package-release.ps1 exited with code $LASTEXITCODE"
  }
}

& scp -P $Port $ArchivePath "${RemoteTarget}:$RemoteArchive"
if ($LASTEXITCODE -ne 0) {
  throw "scp exited with code $LASTEXITCODE"
}

$RemoteScript = @"
set -euxo pipefail
mkdir -p '$AppDir'
find '$AppDir' -mindepth 1 -maxdepth 1 ! -name '.env.production' -exec rm -rf {} +
python3 -m zipfile -e '$RemoteArchive' '$AppDir'
cd '$AppDir'
docker compose up -d --build --remove-orphans
docker compose ps
curl -I http://127.0.0.1 || true
curl -fsS http://127.0.0.1/api/dictionary/current >/dev/null
"@

& ssh -p $Port $RemoteTarget $RemoteScript
if ($LASTEXITCODE -ne 0) {
  throw "ssh exited with code $LASTEXITCODE"
}
