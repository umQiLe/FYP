Add-Type -AssemblyName System.Drawing
$valid = $true

try {
    $pngPath = "C:\Users\PC1\Downloads\PTT_AP2\ptt-frontend\public\logo.png"
    $icoPath = "C:\Users\PC1\Downloads\PTT_AP2\logo.ico"

    Write-Host "Reading PNG from: $pngPath"
    if (-Not (Test-Path $pngPath)) {
        Write-Error "PNG file not found!"
        exit 1
    }

    $png = [System.Drawing.Bitmap]::FromFile($pngPath)
    $ico = [System.Drawing.Icon]::FromHandle($png.GetHicon())
    
    $fs = [System.IO.File]::OpenWrite($icoPath)
    $ico.Save($fs)
    $fs.Close()
    
    $png.Dispose()
    $ico.Dispose()
    
    Write-Host "Created ICO at: $icoPath"
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
