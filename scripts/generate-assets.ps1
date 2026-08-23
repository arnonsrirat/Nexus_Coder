Add-Type -AssemblyName System.Drawing

$SidebarJpg = "C:\Users\anons\.gemini\antigravity-ide\brain\ce03a0be-4212-4bbe-a1e8-1e3a4ed254d3\installer_sidebar_art_1787501604388.jpg"
$HeaderJpg = "C:\Users\anons\.gemini\antigravity-ide\brain\ce03a0be-4212-4bbe-a1e8-1e3a4ed254d3\installer_header_art_1787501626477.jpg"
$LogoJpg = "C:\Users\anons\.gemini\antigravity-ide\brain\ce03a0be-4212-4bbe-a1e8-1e3a4ed254d3\nexuscoder_logo_1787500997930.jpg"

$RootDir = Join-Path $PSScriptRoot ".."
$BuildDir = Join-Path $RootDir "build"
$ClientPublicDir = Join-Path $RootDir "client\public"
$ClientAssetsDir = Join-Path $RootDir "client\src\assets"

if (!(Test-Path $BuildDir)) { New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null }

Write-Host "Processing High-Res Hyper Glass Installer Graphics..." -ForegroundColor Cyan

function Resize-Image($sourcePath, $width, $height, $outputPath, $format = [System.Drawing.Imaging.ImageFormat]::Png) {
    $src = [System.Drawing.Image]::FromFile($sourcePath)
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($src, 0, 0, $width, $height)
    $bmp.Save($outputPath, $format)
    $graphics.Dispose()
    $bmp.Dispose()
    $src.Dispose()
    Write-Host "  -> Generated $outputPath ($width x $height)" -ForegroundColor Green
}

# 1. Installer Sidebar (164x314 24bpp BMP)
Resize-Image $SidebarJpg 164 314 (Join-Path $BuildDir "installerSidebar.bmp") ([System.Drawing.Imaging.ImageFormat]::Bmp)

# 2. Installer Header (150x57 24bpp BMP)
Resize-Image $HeaderJpg 150 57 (Join-Path $BuildDir "installerHeader.bmp") ([System.Drawing.Imaging.ImageFormat]::Bmp)

# 3. Logo PNGs & ICO
$srcImg = [System.Drawing.Image]::FromFile($LogoJpg)
Resize-Image $LogoJpg 512 512 (Join-Path $ClientPublicDir "logo.png")
Resize-Image $LogoJpg 512 512 (Join-Path $ClientAssetsDir "logo.png")
Resize-Image $LogoJpg 512 512 (Join-Path $BuildDir "icon.png")
Resize-Image $LogoJpg 64 64 (Join-Path $ClientPublicDir "favicon.png")

# Windows .ICO multi-resolution
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
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]$msList.Count)
$offset = 6 + (16 * $msList.Count)

foreach ($entry in $msList) {
    $s = $entry[0]
    $ms = $entry[1]
    $bytes = $ms.ToArray()
    $bWidth = if ($s -ge 256) { 0 } else { [byte]$s }
    $bHeight = if ($s -ge 256) { 0 } else { [byte]$s }
    $writer.Write([byte]$bWidth)
    $writer.Write([byte]$bHeight)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$bytes.Length)
    $writer.Write([UInt32]$offset)
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

Copy-Item $icoPath (Join-Path $ClientPublicDir "favicon.ico") -Force
Write-Host "All installer graphics and logo assets successfully processed!" -ForegroundColor Green
