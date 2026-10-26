import sqlite3

conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()

columns_to_add = [
    ("registration_number", "VARCHAR(100) DEFAULT 'IND-GA-2024-REG'"),
    ("vessel_type", "VARCHAR(80) DEFAULT 'Motor Yacht'"),
    ("certifications", "TEXT DEFAULT 'IRS Seaworthiness Class A1, Annual Marine Safety Inspection Passed'"),
    ("maintenance_schedule", "TEXT DEFAULT 'Bi-weekly routine check; Next drydock inspection: Scheduled'"),
    ("supported_activities", "TEXT DEFAULT 'Scuba Diving, Deep-Sea Fishing, Sunset Cruise, Private Boat Charter'"),
]

cur.execute("PRAGMA table_info(crosses_cross)")
existing = [r[1] for r in cur.fetchall()]

for col_name, col_def in columns_to_add:
    if col_name not in existing:
        sql = f"ALTER TABLE crosses_cross ADD COLUMN {col_name} {col_def}"
        print(f"Executing: {sql}")
        cur.execute(sql)
    else:
        print(f"Column {col_name} already exists.")

conn.commit()
conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
conn.close()
print("Migration completed successfully.")
