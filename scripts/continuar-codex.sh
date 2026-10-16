#!/usr/bin/env bash
set -e
task_project="/mnt/c/proyectos/appSSP"
if ! command -v codex >/dev/null 2>&1; then
  if [ -f "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
  fi
fi
if ! command -v codex >/dev/null 2>&1; then
  printf '%s\n' 'No se encontro Codex en PATH. Abre Codex manualmente desde /mnt/c/proyectos/appSSP.'
  exit 1
fi
task_context="$(cat "$task_project/docs/CONTEXTO-CODEX.md")"
exec codex --cd "$task_project" "Continua este proyecto en su carpeta de Windows. Lee AGENTS.md y docs/ESTADO-MIGRACION.md si existe. Recibe este contexto de continuidad: $task_context
Primero confirma que entendiste el estado y los pasos pendientes para compartir el avance con el lider. No ejecutes npm de Linux ni publiques. Esta primera intervencion es de lectura y continuidad; espera el siguiente pedido antes de iniciar operaciones adicionales."
