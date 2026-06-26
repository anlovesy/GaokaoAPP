$ErrorActionPreference = "SilentlyContinue"

function Write-Status {
  param(
    [string]$Label,
    [string]$Status,
    [string]$Detail
  )

  "{0,-18} {1,-8} {2}" -f $Label, $Status, $Detail
}

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "GaokaoApp Startup Doctor"
Write-Host "Project: $projectRoot"
Write-Host ""

$node = Get-Command node
$npm = Get-Command npm.cmd
$git = Get-Command git
$python = Get-Command python

if ($node) {
  $nodeVersion = & $node.Source -v 2>$null
  Write-Status "Node.js" "OK" "$nodeVersion ($($node.Source))"
} else {
  Write-Status "Node.js" "MISSING" "Install Node.js 20+ and reopen the terminal."
}

if ($npm) {
  $npmVersion = & $npm.Source -v 2>$null
  Write-Status "npm" "OK" "$npmVersion ($($npm.Source))"
} else {
  Write-Status "npm" "MISSING" "npm.cmd is not on PATH."
}

if ($git) {
  $gitVersion = & $git.Source --version 2>$null
  Write-Status "Git" "OK" "$gitVersion"
} else {
  Write-Status "Git" "WARN" "Git is optional for runtime, but useful for debugging and deployment."
}

if ($python) {
  $pythonVersion = & $python.Source --version 2>$null
  Write-Status "Python" "OK" "$pythonVersion"
} else {
  Write-Status "Python" "WARN" "Python is optional and only needed for some data scripts."
}

$nodeModulesPath = Join-Path $projectRoot "node_modules"
$distIndexPath = Join-Path $projectRoot "dist\index.html"
$serverPath = Join-Path $projectRoot "server\index.js"
$envExamplePath = Join-Path $projectRoot ".env.example"

Write-Status "node_modules" ($(if (Test-Path $nodeModulesPath) { "OK" } else { "MISSING" })) $nodeModulesPath
Write-Status "server/index.js" ($(if (Test-Path $serverPath) { "OK" } else { "MISSING" })) $serverPath
Write-Status "dist/index.html" ($(if (Test-Path $distIndexPath) { "OK" } else { "WARN" })) $(if (Test-Path $distIndexPath) { "Production build is present." } else { "Run npm.cmd run build before starting production mode." })
Write-Status ".env.example" ($(if (Test-Path $envExamplePath) { "OK" } else { "WARN" })) $(if (Test-Path $envExamplePath) { "Reference env template exists." } else { "Env template not found." })

Write-Host ""

if (-not $node -or -not $npm) {
  Write-Host "Blocking issue detected:"
  Write-Host "  This machine currently cannot start the project because Node.js/npm is missing."
  Write-Host ""
  Write-Host "Recommended next steps:"
  Write-Host "  1. Install Node.js 20+"
  Write-Host "  2. Reopen PowerShell"
  Write-Host "  3. Run node -v and npm -v"
  Write-Host "  4. Run .\dev-start.bat or npm.cmd run dev"
  exit 1
}

Write-Host "Environment looks runnable."
Write-Host "Next commands:"
Write-Host "  npm.cmd run dev"
Write-Host "  npm.cmd run build"
