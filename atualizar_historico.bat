@echo off
setlocal

set "RAIZ=%~dp0"

REM O painel externo agora mora no Portal Conexao MT (via HTTP) - nao tem
REM mais site estatico/GitHub Pages/git nesse fluxo, so precisa do Node
REM pra rodar o script de exportacao.

REM Se a rede corporativa intercepta TLS (proxy/firewall trocando o
REM certificado por um da CA interna), o envio vai falhar com
REM "UNABLE_TO_GET_ISSUER_CERT_LOCALLY". Se acontecer, exporte o certificado
REM raiz da CA interna (certmgr.msc > Autoridades de Certificacao Raiz
REM Confiaveis > Certificados > exportar como Base-64 X.509 .CER) e
REM descomente a linha abaixo apontando pro arquivo:
REM set "NODE_EXTRA_CA_CERTS=C:\certs\cemig-root-ca.pem"

REM Tenta usar Node do PATH primeiro
where node >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] Node encontrado no PATH do sistema
) else (
  REM Tenta localizacoes portateis comuns
  if exist "C:\Users\%USERNAME%\node-v24.19.0-win-x64\node.exe" (
    set "PATH=%PATH%;C:\Users\%USERNAME%\node-v24.19.0-win-x64"
    echo [OK] Node portatil encontrado em C:\Users\%USERNAME%\node-v24.19.0-win-x64
  ) else if exist "%RAIZ%node\node.exe" (
    set "PATH=%PATH%;%RAIZ%node"
    echo [OK] Node encontrado na pasta do projeto
  ) else (
    echo [ERRO] Node nao encontrado! Instale Node.js ou ajuste o caminho.
    pause
    exit /b 1
  )
)

echo.
echo ============================================
echo  Atualizando o painel externo (Portal Conexao MT)
echo ============================================
echo.

node "%RAIZ%server\scripts\exportarPainelExterno.js"
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao atualizar o painel externo.
  pause
  exit /b 1
)

echo.
echo Concluido!
pause
