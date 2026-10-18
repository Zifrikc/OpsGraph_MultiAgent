$ErrorActionPreference = 'Stop'
python (Join-Path $PSScriptRoot 'deploy_gcp.py') @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
