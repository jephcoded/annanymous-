Add-Type -AssemblyName System.Drawing

$imgDir = Join-Path $PSScriptRoot '..\assets\images'
$imgDir = [System.IO.Path]::GetFullPath($imgDir)

$ThemeBackground = '#050B12'
$Card = '#0D1822'
$Primary = '#1B87A6'
$Moon = '#EAF4FA'
$Accent = '#0B0F14'
$Mist = '#93A5B6'

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = [Math]::Min($Radius * 2, [Math]::Min($Width, $Height))
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-Canvas {
  param(
    [int]$Size,
    [string]$Background
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($Background))

  return @{
    Bitmap = $bitmap
    Graphics = $graphics
  }
}

function Save-Png {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Resize-Bitmap {
  param(
    [System.Drawing.Bitmap]$Source,
    [int]$Size
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($Source, 0, 0, $Size, $Size)
  $graphics.Dispose()

  return $bitmap
}

function Export-AndroidLauncherPngs {
  param(
    [System.Drawing.Bitmap]$Icon,
    [System.Drawing.Bitmap]$Foreground,
    [System.Drawing.Bitmap]$Background,
    [System.Drawing.Bitmap]$Monochrome
  )

  $androidResDir = Join-Path $PSScriptRoot '..\android\app\src\main\res'
  $androidResDir = [System.IO.Path]::GetFullPath($androidResDir)
  $densities = @(
    @{ Folder = 'mipmap-mdpi'; Size = 48; Foreground = 108 },
    @{ Folder = 'mipmap-hdpi'; Size = 72; Foreground = 162 },
    @{ Folder = 'mipmap-xhdpi'; Size = 96; Foreground = 216 },
    @{ Folder = 'mipmap-xxhdpi'; Size = 144; Foreground = 324 },
    @{ Folder = 'mipmap-xxxhdpi'; Size = 192; Foreground = 432 }
  )

  foreach ($density in $densities) {
    $dir = Join-Path $androidResDir $density.Folder

    $iconBitmap = Resize-Bitmap -Source $Icon -Size $density.Size
    Save-Png -Bitmap $iconBitmap -Path (Join-Path $dir 'ic_launcher.png')
    Save-Png -Bitmap $iconBitmap -Path (Join-Path $dir 'ic_launcher_round.png')
    $iconBitmap.Dispose()

    $bgBitmap = Resize-Bitmap -Source $Background -Size $density.Foreground
    Save-Png -Bitmap $bgBitmap -Path (Join-Path $dir 'ic_launcher_background.png')
    $bgBitmap.Dispose()

    $fgBitmap = Resize-Bitmap -Source $Foreground -Size $density.Foreground
    Save-Png -Bitmap $fgBitmap -Path (Join-Path $dir 'ic_launcher_foreground.png')
    $fgBitmap.Dispose()

    $monoBitmap = Resize-Bitmap -Source $Monochrome -Size $density.Foreground
    Save-Png -Bitmap $monoBitmap -Path (Join-Path $dir 'ic_launcher_monochrome.png')
    $monoBitmap.Dispose()
  }
}

function Draw-BackgroundScene {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Size,
    [bool]$TransparentBackground = $false
  )

  if ($TransparentBackground) {
    $Graphics.Clear([System.Drawing.Color]::Transparent)
  } else {
    $Graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($ThemeBackground))
  }

  $skyRect = New-Object System.Drawing.RectangleF 0, 0, $Size, $Size
  $skyGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush $skyRect, ([System.Drawing.ColorTranslator]::FromHtml('#08131C')), ([System.Drawing.ColorTranslator]::FromHtml('#03080D')), 90
  $topGlowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(38, 27, 135, 166))
  $baseGlowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(46, 0, 214, 255))
  $mistBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(18, 147, 165, 182))

  $Graphics.FillRectangle($skyGradient, $skyRect)
  $Graphics.FillEllipse($topGlowBrush, ($Size * 0.19), ($Size * 0.08), ($Size * 0.62), ($Size * 0.48))
  $Graphics.FillEllipse($baseGlowBrush, ($Size * 0.16), ($Size * 0.72), ($Size * 0.68), ($Size * 0.12))
  $Graphics.FillEllipse($mistBrush, ($Size * 0.10), ($Size * 0.68), ($Size * 0.80), ($Size * 0.16))

  $mistBrush.Dispose()
  $baseGlowBrush.Dispose()
  $topGlowBrush.Dispose()
  $skyGradient.Dispose()
}

function Draw-NocturneMark {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Size,
    [bool]$TransparentBackground = $false
  )

  if ($TransparentBackground) {
    $Graphics.Clear([System.Drawing.Color]::Transparent)
  }

  $badgeBounds = New-Object System.Drawing.RectangleF ($Size * 0.18), ($Size * 0.14), ($Size * 0.64), ($Size * 0.72)
  $badgePath = New-RoundedRectPath -X $badgeBounds.X -Y $badgeBounds.Y -Width $badgeBounds.Width -Height $badgeBounds.Height -Radius ($Size * 0.13)
  $badgeGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush $badgeBounds, ([System.Drawing.ColorTranslator]::FromHtml('#101722')), ([System.Drawing.ColorTranslator]::FromHtml('#05080D')), 90
  $badgeStroke = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(200, 95, 124, 255)), ($Size * 0.018)
  $hoodGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush $badgeBounds, ([System.Drawing.ColorTranslator]::FromHtml('#2A3646')), ([System.Drawing.ColorTranslator]::FromHtml('#0A1018')), 90
  $shoulderBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#070C11'))
  $faceBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 2, 4, 6))
  $softGlowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 56, 196, 255))
  $rimBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(58, 145, 168, 190))
  $hoodPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $outerPoints = @(
    [System.Drawing.PointF]::new(($Size * 0.27), ($Size * 0.77)),
    [System.Drawing.PointF]::new(($Size * 0.30), ($Size * 0.48)),
    [System.Drawing.PointF]::new(($Size * 0.39), ($Size * 0.24)),
    [System.Drawing.PointF]::new(($Size * 0.50), ($Size * 0.16)),
    [System.Drawing.PointF]::new(($Size * 0.61), ($Size * 0.24)),
    [System.Drawing.PointF]::new(($Size * 0.70), ($Size * 0.48)),
    [System.Drawing.PointF]::new(($Size * 0.73), ($Size * 0.77))
  )
  $visorPath = New-RoundedRectPath -X ($Size * 0.39) -Y ($Size * 0.43) -Width ($Size * 0.22) -Height ($Size * 0.042) -Radius ($Size * 0.018)

  $hoodPath.AddClosedCurve($outerPoints, 0.42)
  $Graphics.FillPath($badgeGradient, $badgePath)
  $Graphics.DrawPath($badgeStroke, $badgePath)
  $Graphics.FillEllipse($softGlowBrush, ($Size * 0.26), ($Size * 0.62), ($Size * 0.48), ($Size * 0.12))
  $Graphics.FillPath($hoodGradient, $hoodPath)
  $Graphics.FillEllipse($shoulderBrush, ($Size * 0.27), ($Size * 0.61), ($Size * 0.46), ($Size * 0.13))
  $Graphics.FillEllipse($faceBrush, ($Size * 0.39), ($Size * 0.34), ($Size * 0.22), ($Size * 0.27))
  $Graphics.FillPath($rimBrush, $visorPath)
  $Graphics.FillEllipse($rimBrush, ($Size * 0.35), ($Size * 0.71), ($Size * 0.30), ($Size * 0.03))

  $visorPath.Dispose()
  $hoodPath.Dispose()
  $softGlowBrush.Dispose()
  $rimBrush.Dispose()
  $faceBrush.Dispose()
  $shoulderBrush.Dispose()
  $hoodGradient.Dispose()
  $badgeStroke.Dispose()
  $badgeGradient.Dispose()
  $badgePath.Dispose()
}

$icon = New-Canvas -Size 1024 -Background $ThemeBackground
Draw-BackgroundScene -Graphics $icon.Graphics -Size 1024
Draw-NocturneMark -Graphics $icon.Graphics -Size 1024
Save-Png -Bitmap $icon.Bitmap -Path (Join-Path $imgDir 'icon.png')
$icon.Graphics.Dispose()

$splash = New-Canvas -Size 1024 -Background $ThemeBackground
Draw-NocturneMark -Graphics $splash.Graphics -Size 1024 -TransparentBackground $true
Save-Png -Bitmap $splash.Bitmap -Path (Join-Path $imgDir 'splash-icon.png')
$splash.Graphics.Dispose()
$splash.Bitmap.Dispose()

$foreground = New-Canvas -Size 1024 -Background '#000000'
Draw-NocturneMark -Graphics $foreground.Graphics -Size 1024 -TransparentBackground $true
Save-Png -Bitmap $foreground.Bitmap -Path (Join-Path $imgDir 'android-icon-foreground.png')
$foreground.Graphics.Dispose()

$background = New-Canvas -Size 1024 -Background $ThemeBackground
Draw-BackgroundScene -Graphics $background.Graphics -Size 1024
Save-Png -Bitmap $background.Bitmap -Path (Join-Path $imgDir 'android-icon-background.png')
$background.Graphics.Dispose()

$monochrome = New-Canvas -Size 1024 -Background '#000000'
$monochrome.Graphics.Clear([System.Drawing.Color]::Transparent)
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$monoPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$monoPoints = @(
  [System.Drawing.PointF]::new(286, 756),
  [System.Drawing.PointF]::new(324, 492),
  [System.Drawing.PointF]::new(390, 286),
  [System.Drawing.PointF]::new(512, 204),
  [System.Drawing.PointF]::new(634, 286),
  [System.Drawing.PointF]::new(700, 492),
  [System.Drawing.PointF]::new(738, 756)
)
$visorCutout = New-RoundedRectPath -X 400 -Y 426 -Width 224 -Height 46 -Radius 18

$monoPath.AddClosedCurve($monoPoints, 0.42)
$monochrome.Graphics.FillPath($whiteBrush, $monoPath)
$monochrome.Graphics.FillEllipse($whiteBrush, (New-Object System.Drawing.RectangleF 286, 612, 452, 142))
$monochrome.Graphics.FillEllipse([System.Drawing.Brushes]::Black, (New-Object System.Drawing.RectangleF 398, 342, 228, 282))
$monochrome.Graphics.FillPath([System.Drawing.Brushes]::Black, $visorCutout)
Save-Png -Bitmap $monochrome.Bitmap -Path (Join-Path $imgDir 'android-icon-monochrome.png')

Export-AndroidLauncherPngs `
  -Icon $icon.Bitmap `
  -Foreground $foreground.Bitmap `
  -Background $background.Bitmap `
  -Monochrome $monochrome.Bitmap

$visorCutout.Dispose()
$monoPath.Dispose()
$whiteBrush.Dispose()
$monochrome.Graphics.Dispose()

$favicon = New-Canvas -Size 256 -Background $ThemeBackground
Draw-BackgroundScene -Graphics $favicon.Graphics -Size 256
Draw-NocturneMark -Graphics $favicon.Graphics -Size 256
Save-Png -Bitmap $favicon.Bitmap -Path (Join-Path $imgDir 'favicon.png')
$darkImagePath = Join-Path $imgDir 'dark.png'
Save-Png -Bitmap $icon.Bitmap -Path $darkImagePath
$favicon.Graphics.Dispose()
$favicon.Bitmap.Dispose()

$icon.Bitmap.Dispose()
$foreground.Bitmap.Dispose()
$background.Bitmap.Dispose()
$monochrome.Bitmap.Dispose()

Write-Output 'Nocturne icon and splash assets generated.'
