from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import os
import json
import datetime
import bcrypt  # Import bcrypt for password hashing

app = Flask(__name__)
app.secret_key = "your_secret_key"  # Required for session management

# Path to the combined JSON file
DATA_FILE = os.path.join("data", "data.json")
os.makedirs("data", exist_ok=True)

# Load data from the JSON file
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as file:
            return json.load(file)
    # Ensure default keys exist.
    return {"users": {}, "transfers": [], "events": {}}

# Save data to the JSON file
def save_data(data):
    try:
        with open(DATA_FILE, "w") as file:
            json.dump(data, file, indent=4)
        print("Data saved successfully!")
    except Exception as e:
        print(f"Error saving data: {e}")

# Hash password using bcrypt
def hash_password(password):
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password.decode('utf-8')

# Verify password using bcrypt
def verify_password(password, hashed_password):
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

# Home page
@app.route("/")
def home():
    return render_template("index.html")

# Get all user data (for debugging purposes)
@app.route("/get_user_data", methods=["GET"])
def get_user_data():
    data = load_data()
    return jsonify(data), 200

# **New: Get user details for a specific user**
@app.route("/get_user_details", methods=["GET"])
def get_user_details():
    username = request.args.get("username")
    if not username:
        return jsonify({"error": "Username is required"}), 400

    data = load_data()
    users = data.get("users", {})

    if username not in users:
        return jsonify({"error": "User does not exist"}), 400

    user = users[username]
    transfers = data.get("transfers", [])
    # Filter transfers related to this user
    user_transfers = [t for t in transfers if t["sender"] == username or t["receiver"] == username]
    latest_transfer = user_transfers[-1] if user_transfers else None

    return jsonify({
        "balance": user.get("balance", 0),
        "daily_limit": user.get("daily_limit", 500),
        "donated_today": user.get("donated_today", 0),
        "latest_transfer": latest_transfer
    }), 200

# Admin login page
@app.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        # Check admin credentials
        if username == "admin" and password == "admin":
            session["admin_logged_in"] = True
            return redirect(url_for("admin_dashboard"))
        else:
            return render_template("admin.html", error="Invalid credentials")
    return render_template("admin.html")

# Admin dashboard (balance adjustment)
@app.route("/admin/dashboard", methods=["GET", "POST"])
def admin_dashboard():
    if not session.get("admin_logged_in"):
        return redirect(url_for("admin_login"))
    
    if request.method == "POST":
        username = request.form.get("username")
        amount_add = request.form.get("amount_add", type=float)
        amount_remove = request.form.get("amount_remove", type=float)
        amount_replace = request.form.get("amount_replace", type=float)
        
        print("Received data - Username:", username, "Amount Add:", amount_add, "Amount Remove:", amount_remove, "Amount Replace:", amount_replace)
        
        if not username:
            return jsonify({"error": "Username is required"}), 400
        
        data = load_data()
        users = data["users"]
        if username not in users:
            return jsonify({"error": "User does not exist"}), 400
        
        user = users[username]
        
        try:
            if amount_replace is not None:
                user["balance"] = amount_replace
            else:
                if amount_add is not None:
                    user["balance"] += amount_add
                if amount_remove is not None:
                    user["balance"] -= amount_remove
        except Exception as e:
            print("Error adjusting balance:", e)
            return jsonify({"error": "Error adjusting balance"}), 500
        
        print("User data after adjustment:", user)
        save_data(data)
        print("Updated balance for:", username, "New balance:", user["balance"])
        
        return jsonify({
            "message": f"Adjusted balance for {username}. New balance: {user['balance']}",
            "new_balance": user["balance"]
        }), 200
    
    return render_template("admin_dashboard.html")

# Logout admin
@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_logged_in", None)
    return redirect(url_for("admin_login"))

# Add a new user (Modified to set a default password)
@app.route("/add_user", methods=["POST"])
def add_user():
    username = request.form.get("username")
    initial_balance = request.form.get("balance", 0)
    # Use a default password for demo purposes if none is provided
    default_password = "password"
    
    if not username:
        return jsonify({"error": "Username is required"}), 400
    
    try:
        initial_balance = float(initial_balance)
    except ValueError:
        return jsonify({"error": "Initial balance must be a number"}), 400
    
    data = load_data()
    users = data["users"]
    if username in users:
        return jsonify({"error": "User already exists"}), 400
    
    users[username] = {
        "balance": initial_balance,
        "donated_today": 0,
        "total_donated": 0,
        "daily_limit": 500,
        "password": hash_password(default_password),
        "email": "",
        "wallet": "",
        "phone": ""
    }
    save_data(data)
    return jsonify({"message": f"User {username} added successfully. Default password is '{default_password}'"}), 200

# User Registration Endpoint
@app.route("/register", methods=["POST"])
def register():
    data_received = request.get_json()
    print("Received registration data:", data_received)
    username = data_received.get("username")
    password = data_received.get("password")
    email = data_received.get("email")
    wallet = data_received.get("wallet")
    phone = data_received.get("phone")

    if not username or not password or not email or not wallet or not phone:
        return jsonify({"success": False, "message": "All fields are required"}), 400

    if len(wallet) < 26:
        return jsonify({"success": False, "message": "Wallet code must be at least 26 characters long"}), 400

    db = load_data()
    users = db.get("users", {})

    if username in users:
        return jsonify({"success": False, "message": "User already exists"}), 400

    hashed_password = hash_password(password)
    users[username] = {
        "balance": 0,
        "donated_today": 0,
        "total_donated": 0,
        "daily_limit": 500,
        "password": hashed_password,
        "email": email,
        "wallet": wallet,
        "phone": phone
    }
    save_data(db)
    print(f"User {username} registered successfully!")
    return jsonify({"success": True, "message": "Registration successful"}), 200

# Admin: Edit Event
@app.route("/admin/edit_event/<event_id>", methods=["POST"])
def edit_event(event_id):
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    db = load_data()
    events = db.get("events", {})

    if event_id not in events:
        return jsonify({"error": "Event does not exist"}), 404

    event = events[event_id]

    # Update fields only if new values are provided
    name = request.json.get("name")
    description = request.json.get("description")
    start_time = request.json.get("start_time")
    end_time = request.json.get("end_time")
    goal = request.json.get("goal")
    image = request.json.get("image")

    if name:
        event["name"] = name
    if description:
        event["description"] = description
    if start_time:
        event["start_time"] = start_time
    if end_time:
        event["end_time"] = end_time
    if goal:
        try:
            event["goal"] = float(goal)
        except ValueError:
            return jsonify({"error": "Invalid goal amount"}), 400
    if image:
        event["image"] = image

    save_data(db)
    return jsonify({"message": f"Event {event_id} updated successfully", "event": event}), 200

# Admin: Edit User Details
@app.route("/admin/edit_user", methods=["POST"])
def edit_user():
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    data_received = request.get_json()
    username = data_received.get("username")
    if not username:
        return jsonify({"error": "Username is required"}), 400

    db = load_data()
    users = db.get("users", {})

    if username not in users:
        return jsonify({"error": "User does not exist"}), 400

    user = users[username]
    daily_limit = data_received.get("daily_limit")
    email = data_received.get("email")
    phone = data_received.get("phone")
    password = data_received.get("password")

    if daily_limit is not None and daily_limit != "":
        try:
            user["daily_limit"] = float(daily_limit)
        except ValueError:
            return jsonify({"error": "Invalid daily limit"}), 400
    if email is not None and email != "":
        user["email"] = email
    if phone is not None and phone != "":
        user["phone"] = phone
    if password is not None and password != "":
        user["password"] = hash_password(password)

    save_data(db)
    return jsonify({"message": f"User {username} updated successfully", "user": user}), 200

# Remove a user
@app.route("/remove_user", methods=["POST"])
def remove_user():
    username = request.form.get("username")
    
    if not username:
        return jsonify({"error": "Username is required"}), 400
    
    data = load_data()
    users = data["users"]
    if username not in users:
        return jsonify({"error": "User does not exist"}), 400
    
    del users[username]
    save_data(data)
    return jsonify({"message": f"User {username} removed successfully"}), 200

# Transfer balance route
@app.route("/transfer_balance", methods=["POST"])
def transfer_balance():
    sender = request.form.get("sender")
    receiver = request.form.get("receiver")
    amount = request.form.get("amount", type=float)

    print("Received transfer data - Sender:", sender, "Receiver:", receiver, "Amount:", amount)

    if not sender or not receiver or not amount:
        return jsonify({"error": "Sender, receiver, and amount are required"}), 400

    data = load_data()
    users = data["users"]
    if sender not in users or receiver not in users:
        return jsonify({"error": "Sender or receiver does not exist"}), 400

    if users[sender]["balance"] < amount:
        return jsonify({"error": "Insufficient balance"}), 400

    users[sender]["balance"] -= amount
    users[receiver]["balance"] += amount

    transfers = data["transfers"]
    transfers.append({
        "sender": sender,
        "receiver": receiver,
        "amount": amount,
        "timestamp": datetime.datetime.now().isoformat()
    })

    print("Transfer data to be saved:", transfers)
    save_data(data)
    print("Transfer recorded successfully!")
    print("Updated transfers:", transfers)
    return jsonify({
        "message": f"Transferred {amount} from {sender} to {receiver}",
        "new_sender_balance": users[sender]["balance"],
        "new_receiver_balance": users[receiver]["balance"]
    }), 200

# View transfers
@app.route("/get_transfers", methods=["GET"])
def get_transfers():
    data = load_data()
    transfers = data["transfers"]
    return jsonify(transfers), 200

# Donate crypto
@app.route("/donate", methods=["POST"])
def donate():
    username = request.form.get("username")
    amount = request.form.get("amount")
    
    if not username or not amount:
        return jsonify({"error": "Username and amount are required"}), 400
    
    try:
        amount = float(amount)
    except ValueError:
        return jsonify({"error": "Amount must be a number"}), 400
    
    data = load_data()
    users = data["users"]
    if username not in users:
        return jsonify({"error": "User does not exist"}), 400
    
    user = users[username]
    if user["donated_today"] + amount > user["daily_limit"]:
        return jsonify({"error": "Daily donation limit exceeded"}), 400
    
    if user["balance"] < amount:
        return jsonify({"error": "Insufficient balance"}), 400
    
    user["balance"] -= amount
    user["donated_today"] += amount
    user["total_donated"] += amount

    transfers = data["transfers"]
    transfers.append({
        "sender": username,
        "receiver": "charity",
        "amount": amount,
        "timestamp": datetime.datetime.now().isoformat()
    })

    save_data(data)
    return jsonify({
        "message": f"Donated {amount} fake coins successfully",
        "balance": user["balance"],
        "donated_today": user["donated_today"],
        "total_donated": user["total_donated"]
    }), 200

# Reset daily donations (optional)
@app.route("/reset_daily_donations", methods=["POST"])
def reset_daily_donations():
    data = load_data()
    users = data["users"]
    for user in users.values():
        user["donated_today"] = 0
    save_data(data)
    return jsonify({"message": "Daily donations reset"}), 200

# User Login
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"}), 400

    data = load_data()
    users = data["users"]

    if username not in users:
        return jsonify({"success": False, "message": "User does not exist"}), 400

    if not verify_password(password, users[username]["password"]):
        return jsonify({"success": False, "message": "Invalid password"}), 400

    session["username"] = username
    return jsonify({"success": True, "message": "Login successful"}), 200

# Logout session    
@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logout successful"}), 200

# Check session status
@app.route("/check_session", methods=["GET"])
def check_session():
    username = session.get("username")
    if username:
        return jsonify({"logged_in": True, "username": username}), 200
    else:
        return jsonify({"logged_in": False}), 200

# --- Event Routes ---

# Get all events
@app.route("/get_events", methods=["GET"])
def get_events():
    data = load_data()
    events = data.get("events", {})
    return jsonify(events), 200

# Admin: Add a new event
@app.route("/admin/add_event", methods=["POST"])
def add_event():
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    data = load_data()
    events = data.setdefault("events", {})

    new_event = request.get_json()
    if not new_event:
        return jsonify({"error": "No event data provided"}), 400

    name = new_event.get("name")
    description = new_event.get("description", "")
    start_time = new_event.get("start_time")
    end_time = new_event.get("end_time")
    goal_raw = new_event.get("goal", 0)
    try:
        goal = float(goal_raw)
    except ValueError:
        return jsonify({"error": "Goal must be a valid number"}), 400
    image = new_event.get("image", "")
    created_by = new_event.get("created_by")  # Creator's username

    if not name or not start_time or not end_time or not created_by:
        return jsonify({"error": "name, start_time, end_time, and created_by are required"}), 400

    event_id = f"event_{len(events) + 1}"
    events[event_id] = {
        "created_by": created_by,
        "name": name,
        "description": description,
        "start_time": start_time,
        "end_time": end_time,
        "goal": goal,
        "current_donation": 0,
        "image": image,
        "donations": []
    }

    save_data(data)
    print(f"Event '{name}' added with ID {event_id}")
    return jsonify({
        "message": f"Event '{name}' (ID: {event_id}) added successfully",
        "event_id": event_id,
        "event": events[event_id]
    }), 200

# Admin: Delete an event
@app.route("/admin/delete_event", methods=["POST"])
def delete_event():
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    data_received = request.get_json()
    event_id = data_received.get("event_id")
    if not event_id:
        return jsonify({"error": "Event ID is required"}), 400

    db = load_data()
    events = db.get("events", {})

    if event_id not in events:
        return jsonify({"error": "Event does not exist"}), 400

    del events[event_id]
    save_data(db)
    return jsonify({"message": f"Event {event_id} deleted successfully"}), 200

# Donate to an event
# Donate to an event
@app.route("/donate_event", methods=["POST"])
def donate_event():
    data_received = request.get_json()
    username = data_received.get("username")
    event_id = data_received.get("event_id")
    try:
        amount = float(data_received.get("amount", 0))
    except ValueError:
        return jsonify({"error": "Invalid donation amount"}), 400

    if not username or not event_id or not amount:
        return jsonify({"error": "username, event_id, and amount are required"}), 400

    db = load_data()
    events = db.setdefault("events", {})
    users = db.get("users", {})

    if username not in users:
        return jsonify({"error": "User does not exist"}), 400
    if event_id not in events:
        return jsonify({"error": "Event does not exist"}), 400

    user = users[username]
    if user["balance"] < amount:
        return jsonify({"error": "Insufficient balance"}), 400
    if user["donated_today"] + amount > user["daily_limit"]:
        return jsonify({"error": "Daily donation limit exceeded"}), 400

    # Deduct donation from user's balance and update daily donation
    user["balance"] -= amount
    user["donated_today"] += amount

    # Update event donation info
    events[event_id]["current_donation"] += amount
    events[event_id]["donations"].append({
        "username": username,
        "amount": amount,
        "timestamp": datetime.datetime.now().isoformat()
    })

    save_data(db)
    return jsonify({
        "message": f"Donated {amount} to {event_id}",
        "new_balance": user["balance"],
        "donated_today": user["donated_today"]
    }), 200
#add balance
@app.route("/add_balance", methods=["POST"])
def add_balance():
    data = request.get_json()
    username = data.get("username")
    try:
        amount = float(data.get("amount", 0))
    except ValueError:
        return jsonify({"error": "Invalid amount"}), 400

    if not username or amount <= 0:
        return jsonify({"error": "Username and a positive amount are required"}), 400

    db = load_data()
    users = db.get("users", {})
    if username not in users:
        return jsonify({"error": "User does not exist"}), 400

    user = users[username]
    # Increase only the balance (no changes to donated_today, etc.)
    user["balance"] += amount
    save_data(db)
    return jsonify({
        "message": f"Balance increased by {amount}. New balance: {user['balance']}",
        "new_balance": user["balance"]
    }), 200

if __name__ == "__main__":
    app.run(debug=True)
