#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Storage Infrastructure Characterization
📄 File: scripts/characterization/storage-windows-restricted-token.ps1

🎯 Purpose:
Proves ACL and reparse controls against real Windows filesystem calls.

🧠 Responsibilities:
• creates synthetic fixtures only in a fresh system-temp arena;
• checks writable namespaces and protected metadata under a restricted token;
• retains negative controls and fails on unexpected access outcomes.

🏗️ Architecture:
Opt-in design evidence, independent of API/Worker runtime and business policy.
A restricted current-user token is not a separate OS-user logon.

⚠️ Important:
Run with PowerShell 7 on Windows outside an already restricted sandbox token.
Changes only fixture ACLs; creates no users, touches no DSS uploads or database.
Fixtures remain for inspection. Never recursively delete their reparse paths.
This is not a production storage implementation or complete containment proof.

🚀 Build. Share. Grow.
===============================================================
#>
if (-not $IsWindows) { throw 'This characterization requires Windows.' }
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Principal;
public static class Dss037RestrictedIo {
 [StructLayout(LayoutKind.Sequential)] struct SidAttributes {public IntPtr Sid;public uint Attributes;}
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool OpenProcessToken(IntPtr process,uint access,out IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool CreateRestrictedToken(IntPtr token,uint flags,uint disable,IntPtr disabled,uint delete,IntPtr privileges,uint restrict,ref SidAttributes restricted,out IntPtr result);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool ImpersonateLoggedOnUser(IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool RevertToSelf();
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool IsTokenRestricted(IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool ConvertStringSecurityDescriptorToSecurityDescriptorW(string sddl,uint revision,out IntPtr sd,out uint size);
 [DllImport("advapi32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool SetFileSecurityW(string path,uint information,IntPtr sd);
 [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr p);
 [DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern IntPtr CreateFileW(string path,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool MoveFileW(string from,string to);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool DeviceIoControl(IntPtr handle,uint code,byte[] buffer,uint size,IntPtr output,uint outputSize,out uint returned,IntPtr overlapped);
 public static void Descriptor(string path,string sddl) {
  IntPtr sd;uint size;if(!ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl,1,out sd,out size))throw new Win32Exception(Marshal.GetLastWin32Error());
  try {if(!SetFileSecurityW(path,0x80000004,sd))throw new Win32Exception(Marshal.GetLastWin32Error());}finally{LocalFree(sd);}
 }
 public static int[] Probe(string root,string stage,string safeEmpty,string unsafeEmpty) {
  IntPtr original=IntPtr.Zero,restricted=IntPtr.Zero,sidMemory=IntPtr.Zero,heldSafe=IntPtr.Zero,heldUnsafe=IntPtr.Zero;
  var sid=new SecurityIdentifier("S-1-5-21-111-222-333-1002");byte[] bytes=new byte[sid.BinaryLength];sid.GetBinaryForm(bytes,0);
  try {
   heldSafe=CreateFileW(safeEmpty,0x100081,3,IntPtr.Zero,3,0x02200000,IntPtr.Zero);
   if(heldSafe==new IntPtr(-1))throw new Win32Exception(Marshal.GetLastWin32Error());
   heldUnsafe=CreateFileW(unsafeEmpty,0x100081,3,IntPtr.Zero,3,0x02200000,IntPtr.Zero);
   if(heldUnsafe==new IntPtr(-1))throw new Win32Exception(Marshal.GetLastWin32Error());
   sidMemory=Marshal.AllocHGlobal(bytes.Length);Marshal.Copy(bytes,0,sidMemory,bytes.Length);
   if(!OpenProcessToken(GetCurrentProcess(),0xE,out original))throw new Win32Exception(Marshal.GetLastWin32Error());
   var restriction=new SidAttributes{Sid=sidMemory};
   if(!CreateRestrictedToken(original,1,0,IntPtr.Zero,0,IntPtr.Zero,1,ref restriction,out restricted))throw new Win32Exception(Marshal.GetLastWin32Error());
   if(!IsTokenRestricted(restricted))throw new Exception("Token is not restricted");
   if(!ImpersonateLoggedOnUser(restricted))throw new Win32Exception(Marshal.GetLastWin32Error());
   try {
    return new int[]{Open(root+"/writer-created.txt",2,1,0x80),Open(root,0x100,3,0x02200000),Open(root,0x40,3,0x02200000),Open(root,0x40000,3,0x02200000),Open(root,0x80000,3,0x02200000),MoveFileW(root+"/owned",root+"/moved")?0:Marshal.GetLastWin32Error(),Open(stage+"/secret.txt",1,3,0x80),Open(unsafeEmpty,0x100,3,0x02200000),Junction(safeEmpty,stage),Junction(unsafeEmpty,stage)};
   }finally{if(!RevertToSelf())Environment.FailFast("Impersonation cleanup failed");}
  }finally{if(heldUnsafe!=IntPtr.Zero && heldUnsafe!=new IntPtr(-1))CloseHandle(heldUnsafe);if(heldSafe!=IntPtr.Zero && heldSafe!=new IntPtr(-1))CloseHandle(heldSafe);if(restricted!=IntPtr.Zero)CloseHandle(restricted);if(original!=IntPtr.Zero)CloseHandle(original);if(sidMemory!=IntPtr.Zero)Marshal.FreeHGlobal(sidMemory);}
 }
 static int Open(string path,uint access,uint disposition,uint flags) {
  IntPtr h=CreateFileW(path,access,7,IntPtr.Zero,disposition,flags,IntPtr.Zero);
  if(h==new IntPtr(-1))return Marshal.GetLastWin32Error();CloseHandle(h);return 0;
 }
 static int Junction(string path,string target) {
  IntPtr h=CreateFileW(path,0x102,3,IntPtr.Zero,3,0x02200000,IntPtr.Zero);
  if(h==new IntPtr(-1))return Marshal.GetLastWin32Error();
  try {
   byte[] substitute=System.Text.Encoding.Unicode.GetBytes("\\??\\"+target),print=System.Text.Encoding.Unicode.GetBytes(target);
   byte[] buffer=new byte[16+substitute.Length+2+print.Length+2];
   Buffer.BlockCopy(BitConverter.GetBytes(0xA0000003u),0,buffer,0,4);
   Buffer.BlockCopy(BitConverter.GetBytes(checked((ushort)(buffer.Length-8))),0,buffer,4,2);
   Buffer.BlockCopy(BitConverter.GetBytes(checked((ushort)substitute.Length)),0,buffer,10,2);
   Buffer.BlockCopy(BitConverter.GetBytes(checked((ushort)(substitute.Length+2))),0,buffer,12,2);
   Buffer.BlockCopy(BitConverter.GetBytes(checked((ushort)print.Length)),0,buffer,14,2);
   Buffer.BlockCopy(substitute,0,buffer,16,substitute.Length);Buffer.BlockCopy(print,0,buffer,18+substitute.Length,print.Length);
   uint returned;return DeviceIoControl(h,0x900A4,buffer,(uint)buffer.Length,IntPtr.Zero,0,out returned,IntPtr.Zero)?0:Marshal.GetLastWin32Error();
  }finally{CloseHandle(h);}
 }
}
'@
$arena=[IO.Path]::GetFullPath([IO.Path]::Combine([IO.Path]::GetTempPath(),'dss037-token-'+[Guid]::NewGuid().ToString('N')))
$root=[IO.Path]::Combine($arena,'uploads')
$owned=[IO.Path]::Combine($root,'owned')
$stage=[IO.Path]::Combine($arena,'private-stage')
$safeEmpty=[IO.Path]::Combine($arena,'safe-empty')
$unsafeEmpty=[IO.Path]::Combine($arena,'unsafe-empty')
foreach($path in @($arena,$root,$owned,$stage,$safeEmpty,$unsafeEmpty)) {
 if(!$path.StartsWith($arena,[StringComparison]::OrdinalIgnoreCase)){throw 'Arena guard failed'}
 [IO.Directory]::CreateDirectory($path)|Out-Null
}
[IO.File]::WriteAllText([IO.Path]::Combine($stage,'secret.txt'),'SYNTHETIC PRIVATE STAGE')
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$writer='S-1-5-21-111-222-333-1002'
$service="O:${sid}G:${sid}D:P(A;OICI;FA;;;${sid})"
$limited=$service+"(A;OICI;0x001200a7;;;${writer})"
foreach($path in @($root,$owned,$safeEmpty)){[Dss037RestrictedIo]::Descriptor($path,$limited)}
# Unsafe control grants mapped generic write plus read-attributes/traverse.
[Dss037RestrictedIo]::Descriptor($unsafeEmpty,$service+"(A;OICI;0x001201b6;;;${writer})")
foreach($path in @($stage,[IO.Path]::Combine($stage,'secret.txt'))){[Dss037RestrictedIo]::Descriptor($path,$service)}
$result=[Dss037RestrictedIo]::Probe($root,$stage,$safeEmpty,$unsafeEmpty)
$safeReparse=([IO.File]::GetAttributes($safeEmpty) -band [IO.FileAttributes]::ReparsePoint) -ne 0
$unsafeReparse=([IO.File]::GetAttributes($unsafeEmpty) -band [IO.FileAttributes]::ReparsePoint) -ne 0
[ordered]@{kind='real filesystem under restricted version of current user token; not a separate logon';checkedAt=[DateTime]::UtcNow.ToString('o');arena=$arena;serviceDirectoryHandlesHeld='share READ|WRITE, without DELETE, throughout reparse attempts';createFileError=$result[0];writeAttributesOpenError=$result[1];deleteChildOpenError=$result[2];writeDaclOpenError=$result[3];writeOwnerOpenError=$result[4];renameOwnedDirectoryError=$result[5];privateStageReadError=$result[6];genericWriteAttributesOpenError=$result[7];safeJunctionError=$result[8];genericWriteJunctionError=$result[9];safeBecameReparse=$safeReparse;unsafeBecameReparse=$unsafeReparse;createdFileExists=[IO.File]::Exists([IO.Path]::Combine($root,'writer-created.txt'));ownedDirectoryRemains=[IO.Directory]::Exists($owned);privateBytesUnchanged=([IO.File]::ReadAllText([IO.Path]::Combine($stage,'secret.txt')) -eq 'SYNTHETIC PRIVATE STAGE');hostUsersCreated=0;projectAclChanges=0} | ConvertTo-Json -Depth 4
if($result[0] -ne 0){throw 'Write-access control failed'}
for($i=1;$i -le 6;$i++){if($result[$i] -ne 5){throw "Expected access denied at result index $i"}}
if($result[7] -ne 0 -or $result[8] -ne 5 -or $result[9] -ne 0){throw 'Reparse/control assertions failed'}
if($safeReparse -or !$unsafeReparse){throw 'Reparse attributes assertion failed'}
if(-not [IO.File]::Exists([IO.Path]::Combine($root,'writer-created.txt')) -or -not [IO.Directory]::Exists($owned)){throw 'Fixture namespace assertion failed'}
if([IO.File]::ReadAllText([IO.Path]::Combine($stage,'secret.txt')) -ne 'SYNTHETIC PRIVATE STAGE'){throw 'Private sentinel was modified'}


