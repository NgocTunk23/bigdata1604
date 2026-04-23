import json
import asyncio
import pandas as pd
import os
import glob
import ast
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

# ========================
# CONFIG PATH
# ========================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PRODUCTS_PATH = os.path.join(BASE_DIR, "data", "results", "association_rules.parquet")
SUPER_RULES_PATH = os.path.join(BASE_DIR, "data", "results", "association_rules_super.parquet")
TRANSACTIONS_PATH = os.path.join(BASE_DIR, "data.parquet")
CLUSTERED_USERS_PATH = os.path.join(BASE_DIR, "data", "results", "clustered_users.parquet")
PRODUCTS_CSV_FALLBACK_PATH = os.path.join(BASE_DIR, "association.csv")
SUPER_RULES_CSV_FALLBACK_PATH = os.path.join(BASE_DIR, "associationsuper.csv")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

# ========================
# GLOBAL CACHE
# ========================
producer = None
products_df = pd.DataFrame()
super_rules_df = pd.DataFrame()
transactions_df = pd.DataFrame()
clustered_users_df = pd.DataFrame()
transactions_data_signature = None
clustered_users_data_signature = None

# ========================
# HELPER
# ========================
def load_table_safely(path: str):
    """
    Load table from:
    - parquet/csv single file
    - Spark output folder containing part-*.csv
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"{path} not found")

    # CASE 1: single file
    if os.path.isfile(path):
        _, ext = os.path.splitext(path.lower())
        if ext == ".parquet":
            return pd.read_parquet(path, engine="pyarrow")
        if ext == ".csv":
            return pd.read_csv(path)
        raise ValueError(f"Unsupported file type: {ext}")

    # CASE 2: folder (Spark output)
    lower_path = path.lower()
    if lower_path.endswith(".parquet"):
        return pd.read_parquet(path, engine="pyarrow")

    csv_files = glob.glob(os.path.join(path, "*.csv"))
    if csv_files:
        return pd.concat([pd.read_csv(f) for f in csv_files], ignore_index=True)

    json_files = glob.glob(os.path.join(path, "*.json"))
    if json_files:
        return pd.concat([pd.read_json(f, lines=True) for f in json_files], ignore_index=True)

    raise ValueError(f"No supported files found in {path}")

def load_rules_with_fallback(primary_path: str, fallback_csv_path: str):
    """
    Same strategy as Streamlit app.py:
    - prefer parquet rules
    - fallback to csv when parquet is unavailable/broken
    """
    try:
        return load_table_safely(primary_path)
    except Exception:
        if os.path.exists(fallback_csv_path):
            return pd.read_csv(fallback_csv_path)
        raise

def build_data_signature(path: str):
    """
    Return a lightweight signature to detect source data changes.
    Works for both files and Spark output directories.
    """
    if not os.path.exists(path):
        return None

    if os.path.isfile(path):
        return os.path.getmtime(path)

    latest_mtime = 0.0
    for root, _, files in os.walk(path):
        for name in files:
            full_path = os.path.join(root, name)
            try:
                latest_mtime = max(latest_mtime, os.path.getmtime(full_path))
            except OSError:
                continue
    return latest_mtime

def normalize(x: str):
    return x.strip().lower()

def clean_item_text(value):
    text = str(value).strip()
    if text.startswith(("'", '"')) and text.endswith(("'", '"')) and len(text) >= 2:
        text = text[1:-1]
    return text.strip()

def extract_items(val):
    if isinstance(val, list):
        return val
    if isinstance(val, (set, tuple)):
        return list(val)
    if isinstance(val, str):
        raw = val.strip()
        if not raw:
            return []
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
        try:
            parsed = ast.literal_eval(raw)
            if isinstance(parsed, (list, tuple, set)):
                return list(parsed)
        except:
            pass
        return [clean_item_text(i) for i in raw.split(",") if i.strip()]
    return []

def collect_unique_products(df: pd.DataFrame):
    if df is None or df.empty or "antecedent" not in df.columns:
        return []

    products = set()
    for val in df["antecedent"].dropna():
        for item in extract_items(val):
            if item:
                cleaned = clean_item_text(item)
                if cleaned:
                    products.add(cleaned)
    return sorted(products)

def format_trend(current: float, previous: float):
    if previous == 0:
        if current == 0:
            return "0%"
        return "+100%"
    pct = ((current - previous) / previous) * 100
    return f"{pct:+.0f}%"

CLUSTER_SEGMENT_ORDER = ["VIP", "Potential", "Risk", "Lost"]

def build_cluster_segment_map(df: pd.DataFrame):
    if df is None or df.empty or "cluster" not in df.columns:
        return {}

    if "total_spend" in df.columns:
        ranked_clusters = list(df.groupby("cluster")["total_spend"].mean().sort_values(ascending=False).index)
    else:
        ranked_clusters = list(df.groupby("cluster").size().sort_values(ascending=False).index)

    mapping = {}
    for idx, cluster_id in enumerate(ranked_clusters):
        if idx < len(CLUSTER_SEGMENT_ORDER):
            mapping[cluster_id] = CLUSTER_SEGMENT_ORDER[idx]
        else:
            mapping[cluster_id] = f"Group {idx + 1}"
    return mapping

def format_recency(days_value):
    days = float(days_value)
    if days < 1:
        return "Vua xong"
    if days < 2:
        return "1 ngay"
    if days < 30:
        return f"{int(round(days))} ngay"
    return f"{int(round(days))} ngay"

def format_spend_k(value):
    return f"{value:,.0f}k"
    
# ========================
# LIFESPAN (INIT APP)
# ========================
@asynccontextmanager
async def lifespan(app: FastAPI):
    global producer, products_df, super_rules_df, transactions_df, clustered_users_df
    global transactions_data_signature, clustered_users_data_signature

    # --- Kafka Producer ---
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    await producer.start()
    print("✅ Kafka Producer ready")

    # --- Load data vào RAM (quan trọng) ---
    try:
        products_df = load_rules_with_fallback(PRODUCTS_PATH, PRODUCTS_CSV_FALLBACK_PATH)
        print(f"✅ Loaded PRODUCTS: {len(products_df)} rows")
    except Exception as e:
        print(f"❌ Load PRODUCTS failed: {e}")
        products_df = pd.DataFrame()

    try:
        super_rules_df = load_rules_with_fallback(SUPER_RULES_PATH, SUPER_RULES_CSV_FALLBACK_PATH)
        print(f"✅ Loaded SUPER RULES: {len(super_rules_df)} rows")
    except Exception as e:
        print(f"❌ Load SUPER RULES failed: {e}")
        super_rules_df = pd.DataFrame()

    try:
        transactions_df = load_table_safely(TRANSACTIONS_PATH)
        transactions_data_signature = build_data_signature(TRANSACTIONS_PATH)
        print(f"✅ Loaded TRANSACTIONS: {len(transactions_df)} rows")
    except Exception as e:
        print(f"❌ Load TRANSACTIONS failed: {e}")
        transactions_df = pd.DataFrame()
        transactions_data_signature = None

    try:
        clustered_users_df = load_table_safely(CLUSTERED_USERS_PATH)
        clustered_users_data_signature = build_data_signature(CLUSTERED_USERS_PATH)
        print(f"✅ Loaded CLUSTERED USERS: {len(clustered_users_df)} rows")
    except Exception as e:
        print(f"❌ Load CLUSTERED USERS failed: {e}")
        clustered_users_df = pd.DataFrame()
        clustered_users_data_signature = None

    yield

    await producer.stop()
    print("🛑 Kafka Producer stopped")


# ========================
# APP INIT
# ========================
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def refresh_transactions_if_changed():
    global transactions_df, transactions_data_signature
    new_signature = build_data_signature(TRANSACTIONS_PATH)
    if new_signature is None:
        return
    if transactions_data_signature != new_signature:
        try:
            transactions_df = load_table_safely(TRANSACTIONS_PATH)
            transactions_data_signature = new_signature
            print(f"🔄 Refreshed TRANSACTIONS: {len(transactions_df)} rows")
        except Exception as e:
            print(f"❌ Refresh TRANSACTIONS failed: {e}")

def refresh_clustered_users_if_changed():
    global clustered_users_df, clustered_users_data_signature
    new_signature = build_data_signature(CLUSTERED_USERS_PATH)
    if new_signature is None:
        return
    if clustered_users_data_signature != new_signature:
        try:
            clustered_users_df = load_table_safely(CLUSTERED_USERS_PATH)
            clustered_users_data_signature = new_signature
            print(f"🔄 Refreshed CLUSTERED USERS: {len(clustered_users_df)} rows")
        except Exception as e:
            print(f"❌ Refresh CLUSTERED USERS failed: {e}")


# ========================
# PRODUCTS API
# ========================
@app.get("/api/v1/products/standard")
async def get_products_standard():
    try:
        if products_df is None or products_df.empty:
            return {"products": []}

        return {"products": collect_unique_products(products_df)}

    except Exception as e:
        return {"error": str(e), "products": []}

@app.get("/api/v1/products/super")
async def get_products_super():
    try:
        if products_df is None or super_rules_df is None:
            return {"products": []}

        std = set(collect_unique_products(products_df))
        sup = set(collect_unique_products(super_rules_df))

        unique = sup - std

        return {"products": sorted(unique)}

    except Exception as e:
        return {"error": str(e), "products": []}

@app.post("/api/v1/analyze/standard")
async def analyze_standard(payload: dict):
    try:
        if products_df is None or products_df.empty:
            return {"results": []}

        selected_items = set(normalize(i) for i in payload.get("items", []))
        results = []

        for _, row in products_df.iterrows():
            ant_raw = extract_items(row["antecedent"])
            ant_norm = [normalize(i) for i in ant_raw]

            if set(ant_norm).issubset(selected_items):
                cons_raw = extract_items(row["consequent"])

                results.append({
                    "product_id": abs(hash(",".join(ant_raw))) % 100000,
                    "product_name": ", ".join(ant_raw),
                    "suggestion": ", ".join(cons_raw),
                    "confidence": round(float(row["confidence"]) * 100, 2)
                })

        return {
            "selected_items": list(selected_items),
            "results": sorted(results, key=lambda x: x["confidence"], reverse=True)[:5]
        }

    except Exception as e:
        return {"error": str(e), "results": []}

@app.post("/api/v1/analyze/super")
async def analyze_super(payload: dict):
    try:
        if super_rules_df is None or super_rules_df.empty:
            return {"results": []}

        selected_items = set(normalize(i) for i in payload.get("items", []))
        results = []

        for _, row in super_rules_df.iterrows():
            ant_raw = extract_items(row["antecedent"])
            ant_norm = [normalize(i) for i in ant_raw]

            if set(ant_norm).issubset(selected_items):
                cons_raw = extract_items(row["consequent"])

                results.append({
                    "selected_items": ", ".join(ant_raw),
                    "suggestion": ", ".join(cons_raw),
                    "confidence": round(float(row["confidence"]) * 100, 2),
                    "lift": round(float(row["lift"]), 4)
                })

        return {
            "results": sorted(results, key=lambda x: (x["lift"], x["confidence"]), reverse=True)[:5]
        }

    except Exception as e:
        return {"error": str(e), "results": []}
    
# ========================
# DASHBOARD APIs
# ========================
@app.get("/api/v1/dashboard/metrics")
async def get_dashboard_metrics():
    try:
        refresh_transactions_if_changed()

        if transactions_df is None or transactions_df.empty:
            return {
                "total_transactions": 0,
                "revenue": 0,
                "total_customers": 0,
                "total_products": 0,
                "trends": {"tx": "0%", "rev": "0%", "cust": "0%"},
            }

        df = transactions_df.copy()
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df = df.dropna(subset=["Date"])

        if "Price" in df.columns and "Quantity" in df.columns:
            df["line_revenue"] = pd.to_numeric(df["Price"], errors="coerce").fillna(0) * pd.to_numeric(df["Quantity"], errors="coerce").fillna(0)
        else:
            df["line_revenue"] = 0.0

        total_transactions = int(df["TransactionNo"].nunique()) if "TransactionNo" in df.columns else 0
        revenue = round(float(df["line_revenue"].sum()), 2)
        total_customers = int(df["CustomerNo"].nunique()) if "CustomerNo" in df.columns else 0
        total_products = int(df["ProductNo"].nunique()) if "ProductNo" in df.columns else 0

        if df.empty:
            trends = {"tx": "0%", "rev": "0%", "cust": "0%"}
        else:
            last_date = df["Date"].max()
            current_start = last_date - pd.Timedelta(days=29)
            prev_start = current_start - pd.Timedelta(days=30)

            current_period = df[(df["Date"] >= current_start) & (df["Date"] <= last_date)]
            previous_period = df[(df["Date"] >= prev_start) & (df["Date"] < current_start)]

            cur_tx = current_period["TransactionNo"].nunique() if "TransactionNo" in df.columns else 0
            prev_tx = previous_period["TransactionNo"].nunique() if "TransactionNo" in df.columns else 0
            cur_rev = float(current_period["line_revenue"].sum())
            prev_rev = float(previous_period["line_revenue"].sum())
            cur_cust = current_period["CustomerNo"].nunique() if "CustomerNo" in df.columns else 0
            prev_cust = previous_period["CustomerNo"].nunique() if "CustomerNo" in df.columns else 0

            trends = {
                "tx": format_trend(cur_tx, prev_tx),
                "rev": format_trend(cur_rev, prev_rev),
                "cust": format_trend(cur_cust, prev_cust),
            }

        return {
            "total_transactions": total_transactions,
            "revenue": revenue,
            "total_customers": total_customers,
            "total_products": total_products,
            "trends": trends,
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/v1/clustering/stats")
async def get_clustering_stats():
    try:
        refresh_clustered_users_if_changed()

        if clustered_users_df is None or clustered_users_df.empty or "cluster" not in clustered_users_df.columns:
            return [
                {"type": "VIP", "count": 0, "avg_recency_days": 0, "avg_orders": 0, "avg_aov": 0},
                {"type": "Potential", "count": 0, "avg_recency_days": 0, "avg_orders": 0, "avg_aov": 0},
                {"type": "Risk", "count": 0, "avg_recency_days": 0, "avg_orders": 0, "avg_aov": 0},
                {"type": "Lost", "count": 0, "avg_recency_days": 0, "avg_orders": 0, "avg_aov": 0},
            ]

        df = clustered_users_df.copy()
        cluster_to_segment = build_cluster_segment_map(df)

        grouped = df.groupby("cluster").agg(
            count=("cluster", "size"),
            avg_recency_days=("recency_days", "mean"),
            avg_orders=("total_orders", "mean"),
            avg_aov=("avg_order_value", "mean"),
        )

        stats = []
        for segment_name in CLUSTER_SEGMENT_ORDER:
            stats.append(
                {
                    "type": segment_name,
                    "count": 0,
                    "avg_recency_days": 0,
                    "avg_orders": 0,
                    "avg_aov": 0,
                }
            )

        for cluster_id, row in grouped.iterrows():
            segment = cluster_to_segment.get(cluster_id)
            if segment in CLUSTER_SEGMENT_ORDER:
                for item in stats:
                    if item["type"] == segment:
                        item["count"] = int(row["count"])
                        item["avg_recency_days"] = round(float(row["avg_recency_days"]), 2) if pd.notna(row["avg_recency_days"]) else 0
                        item["avg_orders"] = round(float(row["avg_orders"]), 2) if pd.notna(row["avg_orders"]) else 0
                        item["avg_aov"] = round(float(row["avg_aov"]), 2) if pd.notna(row["avg_aov"]) else 0
                        break

        return stats
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/v1/clustering/realtime")
async def get_clustering_realtime(limit: int = 20):
    try:
        refresh_clustered_users_if_changed()

        if clustered_users_df is None or clustered_users_df.empty:
            return {"rows": []}

        df = clustered_users_df.copy()
        if "cluster" not in df.columns:
            return {"rows": []}

        cluster_to_segment = build_cluster_segment_map(df)

        if "recency_days" in df.columns:
            sort_df = df.sort_values(by="recency_days", ascending=True)
        else:
            sort_df = df

        top_rows = sort_df.head(max(1, min(limit, 100)))

        rows = []
        for _, row in top_rows.iterrows():
            customer_no = str(row.get("CustomerNo", ""))
            recency_days = float(row.get("recency_days", 0) or 0)
            avg_orders = float(row.get("total_orders", 0) or 0)
            avg_aov = float(row.get("avg_order_value", 0) or 0)
            cluster_id = row.get("cluster", None)
            segment = cluster_to_segment.get(cluster_id, "Potential")

            rows.append(
                {
                    "id": f"TX{customer_no[-4:]}" if customer_no else "TX0000",
                    "cid": f"CUS-{customer_no[-4:]}" if customer_no else "CUS-00",
                    "spend": format_spend_k(avg_aov),
                    "freq": int(round(avg_orders)),
                    "rec": format_recency(recency_days),
                    "type": segment,
                }
            )

        return {"rows": rows}
    except Exception as e:
        return {"error": str(e), "rows": []}


# ========================
# WEBSOCKET (KAFKA → FE)
# ========================
@app.websocket("/ws/dashboard")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    consumer = AIOKafkaConsumer(
        "top_products_stream",
        "recommendation_stream",
        "customer_clustering",
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="latest",
    )

    await consumer.start()

    try:
        async for msg in consumer:
            await websocket.send_json(
                {
                    "topic": msg.topic,
                    "data": msg.value,
                }
            )

    except WebSocketDisconnect:
        print("Client disconnected")

    finally:
        await consumer.stop()