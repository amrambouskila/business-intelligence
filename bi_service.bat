@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM              CONFIGURATION (EDIT THESE ONLY)
REM ============================================================
set "SERVICE_PREFIX=business-intelligence"
set "COMPOSE_FILE=docker-compose.yml"
if not defined BI_PORT set "BI_PORT=5176"
set "URL=http://localhost:%BI_PORT%"

REM ============================================================
REM                     START THE SERVICE
REM ============================================================
call :start_service

:show_menu
echo.
echo ==============================
echo Service running at %URL%
echo.
echo   k = stop (keep image)
echo   q = stop + remove image
echo   v = stop + remove image + volumes
echo   r = full restart (stop, remove, rebuild, relaunch)
echo ==============================

REM ============================================================
REM                     MAIN LOOP
REM ============================================================
:main_loop
set /p "CHOICE=Enter selection (k/q/v/r): "
if /I "%CHOICE%"=="k" goto do_stop
if /I "%CHOICE%"=="q" goto do_cleanup
if /I "%CHOICE%"=="v" goto do_cleanup_volumes
if /I "%CHOICE%"=="r" goto do_restart
echo Invalid selection. Enter k, q, v, or r.
goto main_loop

REM ============================================================
REM            k = STOP BUT KEEP IMAGE
REM ============================================================
:do_stop
echo.
echo Stopping containers but keeping images...
docker compose -f "%COMPOSE_FILE%" down
echo Done.
goto end_script

REM ============================================================
REM            q = STOP + REMOVE IMAGE
REM ============================================================
:do_cleanup
echo.
echo Stopping and removing all containers...
docker compose -f "%COMPOSE_FILE%" down --remove-orphans
call :remove_images
echo Done.
goto end_script

REM ============================================================
REM            v = STOP + REMOVE IMAGE + VOLUMES
REM ============================================================
:do_cleanup_volumes
echo.
echo Stopping and removing all containers and volumes...
docker compose -f "%COMPOSE_FILE%" down --volumes --remove-orphans
call :remove_images
echo Done.
goto end_script

REM ============================================================
REM            r = FULL RESTART
REM ============================================================
:do_restart
echo.
echo === FULL RESTART ===
docker compose -f "%COMPOSE_FILE%" down --remove-orphans
call :remove_images
echo.
call :start_service
goto show_menu

REM ============================================================
REM                    HELPER: START SERVICE
REM ============================================================
:start_service
echo Starting Docker Compose...
docker compose -f "%COMPOSE_FILE%" up --build -d
goto :eof

REM ============================================================
REM                    HELPER: REMOVE IMAGES
REM ============================================================
:remove_images
echo.
echo Searching for images starting with "%SERVICE_PREFIX%"...

set "TARGET_IMAGE="

for /f "delims=" %%I in ('
    docker images --format "{{.Repository}}:{{.Tag}}" ^| findstr /I "^%SERVICE_PREFIX%"
') do (
    set "TARGET_IMAGE=%%I"
    echo Found image: %%I
    echo Removing image %%I...
    docker rmi -f "%%I" 2>nul
)

if not defined TARGET_IMAGE (
    echo No images found matching prefix "%SERVICE_PREFIX%".
)

goto :eof

REM ============================================================
REM                            END
REM ============================================================
:end_script
exit /B
