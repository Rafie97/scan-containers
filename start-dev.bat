@echo off
REM start-dev.bat - Windows wrapper to detect host LAN IP and run docker-compose
REM Usage: start-dev.bat

REM Try to detect a private IPv4 (192.168.* or 10.*) using PowerShell
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {($_.IPAddress -notlike '127.*') -and ($_.IPAddress -notlike '169.*') -and ($_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*')} ^| Select-Object -First 1 -ExpandProperty IPAddress"`) do set HOST_IP=%%i

if "%HOST_IP%"=="" (
  echo Could not auto-detect a suitable host IP.
  echo Please enter your host LAN IP (e.g. 192.168.8.180) and press Enter:
  set /p HOST_IP=
  if "%HOST_IP%"=="" (
    echo No HOST_IP provided. Exiting.
    pause
    exit /b 1
  )
)

echo Detected HOST_IP=%HOST_IP%

REM Export HOST_IP for docker-compose; on Windows we pass it via environment variable for the single command
set HOST_IP=%HOST_IP%

echo Starting docker-compose with HOST_IP=%HOST_IP%

docker-compose up --build
pause
