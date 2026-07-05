# server.ps1
# A lightweight static web server in PowerShell using .NET HttpListener

$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Server started. Listening on http://localhost:${port}/"
    Write-Host "Press Ctrl+C in this process or terminate the task to stop the server."
} catch {
    Write-Error "Failed to start listener on port ${port}: $_"
    exit
}

$workspaceDir = "c:\Users\Admin\Desktop\cafezza"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.RawUrl.Split('?')[0]
        if ($rawUrl -eq "/" -or $rawUrl -eq "") {
            $rawUrl = "/index.html"
        }

        # Prevent directory traversal
        $safeUrl = $rawUrl.Replace("..", "")
        $localPath = [System.IO.Path]::Combine($workspaceDir, $safeUrl.TrimStart('/'))

        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".png"  { $response.ContentType = "image/png" }
                ".gif"  { $response.ContentType = "image/gif" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $statusBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $statusBytes.Length
            $response.OutputStream.Write($statusBytes, 0, $statusBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Server stopped or encountered an error: $_"
} finally {
    $listener.Stop()
}
