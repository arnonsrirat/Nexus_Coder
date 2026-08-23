@echo off
echo ========================================================
echo   NexusCoder - Install Trusted Publisher Certificate
echo   Publisher: arnon_srirat
echo ========================================================
echo.
echo Installing certificate into Windows Trusted Root and Trusted Publisher stores...
certutil -user -addstore Root "%~dp0nexus-publisher.cer"
certutil -user -addstore TrustedPublisher "%~dp0nexus-publisher.cer"
echo.
echo ========================================================
echo   Certificate installed successfully!
echo   Windows SmartScreen and Defender will now trust
echo   NexusCoder installers without warnings.
echo ========================================================
pause
