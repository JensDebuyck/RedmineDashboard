# redmine_proxy.py
import os, requests, math, datetime
from flask import Flask, request, Response, jsonify
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("REDMINE_KEY")
BASE = "https://redmine.trustteam.be"

if not API_KEY:
    raise ValueError("REDMINE_KEY is not set in environment variables")

app = Flask(__name__)

@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "*"
    return resp

def fetch_all_pages(url, params):
    """Haal alle pagina's op en geef alle issues terug."""
    headers = {"X-Redmine-API-Key": API_KEY}
    params = dict(params)
    params["limit"] = 100
    params["offset"] = 0

    first = requests.get(url, params=params, headers=headers, timeout=20).json()
    total = first.get("total_count", len(first.get("issues", [])))
    all_issues = first.get("issues", [])

    pages = math.ceil(total / 100)
    for i in range(1, pages):
        params["offset"] = i * 100
        r = requests.get(url, params=params, headers=headers, timeout=20).json()
        all_issues.extend(r.get("issues", []))

    return jsonify({"issues": all_issues, "total_count": total})

# Backlog route
@app.route("/projects/<project>/issues.json")
def issues(project):
    url = f"{BASE}/projects/{project}/issues.json"
    return fetch_all_pages(url, request.args.to_dict(flat=True))

# My tickets route (met paginatie)
@app.route("/issues.json")
def all_issues():
    url = f"{BASE}/issues.json"
    return fetch_all_pages(url, request.args.to_dict(flat=True))

# Users
@app.route("/users.json")
def users():
    url = f"{BASE}/users.json"
    params = request.args.to_dict(flat=True)
    headers = {"X-Redmine-API-Key": API_KEY}
    r = requests.get(url, params=params, headers=headers, timeout=20)
    return Response(r.content, status=r.status_code,
        content_type=r.headers.get("Content-Type", "application/json"))

# Time entries
@app.route("/time_entries.json")
def time_entries():
    url = f"{BASE}/time_entries.json"
    params = request.args.to_dict(flat=True)
    headers = {"X-Redmine-API-Key": API_KEY}
    r = requests.get(url, params=params, headers=headers, timeout=20)
    return Response(r.content, status=r.status_code,
        content_type=r.headers.get("Content-Type", "application/json"))

@app.route("/issues/stats.json")
def issues_stats():
    thirty_days_ago = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
    url = f"{BASE}/projects/software-kortrijk/issues.json"
    headers = {"X-Redmine-API-Key": API_KEY}

    all_issues = []
    offset = 0
    total = None

    while True:
        r = requests.get(url, params={
            "query_id": "1601",
            "status_id": "*",
            "limit": 100,
            "offset": offset
        }, headers=headers, timeout=20).json()

        issues = r.get("issues", [])
        if total is None:
            total = r.get("total_count", 0)

        all_issues.extend(issues)
        offset += 100

        if not issues or offset >= total:
            break

    filtered = [i for i in all_issues if i.get("created_on", "")[:10] >= thirty_days_ago]

    return jsonify({"issues": filtered, "total_count": len(filtered)})  # ← deze regel miste!

if __name__ == "__main__":
    app.run(port=5000)
