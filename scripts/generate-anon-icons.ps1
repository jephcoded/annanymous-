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

$background = New-Color "#190019"
$panel = New-Color "#120814"
$hood = New-Color "#2B124C"
$hoodShade = New-Color "#1B0E2C"
$primary = New-Color "#854F6C"
$secondary = New-Color "#DFB6B2"
$accent = New-Color "#FBE4D8"
$shadow = New-Color "#0A0613"

function Draw-AnonGlyph([System.Drawing.Graphics]$graphics, [bool]$withBackground, [bool]$monochrome) {
  if ($withBackground) {
    $bgPath = New-RoundedRectanglePath 140 140 744 744 160
    $bgBrush = New-Object System.Drawing.SolidBrush($panel)
    $borderPen = New-Object System.Drawing.Pen($(if ($monochrome) { $accent } else { $primary }), 22)
    $graphics.FillPath($bgBrush, $bgPath)
    $graphics.DrawPath($borderPen, $bgPath)
    $bgBrush.Dispose()
    $borderPen.Dispose()
    $bgPath.Dispose()
  }

  $hoodPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $hoodPath.StartFigure()
  $hoodPath.AddBezier(512, 190, 360, 250, 285, 575, 245, 720)
  $hoodPath.AddBezier(245, 720, 230, 820, 794, 820, 779, 720)
  $hoodPath.AddBezier(779, 720, 739, 575, 664, 250, 512, 190)
  $hoodPath.CloseFigure()

  $hoodBrush = New-Object System.Drawing.SolidBrush($(if ($monochrome) { $accent } else { $hood }))
  $graphics.FillPath($hoodBrush, $hoodPath)
  $hoodBrush.Dispose()

  if (-not $monochrome) {
    $shadePath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shadePath.StartFigure()
    $shadePath.AddBezier(512, 290, 420, 325, 365, 558, 345, 658)
    $shadePath.AddBezier(345, 658, 336, 720, 688, 720, 679, 658)
    $shadePath.AddBezier(679, 658, 659, 558, 604, 325, 512, 290)
    $shadePath.CloseFigure()
    $shadeBrush = New-Object System.Drawing.SolidBrush($hoodShade)
    $graphics.FillPath($shadeBrush, $shadePath)
    $shadeBrush.Dispose()
    $shadePath.Dispose()
  }

  $faceBrush = New-Object System.Drawing.SolidBrush($(if ($monochrome) { $background } else { $shadow }))
  $graphics.FillEllipse($faceBrush, 404, 348, 216, 286)
  $faceBrush.Dispose()

  if (-not $monochrome) {
    $visorPath = New-RoundedRectanglePath 400 440 224 44 22
    $visorBrush = New-Object System.Drawing.SolidBrush($secondary)
    $graphics.FillPath($visorBrush, $visorPath)
    $visorBrush.Dispose()
    $visorPath.Dispose()
  }

  $floorOuterBrush = New-Object System.Drawing.SolidBrush($(if ($monochrome) { $accent } else { $primary }))
  $graphics.FillEllipse($floorOuterBrush, 280, 620, 464, 142)
  $floorOuterBrush.Dispose()

  if (-not $monochrome) {
    $floorInnerBrush = New-Object System.Drawing.SolidBrush($accent)
    $graphics.FillEllipse($floorInnerBrush, 360, 686, 304, 34)
    $floorInnerBrush.Dispose()
  }

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

Save-Png $iconCanvas.Bitmap $iconPath
Save-Png $foregroundCanvas.Bitmap $foregroundPath
Save-Png $backgroundCanvas.Bitmap $backgroundPath
Save-Png $monochromeCanvas.Bitmap $monochromePath
Save-Png $iconCanvas.Bitmap $splashPath

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