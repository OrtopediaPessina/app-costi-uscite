@echo off
title Generatore Link Online per Seregno
echo =================================================================
echo   GENERATORE LINK ONLINE TEMPORANEO (PER SEREGNO / FUORI SEDE)
echo =================================================================
echo.
echo Assicurati che l'app sia avviata con start.bat!
echo Generazione del link pubblico in corso...
echo.

cd /d "%~dp0"
cmd /c npx --yes localtunnel --port 3000

pause
