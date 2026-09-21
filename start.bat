@echo off
title App Costi Uscite Casatenovo & Seregno
echo =================================================================
echo   AVVIO APPLICAZIONE COSTI USCITE & INTERVENTI
echo =================================================================
echo.
cd /d "%~dp0"

echo 1. Rilevamento indirizzo IP locale per la condivisione...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo =================================================================
echo  [TUO COMPUTER]:   http://localhost:3000
echo  [COLLEGHI RETE]:  http://%LOCAL_IP%:3000
echo =================================================================
echo.
echo 2. Apertura del browser in corso...

:: Apri automaticamente il browser dopo 3 secondi
start "" powershell -windowstyle hidden -command "Start-Sleep -s 3; Start-Process 'http://localhost:3000'"

echo.
echo PER CHIUDERE L'APPLICAZIONE: Chiudi questa finestra.
echo =================================================================
echo.

cmd /c npm run dev
