$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot

function New-Color([string]$hex, [int]$alpha = 255) {
  $value = $hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb(
    $alpha,
    [Convert]::ToInt32($value.Substring(0, 2), 16),
    [Convert]::ToInt32($value.Substring(2, 2), 16),
    [Convert]::ToInt32($value.Substring(4, 2), 16)
  )
}

function New-RoundedRectanglePath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $radius * 2

  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-Canvas([int]$size) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Png([System.Drawing.Bitmap]$bitmap, [string]$path) {
  $directory = Split-Path -Parent $path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }

  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Resize-And-Save([System.Drawing.Bitmap]$source, [int]$size, [string]$path) {
  $target = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($source, 0, 0, $size, $size)
  $graphics.Dispose()

  Save-Png $target $path
  $target.Dispose()
}

# Palette matches src/theme.ts COLORS so the icon reads as the same app.
$background = New-Color "#050505"
$panel = New-Color "#0B0B10"
$hood = New-Color "#8B3DFF"
$visor = New-Color "#F7F2FF"
$border = New-Color "#8B3DFF" 60

function New-HoodPath {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.StartFigure()
  # Left side: hood peak down to shoulder
  $path.AddBezier(512, 156, 330, 196, 216, 418, 197, 646)
  # Left shoulder flare
  $path.AddBezier(197, 646, 192, 754, 202, 842, 266, 872)
  # Bottom edge (shoulders)
  $path.AddLine(266, 872, 758, 872)
  # Right shoulder flare
  $path.AddBezier(758, 872, 822, 842, 832, 754, 827, 646)
  # Right side: shoulder back up to hood peak
  $path.AddBezier(827, 646, 808, 418, 694, 196, 512, 156)
  $path.CloseFigure()

  return $path
}

function Draw-AnonGlyph([System.Drawing.Graphics]$graphics, [bool]$withTile, [bool]$monochrome) {
  if ($withTile) {
    $bgPath = New-RoundedRectanglePath 96 96 832 832 176
    $bgBrush = New-Object System.Drawing.SolidBrush($panel)
    $borderPen = New-Object System.Drawing.Pen($border, 4)
    $graphics.FillPath($bgBrush, $bgPath)
    $graphics.DrawPath($borderPen, $bgPath)
    $bgBrush.Dispose()
    $borderPen.Dispose()
    $bgPath.Dispose()
  }

  $hoodPath = New-HoodPath
  $hoodBrush = New-Object System.Drawing.SolidBrush($(if ($monochrome) { [System.Drawing.Color]::Black } else { $hood }))
  $graphics.FillPath($hoodBrush, $hoodPath)
  $hoodBrush.Dispose()

  # Visor: a single clean bar reads as an eye-line at small sizes.
  $visorPath = New-RoundedRectanglePath 372 486 280 56 28
  if ($monochrome) {
    # Punch a true transparent hole so the alpha-mask silhouette keeps the visor detail.
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $visorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Transparent)
    $graphics.FillPath($visorBrush, $visorPath)
    $visorBrush.Dispose()
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  } else {
    $visorBrush = New-Object System.Drawing.SolidBrush($visor)
    $graphics.FillPath($visorBrush, $visorPath)
    $visorBrush.Dispose()
  }
  $visorPath.Dispose()

  $hoodPath.Dispose()
}

$iconCanvas = New-Canvas 1024
$iconCanvas.Graphics.Clear($background)
Draw-AnonGlyph $iconCanvas.Graphics $true $false

$foregroundCanvas = New-Canvas 1024
Draw-AnonGlyph $foregroundCanvas.Graphics $false $false

$backgroundCanvas = New-Canvas 1024
$backgroundCanvas.Graphics.Clear($background)

$monochromeCanvas = New-Canvas 1024
Draw-AnonGlyph $monochromeCanvas.Graphics $false $true

$iconPath = Join-Path $root "assets\images\icon.png"
$foregroundPath = Join-Path $root "assets\images\android-icon-foreground.png"
$backgroundPath = Join-Path $root "assets\images\android-icon-background.png"
$monochromePath = Join-Path $root "assets\images\android-icon-monochrome.png"
$splashPath = Join-Path $root "assets\images\splash-icon.png"
$faviconPath = Join-Path $root "assets\images\favicon.png"

Save-Png $iconCanvas.Bitmap $iconPath
Save-Png $foregroundCanvas.Bitmap $foregroundPath
Save-Png $backgroundCanvas.Bitmap $backgroundPath
Save-Png $monochromeCanvas.Bitmap $monochromePath
Save-Png $iconCanvas.Bitmap $splashPath
Resize-And-Save $iconCanvas.Bitmap 256 $faviconPath

$mipmapSizes = @{
  "mipmap-mdpi" = 48
  "mipmap-hdpi" = 72
  "mipmap-xhdpi" = 96
  "mipmap-xxhdpi" = 144
  "mipmap-xxxhdpi" = 192
}

foreach ($entry in $mipmapSizes.GetEnumerator()) {
  $folder = Join-Path $root "android\app\src\main\res\$($entry.Key)"
  Resize-And-Save $iconCanvas.Bitmap $entry.Value (Join-Path $folder "ic_launcher.png")
  Resize-And-Save $iconCanvas.Bitmap $entry.Value (Join-Path $folder "ic_launcher_round.png")
  Resize-And-Save $foregroundCanvas.Bitmap $entry.Value (Join-Path $folder "ic_launcher_foreground.png")
  Resize-And-Save $backgroundCanvas.Bitmap $entry.Value (Join-Path $folder "ic_launcher_background.png")
  Resize-And-Save $monochromeCanvas.Bitmap $entry.Value (Join-Path $folder "ic_launcher_monochrome.png")
}

$drawableSizes = @{
  "drawable-mdpi" = 160
  "drawable-hdpi" = 240
  "drawable-xhdpi" = 320
  "drawable-xxhdpi" = 480
  "drawable-xxxhdpi" = 640
}

foreach ($entry in $drawableSizes.GetEnumerator()) {
  $folder = Join-Path $root "android\app\src\main\res\$($entry.Key)"
  if (Test-Path $folder) {
    Resize-And-Save $iconCanvas.Bitmap $entry.Value (Join-Path $folder "splashscreen_logo.png")
  }
}

$iconCanvas.Graphics.Dispose()
$iconCanvas.Bitmap.Dispose()
$foregroundCanvas.Graphics.Dispose()
$foregroundCanvas.Bitmap.Dispose()
$backgroundCanvas.Graphics.Dispose()
$backgroundCanvas.Bitmap.Dispose()
$monochromeCanvas.Graphics.Dispose()
$monochromeCanvas.Bitmap.Dispose()

Write-Output "Icons generated."
