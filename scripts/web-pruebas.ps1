param([string]$ApiUrl = "http://localhost:8000")
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path $PSScriptRoot -Parent)
$listeners = @(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -gt 0) {
    throw "El puerto 5173 ya tiene un servidor abierto. Deten el Expo anterior con Ctrl+C antes de iniciar otro; localhost y 127.0.0.1 pueden terminar usando APIs distintas."
}
$ApiUrl = $ApiUrl.TrimEnd("/")
try { $ready = Invoke-RestMethod -Uri "$ApiUrl/dev/ready" -TimeoutSec 10 }
catch { throw "El backend de prueba no responde. Inicia primero C:\proyectos\appSSP-backend\scripts\iniciar-pruebas.ps1." }
if ($ready.status -ne "ok" -or $ready.schema -ne "ssp_test" -or $ready.environment -notin @("development", "test")) {
    throw "La API no confirma el entorno aislado de pruebas. No se inicia Expo."
}
$previousUrl = $env:EXPO_PUBLIC_API_URL
try {
    $env:EXPO_PUBLIC_API_URL = $ApiUrl
    Write-Host "Pruebas locales: http://localhost:5173 -> $ApiUrl -> esquema ssp_test. Usa cuentas ficticias SSP."
    & npx.cmd expo start --web --port 5173 --localhost
    exit $LASTEXITCODE
} finally {
    if ($null -eq $previousUrl) { Remove-Item Env:\EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue }
    else { $env:EXPO_PUBLIC_API_URL = $previousUrl }
}
