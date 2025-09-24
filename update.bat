@echo off
cd /d "%~dp0"
echo Haciendo reset hard del repositorio...
git fetch origin && git reset --hard origin/main
echo ✅ Repositorio actualizado correctamente.