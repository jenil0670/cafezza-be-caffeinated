Add-Type -AssemblyName System.Drawing

$srcDir = "c:\Users\Admin\Desktop\cafezza\frames"
$destDir = "c:\Users\Admin\Desktop\cafezza\upscaled_frames"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
}

$newWidth = 2560
$newHeight = 1440

$codecs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageDecoders()
$jpegCodec = $codecs | Where-Object { $_.FormatDescription -eq "JPEG" }

# Set JPEG quality to 85 for a good balance of quality and file size
$encoder = [System.Drawing.Imaging.Encoder]::Quality
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [long]85)

Write-Host "Starting batch upscale of 300 frames to 2560x1440 (Quality: 85)..."

for ($i = 1; $i -le 300; $i++) {
    $numStr = $i.ToString("000")
    $srcPath = Join-Path $srcDir "ezgif-frame-$numStr.jpg"
    $destPath = Join-Path $destDir "ezgif-frame-$numStr.jpg"

    if (Test-Path $srcPath) {
        try {
            $srcImg = [System.Drawing.Image]::FromFile($srcPath)
            $destImg = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
            $g = [System.Drawing.Graphics]::FromImage($destImg)

            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            $g.DrawImage($srcImg, 0, 0, $newWidth, $newHeight)

            $destImg.Save($destPath, $jpegCodec, $encoderParams)

            $g.Dispose()
            $destImg.Dispose()
            $srcImg.Dispose()
        } catch {
            Write-Error "Failed to process frame $numStr. Error: $_"
        }
    } else {
        Write-Warning "Source file not found: $srcPath"
    }

    if ($i % 30 -eq 0) {
        Write-Host "Processed $i/300 frames ($(($i/300 * 100).ToString('0'))%)..."
    }
}

Write-Host "All frames upscaled successfully to: $destDir"
