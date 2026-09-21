@echo off
cd /d "%~dp0"
start /min "App Costi Uscite Server" cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
start http://localhost:3000
