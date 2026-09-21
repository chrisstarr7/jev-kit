[CmdletBinding()]
param([switch] $RunEval)

$ErrorActionPreference = "Stop"
node scripts/verify.mjs
if ($RunEval) { python project/docs/jev/evals/evaluate.py }
