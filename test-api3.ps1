$file = "D:\Qy-server\test-api2.js"
$errors = @()
$command = "node `"$file`""
try {
    $result = & powershell -Command $command 2>&1
    Write-Output "OUTPUT: $result"
} catch {
    Write-Output "ERROR: $_"
}