$root = "C:\dev"
$report = @()

Get-ChildItem -Recurse -Directory $root | ForEach-Object {
    $acl = Get-Acl $_.FullName
    $owner = $acl.Owner
    if ($owner -ne "LAPTOP-66OOGH2M\soren") {
        $report += [pscustomobject]@{
            Path  = $_.FullName
            Owner = $owner
        }
    }
}

$report | Format-Table -AutoSize
$report | Export-Csv "$root\ownership-report.csv" -NoTypeInformation

Write-Output "Ownership scan complete. See ownership-report.csv."
