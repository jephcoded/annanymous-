Add-Type -AssemblyName System.Drawing

$imgDir = Join-Path $PSScriptRoot '..\assets\images'
$imgDir = [System.IO.Path]::GetFullPath($imgDir)

function New-Canvas {
  param(
    [int]$Size,
    [string]$Background
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
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

function Draw-ClassicBadge {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Size,
    [string]$Primary,
    [string]$Secondary,
    [string]$TextColor,
    [bool]$TransparentBackground = $false
  )

  if ($TransparentBackground) {
    $Graphics.Clear([System.Drawing.Color]::Transparent)
  }

  $outerRect = New-Object System.Drawing.RectangleF ($Size * 0.12), ($Size * 0.12), ($Size * 0.76), ($Size * 0.76)
  $innerRect = New-Object System.Drawing.RectangleF ($Size * 0.18), ($Size * 0.18), ($Size * 0.64), ($Size * 0.64)
  $accentRect = New-Object System.Drawing.RectangleF ($Size * 0.26), ($Size * 0.62), ($Size * 0.48), ($Size * 0.12)

  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush $outerRect, ([System.Drawing.ColorTranslator]::FromHtml($Primary)), ([System.Drawing.ColorTranslator]::FromHtml($Secondary)), 45
  $ringPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(45, 255, 255, 255)), ($Size * 0.02)
  $innerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 11, 16, 32))
  $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Secondary))
  $font = [System.Drawing.Font]::new('Segoe UI', [float]([Math]::Round($Size * 0.30)), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($TextColor))
  $stringFormat = New-Object System.Drawing.StringFormat
  $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = New-Object System.Drawing.RectangleF 0, ($Size * 0.03), $Size, ($Size * 0.66)

  $Graphics.FillEllipse($gradient, $outerRect)
  $Graphics.DrawEllipse($ringPen, $outerRect)
  $Graphics.FillEllipse($innerBrush, $innerRect)
  $Graphics.FillEllipse($accentBrush, $accentRect)
  $Graphics.DrawString('A', $font, $textBrush, $textRect, $stringFormat)

  $stringFormat.Dispose()
  $textBrush.Dispose()
  $font.Dispose()
  $accentBrush.Dispose()
  $innerBrush.Dispose()
  $ringPen.Dispose()
  $gradient.Dispose()
}

$icon = New-Canvas -Size 1024 -Background '#0B1020'
Draw-ClassicBadge -Graphics $icon.Graphics -Size 1024 -Primary '#6D5DF6' -Secondary '#19C6FF' -TextColor '#F5F7FF'
Save-Png -Bitmap $icon.Bitmap -Path (Join-Path $imgDir 'icon.png')
$icon.Graphics.Dispose()
$icon.Bitmap.Dispose()

$splash = New-Canvas -Size 1024 -Background '#0B1020'
Draw-ClassicBadge -Graphics $splash.Graphics -Size 1024 -Primary '#6D5DF6' -Secondary '#19C6FF' -TextColor '#F5F7FF' -TransparentBackground $true
Save-Png -Bitmap $splash.Bitmap -Path (Join-Path $imgDir 'splash-icon.png')
$splash.Graphics.Dispose()
$splash.Bitmap.Dispose()

$foreground = New-Canvas -Size 1024 -Background '#000000'
Draw-ClassicBadge -Graphics $foreground.Graphics -Size 1024 -Primary '#6D5DF6' -Secondary '#19C6FF' -TextColor '#F5F7FF' -TransparentBackground $true
Save-Png -Bitmap $foreground.Bitmap -Path (Join-Path $imgDir 'android-icon-foreground.png')
$foreground.Graphics.Dispose()
$foreground.Bitmap.Dispose()

$background = New-Canvas -Size 1024 -Background '#0B1020'
Save-Png -Bitmap $background.Bitmap -Path (Join-Path $imgDir 'android-icon-background.png')
$background.Graphics.Dispose()
$background.Bitmap.Dispose()

$monochrome = New-Canvas -Size 1024 -Background '#000000'
$monochrome.Graphics.Clear([System.Drawing.Color]::Transparent)
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$blackBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)
$font = [System.Drawing.Font]::new('Segoe UI', 310.0, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$stringFormat = New-Object System.Drawing.StringFormat
$stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

$monochrome.Graphics.FillEllipse($whiteBrush, (New-Object System.Drawing.RectangleF 122, 122, 780, 780))
$monochrome.Graphics.FillEllipse($blackBrush, (New-Object System.Drawing.RectangleF 184, 184, 656, 656))
$monochrome.Graphics.DrawString('A', $font, $whiteBrush, (New-Object System.Drawing.RectangleF 0, 30, 1024, 676), $stringFormat)
$monochrome.Graphics.FillEllipse($whiteBrush, (New-Object System.Drawing.RectangleF 266, 634, 492, 122))
Save-Png -Bitmap $monochrome.Bitmap -Path (Join-Path $imgDir 'android-icon-monochrome.png')

$stringFormat.Dispose()
$font.Dispose()
$blackBrush.Dispose()
$whiteBrush.Dispose()
$monochrome.Graphics.Dispose()
$monochrome.Bitmap.Dispose()

Write-Output 'Classic icon and splash assets generated.'
