@echo off
rem DSS File Passport: local pinned pnpm launcher; no global installation changes.
rem Uses the verified repository Node artifact and the already installed pnpm package.
"%~dp0..\..\..\..\node_modules\.cache\c21-node24\node.exe" "%LOCALAPPDATA%\node\corepack\v1\pnpm\11.9.0\bin\pnpm.cjs" %*
exit /b %ERRORLEVEL%
