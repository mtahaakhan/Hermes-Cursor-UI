@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."

if defined HERMES_PYTHON set "PYTHON_EXE=%HERMES_PYTHON%"
if not defined PYTHON_EXE if exist "%PROJECT_ROOT%\.venv\Scripts\python.exe" set "PYTHON_EXE=%PROJECT_ROOT%\.venv\Scripts\python.exe"
if not defined PYTHON_EXE if exist "%PROJECT_ROOT%\venv\Scripts\python.exe" set "PYTHON_EXE=%PROJECT_ROOT%\venv\Scripts\python.exe"
if not defined PYTHON_EXE if exist "%USERPROFILE%\.hermes\hermes-agent\venv\Scripts\python.exe" set "PYTHON_EXE=%USERPROFILE%\.hermes\hermes-agent\venv\Scripts\python.exe"
if not defined PYTHON_EXE set "PYTHON_EXE=python"

pushd "%PROJECT_ROOT%"
"%PYTHON_EXE%" -c "import fastapi, uvicorn, yaml" >nul 2>&1
if errorlevel 1 (
  popd
  echo Hermes Cursor UI could not find a compatible Hermes Python environment. 1>&2
  echo Install Hermes first, or set HERMES_PYTHON to its Python executable. 1>&2
  exit /b 1
)

"%PYTHON_EXE%" -m hermes_cli.main desktop %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
