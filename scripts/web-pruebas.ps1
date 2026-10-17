param([string]$ApiUrl = "http://localhost:8000")
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path $PSScriptRoot -Parent)
$ApiUrl = $ApiUrl.TrimEnd("/")
try { $ready = Invoke-RestMethod -Uri "$ApiUrl/dev/ready" -TimeoutSec 10 }
catch { throw "El backend de prueba no responde. Inicia primero C:\proyectos\appSSP-backend\scripts\iniciar-pruebas.ps1." }
if ($ready.status -ne "ok" -or $ready.schema -ne "ssp_test" -or $ready.environment -notin @("development", "test")) {
    throw "La API no confirma el entorno aislado de pruebas. No se inicia Expo."
}
$previousUrl = $env:EXPO_PUBLIC_API_URL
try {
    $env:EXPO_PUBLIC_API_URL = $ApiUrl
    & npx.cmd expo start --web --port 5173 --localhost
    exit $LASTEXITCODE
} finally {
    if ($null -eq $previousUrl) { Remove-Item Env:\EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue }
    else { $env:EXPO_PUBLIC_API_URL = $previousUrl }
}
