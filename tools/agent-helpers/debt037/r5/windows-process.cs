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
using Microsoft.Win32.SafeHandles;

public static class DssR5Process
{
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
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern uint WaitForSingleObject(IntPtr handle, uint ms);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GetExitCodeProcess(IntPtr handle, out uint status);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool TerminateProcess(IntPtr handle, uint status);
    private static void Require(bool result) { if (!result) throw new Win32Exception(Marshal.GetLastWin32Error()); }
    private static string Quote(string value) {
        if (value.IndexOfAny(new char[] {'"', '\0', '\r', '\n'}) >= 0 || value.EndsWith("\\"))
            throw new ArgumentException("Invalid proof process argument.");
        return "\"" + value + "\"";
    }
    public sealed class Child : IDisposable {
        private IntPtr process;
        internal Child(IntPtr handle) { process = handle; }
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
        Require(DuplicateTokenEx(token, 0x000F01FF, IntPtr.Zero, 2, 1, out primary));
        using (primary) {
            var startup = new Startup { Size = Marshal.SizeOf<Startup>() };
            var command = new StringBuilder(Quote(node) + " " + Quote(script) + " " + port + " " + Quote(nonce) +
                " " + Quote(actor) + " " + Quote(arena) + " " + Quote(binary));
            var block = "DSS_RIGHTS_ACTOR_PROOF=1\0GITHUB_ACTIONS=true\0RUNNER_ENVIRONMENT=github-hosted\0SystemRoot=" +
                Environment.GetEnvironmentVariable("SystemRoot") + "\0TEMP=" + directory + "\0TMP=" + directory + "\0\0";
            IntPtr environment = Marshal.StringToHGlobalUni(block);
            ProcessInfo info;
            try { Require(CreateProcessWithTokenW(primary, 0, node, command, 0x08000400, environment, directory, ref startup, out info)); }
            finally { Marshal.FreeHGlobal(environment); }
            CloseHandle(info.Thread);
            var child = new Child(info.Process);
            try {
                SafeAccessTokenHandle actual;
                Require(OpenProcessToken(info.Process, 8, out actual));
                using (actual) {
                    if (Dss037IdentityNative.Identity(actual) != expectedSid)
                        throw new InvalidOperationException("Actual child identity mismatch.");
                }
                return child;
            } catch { child.Dispose(); throw; }
        }
    }
}
