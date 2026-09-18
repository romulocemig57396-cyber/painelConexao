@echo off
setlocal

REM Registra o protocolo painelmedidas:// no Windows apontando pro
REM iniciar-painel.bat desta MESMA pasta, onde quer que ela esteja
REM (conta de usuário, letra de unidade, nome de pasta etc.) — substitui o
REM antigo registrar-protocolo-painelmedidas.reg, que tinha o caminho de uma
REM única máquina/usuário gravado dentro do arquivo e não funcionava em
REM nenhuma outra instalação.

set "ALVO=%~dp0iniciar-painel.bat"

if not exist "%ALVO%" (
  echo [ERRO] Nao encontrei "%ALVO%".
  echo Rode este .bat de dentro da pasta do projeto, junto com iniciar-painel.bat.
  pause
  exit /b 1
)

reg add "HKCU\Software\Classes\painelmedidas" /ve /d "URL:Painel de Medidas Protocol" /f >nul
reg add "HKCU\Software\Classes\painelmedidas" /v "URL Protocol" /t REG_SZ /d "" /f >nul
reg add "HKCU\Software\Classes\painelmedidas\shell\open\command" /ve /d "\"%ALVO%\" \"%%1\"" /f >nul

if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao registrar o protocolo no Windows.
  pause
  exit /b 1
)

echo.
echo Protocolo painelmedidas:// registrado com sucesso, apontando para:
echo   %ALVO%
pause
