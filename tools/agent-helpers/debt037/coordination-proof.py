"""
===============================================================
🚀 DSS Universe
📦 Module: Storage Coordination Characterization
📄 File: tools/agent-helpers/debt037/coordination-proof.py

🎯 Purpose:
Tests proposed physical-parent stripes against real OS locks and child processes.

🧠 Responsibilities:
• derives collisions from actual directory identities;
• tests independent opens, unrelated stripes and ordered multi-stripe acquisition;
• verifies lock release after abrupt exit, EOF and killed child processes.

🏗️ Architecture:
Standard-library-only native-primitive proof, separate from API/Worker and Node-API.

⚠️ Important:
Only synthetic private temp fixtures. No ACL changes, users, uploads or network.
This does not prove root admission, hostile-user protection or production binding.

🚀 Build. Share. Grow.
===============================================================
"""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import threading

WINDOWS = sys.platform == "win32"
DOMAIN = b"DSS-STORAGE-PARENT-COORD-v1\0"

if WINDOWS:
    from ctypes import wintypes
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)

    class FileId(ctypes.Structure):
        _fields_ = [("volume", ctypes.c_uint64), ("identifier", ctypes.c_ubyte * 16)]

    class Overlapped(ctypes.Structure):
        _fields_ = [("internal", ctypes.c_size_t), ("high", ctypes.c_size_t),
                    ("offset", wintypes.DWORD), ("offset_high", wintypes.DWORD),
                    ("event", wintypes.HANDLE)]

    kernel.CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                                  ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD,
                                  wintypes.HANDLE]
    kernel.CreateFileW.restype = wintypes.HANDLE
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel.CloseHandle.restype = wintypes.BOOL
    kernel.GetFileInformationByHandleEx.argtypes = [wintypes.HANDLE, ctypes.c_int,
                                                   ctypes.c_void_p, wintypes.DWORD]
    kernel.GetFileInformationByHandleEx.restype = wintypes.BOOL
    kernel.LockFileEx.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.DWORD,
                                 wintypes.DWORD, wintypes.DWORD,
                                 ctypes.POINTER(Overlapped)]
    kernel.LockFileEx.restype = wintypes.BOOL
    kernel.UnlockFileEx.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.DWORD,
                                   wintypes.DWORD, ctypes.POINTER(Overlapped)]
    kernel.UnlockFileEx.restype = wintypes.BOOL
else:
    import fcntl


def windows_open(path, access, flags):
    handle = kernel.CreateFileW(str(path), access, 3, None, 3, flags, None)
    if handle == ctypes.c_void_p(-1).value:
        raise ctypes.WinError(ctypes.get_last_error())
    return handle


def identity(path):
    if WINDOWS:
        handle = windows_open(path, 0x80, 0x02200000)
        try:
            info = FileId()
            assert ctypes.sizeof(info) == 24
            if not kernel.GetFileInformationByHandleEx(handle, 18,
                                                       ctypes.byref(info), 24):
                raise ctypes.WinError(ctypes.get_last_error())
            return struct.pack("<Q", info.volume) + bytes(info.identifier)
        finally:
            assert kernel.CloseHandle(handle)
    info = path.stat()
    return struct.pack("<QQ", info.st_dev, info.st_ino)


def stripe(root, parent):
    platform = 2 if WINDOWS else 3 if sys.platform == "darwin" else 1
    payload = DOMAIN + bytes([platform])
    for item in (root, parent):
        payload += struct.pack("<I", len(item)) + item
    return hashlib.sha256(payload).digest()[0]


class Lock:
    def __init__(self, arena, number):
        self.resource = None
        self.position = None
        if WINDOWS:
            handle = windows_open(arena / "control" / "ranges", 0xC0000000, 0x80)
            position = Overlapped()
            position.offset = number
            if not kernel.LockFileEx(handle, 3, 0, 1, 0, ctypes.byref(position)):
                error = ctypes.get_last_error()
                assert kernel.CloseHandle(handle)
                if error != 33:
                    raise ctypes.WinError(error)
                return
            self.resource, self.position = handle, position
        else:
            descriptor = os.open(arena / "control" / f"{number:02x}",
                                 os.O_RDWR | os.O_CLOEXEC | os.O_NOFOLLOW)
            try:
                fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                os.close(descriptor)
                return
            except BaseException:
                os.close(descriptor)
                raise
            self.resource = descriptor

    @property
    def acquired(self):
        return self.resource is not None

    def close(self):
        if self.resource is None:
            return
        resource, self.resource = self.resource, None
        if WINDOWS:
            try:
                if not kernel.UnlockFileEx(resource, 0, 1, 0,
                                            ctypes.byref(self.position)):
                    raise ctypes.WinError(ctypes.get_last_error())
            finally:
                assert kernel.CloseHandle(resource)
        else:
            try:
                fcntl.flock(resource, fcntl.LOCK_UN)
            finally:
                os.close(resource)


def expect_lock(arena, number, expected):
    lock = Lock(arena, number)
    try:
        assert lock.acquired == expected
    finally:
        lock.close()


def child(arena, first, other, mode):
    # Only parent-created private temp arenas are accepted by the child harness.
    assert arena.parent == Path(tempfile.gettempdir()).resolve()
    assert arena.name.startswith("dss037-coordination-")
    assert (arena / "nonce").read_text() == os.environ["DSS_COORDINATION_PROOF_NONCE"]
    selection = json.loads((arena / "selection.json").read_text())
    root = identity(arena)
    for label, expected in (("first", first), ("collision", first), ("other", other)):
        name = selection[label]
        assert Path(name).name == name
        assert stripe(root, identity(arena / name)) == expected
    if WINDOWS:
        assert stripe(root, identity(arena / selection["first"].upper())) == first
    if mode == "holder":
        held = Lock(arena, first)
        assert held.acquired
        print("HELD", flush=True)
        sys.stdin.readline()
        raise AssertionError("Holder must be killed by its owning controller")
    print("READY", flush=True)
    assert sys.stdin.readline() == "CHECK\n"
    expect_lock(arena, first, False)
    expect_lock(arena, other, True)
    print("BLOCKED_UNRELATED_OK", flush=True)
    assert sys.stdin.readline() == "RELEASED\n"
    expect_lock(arena, first, True)
    print("ACQUIRED", flush=True)
    assert sys.stdin.readline() == "PAIR\n"
    ordered = sorted(set([other, first, first]))
    held = [Lock(arena, number) for number in ordered]
    assert all(lock.acquired for lock in held)
    print(json.dumps(ordered), flush=True)
    command = sys.stdin.readline()
    if command == "":
        os._exit(2)  # EOF releases OS locks without Python cleanup.
    assert command == "EXIT\n"
    os._exit(0)  # Intentionally bypass destructors to test kernel release.


def spawn(arena, first, other, mode):
    env = dict(os.environ, DSS_COORDINATION_PROOF_NONCE=(arena / "nonce").read_text())
    process = subprocess.Popen([sys.executable, "-u", str(Path(__file__).resolve()),
                                "--child", str(arena), str(first), str(other), mode],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, env=env,
                               creationflags=0x08000000 if WINDOWS else 0)
    # Fail a broken fixture, never synchronize successful operations by time.
    watchdog = threading.Timer(30, process.kill)
    watchdog.daemon = True
    watchdog.start()
    return process, watchdog


def receive(process, expected):
    actual = process.stdout.readline().rstrip("\n")
    assert actual == expected, (actual, expected)


def send(process, command):
    process.stdin.write(command + "\n")
    process.stdin.flush()


def exercise(arena, first, other, eof):
    held = Lock(arena, first)
    assert held.acquired
    expect_lock(arena, first, False)  # Independent open within this process.
    process, watchdog = spawn(arena, first, other, "exercise")
    try:
        receive(process, "READY")
        send(process, "CHECK")
        receive(process, "BLOCKED_UNRELATED_OK")
        held.close()
        send(process, "RELEASED")
        receive(process, "ACQUIRED")
        send(process, "PAIR")
        receive(process, json.dumps(sorted([first, other])))
        expect_lock(arena, first, False)
        expect_lock(arena, other, False)
        if eof:
            process.stdin.close()
        else:
            send(process, "EXIT")
        assert process.wait(timeout=10) == (2 if eof else 0)
        assert process.stderr.read() == ""
        expect_lock(arena, first, True)
        expect_lock(arena, other, True)
    finally:
        held.close()
        if process.poll() is None:
            process.kill()
            process.wait(timeout=10)
        watchdog.cancel()
        diagnostics = process.stderr.read()
        if diagnostics:
            sys.stderr.write(diagnostics)
        for stream in (process.stdin, process.stdout, process.stderr):
            stream.close()


def killed_holder(arena, first, other):
    process, watchdog = spawn(arena, first, other, "holder")
    try:
        receive(process, "HELD")
        expect_lock(arena, first, False)
        process.kill()  # Only this controller's captured child process.
        assert process.wait(timeout=10) != 0
        expect_lock(arena, first, True)
    finally:
        if process.poll() is None:
            process.kill()
            process.wait(timeout=10)
        watchdog.cancel()
        diagnostics = process.stderr.read()
        if diagnostics:
            sys.stderr.write(diagnostics)
        for stream in (process.stdin, process.stdout, process.stderr):
            stream.close()


def main():
    if not __debug__:
        raise RuntimeError("Enabled assertions are mandatory")
    if len(sys.argv) > 1:
        assert len(sys.argv) == 6 and sys.argv[1] == "--child"
        child(Path(sys.argv[2]).resolve(), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5])
        return
    assert sys.platform in ("win32", "linux", "darwin")
    arena = Path(tempfile.mkdtemp(prefix="dss037-coordination-")).resolve()
    (arena / "nonce").write_text(os.urandom(16).hex())
    (arena / "control").mkdir(mode=0o700)
    for name in (["ranges"] if WINDOWS else [f"{number:02x}" for number in range(256)]):
        with open(arena / "control" / name, "xb"):
            pass
    root = identity(arena)
    seen, collision = {}, None
    for number in range(257):
        parent = arena / f"parent-{number:03}"
        parent.mkdir()
        object_id = identity(parent)
        value = stripe(root, object_id)
        if value in seen:
            assert seen[value][0] != object_id
            collision = (value, seen[value][1], parent)
        else:
            seen[value] = (object_id, parent)
    assert collision is not None and len(seen) > 1
    first, original, alias_parent = collision
    assert stripe(root, identity(original)) == stripe(root, identity(alias_parent)) == first
    other = next(number for number in seen if number != first)
    (arena / "selection.json").write_text(json.dumps({
        "first": original.name, "collision": alias_parent.name,
        "other": seen[other][1].name}))
    if WINDOWS:
        assert identity(original.with_name(original.name.upper())) == identity(original)
    exercise(arena, first, other, False)
    exercise(arena, first, other, True)
    killed_holder(arena, first, other)
    print(json.dumps({"platform": sys.platform, "python": sys.version.split()[0],
                      "physicalParents": 257, "occupiedStripes": len(seen),
                      "collisionExclusion": True, "independentOpenExclusion": True,
                      "unrelatedStripeConcurrent": True, "sortedPairHeld": True,
                      "abruptExitRelease": True, "eofRelease": True,
                      "killedProcessRelease": True, "fixtureArena": str(arena),
                      "childRecomputedPhysicalStripes": True,
                      "differentIdentityProved": False,
                      "filesystemQualification": "not performed",
                      "darwinEncodingSelected": False,
                      "productionContainmentProved": False,
                      "nodeBindingProved": False}))


if __name__ == "__main__":
    main()
