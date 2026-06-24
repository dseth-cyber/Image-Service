import psycopg2
conn = psycopg2.connect('postgresql://image_user:image_pass@localhost:5432/image_db')
cur = conn.cursor()
cur.execute("UPDATE cameras SET status = 'active', enabled = true WHERE id = '58108035-a012-4be2-8435-8aaeb7e375c5'")
conn.commit()
cur.execute("SELECT name, status, enabled FROM cameras WHERE id = '58108035-a012-4be2-8435-8aaeb7e375c5'")
print(cur.fetchone())
cur.close()
conn.close()
