[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $ProjectRoot,
    [switch] $RemoveProjectAssets,
    [switch] $RemoveMcp
)

$ErrorActionPreference = "Stop"
$arguments = @("bin/jev-kit.mjs", "uninstall", "--project-root", $ProjectRoot)
if ($RemoveProjectAssets) { $arguments += "--remove-project-assets" }
if ($RemoveMcp) { $arguments += "--remove-mcp" }
node @arguments
