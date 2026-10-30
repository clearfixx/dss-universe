"""
===============================================================
🚀 DSS Universe
📦 Module: Storage P2 Characterization
📄 File: tools/agent-helpers/debt037/cleanup-identity.py

🎯 Purpose:
Demonstrates stale POSIX cleanup and a private cross-process lock candidate.

🧠 Responsibilities:
• uses deterministic process barriers rather than sleeps;
• distinguishes a matching-name check from identity-bound cleanup;
• confines all mutation to disposable container tmpfs fixtures.

🏗️ Architecture:
Opt-in characterization only; no application imports or runtime activation.

⚠️ Important:
Not a production lock implementation or complete physical-containment proof.
Never mounts uploads, repairs ACLs or creates host users.

🚀 Build. Share. Grow.
===============================================================
"""
import errno
import fcntl
import json
import os
import stat
import tempfile

SERVICE = 5050


def identity(path):
    info = os.stat(path, follow_symlinks=False)
    assert stat.S_ISREG(info.st_mode)
    return info.st_dev, info.st_ino


def publisher(path, staged, lock, ready, release, protected):
    pid = os.fork()
    if pid == 0:
        try:
            # Open independently: inherited flock descriptions are not independent.
            with open(lock, "r+b", buffering=0) as handle:
                if protected:
                    try:
                        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    except OSError as error:
                        assert error.errno in (errno.EACCES, errno.EAGAIN)
                    else:
                        raise AssertionError("Concurrent private lock was admitted")
                    os.write(ready, b"B")
                    assert os.read(release, 1) == b"R"
                    fcntl.flock(handle, fcntl.LOCK_EX)
                os.replace(staged, path)
                os.write(ready, b"P")
            os._exit(0)
        except BaseException:
            os._exit(1)
    return pid


def scenario(arena, protected):
    directory = os.path.join(arena, "locked" if protected else "unlocked")
    os.mkdir(directory, 0o700)
    path, staged, lock = (os.path.join(directory, name)
                          for name in ("object", "next", "coordination"))
    for name, data in ((path, b"OLD"), (staged, b"NEW"), (lock, b"")):
        with open(name, "xb") as output:
            output.write(data)
        os.chmod(name, 0o600)
    captured = identity(path)
    ready_read, ready_write = os.pipe()
    release_read, release_write = os.pipe()
    with open(lock, "r+b", buffering=0) as handle:
        if protected:
            fcntl.flock(handle, fcntl.LOCK_EX)
        assert identity(path) == captured
        pid = publisher(path, staged, lock, ready_write, release_read, protected)
        os.close(ready_write)
        os.close(release_read)
        try:
            if protected:
                assert os.read(ready_read, 1) == b"B"
                fcntl.flock(handle, fcntl.LOCK_UN)
                os.write(release_write, b"R")
            assert os.read(ready_read, 1) == b"P"
            if protected:
                fcntl.flock(handle, fcntl.LOCK_EX)
                assert identity(path) != captured
                # Stale cleanup rechecks identity under coordination and skips.
                with open(path, "rb") as current:
                    assert current.read() == b"NEW"
            else:
                os.unlink(path)
                assert not os.path.exists(path)
        finally:
            os.close(ready_read)
            os.close(release_write)
            _, status = os.waitpid(pid, 0)
            assert os.waitstatus_to_exitcode(status) == 0
    return True


def main():
    if not __debug__:
        raise RuntimeError("Characterization requires enabled assertions")
    assert os.environ.get("DSS_DISPOSABLE_STORAGE_PROBE") == "1"
    assert os.path.isfile("/.dockerenv")
    assert os.statvfs("/").f_flag & os.ST_RDONLY
    with open("/proc/mounts", encoding="ascii") as mounts:
        assert any(line.split()[1:3] == ["/tmp", "tmpfs"] for line in mounts)
    assert os.geteuid() == 0
    arena = tempfile.mkdtemp(prefix="dss037-cleanup-", dir="/tmp")
    os.chown(arena, SERVICE, SERVICE)
    os.setgroups([])
    os.setgid(SERVICE)
    os.setuid(SERVICE)
    with open("/proc/self/status", encoding="ascii") as status:
        caps = next(line.split(":")[1].strip() for line in status
                    if line.startswith("CapEff:"))
    assert caps == "0000000000000000"
    result = {"uncoordinatedCheckUnlinkDeletesReplacement": scenario(arena, False),
              "privateLockBlocksConcurrentPublicationAndStaleCleanupSkips": scenario(arena, True),
              "serviceUid": os.geteuid(), "effectiveCapabilities": caps,
              "kernel": os.uname().release, "filesystem": "tmpfs",
              "productionContainmentProved": False}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
