@echo off
REM Visual-regression gate (Gate 3): render every chart in a real browser and compare
REM against the committed screenshot baselines, inside the pinned Playwright image so
REM results match CI regardless of host OS.
REM
REM   run_e2e.bat           compare against baselines (fails on visual drift)
REM   run_e2e.bat update    regenerate the baselines (after an intended visual change)

setlocal
set "IMAGE=mcr.microsoft.com/playwright:v1.60.0-noble"
set "MODE=%~1"
if "%MODE%"=="" set "MODE=check"
set "PW_ARGS="
if "%MODE%"=="update" set "PW_ARGS=--update-snapshots"

echo ==^> Playwright visual gate (%MODE%) in %IMAGE%
docker run --rm --ipc=host -v "%CD%:/work" -v /work/node_modules -w /work %IMAGE% bash -lc "npm ci && npm run build && npx playwright test %PW_ARGS%"
if errorlevel 1 (
  echo.
  echo E2E visual gate FAILED - see playwright-report\
  exit /b 1
)

echo E2E visual gate passed.
