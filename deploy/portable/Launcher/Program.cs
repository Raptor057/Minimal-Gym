using System;
using System.Diagnostics;
using System.IO;

namespace TeamBeautyBrownsville.Launcher
{
    internal static class Program
    {
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length > 0 && args[0].Equals("stop", StringComparison.OrdinalIgnoreCase))
                {
                    Stop();
                    return 0;
                }

                Start();
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex.Message);
                return 1;
            }
        }

        private static void Start()
        {
            string root = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            bool isWindows = OperatingSystem.IsWindows();
            string apiName = isWindows ? "Team Beauty Brownsville.exe" : "Team Beauty Brownsville";
            string apiExe = Path.Combine(root, "api", apiName);
            string nginxExe = FindNginxBinary(root);
            string apiPid = Path.Combine(root, "api.pid");
            string nginxPid = Path.Combine(root, "nginx.pid");

            if (!File.Exists(apiExe))
            {
                throw new InvalidOperationException($"API binary not found: {apiExe}");
            }

            if (string.IsNullOrWhiteSpace(nginxExe) || !File.Exists(nginxExe))
            {
                throw new InvalidOperationException("Nginx binary not found under the nginx folder.");
            }

            var apiInfo = new ProcessStartInfo
            {
                FileName = apiExe,
                WorkingDirectory = Path.Combine(root, "api"),
                UseShellExecute = false,
                CreateNoWindow = true
            };
            apiInfo.Environment["ASPNETCORE_URLS"] = "http://127.0.0.1:5057";

            Process apiProcess;
            try
            {
                if (TryGetRunningProcess(apiPid, out Process? existingApi))
                {
                    apiProcess = existingApi;
                }
                else
                {
                    apiProcess = Process.Start(apiInfo) ?? throw new InvalidOperationException("Failed to start API process.");
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(isWindows
                    ? "Failed to start API process. If Windows blocked the file, right-click the EXE, open Properties, and click Unblock, or run Unblock-File on it."
                    : "Failed to start API process.", ex);
            }

            File.WriteAllText(apiPid, apiProcess.Id.ToString());

            var nginxInfo = new ProcessStartInfo
            {
                FileName = nginxExe,
                WorkingDirectory = Path.Combine(root, "nginx"),
                Arguments = "-p \"" + Path.Combine(root, "nginx") + "\" -c conf/nginx.conf -g \"pid ../nginx.pid;\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            try
            {
                if (!TryGetRunningProcess(nginxPid, out _))
                {
                    Process.Start(nginxInfo);
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(isWindows
                    ? "Failed to start Nginx. If Windows blocked the file, right-click the EXE, open Properties, and click Unblock, or run Unblock-File on it."
                    : "Failed to start Nginx.", ex);
            }

            if (!File.Exists(nginxPid))
            {
                File.WriteAllText(nginxPid, string.Empty);
            }

            Console.WriteLine("Open http://localhost");
        }

        private static void Stop()
        {
            string root = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            string apiPid = Path.Combine(root, "api.pid");
            string nginxPid = Path.Combine(root, "nginx.pid");
            string nginxExe = FindNginxBinary(root);
            string nginxPrefix = Path.Combine(root, "nginx");

            if (!string.IsNullOrWhiteSpace(nginxExe) && File.Exists(nginxExe))
            {
                TryStartProcess(nginxExe, "-p \"" + nginxPrefix + "\" -c conf/nginx.conf -s stop -g \"pid ../nginx.pid;\"");
            }

            KillFromPidFile(nginxPid);
            KillFromPidFile(apiPid);
        }

        private static void KillFromPidFile(string pidFile)
        {
            try
            {
                if (!File.Exists(pidFile))
                {
                    return;
                }

                string content = File.ReadAllText(pidFile).Trim();
                if (int.TryParse(content, out int pid))
                {
                    using Process? process = Process.GetProcessById(pid);
                    process?.Kill(true);
                }

                File.Delete(pidFile);
            }
            catch
            {
                // Best-effort stop.
            }
        }

        private static void TryStartProcess(string fileName, string arguments)
        {
            try
            {
                var info = new ProcessStartInfo
                {
                    FileName = fileName,
                    WorkingDirectory = Path.GetDirectoryName(fileName) ?? string.Empty,
                    Arguments = arguments,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                Process.Start(info);
            }
            catch
            {
                // Best-effort stop.
            }
        }

        private static bool TryGetRunningProcess(string pidFile, out Process? process)
        {
            process = null;
            try
            {
                if (!File.Exists(pidFile))
                {
                    return false;
                }

                string content = File.ReadAllText(pidFile).Trim();
                if (!int.TryParse(content, out int pid))
                {
                    return false;
                }

                process = Process.GetProcessById(pid);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static string FindNginxBinary(string root)
        {
            string windowsPath = Path.Combine(root, "nginx", "nginx.exe");
            if (File.Exists(windowsPath))
            {
                return windowsPath;
            }

            string unixPath = Path.Combine(root, "nginx", "sbin", "nginx");
            if (File.Exists(unixPath))
            {
                return unixPath;
            }

            string flatUnix = Path.Combine(root, "nginx", "nginx");
            if (File.Exists(flatUnix))
            {
                return flatUnix;
            }

            try
            {
                foreach (string file in Directory.EnumerateFiles(Path.Combine(root, "nginx"), "nginx", SearchOption.AllDirectories))
                {
                    return file;
                }
            }
            catch
            {
                // Best-effort discovery.
            }

            return string.Empty;
        }
    }
}
