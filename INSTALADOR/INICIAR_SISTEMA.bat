@echo off
chcp 65001 >nul
title IxT-QMS - Iniciando Sistema

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║       IxT-QMS - INICIANDO SISTEMA                        ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Iniciar Backend en nueva ventana
echo Iniciando Backend...
start "IxT-QMS Backend" cmd /k "cd /d %~dp0..\backend && npm start"

:: Esperar 3 segundos para que el backend inicie
timeout /t 3 /nobreak >nul

:: Iniciar Frontend en nueva ventana
echo Iniciando Frontend...
start "IxT-QMS Frontend" cmd /k "cd /d %~dp0..\frontend && npm start"

echo.
echo Sistema iniciando...
echo - Backend: http://localhost:3001
echo - Frontend: http://localhost:3000
echo.
echo Espera unos segundos y el navegador se abrira automaticamente.
echo.
timeout /t 5
