# 实时同步：肉鸽飞机大战 → 作品集网站/肉鸽飞机大战
$source = "D:\Desktop\肉鸽飞机大战"
$target = "D:\Desktop\作品集网站\肉鸽飞机大战"

$exclude = @(".git", ".claude")

Write-Host "=== 游戏文件实时同步 ===" -ForegroundColor Cyan
Write-Host "源: $source"
Write-Host "目标: $target"
Write-Host "排除: $($exclude -join ', ')"
Write-Host "按 Ctrl+C 停止`n"

# 初次全量同步
Write-Host "[初始] 全量同步中..." -ForegroundColor Yellow
foreach ($item in Get-ChildItem $source -Force) {
    if ($exclude -contains $item.Name) { continue }
    Copy-Item -Path $item.FullName -Destination $target -Recurse -Force
}
Write-Host "[初始] 全量同步完成`n" -ForegroundColor Green

# 文件监控
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $source
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$action = {
    $name = $Event.SourceEventArgs.Name
    $fullPath = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType

    # 跳过排除目录
    foreach ($ex in $exclude) {
        if ($fullPath -match "(\\|/)$ex(\\|/)") { return }
    }

    $relPath = $fullPath.Substring($source.Length + 1)
    $destPath = Join-Path $target $relPath
    $destDir = Split-Path $destPath -Parent

    try {
        switch ($changeType) {
            "Changed" {
                if (Test-Path $fullPath -PathType Leaf) {
                    Copy-Item -Path $fullPath -Destination $destPath -Force
                }
            }
            "Created" {
                if (Test-Path $fullPath -PathType Container) {
                    if (-not (Test-Path $destPath)) {
                        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
                    }
                } else {
                    if (-not (Test-Path $destDir)) {
                        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                    }
                    Copy-Item -Path $fullPath -Destination $destPath -Force
                }
            }
            "Deleted" {
                if (Test-Path $destPath) {
                    Remove-Item -Path $destPath -Recurse -Force
                }
            }
            "Renamed" {
                $oldFullPath = $Event.SourceEventArgs.OldFullPath
                $oldRelPath = $oldFullPath.Substring($source.Length + 1)
                $oldDestPath = Join-Path $target $oldRelPath
                if (Test-Path $oldDestPath) {
                    Remove-Item -Path $oldDestPath -Recurse -Force
                }
                if (Test-Path $fullPath -PathType Container) {
                    if (-not (Test-Path $destPath)) {
                        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
                    }
                } else {
                    if (-not (Test-Path $destDir)) {
                        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                    }
                    Copy-Item -Path $fullPath -Destination $destPath -Force
                }
            }
        }
        Write-Host "[$changeType] $relPath"
    } catch {
        Write-Host "[错误] $relPath - $_" -ForegroundColor Red
    }
}

$handlers = @()
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action

Write-Host "监控已启动，等待文件变更..." -ForegroundColor Green
Write-Host ""

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    foreach ($h in $handlers) { Unregister-Event -SubscriptionId $h.Id -ErrorAction SilentlyContinue }
    $watcher.Dispose()
    Write-Host "`n监控已停止" -ForegroundColor Yellow
}
