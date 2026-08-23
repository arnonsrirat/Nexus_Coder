$PfxPath = Join-Path $PSScriptRoot "..\build\nexus-code-signing.pfx"
$CerPath = Join-Path $PSScriptRoot "..\build\nexus-publisher.cer"
$Password = "NexusCoder123!"

if (Test-Path $PfxPath) {
    Write-Host "Loading PFX from $PfxPath..." -ForegroundColor Cyan
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($PfxPath, $Password, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)
    $cerBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    [System.IO.File]::WriteAllBytes($CerPath, $cerBytes)
    Write-Host "Exported CER to $CerPath" -ForegroundColor Green

    Write-Host "Adding to User Trusted Root Certification Authorities..." -ForegroundColor Cyan
    certutil.exe -user -addstore Root $CerPath
    
    Write-Host "Adding to User Trusted Publishers..." -ForegroundColor Cyan
    certutil.exe -user -addstore TrustedPublisher $CerPath
    
    Write-Host "Certificate is now fully trusted by Windows!" -ForegroundColor Green
} else {
    Write-Error "PFX file not found at $PfxPath"
}
