#!/bin/zsh
# © 2026 贵毅_TUFE
cd -- "${0:A:h}"
task_bootstrap="$PWD/.runtime/python/bin/python3"
if [[ ! -x "$task_bootstrap" ]]; then
  task_bootstrap="$(command -v python3)"
fi
if [[ ! -x "$task_bootstrap" ]]; then
  print '请先安装Python：https://www.python.org/downloads/'
  read -k 1
  exit 1
fi
"$task_bootstrap" scripts/start_local.py "$@"
task_status=$?
if (( task_status != 0 )); then
  print '启动未完成。请查看上方提示，按任意键关闭窗口。'
  read -k 1
fi
exit "$task_status"

