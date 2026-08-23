# PowerShell script to generate and trust a Windows Code Signing Certificate
# This prevents Windows SmartScreen warnings ("Windows protected your PC") on your machine.

$CertDir = Join-Path $PSScriptRoot "..\build"
if (!(Test-Path $CertDir)) {
    New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
}

$PfxPath = Join-Path $CertDir "nexus-code-signing.pfx"
$CertPassword = ConvertTo-SecureString -String "NexusCoder123!" -Force -AsPlainText
$CertSubject = "CN=arnon_srirat, O=arnon_srirat, OU=Development, C=TH"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  NexusCoder - Windows Code Signing Certificate Generator" -ForegroundColor Cyan
Write-Host "  Publisher: arnon_srirat" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Check if certificate already exists in cert store
$ExistingCert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*arnon_srirat*" } | Select-Object -First 1

if ($null -eq $ExistingCert) {
    Write-Host "[1/3] Generating new self-signed Code Signing Certificate..." -ForegroundColor Yellow
    $Cert = New-SelfSignedCertificate -Type CodeSigningCert `
        -Subject $CertSubject `
        -HashAlgorithm SHA256 `
        -KeyLength 2048 `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter (Get-Date).AddYears(5)
    Write-Host "  -> Created Certificate Thumbprint: $($Cert.Thumbprint)" -ForegroundColor Green
} else {
    Write-Host "[1/3] Found existing Certificate in CurrentUser\My ($($ExistingCert.Thumbprint))" -ForegroundColor Green
    $Cert = $ExistingCert
}

# Export to PFX
Write-Host "[2/3] Exporting certificate to $PfxPath..." -ForegroundColor Yellow
Export-PfxCertificate -Cert $Cert -FilePath $PfxPath -Password $CertPassword | Out-Null
Write-Host "  -> Successfully exported PFX file!" -ForegroundColor Green

# Install into Trusted Root & Trusted Publisher so Windows SmartScreen won't warn
Write-Host "[3/3] Installing certificate into Windows Trusted Root & Trusted Publishers..." -ForegroundColor Yellow
try {
    $RootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
    $RootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $RootStore.Add($Cert)
    $RootStore.Close()

    $PublisherStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "CurrentUser")
    $PublisherStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $PublisherStore.Add($Cert)
    $PublisherStore.Close()

    Write-Host "  -> Certificate successfully installed to Trusted Stores!" -ForegroundColor Green
} catch {
    Write-Host "  -> Note: Run as Administrator if system-wide trust is needed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Code Signing Setup Completed Successfully!" -ForegroundColor Green
Write-Host "  PFX file: $PfxPath" -ForegroundColor White
Write-Host "  Password: NexusCoder123!" -ForegroundColor White
Write-Host "  Your builds (npm run build:exe) will now be signed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
