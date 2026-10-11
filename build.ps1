$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputDir = Join-Path $projectRoot 'dist'
$siteFiles = @(
    'index.html',
    'trip.config.js',
    'styles.css',
    'app.js',
    'travel-store.js',
    'travel-manager.js',
    '使用說明.html',
    'LICENSE',
    'THIRD_PARTY_NOTICES.md',
    'map.js',
    'weather.js',
    'vendor/leaflet.css',
    'vendor/leaflet.js',
    'vendor/leaflet-LICENSE.txt',
    'sw.js',
    'manifest.webmanifest',
    'icon.svg',
    '_headers'
)

$resolvedProject = [IO.Path]::GetFullPath($projectRoot).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$resolvedOutput = [IO.Path]::GetFullPath($outputDir)
if (-not $resolvedOutput.StartsWith($resolvedProject, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean output outside the project: $resolvedOutput"
}
if (Test-Path -LiteralPath $resolvedOutput) {
    Get-ChildItem -LiteralPath $resolvedOutput -Force | Remove-Item -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null

foreach ($file in $siteFiles) {
    $destination = Join-Path $outputDir $file
    $destinationParent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $destination -Force
}

$buildVersion = [DateTimeOffset]::UtcNow.ToString('yyyyMMddHHmmss')
$serviceWorkerOutput = Join-Path $outputDir 'sw.js'
$serviceWorkerContent = Get-Content -LiteralPath $serviceWorkerOutput -Raw
$serviceWorkerContent = $serviceWorkerContent.Replace('__BUILD_VERSION__', $buildVersion)
Set-Content -LiteralPath $serviceWorkerOutput -Value $serviceWorkerContent -Encoding utf8 -NoNewline

$archive = Join-Path $projectRoot 'travel-handbook-template.zip'
Compress-Archive -Path (Join-Path $outputDir '*') -DestinationPath $archive -Force
Write-Host "Static template ready: $outputDir (version $buildVersion)"
Write-Host "Open index.html directly, or upload the ZIP later: $archive"
