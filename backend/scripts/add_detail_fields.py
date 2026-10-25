import sqlite3

def add_detail_columns():
    conn = sqlite3.connect("db.sqlite3")
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(crosses_activity)")
    cols = [r[1] for r in cur.fetchall()]

    new_cols = [
        ("instructor_available", "BOOLEAN DEFAULT 1"),
        ("instructor_details", "VARCHAR(150) DEFAULT 'Available • Certified Master Instructor'"),
        ("age_restrictions", "VARCHAR(150) DEFAULT 'Operator-defined (Age 10+)'"),
        ("cancellation_policy", "VARCHAR(250) DEFAULT 'Free cancellation up to 24 hours before start time (Operator Policy)'"),
        ("additional_options_json", "TEXT DEFAULT '[{\"id\":\"gopro\",\"name\":\"4K GoPro Video & Photo Package\",\"price\":499},{\"id\":\"vest\",\"name\":\"Pro Impact Neoprene Vest\",\"price\":199},{\"id\":\"pickup\",\"name\":\"Hotel Pickup & Drop Transfer\",\"price\":799}]'")
    ]

    for col_name, col_def in new_cols:
        if col_name not in cols:
            print(f"Adding column {col_name}")
            cur.execute(f"ALTER TABLE crosses_activity ADD COLUMN {col_name} {col_def}")
        else:
            print(f"Column {col_name} already exists.")

    conn.commit()
    conn.close()
    print("Activity detail columns added successfully.")

if __name__ == "__main__":
    add_detail_columns()
