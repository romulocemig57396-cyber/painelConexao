@echo off
setlocal
cd /d "%~dp0"

REM Se a rede corporativa intercepta TLS (proxy/firewall trocando o
REM certificado por um da CA interna), o Node vai falhar com
REM "UNABLE_TO_GET_ISSUER_CERT_LOCALLY" ao chamar o Portal Conexao MT via
REM HTTPS (ex.: botao "Atualizar painel externo"). Se acontecer, exporte o
REM certificado raiz da CA interna (certmgr.msc > Autoridades de Certificacao
REM Raiz Confiaveis > Certificados > exportar como Base-64 X.509 .CER) e
REM descomente a linha abaixo apontando pro arquivo:
REM set "NODE_EXTRA_CA_CERTS=C:\certs\cemig-root-ca.pem"

echo Iniciando o Painel de Medidas...
start "Painel de Medidas - Servidor" cmd /k npm run prod

set "URL=http://localhost:3001/api/health"
set /a TENTATIVAS=0
set /a MAX_TENTATIVAS=90

echo Aguardando o servidor ficar pronto em %URL% ...

:aguardar
set /a TENTATIVAS+=1
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto pronto
if %TENTATIVAS% GEQ %MAX_TENTATIVAS% goto expirou
timeout /t 1 /nobreak >nul
goto aguardar

:pronto
echo Servidor pronto. Abrindo o navegador...
start "" "http://localhost:3001"
goto fim

:expirou
echo.
echo O servidor demorou demais para responder ou houve um erro no build/start.
echo Verifique a janela "Painel de Medidas - Servidor" para mais detalhes.
echo.
pause

:fim
endlocal
