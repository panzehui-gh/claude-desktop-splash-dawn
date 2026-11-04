// Claude Dawn.exe - starts launcher\launch.ps1, and hosts the settings page.
//
// Why an .exe: some antivirus programs delete a .lnk shortcut whose target is "conhost --headless powershell
// -ExecutionPolicy Bypass", because malware uses the same pattern. This program starts the same script with no
// console window instead; a normal shortcut that points to this .exe is not suspicious.
//
//   Claude (Dawn).exe               play the splash and start Claude (opens the settings first if config.js is missing)
//   Claude (Dawn).exe --settings    open the settings page only (or hold Shift while double-clicking)
//   Claude (Dawn).exe --preview     play the splash in its own window, without starting Claude
//   other arguments                 passed on to launch.ps1 (e.g. -Art classic, -NoSound, -NoClaude)
//
// Local server: this program serves the project folder on http://localhost:<random port>/ (this computer only).
//  - The splash is loaded from there instead of from a file: a page opened from a file may not read the pixels of a local
//    video, but a page from localhost may, so the mouth, jaw and blink can be drawn on the playing Live2D video itself.
//  - The settings page is shown from there too; with a random token it may ask this program to write config.js
//    (a web page cannot write files itself). The server stops when the window closes or the launcher ends.
// Built by tools\build-exe.ps1 with the C# compiler that ships with Windows (.NET Framework 4).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

static class ClaudeDawn {
  static string root;

  [STAThread]
  static int Main(string[] args) {
    root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
    // Holding Shift while opening the program also opens the settings (handy when there is no settings shortcut)
    bool settingsOnly = (Control.ModifierKeys & Keys.Shift) != 0 ||
      args.Any(a => a.Equals("--settings", StringComparison.OrdinalIgnoreCase) || a.Equals("/settings", StringComparison.OrdinalIgnoreCase));
    args = args.Where(a => !a.Equals("--settings", StringComparison.OrdinalIgnoreCase) && !a.Equals("/settings", StringComparison.OrdinalIgnoreCase)).ToArray();
    bool preview = args.Any(a => a.Equals("--preview", StringComparison.OrdinalIgnoreCase));
    args = args.Where(a => !a.Equals("--preview", StringComparison.OrdinalIgnoreCase)).ToArray();
    if (preview) { try { Settings.PreviewWindow(root, ""); } catch (Exception e) { Error("Could not open the preview:\n" + e.Message); } return 0; }
    bool firstRun = !File.Exists(Path.Combine(root, "config.js"));
    if (settingsOnly || firstRun) {
      bool launch;
      try { launch = Settings.Run(root, firstRun && !settingsOnly); }
      catch (Exception e) { Error("Could not open the settings page:\n" + e.Message); launch = !settingsOnly; }
      if (settingsOnly || !launch) return 0;
    }
    return Launch(args);
  }

  static int Launch(string[] args) {
    string script = Path.Combine(root, "launcher", "launch.ps1");
    if (!File.Exists(script)) { Error("launcher\\launch.ps1 was not found next to this program:\n" + script); return 1; }
    string ps = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe");
    string extra = string.Join(" ", args.Select(Quote));
    // Serve the page from localhost for as long as the launcher runs (see the top of this file); without the server the
    // launcher falls back to opening the file directly
    int port = 0;
    try { port = Settings.StartServer(root); } catch { port = 0; }
    if (port > 0) extra += " -PageUrl " + Quote("http://localhost:" + port + "/splash.html");
    var psi = new ProcessStartInfo(ps, "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " + Quote(script) + " " + extra) {
      UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = Path.GetDirectoryName(script)
    };
    try {
      using (var p = Process.Start(psi)) { if (port > 0) p.WaitForExit(90000); }
      return 0;
    }
    catch (Exception e) { Error("Could not start PowerShell:\n" + e.Message); return 1; }
    finally { Settings.StopServer(); }
  }

  internal static string Quote(string a) { return a.Length > 0 && a.IndexOfAny(new[] { ' ', '"', '&' }) < 0 ? a : "\"" + a.Replace("\"", "\\\"") + "\""; }
  internal static void Error(string m) { MessageBox.Show(m, "Claude (Dawn)", MessageBoxButtons.OK, MessageBoxIcon.Error); }

  internal static string FindEdge() {
    foreach (var pf in new[] { Environment.GetEnvironmentVariable("ProgramFiles(x86)"), Environment.GetEnvironmentVariable("ProgramFiles") }) {
      if (string.IsNullOrEmpty(pf)) continue;
      string p = Path.Combine(pf, "Microsoft", "Edge", "Application", "msedge.exe");
      if (File.Exists(p)) return p;
    }
    return null;
  }
}

static class Settings {
  static string root, token;
  static int port;
  static HttpListener http;
  static readonly ManualResetEvent closed = new ManualResetEvent(false);

  // Starts the local server (localhost only, random port) and returns the port
  public static int StartServer(string projectRoot) {
    root = projectRoot; token = Guid.NewGuid().ToString("N"); port = FreePort();
    http = new HttpListener(); http.Prefixes.Add("http://localhost:" + port + "/"); http.Start();
    new Thread(() => Serve(http)) { IsBackground = true }.Start();
    return port;
  }
  public static void StopServer() { try { if (http != null) http.Stop(); } catch { } }

  // Plays the splash in an Edge app window from the local server and waits until that window is closed
  public static void PreviewWindow(string projectRoot, string query) {
    string edge = ClaudeDawn.FindEdge();
    if (edge == null) throw new Exception("Microsoft Edge was not found.");
    StartServer(projectRoot);
    string profile = Path.Combine(Path.GetTempPath(), "claude-dawn-preview-" + token.Substring(0, 8));
    string url = "http://localhost:" + port + "/splash.html" + (string.IsNullOrEmpty(query) ? "" : "?" + query);
    try {
      using (var p = Process.Start(new ProcessStartInfo(edge, "--user-data-dir=" + ClaudeDawn.Quote(profile) + " --no-first-run --no-default-browser-check" +
        " --autoplay-policy=no-user-gesture-required --window-size=1600,900 --app=" + ClaudeDawn.Quote(url)) { UseShellExecute = false })) p.WaitForExit();
    } finally {
      StopServer();
      for (int i = 0; i < 10; i++) { try { if (Directory.Exists(profile)) Directory.Delete(profile, true); break; } catch { Thread.Sleep(300); } }
    }
  }
  static bool launchAfter;
  static readonly JavaScriptSerializer json = new JavaScriptSerializer();

  // Returns true when the page asked to start Claude ("保存并启动 Claude").
  public static bool Run(string projectRoot, bool firstRun) {
    string edge = ClaudeDawn.FindEdge();
    if (edge == null) throw new Exception("Microsoft Edge was not found.");
    StartServer(projectRoot);
    // A separate, temporary Edge profile: the window is a real process we can wait for, and the user's own Edge is untouched
    string profile = Path.Combine(Path.GetTempPath(), "claude-dawn-settings-" + token.Substring(0, 8));
    string url = "http://localhost:" + port + "/settings.html?token=" + token + (firstRun ? "&first=1" : "");
    Process edgeProc = Process.Start(new ProcessStartInfo(edge,
      "--user-data-dir=" + ClaudeDawn.Quote(profile) + " --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required" +
      " --window-size=980,900 --app=" + ClaudeDawn.Quote(url)) { UseShellExecute = false });
    // Wait until the page says it is done, or its window is closed
    while (!closed.WaitOne(300)) { if (edgeProc.HasExited) break; }
    if (closed.WaitOne(0)) { try { if (!edgeProc.HasExited) edgeProc.WaitForExit(3000); } catch { } }
    StopServer();
    try { if (!edgeProc.HasExited) edgeProc.Kill(); } catch { }
    for (int i = 0; i < 10; i++) { try { if (Directory.Exists(profile)) Directory.Delete(profile, true); break; } catch { Thread.Sleep(300); } }
    return launchAfter;
  }

  static int FreePort() { var l = new TcpListener(IPAddress.Loopback, 0); l.Start(); int p = ((IPEndPoint)l.LocalEndpoint).Port; l.Stop(); return p; }

  static void Serve(HttpListener http) {
    while (http.IsListening) {
      HttpListenerContext ctx;
      try { ctx = http.GetContext(); } catch { return; }
      ThreadPool.QueueUserWorkItem(_ => { try { Handle(ctx); } catch { try { ctx.Response.StatusCode = 500; ctx.Response.Close(); } catch { } } });
    }
  }

  static void Handle(HttpListenerContext ctx) {
    var req = ctx.Request; var res = ctx.Response;
    string path = Uri.UnescapeDataString(req.Url.AbsolutePath);
    if (req.HttpMethod == "POST" && path.StartsWith("/api/")) {
      string tok = req.Headers["X-Dawn-Token"] ?? req.QueryString["token"];
      if (tok != token) { Send(res, 403, "text/plain", "forbidden"); return; }
      string body; using (var r = new StreamReader(req.InputStream, Encoding.UTF8)) body = r.ReadToEnd();
      var data = string.IsNullOrWhiteSpace(body) ? new Dictionary<string, object>() : json.Deserialize<Dictionary<string, object>>(body);
      if (path == "/api/save") { WriteConfig(Clean(data)); Send(res, 200, "application/json", "{\"ok\":true}"); return; }
      if (path == "/api/preview") { Preview(Clean(data)); Send(res, 200, "application/json", "{\"ok\":true}"); return; }
      if (path == "/api/close") {
        Send(res, 200, "application/json", "{\"ok\":true}");
        lock (closed) { if (!closed.WaitOne(0)) { launchAfter = data.ContainsKey("launch") && data["launch"] is bool && (bool)data["launch"]; closed.Set(); } }
        return;
      }
      Send(res, 404, "text/plain", "not found"); return;
    }
    if (req.HttpMethod != "GET" && req.HttpMethod != "HEAD") { Send(res, 405, "text/plain", "method not allowed"); return; }
    if (path == "/") path = "/settings.html";
    // Static files from the project folder only (no "..", nothing outside the root)
    string full = Path.GetFullPath(Path.Combine(root, path.TrimStart('/').Replace('/', '\\')));
    if (!full.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase) || !File.Exists(full)) { Send(res, 404, "text/plain", "not found"); return; }
    res.AddHeader("Cache-Control", "no-store"); res.AddHeader("Accept-Ranges", "bytes");
    long len = new FileInfo(full).Length, a = 0, b = len - 1;
    string range = req.Headers["Range"];
    bool partial = false;
    if (!string.IsNullOrEmpty(range) && range.StartsWith("bytes=")) {
      string[] ab = range.Substring(6).Split(',')[0].Split('-');
      long x;
      if (ab[0].Length > 0 && long.TryParse(ab[0], out x)) a = x;
      if (ab.Length > 1 && ab[1].Length > 0 && long.TryParse(ab[1], out x)) b = Math.Min(x, len - 1);
      else if (ab[0].Length == 0 && ab.Length > 1 && long.TryParse(ab[1], out x)) { a = Math.Max(0, len - x); }
      if (a > b || a >= len) { res.AddHeader("Content-Range", "bytes */" + len); Send(res, 416, "text/plain", ""); return; }
      partial = true;
    }
    res.StatusCode = partial ? 206 : 200; res.ContentType = Mime(full); res.ContentLength64 = b - a + 1;
    if (partial) res.AddHeader("Content-Range", "bytes " + a + "-" + b + "/" + len);
    try {
      if (req.HttpMethod == "HEAD") return;
      using (var f = File.OpenRead(full)) {
        f.Seek(a, SeekOrigin.Begin); byte[] buf = new byte[1 << 16]; long left = b - a + 1; int n;
        while (left > 0 && (n = f.Read(buf, 0, (int)Math.Min(buf.Length, left))) > 0) { res.OutputStream.Write(buf, 0, n); left -= n; }
      }
    } catch { } finally { try { res.Close(); } catch { } }
  }

  static string Mime(string f) {
    switch (Path.GetExtension(f).ToLowerInvariant()) {
      case ".html": return "text/html; charset=utf-8";
      case ".js": return "text/javascript; charset=utf-8";
      case ".css": return "text/css; charset=utf-8";
      case ".json": return "application/json; charset=utf-8";
      case ".png": return "image/png";
      case ".jpg": return "image/jpeg";
      case ".ico": return "image/x-icon";
      case ".mp3": return "audio/mpeg";
      case ".mp4": return "video/mp4";
      default: return "application/octet-stream";
    }
  }
  static void Send(HttpListenerResponse res, int code, string type, string text) { Send(res, code, type, Encoding.UTF8.GetBytes(text)); }
  static void Send(HttpListenerResponse res, int code, string type, byte[] bytes) {
    res.StatusCode = code; res.ContentType = type; res.ContentLength64 = bytes.Length;
    try { res.OutputStream.Write(bytes, 0, bytes.Length); } finally { res.Close(); }
  }

  static readonly string[] Levels = { "off", "480p30", "480p60", "720p30", "720p60", "1080p30", "1080p60", "1440p30", "1440p60" };

  // Only known keys with the expected types and ranges make it into config.js
  static Dictionary<string, object> Clean(Dictionary<string, object> d) {
    Func<string, int, string, string> str = (k, max, def) => {
      object v; if (!d.TryGetValue(k, out v) || v == null) return def;
      string s = Convert.ToString(v).Replace("\r", "").Replace("\n", " ").Trim();
      return s.Length > max ? s.Substring(0, max) : s;
    };
    Func<string, bool, bool> flag = (k, def) => { object v; return d.TryGetValue(k, out v) && v is bool ? (bool)v : def; };
    Func<string, double, double, double, double> num = (k, lo, hi, def) => {
      object v; double x; if (!d.TryGetValue(k, out v) || v == null || !double.TryParse(Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out x)) return def;
      return Math.Round(Math.Max(lo, Math.Min(hi, x)), 2);
    };
    string voiceId = new string(str("voiceId", 32, "sonia").Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray());
    return new Dictionary<string, object> {
      { "greeting", str("greeting", 24, "欢迎回来") }, { "name", str("name", 40, "") },
      { "voice", flag("voice", true) }, { "voiceId", voiceId.Length > 0 ? voiceId : "sonia" }, { "voiceVolume", num("voiceVolume", 0, 1.5, 1) },
      { "sound", flag("sound", true) }, { "volume", num("volume", 0, 1, .8) },
      { "art", str("art", 10, "new") == "classic" ? "classic" : "new" },
      { "liveVideo", Levels.Contains(str("liveVideo", 10, "1080p30")) ? str("liveVideo", 10, "1080p30") : "off" },
      { "petals", str("petals", 8, "more") == "less" ? "less" : "more" },
      { "hairSway", flag("hairSway", true) }
    };
  }

  static void WriteConfig(Dictionary<string, object> c) {
    string js = "// Written by the settings page of Claude (Dawn). You can edit it by hand too; see config.example.js.\n" +
                "window.SPLASH_CONFIG = Object.assign(window.SPLASH_CONFIG || {}, " + json.Serialize(c) + ");\n";
    string path = Path.Combine(root, "config.js"), tmp = path + ".tmp";
    File.WriteAllText(tmp, js, new UTF8Encoding(false));
    if (File.Exists(path)) File.Replace(tmp, path, null); else File.Move(tmp, path);
  }

  // Plays the splash with the unsaved choices in its own window (does not start Claude)
  static void Preview(Dictionary<string, object> c) {
    string edge = ClaudeDawn.FindEdge();
    var p = new List<string> {
      "name=" + Uri.EscapeDataString((string)c["name"]), "greeting=" + Uri.EscapeDataString((string)c["greeting"]),
      "art=" + c["art"], "voice=" + c["voiceId"],
      "vol=" + ((double)c["volume"]).ToString(System.Globalization.CultureInfo.InvariantCulture),
      "vvol=" + ((double)c["voiceVolume"]).ToString(System.Globalization.CultureInfo.InvariantCulture)
    };
    if (!(bool)c["voice"]) p.Add("novoice");
    if (!(bool)c["sound"]) p.Add("nosfx");
    p.Add("livevideo=" + c["liveVideo"]); p.Add("petals=" + c["petals"]);
    if (!(bool)c["hairSway"]) p.Add("nohair");
    string url = "http://localhost:" + port + "/splash.html?" + string.Join("&", p);
    string profile = Path.Combine(Path.GetTempPath(), "claude-dawn-preview");
    Process.Start(new ProcessStartInfo(edge, "--user-data-dir=" + ClaudeDawn.Quote(profile) + " --no-first-run --no-default-browser-check" +
      " --autoplay-policy=no-user-gesture-required --window-size=1600,900 --app=" + ClaudeDawn.Quote(url)) { UseShellExecute = false });
  }
}
