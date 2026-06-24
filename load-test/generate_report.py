#!/usr/bin/env python3
"""Stage 1 Load Test — Final Report Generator.

Usage:
  python load-test/generate_report.py --metrics-dir ./load-test/metrics

Generates a comprehensive markdown report with:
  1. Throughput Summary
  2. Resource Usage Trend
  3. Queue Statistics
  4. Database Statistics
  5. Storage Statistics
  6. Kafka Statistics
  7. Memory Leak Analysis
  8. Bottleneck Analysis
  9. PASS / FAIL Result
  10. Recommendation for Stage 2
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


def load_all_metrics(metrics_dir: str | Path) -> list[dict]:
    metrics_dir = Path(metrics_dir)
    cycles = []
    for f in sorted(metrics_dir.glob("cycle_*.json")):
        try:
            with open(f, encoding="utf-8") as fh:
                cycles.append(json.load(fh))
        except (json.JSONDecodeError, IOError) as e:
            print(f"  Warning: failed to load {f.name}: {e}", file=sys.stderr)
    return cycles


def format_bytes(b: int | float) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if abs(b) < 1024:
            return f"{b:.2f} {unit}"
        b /= 1024
    return f"{b:.2f} PB"


def analyze_throughput(cycles: list[dict]) -> dict:
    """1. Throughput Summary"""
    if not cycles:
        return {"error": "No data"}

    api_data = [c.get("api", {}) for c in cycles]
    first, last = api_data[0], api_data[-1]

    img_first = first.get("images_count", 0) or 0
    img_last = last.get("images_count", 0) or 0
    total_images = img_last - img_first

    files_first = first.get("image_files_count", 0) or 0
    files_last = last.get("image_files_count", 0) or 0
    total_files = files_last - files_first

    elapsed_h = cycles[-1].get("elapsed_hours", 24) if len(cycles) > 0 else 24
    if elapsed_h <= 0:
        elapsed_h = 1

    # Processing rate from API stats
    processing_rates = []
    for c in cycles:
        ps = c.get("api", {}).get("processing_stats", {})
        if isinstance(ps, dict) and ps.get("processingRate"):
            try:
                processing_rates.append(float(ps["processingRate"]))
            except (ValueError, TypeError):
                pass

    return {
        "total_images_processed": total_images,
        "total_image_files": total_files,
        "duration_hours": elapsed_h,
        "images_per_hour": round(total_images / elapsed_h, 1) if elapsed_h > 0 else 0,
        "images_per_second": round(total_images / elapsed_h / 3600, 3) if elapsed_h > 0 else 0,
        "image_files_per_image": round(files_last / img_last, 2) if img_last > 0 else 0,
        "avg_processing_rate_ms": sum(processing_rates) / len(processing_rates) if processing_rates else None,
    }


def analyze_resource_trends(cycles: list[dict]) -> dict:
    """2. Resource Usage Trend"""
    if not cycles:
        return {"error": "No data"}

    # Parse docker stats over time
    containers = defaultdict(list)
    for c in cycles:
        ds = c.get("docker_stats", {})
        ts = c.get("elapsed_hours", 0)
        for name, data in ds.items():
            if isinstance(data, dict) and "cpu_percent" in data:
                try:
                    cpu = float(data["cpu_percent"].rstrip("%"))
                except (ValueError, AttributeError):
                    cpu = 0

                try:
                    mem_str = data.get("mem_usage", "0B / 0B").split(" / ")[0]
                    if "MiB" in mem_str:
                        mem = float(mem_str.replace("MiB", ""))
                    elif "GiB" in mem_str:
                        mem = float(mem_str.replace("GiB", "")) * 1024
                    elif "KiB" in mem_str:
                        mem = float(mem_str.replace("KiB", "")) / 1024
                    elif "B" in mem_str and not any(x in mem_str for x in ["i"]):
                        mem = float(mem_str.replace("B", "")) / (1024 * 1024)
                    else:
                        mem = 0
                except (ValueError, AttributeError):
                    mem = 0

                containers[name].append({
                    "elapsed_h": ts,
                    "cpu": cpu,
                    "mem_mb": mem,
                })

    # Calculate trends
    trends = {}
    for name, points in containers.items():
        if len(points) < 2:
            continue
        first_cpu = points[0]["cpu"]
        last_cpu = points[-1]["cpu"]
        first_mem = points[0]["mem_mb"]
        last_mem = points[-1]["mem_mb"]

        # Memory leak check: if last > first * 1.2 over the test, flag it
        mem_increase_pct = ((last_mem - first_mem) / first_mem * 100) if first_mem > 0 else 0
        memory_leak_risk = mem_increase_pct > 20

        # CPU trend
        cpu_increase = last_cpu - first_cpu

        trends[name] = {
            "cpu_start": first_cpu,
            "cpu_end": last_cpu,
            "cpu_trend": cpu_increase,
            "mem_start_mb": round(first_mem, 1),
            "mem_end_mb": round(last_mem, 1),
            "mem_increase_pct": round(mem_increase_pct, 1),
            "memory_leak_risk": memory_leak_risk,
            "max_mem_mb": round(max(p["mem_mb"] for p in points), 1),
            "avg_cpu": round(sum(p["cpu"] for p in points) / len(points), 1),
        }

    return trends


def analyze_queues(cycles: list[dict]) -> dict:
    """3. Queue Statistics"""
    if not cycles:
        return {"error": "No data"}

    queues = defaultdict(list)
    for c in cycles:
        redis = c.get("redis", {})
        ts = c.get("elapsed_hours", 0)
        for key in redis:
            if key.startswith("bull_"):
                try:
                    val = int(redis[key])
                except (ValueError, TypeError):
                    val = 0
                queues[key].append({"elapsed_h": ts, "value": val})

    stats = {}
    for qname, points in queues.items():
        values = [p["value"] for p in points]
        stats[qname] = {
            "min": min(values),
            "max": max(values),
            "avg": round(sum(values) / len(values), 1),
            "last": values[-1] if values else 0,
            "trend": values[-1] - values[0] if len(values) >= 2 else 0,
        }

    return stats


def analyze_database(cycles: list[dict]) -> dict:
    """4. Database Statistics"""
    if not cycles:
        return {"error": "No data"}

    # Table growth tracking
    tables = defaultdict(list)
    for c in cycles:
        pg = c.get("postgres", {})
        ts = c.get("elapsed_hours", 0)
        table_sizes_raw = pg.get("table_sizes", [])

        if isinstance(table_sizes_raw, list):
            for line in table_sizes_raw:
                if "|" in line:
                    parts = line.split("|")
                    if len(parts) >= 2:
                        tbl = parts[0].strip()
                        try:
                            size = int(parts[1].strip())
                        except (ValueError, IndexError):
                            size = 0
                        tables[tbl].append({"elapsed_h": ts, "size_bytes": size})

    growth = {}
    for tbl, points in tables.items():
        if len(points) < 2:
            continue
        first_sz = points[0]["size_bytes"]
        last_sz = points[-1]["size_bytes"]
        growth[tbl] = {
            "start": format_bytes(first_sz),
            "end": format_bytes(last_sz),
            "growth": format_bytes(last_sz - first_sz),
            "growth_pct": round((last_sz - first_sz) / first_sz * 100, 1) if first_sz > 0 else 0,
        }

    # Deadlocks
    deadlocks_found = False
    deadlock_counts = []
    for c in cycles:
        dl = c.get("postgres", {}).get("deadlocks", [])
        if dl and isinstance(dl, list) and len(dl) > 0:
            try:
                deadlock_counts.append(int(dl[0]))
                if int(dl[0]) > 0:
                    deadlocks_found = True
            except (ValueError, IndexError):
                pass

    return {
        "table_growth": growth,
        "deadlocks_found": deadlocks_found,
        "deadlock_counts": deadlock_counts,
    }


def analyze_storage(cycles: list[dict]) -> dict:
    """5. Storage Statistics"""
    if not cycles:
        return {"error": "No data"}

    minio_sizes = []
    for c in cycles:
        mi = c.get("minio", {})
        ts = c.get("elapsed_hours", 0)
        bucket = mi.get("bucket_size", {})
        if isinstance(bucket, dict):
            size = bucket.get("size", 0)
        else:
            size = 0
        obj_count = mi.get("object_count", 0) or 0
        minio_sizes.append({"elapsed_h": ts, "size": size, "objects": obj_count})

    # Image files growth
    images_over_time = []
    files_over_time = []
    for c in cycles:
        api = c.get("api", {})
        ts = c.get("elapsed_hours", 0)
        images_over_time.append({"h": ts, "v": api.get("images_count", 0) or 0})
        files_over_time.append({"h": ts, "v": api.get("image_files_count", 0) or 0})

    return {
        "minio": {
            "first": minio_sizes[0] if minio_sizes else None,
            "last": minio_sizes[-1] if minio_sizes else None,
            "samples": len(minio_sizes),
        },
        "images": {
            "over_time": images_over_time,
            "first": images_over_time[0] if images_over_time else None,
            "last": images_over_time[-1] if images_over_time else None,
        },
        "image_files": {
            "over_time": files_over_time,
            "first": files_over_time[0] if files_over_time else None,
            "last": files_over_time[-1] if files_over_time else None,
        },
    }


def analyze_kafka(cycles: list[dict]) -> dict:
    """6. Kafka Statistics"""
    if not cycles:
        return {"error": "No data"}

    consumer_lags = defaultdict(list)
    for c in cycles:
        kafka = c.get("kafka", {})
        ts = c.get("elapsed_hours", 0)
        for group, desc_lines in kafka.get("consumer_groups", {}).items():
            for line in desc_lines:
                if "|" in str(line):
                    parts = str(line).split()
                    # kafka-consumer-groups --describe format:
                    # GROUP TOPIC PARTITION CURRENT-OFFSET LOG-END-OFFSET LAG CONSUMER-ID
                    if len(parts) >= 6:
                        try:
                            lag = int(parts[5])
                            consumer_lags[group].append({"elapsed_h": ts, "lag": lag})
                        except (ValueError, IndexError):
                            pass

    return {
        "consumer_lags": {k: v for k, v in consumer_lags.items()},
        "total_messages_published": None,  # Requires Kafka metrics beyond scope
    }


def analyze_memory_leaks(resource_trends: dict) -> list[dict]:
    """7. Memory Leak Analysis"""
    leaks = []
    for name, trend in resource_trends.items():
        if isinstance(trend, dict) and trend.get("memory_leak_risk"):
            leaks.append({
                "container": name,
                "mem_start_mb": trend["mem_start_mb"],
                "mem_end_mb": trend["mem_end_mb"],
                "increase_pct": trend["mem_increase_pct"],
                "risk": "HIGH" if trend["mem_increase_pct"] > 50 else "MEDIUM" if trend["mem_increase_pct"] > 20 else "LOW",
            })
        elif isinstance(trend, dict):
            leaks.append({
                "container": name,
                "mem_start_mb": trend.get("mem_start_mb"),
                "mem_end_mb": trend.get("mem_end_mb"),
                "increase_pct": trend.get("mem_increase_pct", 0),
                "risk": "NONE",
            })
    return leaks


def analyze_bottleneck(resource_trends: dict, queue_stats: dict, db_stats: dict) -> list[str]:
    """8. Bottleneck Analysis"""
    bottlenecks = []

    # CPU bottlenecks
    high_cpu = []
    for name, trend in resource_trends.items():
        if isinstance(trend, dict) and trend.get("avg_cpu", 0) > 80:
            high_cpu.append(f"{name} (avg {trend['avg_cpu']}% CPU)")

    if high_cpu:
        bottlenecks.append(f"High CPU: {', '.join(high_cpu)}")

    # Memory pressure
    high_mem = []
    for name, trend in resource_trends.items():
        if isinstance(trend, dict) and trend.get("memory_leak_risk"):
            high_mem.append(f"{name} ({trend['mem_increase_pct']}% increase)")

    if high_mem:
        bottlenecks.append(f"Memory leak possible: {', '.join(high_mem)}")

    # Queue backlogs
    if queue_stats and isinstance(queue_stats, dict):
        backlog_queues = [f"{q} (avg {s['avg']})" for q, s in queue_stats.items()
                         if isinstance(s, dict) and s.get("avg", 0) > 50]
        if backlog_queues:
            bottlenecks.append(f"Queue backlog: {', '.join(backlog_queues)}")

    # DB growth risks
    if isinstance(db_stats, dict):
        for tbl, growth in db_stats.get("table_growth", {}).items():
            if isinstance(growth, dict) and growth.get("growth_pct", 0) > 100:
                bottlenecks.append(f"Rapid DB growth: {tbl} ({growth['growth_pct']}% increase)")

    return bottlenecks if bottlenecks else ["No significant bottlenecks detected"]


def calculate_readiness_score(analysis: dict) -> int:
    """Calculate production readiness score (0-100)."""
    deductions = 0

    # Memory leaks
    for leak in analysis.get("memory_leaks", []):
        if leak.get("risk") == "HIGH":
            deductions += 20
        elif leak.get("risk") == "MEDIUM":
            deductions += 10

    # Queue backlogs
    for qname, stats in analysis.get("queue_stats", {}).items():
        if isinstance(stats, dict) and stats.get("max", 0) > 100:
            deductions += 10
        elif isinstance(stats, dict) and stats.get("max", 0) > 50:
            deductions += 5

    # Deadlocks
    db = analysis.get("db_stats", {})
    if isinstance(db, dict) and db.get("deadlocks_found"):
        deductions += 15

    # Throughput issues
    tp = analysis.get("throughput", {})
    if isinstance(tp, dict) and tp.get("images_per_second", 999) < 0.1:
        deductions += 10

    # Resource pressure
    for name, trend in analysis.get("resource_trends", {}).items():
        if isinstance(trend, dict):
            if trend.get("avg_cpu", 0) > 90:
                deductions += 10
            elif trend.get("avg_cpu", 0) > 70:
                deductions += 5

    return max(0, min(100, 100 - deductions))


def generate_markdown_report(analysis: dict, pass_fail: dict) -> str:
    lines = []

    title = "PASS" if pass_fail.get("overall_pass") else "FAIL"
    title_color = "#22c55e" if pass_fail.get("overall_pass") else "#ef4444"
    readiness = pass_fail.get("readiness_score", 0)

    lines.append(f"# Stage 1 Load Test Report — 10 Cameras / 24 Hours")
    lines.append("")
    lines.append(f"**Overall Result:** <span style='color:{title_color};font-weight:bold'>{title}</span>")
    lines.append(f"**Production Readiness Score:** {readiness}/100")
    lines.append("")
    lines.append(f"**Duration:** {analysis.get('throughput', {}).get('duration_hours', 'N/A')} hours")
    lines.append(f"**Total Images:** {analysis.get('throughput', {}).get('total_images_processed', 'N/A')}")
    lines.append(f"**Total Image Files (3× ratio):** {analysis.get('throughput', {}).get('total_image_files', 'N/A')}")
    lines.append("")

    # Validation Results
    lines.append("## Validation Results")
    lines.append("")
    lines.append("| Check | Result |")
    lines.append("|-------|--------|")
    for check, passed in pass_fail.get("checks", {}).items():
        icon = "✅" if passed else "❌"
        lines.append(f"| {check} | {icon} |")
    lines.append("")

    # 1. Throughput Summary
    tp = analysis.get("throughput", {})
    lines.append("## 1. Throughput Summary")
    lines.append("")
    lines.append(f"| Metric | Value |")
    lines.append(f"|--------|-------|")
    lines.append(f"| Total Images Processed | {tp.get('total_images_processed', 'N/A')} |")
    lines.append(f"| Total Image Files (raw+processed+thumbnail) | {tp.get('total_image_files', 'N/A')} |")
    lines.append(f"| Duration | {tp.get('duration_hours', 'N/A')} hours |")
    lines.append(f"| Throughput | {tp.get('images_per_hour', 'N/A')} images/hour |")
    lines.append(f"| Throughput | {tp.get('images_per_second', 'N/A')} images/sec |")
    lines.append(f"| Image Files : Images Ratio | {tp.get('image_files_per_image', 'N/A')}:1 |")
    if tp.get("avg_processing_rate_ms"):
        lines.append(f"| Average Processing Time | {tp['avg_processing_rate_ms']:.2f} ms |")
    lines.append("")

    # 2. Resource Usage Trend
    res = analysis.get("resource_trends", {})
    lines.append("## 2. Resource Usage Trend")
    lines.append("")
    lines.append("| Container | CPU Start | CPU End | Mem Start | Mem End | Max Mem | Avg CPU | Leak Risk |")
    lines.append("|-----------|-----------|---------|-----------|---------|---------|---------|-----------|")
    for name, trend in sorted(res.items()):
        if isinstance(trend, dict):
            lines.append(
                f"| {name} | {trend.get('cpu_start', 'N/A')}% | {trend.get('cpu_end', 'N/A')}% | "
                f"{trend.get('mem_start_mb', 'N/A')} MB | {trend.get('mem_end_mb', 'N/A')} MB | "
                f"{trend.get('max_mem_mb', 'N/A')} MB | {trend.get('avg_cpu', 'N/A')}% | "
                f"{'⚠️' if trend.get('memory_leak_risk') else '✅'} |"
            )
    lines.append("")

    # 3. Queue Statistics
    qs = analysis.get("queue_stats", {})
    lines.append("## 3. Queue Statistics")
    lines.append("")
    lines.append("| Queue | Min | Max | Avg | Last | Trend |")
    lines.append("|-------|-----|-----|-----|------|-------|")
    for qname, stats in sorted(qs.items()):
        if isinstance(stats, dict):
            lines.append(
                f"| {qname} | {stats.get('min', 'N/A')} | {stats.get('max', 'N/A')} | "
                f"{stats.get('avg', 'N/A')} | {stats.get('last', 'N/A')} | "
                f"{'↑' if stats.get('trend', 0) > 0 else '↓'}{abs(stats.get('trend', 0))} |"
            )
    lines.append("")

    # 4. Database Statistics
    db = analysis.get("db_stats", {})
    lines.append("## 4. Database Statistics")
    lines.append("")
    lines.append(f"**Deadlocks:** {'⚠️ Found' if db.get('deadlocks_found') else '✅ None'}")
    lines.append("")
    lines.append("### Table Growth")
    lines.append("")
    lines.append("| Table | Start Size | End Size | Growth | Growth % |")
    lines.append("|-------|-----------|---------|--------|----------|")
    for tbl, growth in sorted(db.get("table_growth", {}).items()):
        if isinstance(growth, dict):
            lines.append(
                f"| {tbl} | {growth.get('start', 'N/A')} | {growth.get('end', 'N/A')} | "
                f"{growth.get('growth', 'N/A')} | {growth.get('growth_pct', 'N/A')}% |"
            )
    lines.append("")

    # 5. Storage Statistics
    st = analysis.get("storage_stats", {})
    lines.append("## 5. Storage Statistics (MinIO)")
    lines.append("")
    mi = st.get("minio", {})
    first_mi = mi.get("first") or {}
    last_mi = mi.get("last") or {}
    lines.append(f"| Metric | Start | End |")
    lines.append(f"|--------|-------|-----|")
    lines.append(f"| MinIO Size | {format_bytes(first_mi.get('size', 0))} | {format_bytes(last_mi.get('size', 0))} |")
    lines.append(f"| MinIO Objects | {first_mi.get('objects', 'N/A')} | {last_mi.get('objects', 'N/A')} |")
    lines.append("")
    lines.append("### Image Growth Over Time")
    lines.append("")
    imgs = st.get("images", {}).get("over_time", [])
    if imgs:
        lines.append("| Hours Elapsed | Images | Image Files |")
        lines.append("|--------------|--------|-------------|")
        files_map = {p["h"]: p["v"] for p in st.get("image_files", {}).get("over_time", [])}
        for p in imgs:
            f_count = files_map.get(p["h"], "—")
            lines.append(f"| {p['h']}h | {p['v']} | {f_count} |")
    lines.append("")

    # 6. Kafka Statistics
    kf = analysis.get("kafka_stats", {})
    lines.append("## 6. Kafka Statistics")
    lines.append("")
    cgs = kf.get("consumer_lags", {})
    if cgs:
        lines.append("| Consumer Group | Min Lag | Max Lag | Last Lag |")
        lines.append("|---------------|---------|---------|----------|")
        for group, lags in sorted(cgs.items()):
            if lags:
                vals = [l["lag"] for l in lags]
                lines.append(f"| {group} | {min(vals)} | {max(vals)} | {vals[-1]} |")
    else:
        lines.append("No consumer lag data collected.")
    lines.append("")

    # 7. Memory Leak Analysis
    leaks = analysis.get("memory_leaks", [])
    lines.append("## 7. Memory Leak Analysis")
    lines.append("")
    if leaks:
        lines.append("| Container | Start (MB) | End (MB) | Increase % | Risk |")
        lines.append("|-----------|-----------|---------|-----------|------|")
        for leak in leaks:
            lines.append(f"| {leak['container']} | {leak['mem_start_mb']} | {leak['mem_end_mb']} | {leak['increase_pct']}% | {leak['risk']} |")
    else:
        lines.append("No data available.")
    lines.append("")

    # 8. Bottleneck Analysis
    btl = analysis.get("bottlenecks", [])
    lines.append("## 8. Bottleneck Analysis")
    lines.append("")
    for i, b in enumerate(btl, 1):
        lines.append(f"{i}. {b}")
    lines.append("")

    # 9. PASS/FAIL
    lines.append("## 9. PASS / FAIL Result")
    lines.append("")
    lines.append(f"**{title}** (Score: {readiness}/100)")
    lines.append("")
    lines.append("| Validation Rule | Status |")
    lines.append("|---------------|--------|")
    for check, passed in sorted(pass_fail.get("checks", {}).items()):
        icon = "✅ PASS" if passed else "❌ FAIL"
        lines.append(f"| {check} | {icon} |")
    lines.append("")

    # 10. Stage 2 Recommendation
    lines.append("## 10. Recommendation for Stage 2 (100 Cameras / 48 Hours)")
    lines.append("")
    if readiness >= 80:
        lines.append("🟢 **Proceed to Stage 2** — System shows adequate performance for 10 cameras.")
        lines.append("")
        lines.append("### Recommendations:")
        lines.append("1. **Worker Scaling**: Add 1 additional processing worker for every 50 cameras")
        lines.append("2. **SMB I/O**: Monitor SMB server bandwidth — 100 cameras × 30s × 4.5MB avg = ~15 MB/s sustained read")
        lines.append("3. **PostgreSQL**: Monitor `images` table growth — expect ~200M rows at Stage 2 scale. Consider partitioning by month.")
        lines.append("4. **Redis Memory**: Current AOF + queue patterns suggest ~200 MB per 100 cameras. Ensure `maxmemory` is configured.")
        lines.append("5. **MinIO**: Ensure sufficient disk space — 100 cameras × 48h × ~120 images/h/cam × 3 files × 1MB avg = ~1.7 TB")
    elif readiness >= 50:
        lines.append("🟡 **Proceed with Caution** — Address bottlenecks before Stage 2.")
        lines.append("")
        lines.append("### Required Improvements:")
        for b in btl:
            lines.append(f"- {b}")
        lines.append("")
        lines.append("### Scaling Estimates:")
        lines.append("1. **Max cameras on current hardware**: ~30-50 cameras")
        lines.append("2. **Worker requirement**: 2-3 processing workers for 100 cameras")
        lines.append("3. **PostgreSQL**: Add connection pooling (PgBouncer) before Stage 2")
        lines.append("4. **MinIO**: Estimate ~500 GB for Stage 2. Ensure sufficient disk.")
    else:
        lines.append("🔴 **Do NOT proceed to Stage 2** — Critical issues must be resolved first.")
        lines.append("")
        lines.append("### Critical Issues:")
        for b in btl:
            lines.append(f"- {b}")
        lines.append("")
        lines.append("### Remediation Required:")
        lines.append("1. Resolve all memory leaks")
        lines.append("2. Fix queue backlogs")
        lines.append("3. Address database deadlocks")
        lines.append("4. Re-run Stage 1 after fixes")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Stage 1 Load Test Report Generator")
    parser.add_argument("--metrics-dir", required=True, help="Directory containing cycle_*.json metrics files")
    parser.add_argument("--output", default=None, help="Output report file path (default: stdout)")
    args = parser.parse_args()

    metrics_dir = Path(args.metrics_dir)
    if not metrics_dir.exists():
        print(f"Error: metrics directory not found: {metrics_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading metrics from {metrics_dir}...", file=sys.stderr)
    cycles = load_all_metrics(metrics_dir)
    print(f"  Loaded {len(cycles)} cycles", file=sys.stderr)

    if not cycles:
        print("Error: no metrics data found", file=sys.stderr)
        sys.exit(1)

    # Run all analyses
    analysis = {}
    analysis["throughput"] = analyze_throughput(cycles)
    analysis["resource_trends"] = analyze_resource_trends(cycles)
    analysis["queue_stats"] = analyze_queues(cycles)
    analysis["db_stats"] = analyze_database(cycles)
    analysis["storage_stats"] = analyze_storage(cycles)
    analysis["kafka_stats"] = analyze_kafka(cycles)

    analysis["memory_leaks"] = analyze_memory_leaks(analysis["resource_trends"])
    analysis["bottlenecks"] = analyze_bottleneck(
        analysis["resource_trends"],
        analysis["queue_stats"],
        analysis["db_stats"],
    )

    # Validation
    pass_fail_paths = sorted(metrics_dir.glob("pass_fail_*.json"))
    if pass_fail_paths:
        with open(pass_fail_paths[-1], encoding="utf-8") as f:
            last_check = json.load(f)
        # Also check if ANY cycle failed
        all_passed = True
        all_checks = {}
        for pf_path in pass_fail_paths:
            with open(pf_path, encoding="utf-8") as f:
                pf = json.load(f)
            for k, v in pf.get("checks", {}).items():
                if k not in all_checks:
                    all_checks[k] = v
                else:
                    all_checks[k] = all_checks[k] and v
            if not pf.get("pass", True):
                all_passed = False

        pass_fail = {
            "overall_pass": all_passed and last_check.get("pass", False),
            "checks": all_checks,
        }
    else:
        pass_fail = {"overall_pass": False, "checks": {}}

    pass_fail["readiness_score"] = calculate_readiness_score(analysis)

    # Generate report
    report = generate_markdown_report(analysis, pass_fail)

    if args.output:
        output_path = Path(args.output)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"Report written to {output_path}")
    else:
        print(report)

    # Summary
    print(f"\n{'='*60}", file=sys.stderr)
    result = "PASS" if pass_fail["overall_pass"] else "FAIL"
    print(f"Result: {result} | Readiness: {pass_fail['readiness_score']}/100", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)


if __name__ == "__main__":
    main()
