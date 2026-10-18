$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $projectRoot '.env'
function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
$template = Get-Content -LiteralPath (Join-Path $projectRoot '.env.example') -Raw
if (Test-Path -LiteralPath $envPath) {
    $content = Get-Content -LiteralPath $envPath -Raw
    Write-Host '.env existente: se conservan los valores y se agregan solo claves nuevas.'
} else {
    $content = $template
}
foreach ($name in @('FALKORDB_PASSWORD', 'API_TOKEN', 'AUTH_SECRET', 'ADMIN_PASSWORD', 'OPERATOR_PASSWORD', 'VIEWER_PASSWORD')) {
    $pattern = "(?m)^$name=(.*)$"
    $match = [regex]::Match($content, $pattern)
    if ($match.Success -and $match.Groups[1].Value -ne 'GENERATE_LOCALLY' -and $match.Groups[1].Value.Length -gt 0) { continue }
    $value = if ($name -eq 'ADMIN_PASSWORD') { 'admin' } else { New-LocalSecret }
    if ($match.Success) {
        $content = [regex]::Replace($content, $pattern, "$name=$value")
    } else {
        $content = $content.TrimEnd("`r", "`n") + "`n$name=$value`n"
    }
}
[System.IO.File]::WriteAllText($envPath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Configuración local lista. Contraseñas guardadas únicamente en .env (excluido de Git).'
