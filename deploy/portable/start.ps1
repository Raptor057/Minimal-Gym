$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiExe = Join-Path $root "api\Team Beauty Brownsville.exe"
$apiPid = Join-Path $root "api.pid"
$nginxExe = Join-Path $root "nginx\nginx.exe"
$nginxPrefix = Join-Path $root "nginx"
$nginxPid = Join-Path $root "nginx.pid"

$env:ASPNETCORE_URLS = "http://127.0.0.1:5057"

if (-not (Test-Path $apiExe)) {
  throw "API binary not found: $apiExe"
}
if (-not (Test-Path $nginxExe)) {
  throw "Nginx binary not found: $nginxExe"
}

$apiProc = Start-Process -FilePath $apiExe -WorkingDirectory (Join-Path $root "api") -PassThru
$apiProc.Id | Set-Content -Path $apiPid -Encoding ascii

$nginxArgs = @("-p", $nginxPrefix, "-c", "conf/nginx.conf", "-g", "pid ../nginx.pid;")
Start-Process -FilePath $nginxExe -WorkingDirectory $nginxPrefix -ArgumentList $nginxArgs | Out-Null

"Open http://localhost"
