import sys
from pathlib import Path

# Ensure project root is in sys.path so 'backend.app' imports work in any environment
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))
