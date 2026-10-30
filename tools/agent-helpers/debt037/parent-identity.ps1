#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Storage P2 Characterization
📄 File: tools/agent-helpers/debt037/parent-identity.ps1

🎯 Purpose:
Checks physical-parent identity coordination for Windows case aliases.

🧠 Responsibilities:
• opens real temporary directory objects and compares volume/file IDs;
• derives a versioned candidate stripe without hashing path text;
• disposes every metadata handle without touching application data.

🏗️ Architecture:
Opt-in infrastructure characterization; no runtime or admission implementation.

⚠️ Important:
Creates synthetic temp fixtures only; no ACL repair, host users or uploads IO.
Does not prove hostile-identity security or all filesystem alias behavior.

🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'This characterization requires Windows.' }
if (-not ('DssParentIdentityProbe' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class DssParentIdentityProbe {
    [StructLayout(LayoutKind.Sequential)] struct FileId {
        public ulong Volume; public ulong Low; public ulong High;
    }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern SafeFileHandle CreateFileW(string name, uint access, uint share,
        IntPtr security, uint disposition, uint flags, IntPtr template);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool GetFileInformationByHandleEx(SafeFileHandle handle,
        int informationClass, out FileId info, uint size);
    public static byte[] Identity(string path) {
        using (var handle = CreateFileW(path, 0x80, 7, IntPtr.Zero, 3,
                0x02200000, IntPtr.Zero)) {
            if (handle.IsInvalid) throw new Win32Exception(Marshal.GetLastWin32Error());
            FileId info;
            if (!GetFileInformationByHandleEx(handle, 18, out info, 24))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            if (!BitConverter.IsLittleEndian) throw new NotSupportedException();
            byte[] result = new byte[24];
            Buffer.BlockCopy(BitConverter.GetBytes(info.Volume), 0, result, 0, 8);
            Buffer.BlockCopy(BitConverter.GetBytes(info.Low), 0, result, 8, 8);
            Buffer.BlockCopy(BitConverter.GetBytes(info.High), 0, result, 16, 8);
            return result;
        }
    }
}
'@
}

function Get-Stripe([byte[]]$RootIdentity, [byte[]]$ParentIdentity) {
    $stream = [IO.MemoryStream]::new()
    $writer = [IO.BinaryWriter]::new($stream)
    try {
        $writer.Write([Text.Encoding]::UTF8.GetBytes("DSS-STORAGE-PARENT-COORD-v1`0"))
        $writer.Write([byte]2)
        $writer.Write([uint32]$RootIdentity.Length)
        $writer.Write($RootIdentity)
        $writer.Write([uint32]$ParentIdentity.Length)
        $writer.Write($ParentIdentity)
        $writer.Flush()
        return [Security.Cryptography.SHA256]::HashData($stream.ToArray())[0]
    } finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

$arena = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('dss037-parent-' + [Guid]::NewGuid().ToString('N'))))
$parent = Join-Path $arena 'case-parent'
$alias = Join-Path $arena 'CASE-PARENT'
$null = [IO.Directory]::CreateDirectory($parent)
$rootId = [DssParentIdentityProbe]::Identity($arena)
$parentId = [DssParentIdentityProbe]::Identity($parent)
$aliasId = [DssParentIdentityProbe]::Identity($alias)
if ([Convert]::ToHexString($parentId) -cne [Convert]::ToHexString($aliasId)) { throw 'Case alias did not resolve to the same actual object.' }
$stripe = Get-Stripe $rootId $parentId
$aliasStripe = Get-Stripe $rootId $aliasId
if ($stripe -ne $aliasStripe) { throw 'Physical aliases received different stripes.' }
[ordered]@{
    caseAliasSamePhysicalIdentity = $true
    samePhysicalParentSameStripe = $true
    stripe = $stripe
    stripeCount = 256
    algorithm = 'SHA256(domain-NUL, platform-byte, little-endian length-prefixed identities)[0]'
    platform = [Runtime.InteropServices.RuntimeInformation]::OSDescription
    fixtureArena = $arena
    fixtureRetained = $true
    aclChanges = 0
    hostUsersCreated = 0
    productionContainmentProved = $false
} | ConvertTo-Json
