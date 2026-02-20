Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path (Get-Location) 'public\icon.png'

if (!(Test-Path $sourcePath)) {
    Write-Host "No se encontro icon.png en public"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($sourcePath)

foreach ($size in @(16, 48, 128)) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Alta calidad
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $graph.DrawImage($img, 0, 0, $size, $size)
    $path = Join-Path (Get-Location) "public\icon${size}.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Generado icon${size}.png"
    
    $graph.Dispose()
    $bmp.Dispose()
}

$img.Dispose()
Write-Host "Exito"
