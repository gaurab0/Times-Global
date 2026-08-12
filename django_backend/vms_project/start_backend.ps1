param(
    [string]$HostAddress = "127.0.0.1",
    [int]$Port = 8000,
    [switch]$SkipInstall,
    [switch]$UsePostgres,
    [switch]$NoMigrate,
    [switch]$NoReload,
    [switch]$Background
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSCommandPath
$VenvDir = Join-Path $ProjectRoot "myenv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$Requirements = Join-Path $ProjectRoot "requirements.txt"

function Test-PortOpen {
    param([string]$Address, [int]$PortNumber)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $client.BeginConnect($Address, $PortNumber, $null, $null)
        if (-not $connect.AsyncWaitHandle.WaitOne(500, $false)) {
            return $false
        }
        $client.EndConnect($connect)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

if ($Background) {
    if (Test-PortOpen -Address $HostAddress -PortNumber $Port) {
        Write-Host "Django backend is already running at http://$HostAddress`:$Port/"
        exit 0
    }

    $stdoutLog = Join-Path $ProjectRoot "backend_server_latest.log"
    $stderrLog = Join-Path $ProjectRoot "backend_server_latest.err.log"
    $argsList = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "`"$PSCommandPath`"",
        "-HostAddress",
        $HostAddress,
        "-Port",
        $Port,
        "-NoReload"
    )

    if ($SkipInstall) { $argsList += "-SkipInstall" }
    if ($UsePostgres) { $argsList += "-UsePostgres" }
    if ($NoMigrate) { $argsList += "-NoMigrate" }

    Start-Process `
        -FilePath "powershell" `
        -ArgumentList $argsList `
        -WorkingDirectory $ProjectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog

    Write-Host "Starting Django backend in the background at http://$HostAddress`:$Port/"
    Write-Host "Logs: $stdoutLog"
    exit 0
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating Python virtual environment in $VenvDir..."

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        & python -m venv $VenvDir
    }
    else {
        $pythonLauncher = Get-Command py -ErrorAction SilentlyContinue
        if ($pythonLauncher) {
            & py -m venv $VenvDir
        }
        else {
            throw "Could not find Python. Install Python, then rerun this script."
        }
    }
}

Set-Location $ProjectRoot

if ($UsePostgres) {
    $env:DJANGO_USE_SQLITE = "False"
}
else {
    $env:DJANGO_USE_SQLITE = "True"
}

if (-not $SkipInstall) {
    & $VenvPython -c "import corsheaders, django, django_filters, psycopg2, rest_framework; import rest_framework_simplejwt; import PIL" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing backend requirements..."
        & $VenvPython -m pip install --upgrade pip
        & $VenvPython -m pip install -r $Requirements
    }
}

if (-not $NoMigrate) {
    Write-Host "Applying backend migrations..."
    & $VenvPython manage.py migrate --noinput
}

$runserverArgs = @("manage.py", "runserver", "$HostAddress`:$Port")
if ($NoReload) {
    $runserverArgs += "--noreload"
}

Write-Host "Starting Django backend at http://$HostAddress`:$Port/"
& $VenvPython $runserverArgs
