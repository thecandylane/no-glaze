# no-glaze installer shim (Windows). Delegates to bin/install.js.
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$localInstaller = Join-Path $scriptDir 'bin\install.js'

if (Test-Path $localInstaller) {
  & node $localInstaller @args
} else {
  & npx -y github:thecandylane/no-glaze @args
}
