import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('92.113.151.24', username='admin', password='Denskie123', timeout=10)

def run(cmd):
    stdin,stdout,stderr=ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    return out.strip()

# Find what routes the server actually handles by searching the built index.mjs
# TanStack Start uses /_server by default
out = run("grep -o '\"/_server\"\\|/_server[^\"]*\"' /home/admin/frontend/.output/server/index.mjs | sort -u")
print("_server routes:", out[:500])

out = run("grep -o 'addRoute.*' /home/admin/frontend/.output/server/index.mjs | head -20")
print("addRoute:", out[:500])

# Try to find ALL registered routes
out = run("strings /home/admin/frontend/.output/server/index.mjs | grep '^/[a-z_]' | sort -u | head -40")
print("Routes:", out[:1000])

ssh.close()
