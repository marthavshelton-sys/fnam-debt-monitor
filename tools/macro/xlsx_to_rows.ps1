# Reads the first worksheet of an .xlsx into rows of strings with no Excel
# dependency: an xlsx is a zip of XML, cells are either inline numbers or
# indexes into a shared-string table.
param([Parameter(Mandatory)][string]$Path, [string]$OutJson)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
function ReadEntry($name) {
  $e = $zip.GetEntry($name); if (-not $e) { return $null }
  $sr = New-Object System.IO.StreamReader($e.Open()); $s = $sr.ReadToEnd(); $sr.Close(); return $s
}
$ssXml = ReadEntry "xl/sharedStrings.xml"
$shared = @()
if ($ssXml) {
  $x = [xml]$ssXml
  $ns = New-Object System.Xml.XmlNamespaceManager($x.NameTable)
  $ns.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
  foreach ($si in $x.SelectNodes("//m:si", $ns)) {
    $shared += (($si.SelectNodes(".//m:t", $ns) | ForEach-Object { $_.InnerText }) -join "")
  }
}
$sheet = [xml](ReadEntry "xl/worksheets/sheet1.xml")
$ns2 = New-Object System.Xml.XmlNamespaceManager($sheet.NameTable)
$ns2.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
$rows = @()
foreach ($r in $sheet.SelectNodes("//m:sheetData/m:row", $ns2)) {
  $cells = @{}
  foreach ($c in $r.SelectNodes("m:c", $ns2)) {
    $ref = $c.GetAttribute("r") -replace '\d',''
    $vNode = $c.SelectSingleNode("m:v", $ns2)
    $v = if ($vNode) { $vNode.InnerText } else { $null }
    if ($c.GetAttribute("t") -eq "s" -and $v -ne $null) { $v = $shared[[int]$v] }
    elseif ($c.GetAttribute("t") -eq "inlineStr") { $v = ($c.SelectNodes(".//m:t", $ns2) | ForEach-Object { $_.InnerText }) -join "" }
    $cells[$ref] = $v
  }
  $rows += ,$cells
}
$zip.Dispose()
if ($OutJson) { ($rows | ConvertTo-Json -Depth 4 -Compress) | Set-Content $OutJson -Encoding utf8 }
return $rows
