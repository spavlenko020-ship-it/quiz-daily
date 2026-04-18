param(
  [string]$SourceDir = "dist",
  [string]$OutZip = "quiz-daily-fb.zip"
)

Add-Type -Assembly System.IO.Compression
Add-Type -Assembly System.IO.Compression.FileSystem

$root = (Resolve-Path $SourceDir).Path
$outPath = Join-Path (Resolve-Path ".").Path $OutZip
if (Test-Path $outPath) { Remove-Item $outPath -Force }

$stream = [System.IO.File]::Open($outPath, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)

try {
  $files = Get-ChildItem -Path $root -Recurse -File
  foreach ($f in $files) {
    # Compute relative path and convert backslashes to forward slashes (ZIP spec 4.4.17.1)
    $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
    # Skip source maps
    if ($rel -like "*.map") { continue }
    $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    try {
      $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
      $entryStream.Write($bytes, 0, $bytes.Length)
    } finally {
      $entryStream.Dispose()
    }
    Write-Host "added: $rel"
  }
} finally {
  $archive.Dispose()
  $stream.Dispose()
}

Write-Host "wrote: $outPath"
