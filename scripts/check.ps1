$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Get-Content -LiteralPath (Join-Path $projectRoot '.env') | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
}
$env:FALKORDB_HOST='localhost'
$env:FALKORDB_PORT='6380'
$env:RUN_INTEGRATION='1'
Push-Location (Join-Path $projectRoot 'apps/api')
try {
    python -m uv run pytest -q
    if ($LASTEXITCODE -ne 0) { throw 'Backend checks failed' }
} finally { Pop-Location }
Push-Location (Join-Path $projectRoot 'apps/web')
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
} finally { Pop-Location }
