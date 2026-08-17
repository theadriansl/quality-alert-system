@echo off
chcp 65001 >nul
title IxT-QMS - Backup

:: ============================================
:: CONFIGURACION - EDITAR SEGUN TU SISTEMA
:: ============================================
set POSTGRES_BIN=C:\Program Files\PostgreSQL\17\bin
set DB_NAME=apqp_system
set DB_USER=postgres
set BACKUP_DIR=C:\Backups\IxT-QMS
set UPLOADS_DIR=%~dp0..\backend\uploads

:: ============================================
:: NO MODIFICAR DESDE AQUI
:: ============================================

:: Crear carpeta de backups si no existe
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Obtener fecha y hora
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set FECHA=%datetime:~0,8%_%datetime:~8,4%

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║       IxT-QMS - BACKUP DEL SISTEMA                       ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo Fecha: %FECHA%
echo Destino: %BACKUP_DIR%
echo.

:: Backup de base de datos
echo [1/2] Respaldando base de datos...
"%POSTGRES_BIN%\pg_dump.exe" -U %DB_USER% %DB_NAME% > "%BACKUP_DIR%\db_%FECHA%.sql"
if %errorlevel% equ 0 (
    echo      [OK] Base de datos respaldada
) else (
    echo      [ERROR] Fallo el backup de BD
)

:: Backup de archivos
echo [2/2] Respaldando archivos adjuntos...
if exist "%UPLOADS_DIR%" (
    xcopy "%UPLOADS_DIR%" "%BACKUP_DIR%\uploads_%FECHA%\" /E /I /Q >nul
    echo      [OK] Archivos respaldados
) else (
    echo      [SKIP] No hay carpeta uploads
)

:: Mostrar resultado
echo.
echo ============================================
echo Backup completado en: %BACKUP_DIR%
echo.
dir "%BACKUP_DIR%\*%FECHA%*" /b 2>nul
echo ============================================
echo.

:: Limpiar backups viejos (mas de 30 dias)
echo Limpiando backups antiguos (mas de 30 dias)...
forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @path" 2>nul
forfiles /p "%BACKUP_DIR%" /m uploads_* /d -30 /c "cmd /c rmdir /s /q @path" 2>nul
echo [OK] Limpieza completada
echo.

pause
