@echo off
title SMC Signal Platform - Setup
color 0A

echo ================================================
echo   SMC Signal Platform - Windows Setup Script
echo ================================================
echo.

:: ── Check Python ────────────────────────────────────────────────
echo [1/5] Checking Python...
python --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found. Install Python 3.11+ from https://python.org
    pause
    exit /b 1
)
echo Python OK.

:: ── Check Node ──────────────────────────────────────────────────
echo.
echo [2/5] Checking Node.js...
node --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Install Node 20+ from https://nodejs.org
    pause
    exit /b 1
)
echo Node.js OK.

:: ── Backend venv ────────────────────────────────────────────────
echo.
echo [3/5] Setting up Python virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
echo Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt
cd ..
echo Backend dependencies installed.

:: ── Frontend ────────────────────────────────────────────────────
echo.
echo [4/5] Installing frontend dependencies...
cd frontend
call npm install
cd ..
echo Frontend dependencies installed.

:: ── .env file ───────────────────────────────────────────────────
echo.
echo [5/5] Creating .env file...
if not exist backend\.env (
    echo # Optional Binance API keys (not needed for public market data)> backend\.env
    echo BINANCE_API_KEY=>> backend\.env
    echo BINANCE_API_SECRET=>> backend\.env
    echo Created backend\.env
) else (
    echo backend\.env already exists, skipping.
)

echo.
echo ================================================
echo   SETUP COMPLETE!
echo.
echo   To start:
echo     Terminal 1:  cd backend ^&^& venv\Scripts\activate ^&^& python main.py
echo     Terminal 2:  cd frontend ^&^& npm start
echo.
echo   Then open:  http://localhost:3000
echo ================================================
pause
