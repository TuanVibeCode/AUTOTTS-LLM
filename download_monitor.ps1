$url = "https://hf-mirror.com/mradermacher/Qwen3-4B-2507-Thinking-heretic-abliterated-uncensored-GGUF/resolve/main/Qwen3-4B-2507-Thinking-heretic-abliterated-uncensored.Q4_K_M.gguf"
$dest = "d:\text-tts\qwen3-heretic.gguf"
Write-Host "Starting download..."

Import-Module BitsTransfer
# Clean up any existing jobs
Get-BitsTransfer | Remove-BitsTransfer

# Start async transfer
$job = Start-BitsTransfer -Source $url -Destination $dest -Asynchronous -Priority Foreground

while ($job.JobState -eq 'Transferring' -or $job.JobState -eq 'Connecting') {
    $p = $job.BytesTransferred
    $t = $job.TotalBytes
    if ($t -gt 0) {
        $pct = [math]::Round(($p / $t) * 100, 1)
        $pmb = [math]::Round($p / 1MB, 2)
        $tmb = [math]::Round($t / 1MB, 2)
        Write-Host "Downloading: $pmb MB / $tmb MB ($pct%)"
    } else {
        Write-Host "Connecting..."
    }
    Start-Sleep -Seconds 2
}

if ($job.JobState -eq 'Transferred') {
    Complete-BitsTransfer -BitsJob $job
    Write-Host "Download Finished Successfully!"
} else {
    Write-Host "Download ended with state: $($job.JobState)"
    $job | Format-List
}
