$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPid = Join-Path $root "api.pid"
$nginxPid = Join-Path $root "nginx.pid"
$nginxExe = Join-Path $root "nginx\nginx.exe"
$nginxPrefix = Join-Path $root "nginx"

if (Test-Path $nginxExe) {
  & $nginxExe -p $nginxPrefix -c "conf/nginx.conf" -s stop -g "pid ../nginx.pid;" | Out-Null
}

if (Test-Path $nginxPid) {
  $pid = Get-Content $nginxPid -ErrorAction SilentlyContinue
  if ($pid) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $nginxPid -ErrorAction SilentlyContinue
}

if (Test-Path $apiPid) {
  $pid = Get-Content $apiPid -ErrorAction SilentlyContinue
  if ($pid) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $apiPid -ErrorAction SilentlyContinue
} else {
  Get-Process -Name "Team Beauty Brownsville" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
