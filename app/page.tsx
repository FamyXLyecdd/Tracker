"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootText, setBootText] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const bootSequence = [
      "INITIALIZING SYSTEM...",
      "LOADING KERNEL MODULES...",
      "MOUNTING FILE SYSTEMS...",
      "STARTING NETWORK SERVICES...",
      "PILOT TRACKER v1.0.0",
      "",
      "AUTHENTICATION REQUIRED",
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < bootSequence.length) {
        setBootText((prev) => [...prev, bootSequence[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("auth_token", data.token);
        router.push("/dashboard");
      } else {
        setError(data.error || "ACCESS DENIED");
      }
    } catch {
      setError("CONNECTION FAILED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.terminal}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>ZAYNFAMY_PILOT.EXE</span>
          <div className={styles.headerButtons}>
            <span className={styles.headerBtn}>_</span>
            <span className={styles.headerBtn}>□</span>
            <span className={styles.headerBtn}>×</span>
          </div>
        </div>

        <div className={styles.content}>
          <pre className={styles.ascii}>
            {`
 ███████╗ █████╗ ██╗   ██╗███╗   ██╗███████╗ █████╗ ███╗   ███╗██╗   ██╗
 ╚══███╔╝██╔══██╗╚██╗ ██╔╝████╗  ██║██╔════╝██╔══██╗████╗ ████║╚██╗ ██╔╝
   ███╔╝ ███████║ ╚████╔╝ ██╔██╗ ██║█████╗  ███████║██╔████╔██║ ╚████╔╝ 
  ███╔╝  ██╔══██║  ╚██╔╝  ██║╚██╗██║██╔══╝  ██╔══██║██║╚██╔╝██║  ╚██╔╝  
 ███████╗██║  ██║   ██║   ██║ ╚████║██║     ██║  ██║██║ ╚═╝ ██║   ██║   
 ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝   
           ██████╗ ██╗██╗      ██████╗ ████████╗                        
           ██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝                        
           ██████╔╝██║██║     ██║   ██║   ██║                           
           ██╔═══╝ ██║██║     ██║   ██║   ██║                           
           ██║     ██║███████╗╚██████╔╝   ██║                           
           ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝                           
`}
          </pre>

          <div className={styles.bootLog}>
            {bootText.map((line, i) => (
              <div key={i} className={styles.logLine}>
                <span className={styles.prompt}>&gt;</span> {line}
              </div>
            ))}
          </div>

          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <span className={styles.prompt}>PASSWORD:</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                autoFocus
              />
              <span className="cursor"></span>
            </div>

            {error && (
              <div className={styles.error}>
                <span className={styles.prompt}>[ERROR]</span> {error}
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>

          <div className={styles.footer}>
            <span className={styles.footerText}>
              {`> SECURE CONNECTION ESTABLISHED`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
