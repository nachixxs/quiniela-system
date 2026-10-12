# Arma un worktree nuevo de la caja: su propio .venv, web/node_modules y e2e/node_modules (no se comparten, D119)
# y la copia de CLAUDE.local.md desde el checkout principal. Se corre desde la raíz del worktree.
# El .env no se copia: Docker se levanta con el del checkout principal (--env-file).
$principal = (git worktree list --porcelain | Select-Object -First 1) -replace '^worktree ', ''
if (-not (Test-Path CLAUDE.local.md)) { Copy-Item (Join-Path $principal 'CLAUDE.local.md') . }
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -q -r requirements.txt
npm ci --prefix web
npm ci --prefix e2e
