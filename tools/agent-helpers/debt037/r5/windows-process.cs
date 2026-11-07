/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Rights Actor Proof
 * 📄 File: tools/agent-helpers/debt037/r5/windows-process.cs
 * 🎯 Purpose: Launches and verifies real primary-token Node children in disposable CI.
 * 🧠 Responsibilities: Owns duplicated tokens, process/thread handles and minimal environments.
 * 🏗️ Architecture: Test-only Win32 process adapter, distinct from native runtime code.
 * ⚠️ Important: No NETCREDENTIALS_ONLY or thread impersonation substitutes an ordinary process.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using System.Security.Principal;
using System.Security;
using Microsoft.Win32.SafeHandles;

public static class DssR5Process
{
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool LogonUserW(string name, string domain, IntPtr password, int kind,
        int provider, out SafeAccessTokenHandle token);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct Startup {
        public int Size; public string Reserved, Desktop, Title;
        public int X, Y, Width, Height, XChars, YChars, Fill, Flags;
        public short Show, ReservedSize; public IntPtr ReservedPointer, Input, Output, Error;
    }
    [StructLayout(LayoutKind.Sequential)]
    private struct ProcessInfo { public IntPtr Process, Thread; public uint Id, ThreadId; }
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool DuplicateTokenEx(SafeAccessTokenHandle token, uint access, IntPtr attributes,
        int level, int type, out SafeAccessTokenHandle primary);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcessWithTokenW(SafeAccessTokenHandle token, uint flags, string application,
        StringBuilder command, uint creation, IntPtr environment, string directory, ref Startup startup, out ProcessInfo info);
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool OpenProcessToken(IntPtr process, uint access, out SafeAccessTokenHandle token);
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool GetTokenInformation(SafeAccessTokenHandle token, int kind, IntPtr buffer, int size, out int returned);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern uint WaitForSingleObject(IntPtr handle, uint ms);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GetExitCodeProcess(IntPtr handle, out uint status);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool TerminateProcess(IntPtr handle, uint status);
    private static void Require(bool result) { if (!result) throw new Win32Exception(Marshal.GetLastWin32Error()); }
    private static void Require(bool result, string stage) {
        if (!result) throw new InvalidOperationException("Proof process failure at " + stage + ", code " + Marshal.GetLastWin32Error());
    }
    private static string TokenSid(SafeAccessTokenHandle token) {
        int size;
        GetTokenInformation(token, 1, IntPtr.Zero, 0, out size);
        if (size < IntPtr.Size + 4 || size > 65536) throw new InvalidOperationException("Invalid child token extent.");
        IntPtr bytes = Marshal.AllocHGlobal(size);
        try {
            int returned;
            Require(GetTokenInformation(token, 1, bytes, size, out returned), "read-child-token");
            IntPtr sid = Marshal.ReadIntPtr(bytes);
            long offset = sid.ToInt64() - bytes.ToInt64();
            if (offset < 0 || offset > size - 8 || 8 + Marshal.ReadByte(sid, 1) * 4 > size - offset)
                throw new InvalidOperationException("Invalid child token SID extent.");
            return new SecurityIdentifier(sid).Value;
        } finally { Marshal.FreeHGlobal(bytes); }
    }
    public static SafeAccessTokenHandle Logon(string name, SecureString password) {
        IntPtr secret = Marshal.SecureStringToGlobalAllocUnicode(password);
        try {
            SafeAccessTokenHandle token;
            // R5 launches local processes. R4's NETWORK token remains unchanged
            // in its own harness and is not reused as a process logon here.
            if (!LogonUserW(name, ".", secret, 2, 0, out token)) {
                int error = Marshal.GetLastWin32Error();
                if (token != null) token.Dispose();
                throw new Win32Exception(error);
            }
            return token;
        } finally { Marshal.ZeroFreeGlobalAllocUnicode(secret); }
    }
    private static string Quote(string value) {
        if (value.IndexOfAny(new char[] {'"', '\0', '\r', '\n'}) >= 0 || value.EndsWith("\\"))
            throw new ArgumentException("Invalid proof process argument.");
        return "\"" + value + "\"";
    }
    public sealed class Child : IDisposable {
        private IntPtr process;
        internal Child(IntPtr handle) { process = handle; }
        public uint Status { get { uint status; Require(GetExitCodeProcess(process, out status)); return status; } }
        public uint Finish() {
            if (WaitForSingleObject(process, 60000) != 0) throw new InvalidOperationException("Proof child did not finish.");
            uint status; Require(GetExitCodeProcess(process, out status)); return status;
        }
        public void Dispose() {
            if (process == IntPtr.Zero) return;
            if (WaitForSingleObject(process, 0) == 258) {
                Require(TerminateProcess(process, 1));
                if (WaitForSingleObject(process, 60000) != 0) throw new InvalidOperationException("Proof child cleanup failed.");
            }
            Require(CloseHandle(process)); process = IntPtr.Zero;
        }
    }
    public static Child Launch(SafeAccessTokenHandle token, string expectedSid, string node, string script,
        int port, string nonce, string actor, string arena, string binary, string directory) {
        SafeAccessTokenHandle primary;
        Require(DuplicateTokenEx(token, 0x000F01FF, IntPtr.Zero, 2, 1, out primary), "duplicate-primary");
        using (primary) {
            var startup = new Startup { Size = Marshal.SizeOf<Startup>() };
            // Static bootstrap code uses argv for paths, never string interpolation
            // of source or credentials. It distinguishes JS startup from actor setup.
            const string bootstrap = "const f=require('node:fs');const d=process.argv[1];const s=process.argv[2];" +
                "f.writeFileSync(d,JSON.stringify({started:true,environmentReady:process.env.GITHUB_ACTIONS==='true'&&" +
                "process.env.RUNNER_ENVIRONMENT==='github-hosted'&&process.env.DSS_RIGHTS_ACTOR_PROOF==='1'}),{flag:'wx'});" +
                "process.argv.splice(1,1);require(s);";
            var marker = System.IO.Path.Combine(arena, actor + "-bootstrap.json");
            var command = new StringBuilder(Quote(node) + " --eval " + Quote(bootstrap) + " " + Quote(marker) + " " + Quote(script) + " " + port + " " + Quote(nonce) +
                " " + Quote(actor) + " " + Quote(arena) + " " + Quote(binary));
            var block = "DSS_RIGHTS_ACTOR_PROOF=1\0GITHUB_ACTIONS=true\0RUNNER_ENVIRONMENT=github-hosted\0SystemRoot=" +
                Environment.GetEnvironmentVariable("SystemRoot") + "\0TEMP=" + directory + "\0TMP=" + directory + "\0\0";
            IntPtr environment = Marshal.StringToHGlobalUni(block);
            ProcessInfo info;
            try { Require(CreateProcessWithTokenW(primary, 1, node, command, 0x08000400, environment, directory, ref startup, out info), "create-primary-process"); }
            finally { Marshal.FreeHGlobal(environment); }
            CloseHandle(info.Thread);
            var child = new Child(info.Process);
            try {
                SafeAccessTokenHandle actual;
                Require(OpenProcessToken(info.Process, 8, out actual), "query-child-token");
                using (actual) {
                    if (TokenSid(actual) != expectedSid)
                        throw new InvalidOperationException("Actual child identity mismatch.");
                }
                return child;
            } catch { child.Dispose(); throw; }
        }
    }
}
