"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

import type { TrackedAccount, TrackerEvent } from "@/lib/store";

export default function DashboardPage() {
    const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
    const [events, setEvents] = useState<TrackerEvent[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showScript, setShowScript] = useState(false);
    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const [selectedKey, setSelectedKey] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [showWebhook, setShowWebhook] = useState(false);
    const [serverUrl, setServerUrl] = useState("");
    const [selectedAccount, setSelectedAccount] = useState<TrackedAccount | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const router = useRouter();

    const getToken = () => localStorage.getItem("auth_token");

    // Request notification permission
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Send browser notification
    const sendNotification = (title: string, body: string) => {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body, icon: "/favicon.ico" });
        }
    };

    const fetchData = useCallback(async () => {
        const token = getToken();
        if (!token) {
            router.push("/");
            return;
        }

        try {
            const res = await fetch("/api/accounts", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                localStorage.removeItem("auth_token");
                router.push("/");
                return;
            }

            const data = await res.json();

            // Check for disconnections and send notifications
            const oldOnline = new Set(accounts.filter(a => a.status === "online").map(a => a.id));
            const newAccounts = data.accounts || [];
            const newOnline = new Set(newAccounts.filter((a: TrackedAccount) => a.status === "online").map((a: TrackedAccount) => a.id));

            // Find disconnected accounts
            oldOnline.forEach(id => {
                if (!newOnline.has(id)) {
                    const acc = accounts.find(a => a.id === id);
                    if (acc) {
                        sendNotification("Account Disconnected", `${acc.username} went offline`);
                    }
                }
            });

            setAccounts(newAccounts);
            setEvents(data.events || []);
            setError("");
        } catch {
            setError("CONNECTION LOST");
        } finally {
            setLoading(false);
        }
    }, [router, accounts]);

    const fetchKeys = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch("/api/keys", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setApiKeys(data.keys || []);
            if (data.keys?.length > 0 && !selectedKey) {
                setSelectedKey(data.keys[0]);
            }
        } catch {
            console.error("Failed to fetch keys");
        }
    }, [selectedKey]);

    const fetchWebhook = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch("/api/webhook", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setWebhookUrl(data.url || "");
        } catch {
            console.error("Failed to fetch webhook");
        }
    }, []);

    useEffect(() => {
        setServerUrl(window.location.origin);
        fetchData();
        fetchKeys();
        fetchWebhook();

        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedAccounts((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedAccounts.size === accounts.length) {
            setSelectedAccounts(new Set());
        } else {
            setSelectedAccounts(new Set(accounts.map((a) => a.id)));
        }
    };

    const sendCommand = async (command: string, targetIds?: string[]) => {
        const token = getToken();
        if (!token) return;

        const accountIds = targetIds || Array.from(selectedAccounts);

        if (accountIds.length === 0) {
            // If no selection, target all online accounts
            const onlineIds = accounts.filter(a => a.status === "online").map(a => a.id);
            if (onlineIds.length === 0) return;

            await fetch("/api/accounts", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ command, accountIds: onlineIds }),
            });
        } else {
            await fetch("/api/accounts", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ command, accountIds }),
            });
        }

        fetchData();
    };

    const kickAccount = async (id: string) => {
        const token = getToken();
        if (!token) return;

        await fetch(`/api/accounts?id=${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        setSelectedAccounts((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        setSelectedAccount(null);
        fetchData();
    };

    const saveWebhook = async () => {
        const token = getToken();
        if (!token) return;

        await fetch("/api/webhook", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: webhookUrl }),
        });
    };

    const generateNewKey = async () => {
        const token = getToken();
        if (!token) return;

        const res = await fetch("/api/keys", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setApiKeys(data.keys || []);
        setSelectedKey(data.key);
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString("en-US", { hour12: false });
    };

    const formatUptime = (connectedAt: number) => {
        const seconds = Math.floor((Date.now() - connectedAt) / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const logout = () => {
        localStorage.removeItem("auth_token");
        router.push("/");
    };

    const openAccountDetails = (account: TrackedAccount) => {
        setSelectedAccount(account);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    LOADING SYSTEM<span className="cursor"></span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Account Detail Modal */}
            {selectedAccount && (
                <div className={styles.modalOverlay} onClick={() => setSelectedAccount(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>
                                <span className={selectedAccount.status === "online" ? styles.online : styles.offline}>●</span>
                                {selectedAccount.username}
                            </span>
                            <button onClick={() => setSelectedAccount(null)} className={styles.modalClose}>×</button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.statGrid}>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>USER ID</span>
                                    <span className={styles.statValue}>{selectedAccount.userId}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>DISPLAY NAME</span>
                                    <span className={styles.statValue}>{selectedAccount.displayName}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>GAME</span>
                                    <span className={styles.statValue}>{selectedAccount.gameName}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>SERVER ID</span>
                                    <span className={styles.statValue}>{selectedAccount.jobId.slice(0, 12)}...</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>FPS</span>
                                    <span className={styles.statValue}>{selectedAccount.fps}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>PING</span>
                                    <span className={styles.statValue}>{selectedAccount.ping}ms</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>UPTIME</span>
                                    <span className={styles.statValue}>{formatUptime(selectedAccount.connectedAt)}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>LAST HEARTBEAT</span>
                                    <span className={styles.statValue}>{formatTime(selectedAccount.lastHeartbeat)}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>IDLE TIME</span>
                                    <span className={styles.statValue}>
                                        {selectedAccount.idleTime ? `${selectedAccount.idleTime}s` : "0s"}
                                    </span>
                                </div>
                                {selectedAccount.position && (
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>POSITION</span>
                                        <span className={styles.statValue}>
                                            X:{Math.floor(selectedAccount.position.x)} Y:{Math.floor(selectedAccount.position.y)} Z:{Math.floor(selectedAccount.position.z)}
                                        </span>
                                    </div>
                                )}
                                {selectedAccount.health !== undefined && (
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>HEALTH</span>
                                        <span className={styles.statValue}>{selectedAccount.health}/{selectedAccount.maxHealth || 100}</span>
                                    </div>
                                )}
                                {selectedAccount.walkSpeed !== undefined && (
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>WALK SPEED</span>
                                        <span className={styles.statValue}>{selectedAccount.walkSpeed}</span>
                                    </div>
                                )}
                            </div>
                            <div className={styles.modalActions}>
                                <button onClick={() => sendCommand("serverhop", [selectedAccount.id])} className={styles.modalBtn}>SERVER HOP</button>
                                <button onClick={() => sendCommand("rejoin", [selectedAccount.id])} className={styles.modalBtn}>REJOIN</button>
                                <button onClick={() => sendCommand("optimize", [selectedAccount.id])} className={styles.modalBtn}>OPTIMIZE</button>
                                <button onClick={() => kickAccount(selectedAccount.id)} className={`${styles.modalBtn} ${styles.dangerBtn}`}>KICK</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>ZAYNFAMY_PILOT</h1>
                    <span className={styles.version}>v1.0.0</span>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.status}>
                        <span className={accounts.filter((a) => a.status === "online").length > 0 ? styles.online : styles.offline}>●</span>
                        {accounts.filter((a) => a.status === "online").length} ONLINE
                    </span>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={styles.mobileMenuBtn}>☰</button>
                    <button onClick={logout} className={styles.logoutBtn}>LOGOUT</button>
                </div>
            </header>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className={styles.mobileMenu}>
                    <button onClick={() => { setShowScript(!showScript); setMobileMenuOpen(false); }} className={styles.mobileMenuItem}>
                        {showScript ? "HIDE SCRIPT" : "GET SCRIPT"}
                    </button>
                    <button onClick={() => { setShowWebhook(!showWebhook); setMobileMenuOpen(false); }} className={styles.mobileMenuItem}>
                        {showWebhook ? "HIDE WEBHOOK" : "SET WEBHOOK"}
                    </button>
                    <button onClick={() => { logout(); }} className={styles.mobileMenuItem}>LOGOUT</button>
                </div>
            )}

            {error && <div className={styles.errorBanner}>[ERROR] {error}</div>}

            {/* Selection Actions Bar */}
            {selectedAccounts.size > 0 && (
                <div className={styles.selectionBar}>
                    <span>{selectedAccounts.size} SELECTED</span>
                    <div className={styles.selectionActions}>
                        <button onClick={() => sendCommand("serverhop")} className={styles.selectionBtn}>HOP ALL</button>
                        <button onClick={() => sendCommand("rejoin")} className={styles.selectionBtn}>REJOIN ALL</button>
                        <button onClick={() => sendCommand("optimize")} className={styles.selectionBtn}>OPTIMIZE ALL</button>
                        <button onClick={() => sendCommand("kick")} className={`${styles.selectionBtn} ${styles.danger}`}>KICK ALL</button>
                        <button onClick={() => setSelectedAccounts(new Set())} className={styles.selectionBtn}>CLEAR</button>
                    </div>
                </div>
            )}

            <div className={styles.main}>
                <div className={styles.leftPanel}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <span>ACCOUNTS ({accounts.length})</span>
                            <button onClick={selectAll} className={styles.smallBtn}>
                                {selectedAccounts.size === accounts.length ? "NONE" : "ALL"}
                            </button>
                        </div>
                        <div className={styles.accountList}>
                            {accounts.length === 0 ? (
                                <div className={styles.empty}>
                                    <span className={styles.prompt}>&gt;</span> NO ACCOUNTS CONNECTED
                                    <br />
                                    <span className={styles.muted}>Inject the tracker script to begin</span>
                                </div>
                            ) : (
                                accounts.map((account) => (
                                    <div
                                        key={account.id}
                                        className={`${styles.accountCard} ${selectedAccounts.has(account.id) ? styles.selected : ""}`}
                                        onClick={() => openAccountDetails(account)}
                                    >
                                        <div className={styles.accountHeader}>
                                            <input
                                                type="checkbox"
                                                checked={selectedAccounts.has(account.id)}
                                                onChange={(e) => toggleSelect(account.id, e as unknown as React.MouseEvent)}
                                                onClick={(e) => e.stopPropagation()}
                                                className={styles.checkbox}
                                            />
                                            <span className={account.status === "online" ? styles.online : styles.offline}>●</span>
                                            <span className={styles.username}>{account.username}</span>
                                            <span className={styles.userId}>#{account.userId}</span>
                                        </div>
                                        <div className={styles.accountDetails}>
                                            <span className={styles.game}>{account.gameName}</span>
                                            <span className={styles.stats}>
                                                FPS: {account.fps} | PING: {account.ping}ms
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <span>QUICK COMMANDS</span>
                        </div>
                        <div className={styles.commandGrid}>
                            <button onClick={() => sendCommand("serverhop")} className={styles.cmdBtn}>SERVER HOP</button>
                            <button onClick={() => sendCommand("rejoin")} className={styles.cmdBtn}>REJOIN</button>
                            <button onClick={() => sendCommand("kick")} className={`${styles.cmdBtn} ${styles.danger}`}>KICK ALL</button>
                            <button onClick={() => sendCommand("optimize")} className={styles.cmdBtn}>OPTIMIZE</button>
                        </div>
                    </div>
                </div>

                <div className={styles.rightPanel}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <span>EVENT LOG</span>
                        </div>
                        <div className={styles.logContainer}>
                            {events.length === 0 ? (
                                <div className={styles.logLine}>
                                    <span className={styles.timestamp}>[--:--:--]</span>
                                    <span className={styles.logText}>Waiting for events...</span>
                                </div>
                            ) : (
                                [...events].reverse().map((event) => (
                                    <div key={event.id} className={styles.logLine}>
                                        <span className={styles.timestamp}>[{formatTime(event.timestamp)}]</span>
                                        <span className={`${styles.logType} ${styles[event.type]}`}>[{event.type.toUpperCase()}]</span>
                                        <span className={styles.logText}>{event.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <span>CONFIG</span>
                        </div>
                        <div className={styles.configSection}>
                            <button onClick={() => setShowScript(!showScript)} className={styles.configBtn}>
                                {showScript ? "HIDE" : "SCRIPT"}
                            </button>
                            <button onClick={() => setShowWebhook(!showWebhook)} className={styles.configBtn}>
                                {showWebhook ? "HIDE" : "WEBHOOK"}
                            </button>
                        </div>

                        {showWebhook && (
                            <div className={styles.webhookSection}>
                                <input
                                    type="text"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="Discord webhook URL..."
                                    className={styles.webhookInput}
                                />
                                <button onClick={saveWebhook} className={styles.saveBtn}>SAVE</button>
                            </div>
                        )}

                        {showScript && (
                            <div className={styles.scriptSection}>
                                <div className={styles.keySelect}>
                                    <label>KEY:</label>
                                    <select
                                        value={selectedKey}
                                        onChange={(e) => setSelectedKey(e.target.value)}
                                        className={styles.select}
                                    >
                                        {apiKeys.map((key) => (
                                            <option key={key} value={key}>{key}</option>
                                        ))}
                                    </select>
                                    <button onClick={generateNewKey} className={styles.newKeyBtn}>+</button>
                                </div>
                                <div className={styles.scriptPreview}>
                                    <pre style={{ color: '#fff', fontSize: '10px', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                                        {`loadstring(game:HttpGet("${serverUrl}/api/script?key=${selectedKey}"))()`}
                                    </pre>
                                </div>
                                <button onClick={() => {
                                    navigator.clipboard.writeText(`loadstring(game:HttpGet("${serverUrl}/api/script?key=${selectedKey}"))()`);
                                }} className={styles.copyBtn}>COPY LOADSTRING</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
