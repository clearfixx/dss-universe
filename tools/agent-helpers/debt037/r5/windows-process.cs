/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Rights Actor Proof
 * 📄 File: tools/agent-helpers/debt037/r5/windows-process.cs
 * 🎯 Purpose: Launches and verifies real primary-token Node children in disposable CI.
 * 🧠 Responsibilities: Uses framework credential startup, bounded stdio and verified primary-token metadata.
 * 🏗️ Architecture: Test-only Win32 process adapter, distinct from native runtime code.
 * ⚠️ Important: No NETCREDENTIALS_ONLY or thread impersonation substitutes an ordinary process.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

public static class DssR5Process
{
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool OpenProcessToken(IntPtr process, uint access, out SafeAccessTokenHandle token);
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool GetTokenInformation(SafeAccessTokenHandle token, int kind, IntPtr buffer, int size, out int returned);
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
    private static int TokenNumber(SafeAccessTokenHandle token, int kind) {
        IntPtr bytes = Marshal.AllocHGlobal(4);
        try {
            int returned;
            Require(GetTokenInformation(token, kind, bytes, 4, out returned), "read-child-token");
            if (returned != 4) throw new InvalidOperationException("Invalid token number extent.");
            return Marshal.ReadInt32(bytes);
        } finally { Marshal.FreeHGlobal(bytes); }
    }
    public sealed class Child : IDisposable {
        private readonly Process process;
        private readonly Task output, errors;
        private volatile string hint = "none";
        private bool disposed;
        internal Child(Process value) {
            process = value;
            output = Drain(process.StandardOutput, false);
            errors = Drain(process.StandardError, true);
            process.StandardInput.Close();
        }
        private async Task Drain(StreamReader reader, bool diagnostic) {
            char[] buffer = new char[1024];
            var text = new StringBuilder();
            int count;
            while ((count = await reader.ReadAsync(buffer, 0, buffer.Length)) > 0) {
                if (diagnostic && text.Length < 8192) {
                    text.Append(buffer, 0, Math.Min(count, 8192 - text.Length));
                    string seen = text.ToString();
                    if (seen.Contains("Cannot find module")) hint = "module-not-found";
                    else if (seen.Contains("EACCES") || seen.Contains("Access is denied")) hint = "file-access-denied";
                    else if (seen.Contains("ECONNREFUSED")) hint = "connection-refused";
                    else if (seen.Contains("Unadmitted proof child")) hint = "environment-guard";
                    else if (seen.Contains("error") || seen.Contains("Error")) hint = "node-error";
                }
            }
        }
        public string ErrorHint { get { return hint; } }
        public uint Status { get { return process.HasExited ? unchecked((uint)process.ExitCode) : 259; } }
        public uint Finish() {
            var clock = Stopwatch.StartNew();
            if (!process.WaitForExit(60000)) throw new InvalidOperationException("Proof child did not finish.");
            var drained = Task.WhenAll(output, errors);
            int remaining = (int)Math.Max(0, 60000 - clock.ElapsedMilliseconds);
            if (!drained.Wait(remaining)) throw new InvalidOperationException("Proof child stdio did not close.");
            drained.GetAwaiter().GetResult();
            return unchecked((uint)process.ExitCode);
        }
        public void Dispose() {
            if (disposed) return;
            try {
                if (!process.HasExited) process.Kill();
                Finish();
            } finally { process.Dispose(); disposed = true; }
        }
    }
    public static Child Launch(string name, SecureString password, string expectedSid, string node, string script,
        int port, string nonce, string actor, string arena, string binary, string directory) {
        // The managed credential API owns logon/profile/stdio setup. Credentials
        // remain SecureString data; no shell, password argument or elevated actor.
        var start = new ProcessStartInfo {
            FileName = node, UserName = name, Domain = ".", Password = password,
            LoadUserProfile = true, UseShellExecute = false, CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden, WorkingDirectory = directory,
            RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true
        };
        const string bootstrap = "const f=require('node:fs');const d=process.argv[1];const s=process.argv[2];" +
            "f.writeFileSync(d,JSON.stringify({started:true,environmentReady:process.env.GITHUB_ACTIONS==='true'&&" +
            "process.env.RUNNER_ENVIRONMENT==='github-hosted'&&process.env.DSS_RIGHTS_ACTOR_PROOF==='1'}),{flag:'wx'});" +
            "process.argv.splice(1,1);require(s);";
        var marker = Path.Combine(arena, actor + "-bootstrap.json");
        foreach (string argument in new string[] {"--eval", bootstrap, marker, script, port.ToString(System.Globalization.CultureInfo.InvariantCulture),
            nonce, actor, arena, binary}) start.ArgumentList.Add(argument);
        start.Environment.Clear();
        start.Environment["DSS_RIGHTS_ACTOR_PROOF"] = "1";
        start.Environment["GITHUB_ACTIONS"] = "true";
        start.Environment["RUNNER_ENVIRONMENT"] = "github-hosted";
        start.Environment["SystemRoot"] = Environment.GetEnvironmentVariable("SystemRoot");
        start.Environment["TEMP"] = directory;
        start.Environment["TMP"] = directory;
        var process = new Process { StartInfo = start };
        Child child = null;
        try {
            if (!process.Start()) throw new InvalidOperationException("Ordinary process did not start.");
            child = new Child(process);
            SafeAccessTokenHandle token;
            Require(OpenProcessToken(process.Handle, 8, out token), "query-child-token");
            using (token) {
                if (TokenSid(token) != expectedSid || TokenNumber(token, 8) != 1 || TokenNumber(token, 20) != 0)
                    throw new InvalidOperationException("Actual ordinary primary token mismatch.");
            }
            return child;
        } catch {
            if (child != null) child.Dispose();
            else process.Dispose();
            throw;
        }
    }
}
