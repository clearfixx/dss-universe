/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Native Security Test Fixtures
 * 📄 File: tools/agent-helpers/debt037/windows-acl-fixture.cs
 * 🎯 Purpose: Creates explicit DACL controls on caller-admitted synthetic fixtures.
 * 🧠 Responsibilities: Owns descriptor allocations and preserves native errors.
 * 🏗️ Architecture: Test-only interop; never loaded by API/Worker/native runtime.
 * ⚠️ Important: PowerShell wrapper must admit the fresh temporary arena first.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class Dss037AclFixture
{
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode)]
    private static extern uint SetNamedSecurityInfoW(string path, uint type, uint information,
        IntPtr owner, IntPtr group, IntPtr dacl, IntPtr sacl);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool ConvertStringSecurityDescriptorToSecurityDescriptorW(
        string text, uint revision, out IntPtr descriptor, out uint size);
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool GetSecurityDescriptorDacl(IntPtr descriptor,
        out bool present, out IntPtr dacl, out bool defaulted);
    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr memory);

    public static void Apply(string path, string mode, string currentSid)
    {
        IntPtr descriptor = IntPtr.Zero, dacl = IntPtr.Zero;
        try
        {
            if (mode != "null-dacl")
            {
                string text;
                if (mode == "empty-dacl") text = "D:P";
                else if (mode == "entries") text = "D:P(A;;FA;;;" + currentSid + ")(A;;FR;;;WD)";
                else throw new ArgumentException("Unknown synthetic ACL mode.");
                uint size;
                if (!ConvertStringSecurityDescriptorToSecurityDescriptorW(text, 1, out descriptor, out size))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
                bool present, defaulted;
                if (!GetSecurityDescriptorDacl(descriptor, out present, out dacl, out defaulted) || !present)
                    throw new InvalidOperationException("Synthetic descriptor did not contain a DACL.");
            }
            uint error = SetNamedSecurityInfoW(path, 1, 0x80000004, IntPtr.Zero, IntPtr.Zero, dacl, IntPtr.Zero);
            if (error != 0) throw new Win32Exception((int)error);
        }
        finally { if (descriptor != IntPtr.Zero) LocalFree(descriptor); }
    }
}
