#!/usr/bin/env python3
"""
===============================================================
🚀 DSS Universe
📦 Module: Disposable Storage Qualification Proof
📄 File: tools/agent-helpers/debt037/r6/posix-controller.py
🎯 Purpose: Provisions isolated CI mount/image controls and ordinary actor processes.
🧠 Responsibilities: Guards ownership, mount cleanup and held-object barriers.
🏗️ Architecture: Root controller only in opted-in disposable hosted CI.
⚠️ Important: No developer execution, new users, host mounts or recursive cleanup.
🚀 Build. Share. Grow.
===============================================================
"""
import json
import os
import pathlib
import pwd
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile

STAGE = "guard"


def require(value):
    if not value:
        raise RuntimeError("Qualification controller assertion")


def main():
    global STAGE
    require(sys.platform in ("linux", "darwin") and os.getuid() == 0)
    require(os.environ.get("GITHUB_ACTIONS") == "true" and os.environ.get("RUNNER_ENVIRONMENT") == "github-hosted")
    require(os.environ.get("DSS_QUALIFICATION_PROOF") == "1" and len(sys.argv) == 5)
    node, probe = [pathlib.Path(value).resolve(strict=True) for value in sys.argv[1:3]]
    uid, gid = [int(value) for value in sys.argv[3:]]
    service, attacker = pwd.getpwuid(uid), pwd.getpwnam("nobody")
    require(uid > 0 and gid > 0 and service.pw_gid == gid)
    require(attacker.pw_uid > 0 and attacker.pw_gid > 0 and attacker.pw_uid != uid)
    if sys.platform == "linux":
        STAGE = "isolate-mount-namespace"
        original = os.stat("/proc/self/ns/mnt")
        os.unshare(os.CLONE_NEWNS)
        isolated = os.stat("/proc/self/ns/mnt")
        require((original.st_dev, original.st_ino) != (isolated.st_dev, isolated.st_ino))
        subprocess.run(["/usr/bin/mount", "--make-rprivate", "/"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    arena = pathlib.Path(tempfile.mkdtemp(prefix="dss-qualification-r6-", dir="/tmp")).resolve()
    os.chmod(arena, 0o755)
    code = arena / "code"
    code.mkdir(mode=0o755)
    for source, name in [(node, "node"), (probe, "probe"), (pathlib.Path(__file__).with_name("actor.cjs"), "actor.cjs")]:
        shutil.copyfile(source, code / name)
        os.chmod(code / name, 0o444 if name.endswith(".cjs") else 0o555)
    work = arena / "fixtures"
    work.mkdir(mode=0o755)
    for name, mode in [("shared", 0o1777), ("outside", 0o755), ("normal", 0o755)]:
        path = work / name
        path.mkdir(mode=mode)
        os.chmod(path, mode)
    os.chown(work / "normal", uid, gid)
    (work / "outside" / "sentinel").write_text("SYNTHETIC OUTSIDE")
    controls, mounts, images = [], [], []
    children, channels = [], {}
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.bind(("127.0.0.1", 0)); listener.listen(2); listener.settimeout(60)
    nonce = secrets.token_hex(16)

    def control(name, state, value, tool_exit=None):
        require(state in ("present", "unavailable", "unsupported") and
                (tool_exit is None or 0 <= tool_exit <= 255))
        controls.append({"name": name, "state": state, "value": value, "toolExitCode": tool_exit})

    def mount_control(name, arguments):
        target = work / name
        target.mkdir(mode=0o755)
        result = subprocess.run(arguments + [str(target)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode == 0:
            mounts.append(target)
            control(name + "-fixture", "present", True, 0)
            return True
        target.rmdir()  # Empty, root-owned and never exposed as a mounted actor target.
        control(name + "-fixture", "unavailable", None, result.returncode)
        return False

    def launch(actor, actor_uid, actor_gid):
        global STAGE
        STAGE = "launch-" + actor
        environment = {"GITHUB_ACTIONS": "true", "RUNNER_ENVIRONMENT": "github-hosted", "DSS_RIGHTS_ACTOR_PROOF": "1"}
        child = subprocess.Popen([str(code / "node"), str(code / "actor.cjs"), str(listener.getsockname()[1]),
                                  nonce, actor, str(work), str(code / "probe")], user=actor_uid, group=actor_gid,
                                 extra_groups=(), close_fds=True, stdin=subprocess.DEVNULL,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, cwd=arena, env=environment)
        children.append(child)
        connection, _ = listener.accept(); connection.settimeout(60)
        stream = connection.makefile("rwb", buffering=0)
        ready = json.loads(stream.readline(65537))
        require(ready == {"kind": "ready", "actor": actor, "nonce": nonce})
        channels[actor] = (connection, stream, child)

    def exchange(actor, command, kind):
        global STAGE
        STAGE = command + "-" + actor
        _, stream, _ = channels[actor]
        stream.write((command + "\n").encode())
        value = json.loads(stream.readline(65537))
        require(value.get("kind") == kind)
        return value

    try:
        STAGE = "prepare-platform-fixtures"
        if sys.platform == "linux":
            control("isolated-namespace", "present", True)
            mount_control("separate", ["/usr/bin/mount", "-t", "tmpfs", "-o", "size=8m,mode=755", "tmpfs"])
            mount_control("bind", ["/usr/bin/mount", "--bind", str(work / "normal")])
            # Map only this synthetic service-owned tree to displayed UID/GID0.
            # Actual actors retain ordinary credentials. UID0 is not an overflow-ID ambiguity.
            options = "X-mount.idmap=u:" + str(uid) + ":0:1 g:" + str(gid) + ":0:1"
            if mount_control("idmapped", ["/usr/bin/mount", "--bind", "-o", options, str(work / "normal")]):
                require((work / "idmapped").stat().st_uid == 0)
                control("mapped-owner-distinguished", "present", True)
        else:
            for name, owners in [("ownership-on", "on"), ("ownership-off", "off")]:
                image, target = arena / (name + ".sparseimage"), work / name
                created = subprocess.run(["/usr/bin/hdiutil", "create", "-quiet", "-size", "256m", "-fs", "APFS",
                                          "-type", "SPARSE", "-volname", "DSS-R6-" + nonce[:12] + owners, str(image)],
                                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if created.returncode:
                    control(name + "-fixture", "unavailable", None, created.returncode); continue
                images.append(image); target.mkdir(mode=0o755)
                attached = subprocess.run(["/usr/bin/hdiutil", "attach", "-quiet", "-nobrowse", "-owners", owners,
                                           "-mountpoint", str(target), str(image)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if attached.returncode:
                    target.rmdir(); control(name + "-fixture", "unavailable", None, attached.returncode); continue
                mounts.append(target)
                os.chown(target, uid, gid); os.chmod(target, 0o700)
                control(name + "-fixture", "present", True, 0)
        print(json.dumps({"kind": "fixture-evidence", "controls": controls}), flush=True)
        launch("service", uid, gid); launch("attacker", attacker.pw_uid, attacker.pw_gid)
        exchange("service", "hold", "held")
        exchange("attacker", "transition", "transition-created")
        for actor in ("service", "attacker"):
            result = exchange(actor, "observe", "result")
            require(result.get("actor") == actor and result.get("identityChecked") is True)
            print(json.dumps(result), flush=True)
            connection, stream, child = channels[actor]
            stream.close(); connection.close(); require(child.wait(timeout=60) == 0)
        require((work / "outside" / "sentinel").read_text() == "SYNTHETIC OUTSIDE")
        require((work / "shared" / "service-marker").read_text() == "SYNTHETIC")
    finally:
        listener.close()
        for connection, stream, _ in channels.values():
            stream.close(); connection.close()
        for child in children:
            if child.poll() is None: child.kill()
            child.wait(timeout=60); child.stderr.close()
        for target in reversed(mounts):
            require(target.parent == work and target.name in ("separate", "bind", "idmapped", "ownership-on", "ownership-off"))
            command = ["/usr/bin/umount", str(target)] if sys.platform == "linux" else ["/usr/bin/hdiutil", "detach", "-quiet", str(target)]
            subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # New images and fixtures remain for disposable VM teardown. Never recurse through actor entries.


try:
    main()
except Exception as error:
    print("DSS_R6_FAILURE stage=" + STAGE + " code=" + str(getattr(error, "errno", 0) or 0), file=sys.stderr)
    sys.exit(1)
