[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $ProjectRoot,
    [switch] $ConfigureMcp,
    [switch] $Force
)

$ErrorActionPreference = "Stop"
$arguments = @("bin/jev-kit.mjs", "setup", "--project-root", $ProjectRoot)
if ($ConfigureMcp) { $arguments += "--configure-mcp" }
if ($Force) { $arguments += "--force" }
node @arguments
