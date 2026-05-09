# redmine_proxy.py
import os, requests, math
from flask import Flask, request, Response, jsonify

API_KEY = os.environ.get("REDMINE_KEY") or "9bfdf5b21b2e574ccb9478d1d7812cedef1bb554"
BASE = "https://redmine.trustteam.be"

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

if __name__ == "__main__":
    app.run(port=5000)
