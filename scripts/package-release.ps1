param(
  [string]$Archive = "2sh-release.zip"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ArchivePath = Join-Path $RepoRoot $Archive

if (Test-Path $ArchivePath) {
  Remove-Item $ArchivePath -Force
}

$ExcludedDirectories = @(
  ".git"
  ".next"
  "node_modules"
  "var"
)

$ExcludedFiles = @(
  ".env.production"
  $Archive
  "2sh-release.tgz"
  "2sh-release.zip"
)

function Get-ArchiveRelativePath {
  param(
    [string]$BasePath,
    [string]$FullPath
  )

  $trimmedBase = $BasePath.TrimEnd("\", "/")
  $trimmedFullPath = $FullPath

  if ($trimmedFullPath.StartsWith($trimmedBase)) {
    $relativePath = $trimmedFullPath.Substring($trimmedBase.Length).TrimStart("\", "/")
  }
  else {
    $relativePath = $trimmedFullPath
  }

  return ($relativePath -replace "\\", "/")
}

$FilesToArchive = Get-ChildItem -LiteralPath $RepoRoot -Recurse -File -Force | Where-Object {
  $relativePath = Get-ArchiveRelativePath -BasePath $RepoRoot -FullPath $_.FullName

  if ($ExcludedFiles -contains $relativePath) {
    return $false
  }

  foreach ($directory in $ExcludedDirectories) {
    if ($relativePath -eq $directory -or $relativePath.StartsWith("$directory/")) {
      return $false
    }
  }

  return $true
}

$ArchiveStream = [System.IO.File]::Open($ArchivePath, [System.IO.FileMode]::CreateNew)
try {
  $ZipArchive = [System.IO.Compression.ZipArchive]::new($ArchiveStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    foreach ($file in $FilesToArchive) {
      $entryName = Get-ArchiveRelativePath -BasePath $RepoRoot -FullPath $file.FullName
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $ZipArchive,
        $file.FullName,
        $entryName,
        [System.IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  }
  finally {
    $ZipArchive.Dispose()
  }
}
finally {
  $ArchiveStream.Dispose()
}

Write-Host "Created release bundle: $ArchivePath"
