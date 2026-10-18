$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envPath) { Write-Host '.env ya existe; se conserva.'; exit 0 }
function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
$dbPassword = New-LocalSecret
$apiToken = New-LocalSecret
$content = Get-Content -LiteralPath (Join-Path $projectRoot '.env.example') -Raw
$content = $content.Replace('FALKORDB_PASSWORD=GENERATE_LOCALLY', "FALKORDB_PASSWORD=$dbPassword")
$content = $content.Replace('API_TOKEN=GENERATE_LOCALLY', "API_TOKEN=$apiToken")
[System.IO.File]::WriteAllText($envPath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Configuración local creada. Contraseñas guardadas únicamente en .env (excluido de Git).'
