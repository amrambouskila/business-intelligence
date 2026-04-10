@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM              CONFIGURATION (EDIT THESE ONLY)
REM ============================================================
set "SERVICE_PREFIX=business-intelligence"
set "COMPOSE_FILE=docker-compose.yml"

REM ============================================================
REM                     RUN DOCKER COMPOSE
REM ============================================================
echo Starting Docker Compose...
docker compose -f "%COMPOSE_FILE%" up --build -d

echo.
echo ==============================
echo Service running.
echo Press k + Enter = stop but keep image
echo Press q + Enter = stop ^& remove image
echo Press v + Enter = stop, remove image ^& volumes
echo ==============================

:wait_choice
set /p "CHOICE=Enter selection (k/q/v): "
if /I "%CHOICE%"=="k" goto stop_only
if /I "%CHOICE%"=="q" goto full_cleanup
if /I "%CHOICE%"=="v" goto full_cleanup_with_volumes
goto wait_choice

REM ============================================================
REM                 STOP BUT KEEP IMAGE
REM ============================================================
:stop_only
echo.
echo Stopping containers but keeping images...
docker compose -f "%COMPOSE_FILE%" down
goto end_script

REM ============================================================
REM         FULL CLEANUP: STOP + REMOVE IMAGES (NO VOLUMES)
REM ============================================================
:full_cleanup
echo.
echo Stopping and removing all containers...
docker compose -f "%COMPOSE_FILE%" down --remove-orphans
goto remove_images

REM ============================================================
REM   FULL CLEANUP WITH VOLUMES: STOP + VOLUMES + IMAGES
REM ============================================================
:full_cleanup_with_volumes
echo.
echo Stopping and removing all containers and volumes...
docker compose -f "%COMPOSE_FILE%" down --volumes --remove-orphans
goto remove_images

REM ============================================================
REM       SHARED IMAGE REMOVAL LOGIC (USED BY q AND v)
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

goto end_script

REM ============================================================
REM                            END
REM ============================================================
:end_script
exit /B
