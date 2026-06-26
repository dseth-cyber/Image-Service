#!/usr/bin/env python3
"""Stage 1 Load Test Monitor — collects metrics every 30 minutes.

Usage:
  python load-test/monitor.py --output-dir ./load-test/metrics

Collects:
  1. docker stats for all containers
  2. PostgreSQL health (connections, deadlocks, TPS, table growth, index usage)
  3. Redis health (memory, queue length, AOF status)
  4. Storage providers health (via API — supports MinIO, SMB, NFS, S3)
  5. API health (queue stats, processing stats)
  6. Kafka health (consumer lag, failed messages)
  7. System resource usage

Outputs JSON files per collection cycle.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path


CONTAINERS = [
    "image-api",
    "image-processing-worker",
    "image-sync-worker",
    "image-redis",
    "image-postgres",
    "image-minio",         # Development S3 provider (optional — production uses configured providers)
    "image-kafka",
    "image-zookeeper",
    "image-smb-server",
    "image-web-app",
]

POSTGRES_METRICS_QUERIES = [
    ("active_connections", "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'"),
    ("idle_connections",   "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle'"),
    ("deadlocks",          "SELECT deadlocks FROM pg_stat_database WHERE datname = 'image_db'"),
    ("tps",                "SELECT xact_commit + xact_rollback AS tps FROM pg_stat_database WHERE datname = 'image_db'"),
    ("table_sizes",        "SELECT relname, pg_total_relation_size(relid) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC"),
    ("index_hits",         "SELECT relname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_tables ORDER BY idx_scan DESC"),
    ("table_growth", """
        SELECT
          relname,
          n_tup_ins AS inserts,
          n_tup_upd AS updates,
          n_tup_del AS deletes,
          n_live_tup AS live_rows,
          n_dead_tup AS dead_rows
        FROM pg_stat_user_tables
        ORDER BY n_tup_ins DESC
    """),
    ("seq_scans", "SELECT relname, seq_scan, seq_tup_read FROM pg_stat_user_tables ORDER BY seq_scan DESC"),
]


def run_cmd(cmd: list[str], timeout: int = 15) -> str:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception as e:
        return f"ERROR: {e}"


def collect_docker_stats() -> dict:
    stats = {}
    for name in CONTAINERS:
        out = run_cmd(["docker", "stats", name, "--no-stream", "--format",
                       "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}"])
        if out.startswith("ERROR"):
            stats[name] = {"error": out}
        else:
            parts = out.split("|")
            if len(parts) >= 6:
                stats[name] = {
                    "name": parts[0],
                    "cpu_percent": parts[1],
                    "mem_usage": parts[2],
                    "mem_percent": parts[3],
                    "net_io": parts[4],
                    "block_io": parts[5],
                }
    return stats


def collect_postgres_metrics() -> dict:
    results = {}
    for metric_name, query in POSTGRES_METRICS_QUERIES:
        escaped = query.replace('"', '\\"').replace("'", "'\\''")
        out = run_cmd([
            "docker", "exec", "image-postgres",
            "psql", "-U", "image_user", "-d", "image_db",
            "-t", "-A", "-F", "|",
            "-c", query,
        ], timeout=10)
        results[metric_name] = out.split("\n") if out else []
    return results


def collect_redis_metrics() -> dict:
    results = {}
    info = run_cmd(["docker", "exec", "image-redis", "redis-cli", "INFO", "all"], timeout=10)

    # Parse key sections
    for line in info.split("\n"):
        if ":" in line and not line.startswith("#"):
            k, v = line.split(":", 1)
            results[k.strip()] = v.strip()

    # BullMQ queue lengths
    for q in ["image-processing", "image-sync"]:
        len_out = run_cmd(["docker", "exec", "image-redis", "redis-cli", "LLEN", f"bull:{q}:wait"], timeout=5)
        active_out = run_cmd(["docker", "exec", "image-redis", "redis-cli", "LLEN", f"bull:{q}:active"], timeout=5)
        failed_out = run_cmd(["docker", "exec", "image-redis", "redis-cli", "ZCARD", f"bull:{q}:failed"], timeout=5)
        results[f"bull_{q}_wait"] = len_out
        results[f"bull_{q}_active"] = active_out
        results[f"bull_{q}_failed"] = failed_out

    return results


def collect_storage_metrics() -> dict:
    """Collect metrics from storage providers via API health endpoint."""
    results = {}
    out = run_cmd([
        "docker", "exec", "image-api",
        "wget", "-qO-", "http://localhost:3001/api/v1/health",
    ], timeout=10)
    if out and out != "ERROR":
        try:
            data = json.loads(out)
            results["health"] = data.get("providers", [])
            results["storage_ok"] = data.get("checks", {}).get("storage") == "ok"
        except json.JSONDecodeError:
            results["health_raw"] = out

    # Get detailed provider metrics from API
    out2 = run_cmd([
        "docker", "exec", "image-api",
        "wget", "-qO-", "http://localhost:3001/api/v1/storage-providers",
    ], timeout=10)
    if out2 and out2 != "ERROR":
        try:
            results["providers"] = json.loads(out2)
        except json.JSONDecodeError:
            results["providers_raw"] = out2

    return results


def collect_kafka_metrics() -> dict:
    results = {"consumer_groups": {}, "topics": {}}

    # List consumer groups
    groups_out = run_cmd([
        "docker", "exec", "image-kafka",
        "kafka-consumer-groups", "--bootstrap-server", "localhost:9092", "--list",
    ], timeout=15)
    if groups_out and not groups_out.startswith("ERROR"):
        results["groups"] = [g for g in groups_out.split("\n") if g.strip()]
        for group in results["groups"]:
            desc = run_cmd([
                "docker", "exec", "image-kafka",
                "kafka-consumer-groups", "--bootstrap-server", "localhost:9092",
                "--group", group, "--describe",
            ], timeout=15)
            results["consumer_groups"][group] = desc.split("\n") if desc else []

    # Topic list
    topics_out = run_cmd([
        "docker", "exec", "image-kafka",
        "kafka-topics", "--bootstrap-server", "localhost:9092", "--list",
    ], timeout=10)
    if topics_out and not topics_out.startswith("ERROR"):
        results["topics"]["list"] = [t for t in topics_out.split("\n") if t.strip()]
        for topic in results["topics"]["list"]:
            desc = run_cmd([
                "docker", "exec", "image-kafka",
                "kafka-topics", "--bootstrap-server", "localhost:9092",
                "--topic", topic, "--describe",
            ], timeout=10)
            results["topics"][topic] = desc.split("\n") if desc else []

    return results


def collect_api_metrics() -> dict:
    """Hit the API for queue stats and processing stats."""
    results = {}
    out = run_cmd([
        "docker", "exec", "image-api",
        "wget", "-qO-", "http://localhost:3001/image-service/api/processing-logs/stats",
    ], timeout=10)
    if out and out != "ERROR":
        try:
            results["processing_stats"] = json.loads(out)
        except json.JSONDecodeError:
            results["processing_stats_raw"] = out

    # Image counts by status
    out2 = run_cmd([
        "docker", "exec", "image-postgres",
        "psql", "-U", "image_user", "-d", "image_db",
        "-t", "-A", "-F", "|",
        "-c", "SELECT status, COUNT(*) FROM images GROUP BY status ORDER BY status",
    ], timeout=10)
    if out2 and not out2.startswith("ERROR"):
        results["images_by_status"] = {}
        for line in out2.strip().split("\n"):
            if "|" in line:
                s, c = line.split("|", 1)
                results["images_by_status"][s.strip()] = int(c.strip())

    # image_files count
    out3 = run_cmd([
        "docker", "exec", "image-postgres",
        "psql", "-U", "image_user", "-d", "image_db",
        "-t", "-A",
        "-c", "SELECT COUNT(*) FROM image_files",
    ], timeout=5)
    if out3 and not out3.startswith("ERROR"):
        results["image_files_count"] = int(out3.strip())

    # images count
    out4 = run_cmd([
        "docker", "exec", "image-postgres",
        "psql", "-U", "image_user", "-d", "image_db",
        "-t", "-A",
        "-c", "SELECT COUNT(*) FROM images",
    ], timeout=5)
    if out4 and not out4.startswith("ERROR"):
        results["images_count"] = int(out4.strip())
        if results.get("image_files_count"):
            results["image_files_ratio"] = round(results["image_files_count"] / results["images_count"], 2)

    return results


def collect_system_metrics() -> dict:
    """Collect host system resource info."""
    results = {}
    # CPU
    out = run_cmd([
        "powershell", "-Command",
        "(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average"
    ], timeout=10)
    if out and not out.startswith("ERROR"):
        results["host_cpu_percent"] = out

    # Memory
    out2 = run_cmd([
        "powershell", "-Command",
        "$os = Get-CimInstance Win32_OperatingSystem; $pct = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100, 1); Write-Output $pct"
    ], timeout=10)
    if out2 and not out2.startswith("ERROR"):
        results["host_mem_percent"] = out2

    # Disk
    out3 = run_cmd([
        "powershell", "-Command",
        "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID, @{N='Pct';E={[math]::Round($_.Size - $_.FreeSpace, 0)}}, @{N='Free';E={$_.FreeSpace}} | ConvertTo-Json"
    ], timeout=10)
    if out3 and not out3.startswith("ERROR"):
        results["host_disk"] = out3

    return results


def main():
    parser = argparse.ArgumentParser(description="Stage 1 Load Test Monitor")
    parser.add_argument("--output-dir", default="./load-test/metrics", help="Metrics output directory")
    parser.add_argument("--interval", type=int, default=1800, help="Collection interval in seconds (default: 1800 = 30 min)")
    parser.add_argument("--cycles", type=int, default=48, help="Number of collection cycles to run (default: 48 = 24h at 30min interval)")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print(f"Stage 1 Load Test Monitor")
    print(f"  Interval: {args.interval}s ({args.interval/60:.0f} min)")
    print(f"  Cycles:   {args.cycles}")
    print(f"  Duration: {args.interval * args.cycles / 3600:.0f} hours")
    print(f"  Output:   {output_dir.absolute()}")
    print("=" * 60)

    for cycle in range(1, args.cycles + 1):
        timestamp = datetime.now()
        cycle_label = f"cycle_{cycle:03d}_{timestamp.strftime('%Y%m%d_%H%M%S')}"
        print(f"\n{'─' * 50}")
        print(f"[{timestamp.strftime('%H:%M:%S')}] Cycle {cycle}/{args.cycles} — {cycle_label}")

        metrics = {
            "cycle": cycle,
            "timestamp": timestamp.isoformat(),
            "timestamp_unix": int(timestamp.timestamp()),
            "elapsed_hours": round((cycle - 1) * args.interval / 3600, 1),
        }

        # Collect all metrics
        print("  Collecting docker stats...", end=" ", flush=True)
        metrics["docker_stats"] = collect_docker_stats()
        print("OK")

        print("  Collecting PostgreSQL metrics...", end=" ", flush=True)
        metrics["postgres"] = collect_postgres_metrics()
        print("OK")

        print("  Collecting Redis metrics...", end=" ", flush=True)
        metrics["redis"] = collect_redis_metrics()
        print("OK")

        print("  Collecting storage provider metrics...", end=" ", flush=True)
        metrics["storage"] = collect_storage_metrics()
        print("OK")

        print("  Collecting Kafka metrics...", end=" ", flush=True)
        metrics["kafka"] = collect_kafka_metrics()
        print("OK")

        print("  Collecting API/DB metrics...", end=" ", flush=True)
        metrics["api"] = collect_api_metrics()
        print("OK")

        print("  Collecting system metrics...", end=" ", flush=True)
        metrics["system"] = collect_system_metrics()
        print("OK")

        # Save metrics file
        filepath = output_dir / f"{cycle_label}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=2, default=str)
        print(f"  Saved: {filepath}")

        # Save summary
        summary = {
            "cycle": cycle,
            "timestamp": timestamp.isoformat(),
            "api_stats": {
                "images_count": metrics.get("api", {}).get("images_count"),
                "image_files_count": metrics.get("api", {}).get("image_files_count"),
                "ratio": metrics.get("api", {}).get("image_files_ratio"),
                "status_breakdown": metrics.get("api", {}).get("images_by_status"),
            },
            "redis_queues": {
                k: v for k, v in metrics.get("redis", {}).items()
                if k.startswith("bull_")
            },
        }
        summary_path = output_dir / f"summary_{cycle:03d}.json"
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

        # Check pass/fail conditions
        check_pass_fail(metrics, cycle, output_dir)

        if cycle < args.cycles:
            next_time = timestamp.timestamp() + args.interval
            next_dt = datetime.fromtimestamp(next_time)
            print(f"\n  Next collection at {next_dt.strftime('%H:%M:%S')} (in {args.interval}s)")
            time.sleep(args.interval)

    print(f"\n{'=' * 60}")
    print(f"Stage 1 Monitoring Complete — {args.cycles} cycles collected")
    print(f"  Output: {output_dir.absolute()}")
    print(f"{'=' * 60}")


def check_pass_fail(metrics: dict, cycle: int, output_dir: Path):
    """Check Stage 1 validation rules and write pass/fail status."""
    checks = {
        "queue_backlog_lt_50": True,
        "failed_jobs_eq_0": True,
        "no_deadlocks": True,
        "image_files_ratio_3:1": False,
        "all_images_completed": True,
        "all_containers_healthy": True,
    }

    # Queue backlog check
    redis = metrics.get("redis", {})
    for q in ["bull_image-processing_wait", "bull_image-sync_wait"]:
        try:
            val = int(redis.get(q, 0))
            if val >= 50:
                checks["queue_backlog_lt_50"] = False
        except (ValueError, TypeError):
            pass

    # Failed jobs check
    for q in ["bull_image-processing_failed", "bull_image-sync_failed"]:
        try:
            val = int(redis.get(q, 0))
            if val > 0:
                checks["failed_jobs_eq_0"] = False
        except (ValueError, TypeError):
            pass

    # Deadlocks
    pg = metrics.get("postgres", {})
    dl = pg.get("deadlocks", [])
    if dl and len(dl) > 0:
        try:
            if int(dl[0]) > 0:
                checks["no_deadlocks"] = False
        except (ValueError, IndexError):
            pass

    # Image files ratio
    api = metrics.get("api", {})
    img_count = api.get("images_count", 0)
    file_count = api.get("image_files_count", 0)
    if img_count > 0 and file_count > 0:
        ratio = file_count / img_count
        if abs(ratio - 3.0) <= 0.1:
            checks["image_files_ratio_3:1"] = True

    # All images completed
    by_status = api.get("images_by_status", {})
    for status, count in by_status.items():
        if status != "completed" and count > 0:
            checks["all_images_completed"] = False

    # Container health
    docker_stats = metrics.get("docker_stats", {})
    for name, data in docker_stats.items():
        if isinstance(data, dict) and data.get("error"):
            checks["all_containers_healthy"] = False

    pass_all = all(checks.values())

    # Write check result
    result = {
        "cycle": cycle,
        "pass": pass_all,
        "checks": checks,
        "failed_checks": [k for k, v in checks.items() if not v],
    }

    result_path = output_dir / f"pass_fail_{cycle:03d}.json"
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    status = "PASS" if pass_all else "FAIL"
    failed = result["failed_checks"]
    print(f"  Validation: {status} {'(issues: ' + ', '.join(failed) + ')' if failed else ''}")


if __name__ == "__main__":
    main()
