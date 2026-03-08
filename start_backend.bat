@echo off
title SMC Backend
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
echo Starting SMC Backend on http://localhost:8000 ...
python main.py
pause
