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
            string apiExe = Path.Combine(root, "api", "Team Beauty Brownsville.exe");
            string nginxExe = Path.Combine(root, "nginx", "nginx.exe");
            string apiPid = Path.Combine(root, "api.pid");
            string nginxPid = Path.Combine(root, "nginx.pid");

            if (!File.Exists(apiExe))
            {
                throw new InvalidOperationException($"API binary not found: {apiExe}");
            }

            if (!File.Exists(nginxExe))
            {
                throw new InvalidOperationException($"Nginx binary not found: {nginxExe}");
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
                apiProcess = Process.Start(apiInfo) ?? throw new InvalidOperationException("Failed to start API process.");
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to start API process. If Windows blocked the file, right-click the EXE, open Properties, and click Unblock, or run Unblock-File on it.", ex);
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
                Process.Start(nginxInfo);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to start Nginx. If Windows blocked the file, right-click the EXE, open Properties, and click Unblock, or run Unblock-File on it.", ex);
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
            string nginxExe = Path.Combine(root, "nginx", "nginx.exe");
            string nginxPrefix = Path.Combine(root, "nginx");

            if (File.Exists(nginxExe))
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
    }
}
