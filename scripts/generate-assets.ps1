Add-Type -AssemblyName System.Drawing

$SourceJpg = "C:\Users\anons\.gemini\antigravity-ide\brain\ce03a0be-4212-4bbe-a1e8-1e3a4ed254d3\nexuscoder_logo_1787500997930.jpg"
$RootDir = Join-Path $PSScriptRoot ".."
$BuildDir = Join-Path $RootDir "build"
$ClientPublicDir = Join-Path $RootDir "client\public"
$ClientAssetsDir = Join-Path $RootDir "client\src\assets"

if (!(Test-Path $BuildDir)) { New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null }
if (!(Test-Path $ClientPublicDir)) { New-Item -ItemType Directory -Path $ClientPublicDir -Force | Out-Null }
if (!(Test-Path $ClientAssetsDir)) { New-Item -ItemType Directory -Path $ClientAssetsDir -Force | Out-Null }

Write-Host "Processing NexusCoder Logo Assets..." -ForegroundColor Cyan

# Load source image
$srcImg = [System.Drawing.Image]::FromFile($SourceJpg)

# Helper function to resize and save
function Resize-Image($image, $width, $height, $outputPath, $format = [System.Drawing.Imaging.ImageFormat]::Png) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($image, 0, 0, $width, $height)
    $bmp.Save($outputPath, $format)
    $graphics.Dispose()
    $bmp.Dispose()
    Write-Host "  -> Generated $outputPath ($width x $height)" -ForegroundColor Green
}

# 1. client/public/logo.png (512x512)
Resize-Image $srcImg 512 512 (Join-Path $ClientPublicDir "logo.png")

# 2. client/src/assets/logo.png (512x512)
Resize-Image $srcImg 512 512 (Join-Path $ClientAssetsDir "logo.png")

# 3. build/icon.png (512x512)
Resize-Image $srcImg 512 512 (Join-Path $BuildDir "icon.png")

# 4. client/public/favicon.png (64x64)
Resize-Image $srcImg 64 64 (Join-Path $ClientPublicDir "favicon.png")

# 5. NSIS Installer Sidebar & Header BMPs
Resize-Image $srcImg 150 57 (Join-Path $BuildDir "installerHeader.bmp") ([System.Drawing.Imaging.ImageFormat]::Bmp)
Resize-Image $srcImg 164 314 (Join-Path $BuildDir "installerSidebar.bmp") ([System.Drawing.Imaging.ImageFormat]::Bmp)

# 6. Convert to standard Windows .ICO format (Icon with PNG payloads for 16, 32, 48, 64, 128, 256)
$icoPath = Join-Path $BuildDir "icon.ico"
$sizes = @(16, 32, 48, 64, 128, 256)
$msList = @()

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($srcImg, 0, 0, $s, $s)
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $msList += ,@($s, $ms)
}

$icoStream = [System.IO.File]::OpenWrite($icoPath)
$writer = New-Object System.IO.BinaryWriter($icoStream)

# ICONDIR Header
$writer.Write([UInt16]0) # Reserved
$writer.Write([UInt16]1) # Type 1 = Icon
$writer.Write([UInt16]$msList.Count) # Number of images

$offset = 6 + (16 * $msList.Count)

foreach ($entry in $msList) {
    $s = $entry[0]
    $ms = $entry[1]
    $bytes = $ms.ToArray()
    $bWidth = if ($s -ge 256) { 0 } else { [byte]$s }
    $bHeight = if ($s -ge 256) { 0 } else { [byte]$s }

    $writer.Write([byte]$bWidth)
    $writer.Write([byte]$bHeight)
    $writer.Write([byte]0) # Color count
    $writer.Write([byte]0) # Reserved
    $writer.Write([UInt16]1) # Color planes
    $writer.Write([UInt16]32) # Bits per pixel
    $writer.Write([UInt32]$bytes.Length) # Image size in bytes
    $writer.Write([UInt32]$offset) # Image offset

    $offset += $bytes.Length
}

foreach ($entry in $msList) {
    $ms = $entry[1]
    $bytes = $ms.ToArray()
    $writer.Write($bytes)
    $ms.Dispose()
}

$writer.Close()
$icoStream.Close()
$srcImg.Dispose()

Write-Host "  -> Generated Windows Icon: $icoPath (Multi-resolution 16-256px)" -ForegroundColor Green

# Copy icon.ico to client/public
Copy-Item $icoPath (Join-Path $ClientPublicDir "favicon.ico") -Force
Write-Host "All assets generated successfully!" -ForegroundColor Green
