#!/usr/bin/env python3
"""
===============================================================
🚀 DSS Universe
📦 Module: Disposable Rights Actor Proof
📄 File: tools/agent-helpers/debt037/r5/posix-controller.py
🎯 Purpose: Launches existing ordinary identities before exec of the async Node addon.
🧠 Responsibilities: Owns fresh fixtures, credential drops and ready/go TCP barriers.
🏗️ Architecture: Guarded disposable CI orchestration; no application imports.
⚠️ Important: No new accounts, target path fallback or recursive cleanup.
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
import re

STAGE = "guard"


def require(condition):
    if not condition:
        raise RuntimeError("Disposable POSIX rights proof failed.")


def main():
    global STAGE
    require(sys.platform in ("linux", "darwin") and os.getuid() == 0)
    require(os.environ.get("GITHUB_ACTIONS") == "true")
    require(os.environ.get("RUNNER_ENVIRONMENT") == "github-hosted")
    require(os.environ.get("DSS_RIGHTS_ACTOR_PROOF") == "1" and len(sys.argv) == 6)
    node, binary, fixture = [pathlib.Path(value).resolve(strict=True) for value in sys.argv[1:4]]
    uid, gid = [int(value) for value in sys.argv[4:]]
    service = pwd.getpwuid(uid)
    attacker = pwd.getpwnam("nobody")
    require(uid > 0 and gid > 0 and service.pw_gid == gid)
    require(attacker.pw_uid > 0 and attacker.pw_gid > 0 and attacker.pw_uid != uid)
    # Runner TMPDIR on Darwin can sit below a user-private ancestor. Both real
    # actors need a fresh arena below the OS shared temporary namespace.
    arena = pathlib.Path(tempfile.mkdtemp(prefix="dss-rights-r5-", dir="/tmp")).resolve()
    STAGE = "prepare-code"
    os.chmod(arena, 0o755)
    code = arena / "code"
    code.mkdir(mode=0o755)
    for source, name in [(node, "node"), (binary, "probe.node"), (fixture, "fixture"),
                         (pathlib.Path(__file__).with_name("actor.cjs"), "actor.cjs")]:
        shutil.copyfile(source, code / name)
        os.chmod(code / name, 0o555 if name in ("node", "fixture") else 0o444)
    work = arena / "fixtures"
    work.mkdir(mode=0o777)
    os.chmod(work, 0o777)  # setup only, revoked after both ready records
    nonce = secrets.token_hex(16)
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.bind(("127.0.0.1", 0))
    listener.listen(2)
    listener.settimeout(60)
    children = []
    channels = {}

    def ordinary(user, group):
        def drop():
            os.setgroups([])
            os.setgid(group)
            os.setuid(user)
            require(os.getuid() == user and os.geteuid() == user)
            require(os.getgid() == group and os.getegid() == group)
            require(all(value == group and value != 0 for value in os.getgroups()))
            try:
                os.setuid(0)
            except PermissionError:
                return
            raise RuntimeError("Privilege drop failed.")
        return drop

    def launch(actor, user, group):
        global STAGE
        STAGE = "launch-" + actor
        child = subprocess.Popen([str(code / "node"), str(code / "actor.cjs"), str(listener.getsockname()[1]),
                                  nonce, actor, str(work), str(code / "probe.node")],
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                                 close_fds=True, preexec_fn=ordinary(user, group), cwd=arena)
        children.append(child)
        connection, _ = listener.accept()
        connection.settimeout(60)
        stream = connection.makefile("rwb", buffering=0)
        value = json.loads(stream.readline(65537))
        require(value == {"kind": "ready", "actor": actor, "nonce": nonce})
        channels[actor] = (connection, stream, child)

    try:
        launch("attacker", attacker.pw_uid, attacker.pw_gid)
        launch("service", uid, gid)
        STAGE = "prepare-acls"
        os.chmod(work, 0o755)
        subprocess.run([str(code / "fixture"), "fixture", str(work), "safe", str(attacker.pw_uid)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        names = ["protected", "control", "shared", "unsafe", "inherited", "denied", "deny-allow", "parent", "parent/child", "empty", "null"]
        for name in names:
            path = work / name
            require(path.is_dir() and not path.is_symlink() and path.stat().st_uid == uid)
            subprocess.run([str(code / "fixture"), "fixture", str(path), "safe", str(attacker.pw_uid)], check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.chmod(work / "shared", 0o1777)
        for name, control in [("unsafe", "allow"), ("inherited", "inherited")]:
            subprocess.run([str(code / "fixture"), "fixture", str(work / name), control, str(attacker.pw_uid)],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if sys.platform == "darwin":
            subprocess.run([str(code / "fixture"), "fixture", str(work / "deny-allow"), "deny", str(attacker.pw_uid)],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.chmod(work / "denied", 0o500)
        os.chmod(work / "parent", 0o777)
        os.chmod(work / "foreign", 0o755)
        for actor in ("service", "attacker"):
            STAGE = "result-" + actor
            connection, stream, child = channels[actor]
            stream.write(b"go\n")
            record = json.loads(stream.readline(65537))
            if record.get("kind") == "failure" and re.fullmatch(r"[a-z/-]{1,48}", record.get("stage", "")):
                STAGE += "-" + record["stage"].replace("/", "-")
            require(record.get("kind") == "result" and record.get("actor") == actor)
            connection.shutdown(socket.SHUT_RDWR)
            stream.close()
            connection.close()
            require(child.wait(timeout=60) == 0)
            print(json.dumps(record), flush=True)
        require((work / "shared" / "attacker-created").read_text() == "SYNTHETIC ATTACKER")
        require((work / "protected" / "service-created").read_text() == "SYNTHETIC SERVICE")
    finally:
        listener.close()
        for child in children:
            if child.poll() is None:
                child.kill()
            child.wait(timeout=60)
        # Fixtures are intentionally retained for disposable VM teardown.


try:
    main()
except Exception as error:
    print("Disposable POSIX rights controller failed at " + STAGE + " (" + type(error).__name__ +
          ", errno=" + str(getattr(error, "errno", 0)) + ").", file=sys.stderr)
    sys.exit(1)
