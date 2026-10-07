# Private-sector debt from the Federal Reserve's Z.1 Financial Accounts of the United
# States, via FRED (the St. Louis Fed republishes every Z.1 series the day it comes out).
#   "Debt securities and loans; liability, level" per sector, quarterly, not seasonally
#   adjusted, $ millions: households and nonprofits, nonfinancial corporate business,
#   nonfinancial noncorporate business, nonfinancial business (the two together), federal
#   government, state and local governments, domestic nonfinancial sectors (all of the
#   above), domestic financial sectors and all sectors; plus the nonfinancial corporate
#   sector's debt securities alone (its loans are the remainder).
#   Nominal GDP (BEA, $ billions, SAAR) for the ratios, as the Z.1's own table D.3 does.
# Every id is checked against its FRED title before it is used (common.ps1,
# Get-FredChecked), and the sector totals are checked against the sum of their components.
. "$PSScriptRoot\common.ps1"
$from = "1952-01-01"   # the Z.1's quarterly series start here; earlier points are annual

$defs = [ordered]@{
  hh     = @{ ids = @("CMDEBT", "BOGZ1FL154104005Q");    re = '^Households and Nonprofit Organizations; Debt Securities and Loans; Liability, Level' }
  nfc    = @{ ids = @("BCNSDODNS", "TCMILBSNNCB");       re = '^Nonfinancial Corporate Business; Debt Securities and Loans; Liability, Level' }
  nnb    = @{ ids = @("TCMILBSNNB");                     re = '^Nonfinancial Noncorporate Business; Debt Securities and Loans; Liability, Level' }
  bus    = @{ ids = @("TBSDODNS");                       re = '^Nonfinancial Business; Debt Securities and Loans; Liability, Level' }
  fed    = @{ ids = @("FGSDODNS");                       re = '^Federal Government; Debt Securities and Loans; Liability, Level' }
  sl     = @{ ids = @("SLGSDODNS");                      re = '^State and Local Governments; Debt Securities and Loans; Liability, Level' }
  dnf    = @{ ids = @("TCMDODNS");                       re = '^Domestic Nonfinancial Sectors; Debt Securities and Loans; Liability, Level' }
  fin    = @{ ids = @("DODFS");                          re = '^Domestic Financial Sectors; Debt Securities and Loans; Liability, Level' }
  all    = @{ ids = @("TCMDO");                          re = '^All Sectors; Debt Securities and Loans; Liability, Level' }
  nfcSec = @{ ids = @("NCBDBIQ027S");                    re = '^Nonfinancial Corporate Business; Debt Securities; Liability, Level' }
}
$series = [ordered]@{}; $by = @{}
foreach ($k in $defs.Keys) {
  $s = Get-FredChecked $defs[$k].ids $defs[$k].re $from
  $series[$k] = [ordered]@{ id = $s.id; title = $s.title }
  $m = @{}; foreach ($p in $s.points) { $m[(ToQuarter $p.d)] = [math]::Round($p.v / 1000, 1) }   # $ millions -> $ billions
  $by[$k] = $m
}
$g = Get-FredChecked @("GDP") '^Gross Domestic Product$' "1947-01-01"
$series["gdp"] = [ordered]@{ id = $g.id; title = $g.title }
$gdp = @{}; foreach ($p in $g.points) { $gdp[(ToQuarter $p.d)] = [math]::Round($p.v, 1) }

# One row per quarter from the first quarter the household series has; a quarter a series
# lacks carries null there (GDP's advance estimate runs a quarter ahead of the Z.1).
$quarters = @($by["hh"].Keys | Sort-Object)
$rows = New-Object System.Collections.ArrayList
foreach ($q in $quarters) {
  $row = [ordered]@{ d = $q }
  foreach ($k in $defs.Keys) { $row[$k] = $(if ($by[$k].ContainsKey($q)) { $by[$k][$q] } else { $null }) }
  $row["gdp"] = $(if ($gdp.ContainsKey($q)) { $gdp[$q] } else { $null })
  [void]$rows.Add($row)
}
$last = $rows[$rows.Count - 1]
Write-Output ("Z.1 debt: {0} quarters, {1} .. {2}; households {3}B, nonfinancial corporate {4}B, domestic nonfinancial {5}B, GDP {6}B" -f $rows.Count, $rows[0].d, $last.d, $last.hh, $last.nfc, $last.dnf, $last.gdp)

# ---- plausibility bands on the Z.1's sector totals (table D.3): business ~ corporate +
# noncorporate; domestic nonfinancial ~ households + business + federal + state and local.
# The published totals are not exact sums of the FRED component series (the Fed's
# consolidation leaves gaps of up to 0.05% for business and 0.4% for the domestic
# nonfinancial total, 7-Oct-2026), so the bands are 0.2% and 1%: wide enough for that,
# far too narrow for a wrong series. Corporate debt securities must not exceed corporate debt.
$bad1 = @($rows | Where-Object { $null -ne $_.bus -and $null -ne $_.nfc -and $null -ne $_.nnb -and [math]::Abs($_.bus - ($_.nfc + $_.nnb)) -gt [math]::Max(0.5, 0.002 * $_.bus) })
$bad2 = @($rows | Where-Object { $null -ne $_.dnf -and $null -ne $_.hh -and $null -ne $_.bus -and $null -ne $_.fed -and $null -ne $_.sl -and [math]::Abs($_.dnf - ($_.hh + $_.bus + $_.fed + $_.sl)) -gt [math]::Max(0.5, 0.01 * $_.dnf) })
$bad3 = @($rows | Where-Object { $null -ne $_.nfcSec -and $null -ne $_.nfc -and $_.nfcSec -gt $_.nfc })
if ($bad1.Count) { throw ("Z.1 business debt differs from corporate + noncorporate by more than 0.2% in {0} quarters (first {1}: {2} vs {3} + {4})" -f $bad1.Count, $bad1[0].d, $bad1[0].bus, $bad1[0].nfc, $bad1[0].nnb) }
if ($bad2.Count) { throw ("Z.1 domestic nonfinancial debt differs from households + business + governments by more than 1% in {0} quarters (first {1})" -f $bad2.Count, $bad2[0].d) }
if ($bad3.Count) { throw ("nonfinancial corporate debt securities exceed total debt in {0} quarters" -f $bad3.Count) }
$gap1 = ($rows | Where-Object { $null -ne $_.bus -and $null -ne $_.nfc -and $null -ne $_.nnb } | ForEach-Object { [math]::Abs($_.bus - ($_.nfc + $_.nnb)) / $_.bus * 100 } | Measure-Object -Maximum).Maximum
$gap2 = ($rows | Where-Object { $null -ne $_.dnf -and $null -ne $_.hh -and $null -ne $_.bus -and $null -ne $_.fed -and $null -ne $_.sl } | ForEach-Object { [math]::Abs($_.dnf - ($_.hh + $_.bus + $_.fed + $_.sl)) / $_.dnf * 100 } | Measure-Object -Maximum).Maximum
Write-Output ("sector totals: business within {0:F3}% of corporate + noncorporate, domestic nonfinancial within {1:F3}% of its sectors, all {2} quarters" -f $gap1, $gap2, $rows.Count)
# The latest quarter with the full private-sector set (the Z.1 comes out as one release).
$complete = @($rows | Where-Object { $null -ne $_.hh -and $null -ne $_.nfc -and $null -ne $_.nnb -and $null -ne $_.fin })
$asOf = $complete[$complete.Count - 1].d
if ($asOf -ne $last.d) { Write-Host "::warning::Z.1 sectors end at different quarters ($asOf vs $($last.d))" }

$obj = [ordered]@{ quarterly = $rows; series = $series; asOf = $asOf; fetchedAt = (Get-Date -Format "yyyy-MM-dd") }
Save-Json $obj "debt_processed.json" 6
