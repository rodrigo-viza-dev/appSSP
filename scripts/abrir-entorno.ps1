$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\proyectos\appSSP'
& 'C:\Users\rodri\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd' --new-window 'C:\proyectos\appSSP'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo solicitar la apertura de VS Code.' }
$taskProcess = Start-Process -FilePath 'C:\Windows\System32\wsl.exe' -ArgumentList '-d kali-linux --cd /mnt/c/proyectos/appSSP -- bash -ic "bash scripts/continuar-codex.sh"' -PassThru
Write-Output ('Se solicito una nueva consola WSL para Codex. PID: ' + $taskProcess.Id)
