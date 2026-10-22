param([string]$LanHost = "", [int]$ApiPort = 8000)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path $PSScriptRoot -Parent)
if (-not $LanHost) {
    $LanHost = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address -and $_.InterfaceAlias -notmatch 'vEthernet|WSL' } | ForEach-Object { $_.IPv4Address.IPAddress } | Select-Object -First 1
}
$parsed = $null
if (-not [System.Net.IPAddress]::TryParse($LanHost, [ref]$parsed)) { throw "No se encontro la IP de Windows. Indica -LanHost." }
$api = "http://${LanHost}:$ApiPort"
try { $ready = Invoke-RestMethod -Uri "$api/dev/ready" -TimeoutSec 10 }
catch { throw "La API no responde por LAN. Ejecuta primero en el backend: .\scripts\iniciar-pruebas.ps1 -Lan -LanHost $LanHost" }
if ($ready.schema -ne "ssp_test" -or $ready.environment -notin @("development", "test")) { throw "La API no confirma el entorno aislado de pruebas." }
if (@(Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue).Count) { throw "El puerto 5173 esta ocupado. Deten el Expo anterior antes de iniciar el modo celular." }
$previous = $env:EXPO_PUBLIC_API_URL
try {
    $env:EXPO_PUBLIC_API_URL = $api
    Write-Host "Android: misma red Wi-Fi que Windows. Escanea el QR con Expo Go para probar el ingreso SSP."
    Write-Host "Tambien puedes abrir http://${LanHost}:5173 en Chrome Android. Google requiere OAuth y una compilacion de desarrollo."
    & npx.cmd expo start --lan --port 5173
    exit $LASTEXITCODE
} finally {
    if ($null -eq $previous) { Remove-Item Env:\EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue } else { $env:EXPO_PUBLIC_API_URL = $previous }
}
