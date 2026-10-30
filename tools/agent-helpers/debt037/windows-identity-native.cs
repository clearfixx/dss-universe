/*
 * DSS Universe — Storage infrastructure characterization
 * File: tools/agent-helpers/debt037/windows-identity-native.cs
 * Purpose: synchronous, real-logon fixture capabilities for disposable Windows CI.
 * Responsibilities: own token/handle lifetimes; preserve Win32 outcomes; clear passwords.
 * Architecture: diagnostic helper only; no API/Worker or production storage imports.
 * Important: callers must enforce disposable-runner admission before provisioning users.
 * This is not production containment or a substitute for historical-handle proofs.
 * Build. Share. Grow.
 */
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Principal;
using Microsoft.Win32.SafeHandles;

public static class Dss037IdentityNative
{
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool LogonUserW(string name, string domain, IntPtr password,
        uint type, uint provider, out SafeAccessTokenHandle token);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFileW(string path, uint access, uint share,
        IntPtr security, uint disposition, uint flags, IntPtr template);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool DeviceIoControl(SafeFileHandle handle, uint code, byte[] input,
        uint size, IntPtr output, uint outputSize, out uint returned, IntPtr overlapped);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool ConvertStringSecurityDescriptorToSecurityDescriptorW(
        string text, uint revision, out IntPtr descriptor, out uint size);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool SetFileSecurityW(string path, uint information, IntPtr descriptor);
    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr memory);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetFileInformationByHandleEx(SafeFileHandle handle,
        int information, out AttributeTag value, uint size);
    [StructLayout(LayoutKind.Sequential)]
    private struct AttributeTag { public uint Attributes; public uint Tag; }

    public static SafeAccessTokenHandle Logon(string name, SecureString password)
    {
        IntPtr memory = Marshal.SecureStringToGlobalAllocUnicode(password);
        try
        {
            SafeAccessTokenHandle token;
            // NETWORK is a real local logon, unlike NEW_CREDENTIALS.
            if (!LogonUserW(name, ".", memory, 3, 0, out token))
            {
                int error = Marshal.GetLastWin32Error();
                if (token != null) token.Dispose();
                throw new Win32Exception(error);
            }
            return token;
        }
        finally { Marshal.ZeroFreeGlobalAllocUnicode(memory); }
    }

    public static string Identity(SafeAccessTokenHandle token)
    {
        return WindowsIdentity.RunImpersonated(token, () =>
        {
            using (WindowsIdentity identity = WindowsIdentity.GetCurrent())
            {
                if (!identity.IsAuthenticated || new WindowsPrincipal(identity)
                    .IsInRole(WindowsBuiltInRole.Administrator))
                    throw new InvalidOperationException("Fixture identity must be authenticated and non-admin.");
                return identity.User.Value;
            }
        });
    }

    public static void Descriptor(string path, string sddl)
    {
        IntPtr descriptor;
        uint size;
        if (!ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl, 1, out descriptor, out size))
            throw new Win32Exception(Marshal.GetLastWin32Error());
        try
        {
            if (!SetFileSecurityW(path, 0x80000004, descriptor))
                throw new Win32Exception(Marshal.GetLastWin32Error());
        }
        finally { LocalFree(descriptor); }
    }

    public static SafeFileHandle Open(SafeAccessTokenHandle token, string path, uint access)
    {
        return WindowsIdentity.RunImpersonated(token, () =>
        {
            SafeFileHandle handle = CreateFileW(path, access, 3, IntPtr.Zero, 3, 0x02200000, IntPtr.Zero);
            if (handle.IsInvalid)
            {
                int error = Marshal.GetLastWin32Error();
                handle.Dispose();
                throw new Win32Exception(error);
            }
            return handle;
        });
    }

    public static int OpenOutcome(SafeAccessTokenHandle token, string path, uint access)
    {
        try { using (SafeFileHandle handle = Open(token, path, access)) return 0; }
        catch (Win32Exception error) { return error.NativeErrorCode; }
    }

    public static uint Tag(SafeFileHandle handle)
    {
        AttributeTag value;
        if (!GetFileInformationByHandleEx(handle, 9, out value, 8))
            throw new Win32Exception(Marshal.GetLastWin32Error());
        return value.Tag;
    }

    public static int Junction(SafeAccessTokenHandle token, SafeFileHandle handle, string target)
    {
        byte[] substitute = System.Text.Encoding.Unicode.GetBytes("\\??\\" + target);
        byte[] print = System.Text.Encoding.Unicode.GetBytes(target);
        byte[] buffer = new byte[16 + substitute.Length + 2 + print.Length + 2];
        Buffer.BlockCopy(BitConverter.GetBytes(0xA0000003u), 0, buffer, 0, 4);
        Buffer.BlockCopy(BitConverter.GetBytes(checked((ushort)(buffer.Length - 8))), 0, buffer, 4, 2);
        Buffer.BlockCopy(BitConverter.GetBytes(checked((ushort)substitute.Length)), 0, buffer, 10, 2);
        Buffer.BlockCopy(BitConverter.GetBytes(checked((ushort)(substitute.Length + 2))), 0, buffer, 12, 2);
        Buffer.BlockCopy(BitConverter.GetBytes(checked((ushort)print.Length)), 0, buffer, 14, 2);
        Buffer.BlockCopy(substitute, 0, buffer, 16, substitute.Length);
        Buffer.BlockCopy(print, 0, buffer, 18 + substitute.Length, print.Length);
        return WindowsIdentity.RunImpersonated(token, () =>
        {
            uint returned;
            return DeviceIoControl(handle, 0x900A4, buffer, (uint)buffer.Length,
                IntPtr.Zero, 0, out returned, IntPtr.Zero) ? 0 : Marshal.GetLastWin32Error();
        });
    }
}
