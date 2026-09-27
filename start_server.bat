@echo off
title Ruzivo AI Server
cd /d "%~dp0"
echo ========================================================
echo         Kutanga Ruzivo AI Server (Port 8080)
echo ========================================================
echo.
python scripts\run_server.py
pause
