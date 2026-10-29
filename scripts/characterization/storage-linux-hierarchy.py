"""
===============================================================
🚀 DSS Universe
📦 Module: Storage Infrastructure Characterization
📄 File: scripts/characterization/storage-linux-hierarchy.py

🎯 Purpose:
Tests hierarchical namespace protection against a different Linux UID.

🧠 Responsibilities:
• proves hostile write access and sticky-directory relocation barriers;
• checks descriptor-based ownership/mode admission and unsafe controls.

🏗️ Architecture:
Opt-in disposable-container evidence, independent of API/Worker runtime.

⚠️ Important:
Requires an isolated root controller, read-only container root and private
tmpfs /tmp. Never mount project data. Both tested roles drop effective caps.
Not a production backend or complete containment/root-bootstrap proof.

🚀 Build. Share. Grow.
===============================================================
"""

import errno
import json
import os
import stat
import tempfile

SERVICE = 5050
ATTACKER = 65534


def as_uid(uid, operation):
    read_end, write_end = os.pipe()
    pid = os.fork()
    if pid == 0:
        os.close(read_end)
        try:
            os.setgroups([])
            os.setgid(uid)
            os.setuid(uid)
            with open("/proc/self/status", encoding="ascii") as status:
                caps = next(line.split(":")[1].strip() for line in status
                            if line.startswith("CapEff:"))
            assert caps == "0000000000000000"
            result = {"ok": True, "result": operation()}
        except BaseException as error:
            result = {"ok": False, "error": repr(error)}
        os.write(write_end, json.dumps(result).encode())
        os._exit(0)
    os.close(write_end)
    payload = os.read(read_end, 65536)
    os.close(read_end)
    _, status = os.waitpid(pid, 0)
    assert status == 0
    result = json.loads(payload)
    assert result["ok"], result
    return result["result"]


def admitted_directory(fd):
    info = os.fstat(fd)
    return (stat.S_ISDIR(info.st_mode) and info.st_uid == SERVICE
            and (not info.st_mode & 0o022 or bool(info.st_mode & stat.S_ISVTX)))


def main():
    if not __debug__:
        raise RuntimeError("Assertions must remain enabled for characterization")
    assert os.geteuid() == 0
    assert os.environ.get("DSS_DISPOSABLE_STORAGE_PROBE") == "1"
    assert os.path.isfile("/.dockerenv")
    assert os.statvfs("/").f_flag & os.ST_RDONLY
    with open("/proc/mounts", encoding="ascii") as mounts:
        assert any(line.split()[1:3] == ["/tmp", "tmpfs"] for line in mounts)
    arena = tempfile.mkdtemp(prefix="dss037-hierarchy-", dir="/tmp")
    os.chmod(arena, 0o755)
    uploads = arena + "/uploads"
    owned = uploads + "/owned"
    nested = owned + "/nested"
    unsafe = uploads + "/nonsticky"
    for path in (uploads, owned, nested, unsafe):
        os.mkdir(path)
        os.chmod(path, 0o777 if path == unsafe else 0o1777)
        os.chown(path, SERVICE, SERVICE)
    os.mkdir(unsafe + "/owned")
    os.chown(unsafe + "/owned", SERVICE, SERVICE)

    def attacks():
        with open(uploads + "/attacker-file", "x", encoding="ascii"):
            pass
        os.mkdir(uploads + "/attacker-prefix")
        os.symlink(arena, uploads + "/attacker-link")
        denied = []
        for source, target in ((owned, uploads + "/moved"),
                               (nested, owned + "/moved")):
            try:
                os.rename(source, target)
            except OSError as error:
                assert error.errno == errno.EPERM
                denied.append(error.errno)
            else:
                raise AssertionError("Service-owned sticky entry moved")
        os.rename(unsafe + "/owned", unsafe + "/moved")
        return {"namespaceWriteProven": True, "relocationDeniedErrnos": denied,
                "nonstickyControlMoveSucceeded": True}

    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    root_fd = os.open(uploads, flags)
    owned_fd = os.open("owned", flags, dir_fd=root_fd)
    nested_fd = os.open("nested", flags, dir_fd=owned_fd)
    try:
        # The attacker acts after directory descriptors have been acquired.
        attack_result = as_uid(ATTACKER, attacks)

        def service_checks():
            assert all(admitted_directory(fd) for fd in
                       (root_fd, owned_fd, nested_fd))
            for name in ("attacker-prefix", "nonsticky"):
                fd = os.open(name, flags, dir_fd=root_fd)
                try:
                    assert not admitted_directory(fd), name
                finally:
                    os.close(fd)
            try:
                fd = os.open("attacker-link", flags, dir_fd=root_fd)
            except OSError as error:
                assert error.errno in (errno.ELOOP, errno.ENOTDIR)
            else:
                os.close(fd)
                raise AssertionError("Symlink directory admitted")
            fd = os.open("service-output", os.O_CREAT | os.O_EXCL | os.O_WRONLY
                         | os.O_NOFOLLOW, 0o600, dir_fd=nested_fd)
            try:
                assert os.write(fd, b"synthetic DSS output") == 20
            finally:
                os.close(fd)
            return {"unsafeOwnershipRejected": True,
                    "nonstickyWritableDirectoryRejected": True,
                    "preexistingSymlinkRejected": True,
                    "heldDirectoryRelativeCreationSucceeded": True}

        service_result = as_uid(SERVICE, service_checks)
        with open(nested + "/service-output", "rb") as output:
            assert output.read() == b"synthetic DSS output"
        print(json.dumps({"kernel": os.uname().release, "filesystem": "tmpfs",
                          "serviceUid": SERVICE, "attackerUid": ATTACKER,
                          "effectiveCapsInBothChildRoles": "0",
                          "attack": attack_result, "service": service_result,
                          "projectWrites": 0, "databaseConnections": 0,
                          "networkCalls": 0, "runtimeCorrection": False},
                         sort_keys=True))
    finally:
        for fd in (nested_fd, owned_fd, root_fd):
            os.close(fd)


if __name__ == "__main__":
    main()
