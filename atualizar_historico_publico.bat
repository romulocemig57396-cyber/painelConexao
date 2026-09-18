@echo off
REM Mantido com esse nome por compatibilidade com PUBLICACAO.md e com
REM eventuais atalhos já criados na área de trabalho — a lógica real
REM (detecção de Node/Git, exportação, commit e push) vive só em
REM atualizar_historico.bat, pra não duplicar o mesmo script em dois lugares.
call "%~dp0atualizar_historico.bat"
