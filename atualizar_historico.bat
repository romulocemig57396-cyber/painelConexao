@echo off
setlocal

REM ============================================
REM Detecta Node e Git automaticamente
REM ============================================

REM Tenta usar Node do PATH primeiro
where node >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] Node encontrado no PATH do sistema
) else (
  REM Tenta localizacoes portateis comuns
  if exist "C:\Users\%USERNAME%\node-v24.19.0-win-x64\node.exe" (
    set "PATH=%PATH%;C:\Users\%USERNAME%\node-v24.19.0-win-x64"
    echo [OK] Node portatil encontrado em C:\Users\%USERNAME%\node-v24.19.0-win-x64
  ) else if exist "C:\Users\c057396\node-v24.19.0-win-x64\node.exe" (
    set "PATH=%PATH%;C:\Users\c057396\node-v24.19.0-win-x64"
    echo [OK] Node portatil encontrado em C:\Users\c057396\node-v24.19.0-win-x64
  ) else if exist "%RAIZ%node\node.exe" (
    set "PATH=%PATH%;%RAIZ%node"
    echo [OK] Node encontrado na pasta do projeto
  ) else (
    echo [ERRO] Node nao encontrado! Instale Node.js ou ajuste o caminho.
    pause
    exit /b 1
  )
)

REM Tenta usar Git do PATH primeiro
where git >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] Git encontrado no PATH do sistema
) else (
  REM Tenta localizacoes portateis comuns
  if exist "C:\Users\%USERNAME%\PortableGit\cmd\git.exe" (
    set "PATH=%PATH%;C:\Users\%USERNAME%\PortableGit\cmd"
    echo [OK] Git portatil encontrado em C:\Users\%USERNAME%\PortableGit\cmd
  ) else if exist "C:\Users\c057396\PortableGit\cmd\git.exe" (
    set "PATH=%PATH%;C:\Users\c057396\PortableGit\cmd"
    echo [OK] Git portatil encontrado em C:\Users\c057396\PortableGit\cmd
  ) else if exist "C:\Program Files\Git\cmd\git.exe" (
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    echo [OK] Git encontrado em C:\Program Files\Git
  ) else (
    echo [ERRO] Git nao encontrado! Instale Git ou ajuste o caminho.
    pause
    exit /b 1
  )
)

set "RAIZ=%~dp0"
set "DOCS=%RAIZ%docs"

echo.
echo ============================================
echo  Atualizando historico publico (GitHub Pages)
echo ============================================

if not exist "%DOCS%\.git" (
  echo.
  echo [ERRO] "%DOCS%" ainda nao e um repositorio Git.
  echo Rode a configuracao inicial uma unica vez antes de usar este atalho
  echo ^(veja PUBLICACAO.md, secao "Configuracao inicial do repositorio docs/"^).
  echo.
  pause
  exit /b 1
)

echo.
echo [1/4] Exportando dados do banco...
node "%RAIZ%server\scripts\exportarHistoricoEstatico.js"
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao exportar os dados. Nada foi publicado.
  pause
  exit /b 1
)

cd /d "%DOCS%"

echo.
echo [2/4] Sincronizando com o GitHub antes de publicar...
git pull --ff-only
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel sincronizar com o repositorio remoto.
  echo Resolva manualmente ^(git status / git pull^) antes de tentar de novo.
  pause
  exit /b 1
)

echo.
echo [3/4] Verificando alteracoes...
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma mudanca desde a ultima publicacao. Nada a enviar.
  pause
  exit /b 0
)

git commit -m "Atualizacao automatica dos dados - %date% %time%"
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao commitar as mudancas.
  pause
  exit /b 1
)

echo.
echo [4/4] Enviando para o GitHub...
git push
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao enviar para o GitHub. Verifique sua conexao/login do git.
  echo As mudancas ja foram commitadas localmente em docs\ - rode "git push"
  echo manualmente dentro da pasta docs\ quando resolver o problema.
  pause
  exit /b 1
)

echo.
echo Concluido! O site sera atualizado em alguns minutos no link do GitHub Pages.
pause