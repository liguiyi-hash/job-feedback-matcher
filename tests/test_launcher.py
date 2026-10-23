"""验证旧版默认Python被跳过、无可用解释器时给出明确结果。"""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('launcher',ROOT/'scripts/start_local.py')
launcher=importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)

class LauncherTests(unittest.TestCase):
    def test_prefers_bundled_python_without_override(self):
        with patch.dict(launcher.os.environ, {}, clear=True):
            self.assertEqual(next(launcher.candidates()), str(ROOT / '.runtime/python/bin/python3'))
    def test_skips_old_python(self):
        with patch.object(launcher,'candidates',return_value=['old-python','new-python']), patch.object(Path,'is_file',return_value=True), patch.object(launcher.os,'access',return_value=True), patch.object(launcher.subprocess,'run',side_effect=[SimpleNamespace(returncode=1),SimpleNamespace(returncode=0)]):
            self.assertEqual(launcher.choose_python(),'new-python')
    def test_no_compatible_python(self):
        with patch.object(launcher,'candidates',return_value=[]):
            self.assertIsNone(launcher.choose_python())

if __name__=='__main__':
    unittest.main()

