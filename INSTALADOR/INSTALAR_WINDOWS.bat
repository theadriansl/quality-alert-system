@echo off
chcp 65001 >nul
title IxT-QMS - Instalador

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║       IxT-QMS - INSTALADOR AUTOMATICO                    ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Verificar Node.js
echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo de: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado

:: Ir a carpeta backend
cd /d "%~dp0..\backend"

:: Verificar si existe .env
if not exist ".env" (
    echo.
    echo [ADVERTENCIA] No existe archivo .env
    echo Copiando desde ejemplo...
    copy "%~dp0.env.ejemplo" ".env" >nul
    echo [OK] Archivo .env creado
    echo.
    echo IMPORTANTE: Edita backend\.env con tu contrasena de PostgreSQL
    echo.
    pause
)

:: Instalar dependencias backend
echo.
echo Instalando dependencias del backend...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias del backend
    pause
    exit /b 1
)
echo [OK] Dependencias del backend instaladas

:: Ejecutar migraciones
echo.
echo Configurando base de datos...
node "%~dp0scripts\instalar_bd.js"

:: Ir a carpeta frontend
cd /d "%~dp0..\frontend"

:: Instalar dependencias frontend
echo.
echo Instalando dependencias del frontend...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias del frontend
    pause
    exit /b 1
)
echo [OK] Dependencias del frontend instaladas

:: Finalizado
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║            INSTALACION COMPLETADA                        ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo Para iniciar el sistema:
echo   1. Abre una terminal en backend\ y ejecuta: npm start
echo   2. Abre otra terminal en frontend\ y ejecuta: npm start
echo   3. Abre el navegador en: http://localhost:3000
echo.
echo Usuario inicial: admin@company.com / admin123
echo.
pause
