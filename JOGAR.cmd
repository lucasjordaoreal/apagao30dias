@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 20 ou superior e abra este arquivo novamente.
  pause
  exit /b 1
)
echo APAGAO: 30 DIAS
echo Abra http://127.0.0.1:4173 no navegador.
echo Mantenha esta janela aberta enquanto joga. Feche para encerrar o servidor local.
start "" "http://127.0.0.1:4173"
node scripts/serve.mjs
pause
