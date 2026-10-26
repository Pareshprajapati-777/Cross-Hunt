import sqlite3

def run():
    conn = sqlite3.connect("db.sqlite3")
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(crosses_activity)")
    existing = [c[1] for c in cur.fetchall()]
    cols = [
        ("min_participants", "INTEGER DEFAULT 1"),
        ("pricing_type", "VARCHAR(30) DEFAULT 'PER_PERSON'"),
        ("weather_conditions", "VARCHAR(250) DEFAULT 'Operates in calm to moderate sea swell. Subject to wind/rain advisories.'"),
    ]
    for col, defn in cols:
        if col not in existing:
            cur.execute(f"ALTER TABLE crosses_activity ADD COLUMN {col} {defn}")
            print(f"Added column {col}")
    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()
    print("Columns verified!")

if __name__ == "__main__":
    run()
