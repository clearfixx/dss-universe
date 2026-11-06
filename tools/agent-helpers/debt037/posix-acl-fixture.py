"""
===============================================================
🚀 DSS Universe
📦 Module: Native Security Test Fixtures
📄 File: tools/agent-helpers/debt037/posix-acl-fixture.py
🎯 Purpose: Builds real ACL positive controls in fresh service-owned test leaves.
🧠 Responsibilities: Uses native OS facilities and refuses links/unowned arenas.
🏗️ Architecture: Test fixture builder; no production imports or extra packages.
⚠️ Important: Never changes deployment paths, users or existing permissions.
🚀 Build. Share. Grow.
===============================================================
"""
import json
import os
from pathlib import Path
import re
import stat
import struct
import subprocess
import sys
import tempfile

if os.environ.get("DSS_NATIVE_SECURITY_FIXTURE") != "1" or sys.platform not in ("linux", "darwin"):
    raise RuntimeError("Requires an admitted POSIX native test fixture")
if len(sys.argv) != 2:
    raise RuntimeError("Expected exactly one fixture arena")
arena = Path(sys.argv[1])
base = Path(tempfile.gettempdir()).resolve()
if (not arena.is_absolute() or arena.parent != base or arena.resolve() != arena
        or not re.fullmatch(r"dss-native-r2-[A-Za-z0-9]+", arena.name)):
    raise RuntimeError("Refusing an unrelated fixture arena")
leaf = arena / "entries"
for path in (arena, leaf):
    details = path.lstat()
    if not stat.S_ISDIR(details.st_mode) or details.st_uid != os.geteuid():
        raise RuntimeError("Refusing linked or unowned fixture")

if sys.platform == "linux":
    undefined = 0xFFFFFFFF
    named_user = 65534 if os.geteuid() != 65534 else 65533
    entries = [(1, 7, undefined), (2, 4, named_user), (4, 0, undefined),
               (16, 4, undefined), (32, 0, undefined)]
    payload = struct.pack("<I", 2) + b"".join(struct.pack("<HHI", *entry) for entry in entries)
    os.setxattr(leaf, "system.posix_acl_access", payload, follow_symlinks=False)
    os.setxattr(leaf, "system.posix_acl_default", payload, follow_symlinks=False)
else:
    result = subprocess.run(["/bin/chmod", "+a", "everyone deny delete", str(leaf)],
                            check=False, capture_output=True)
    if result.returncode:
        raise RuntimeError("Could not create synthetic Darwin ACL control")
print(json.dumps({"fixture": "posix-acl", "platform": sys.platform}))
