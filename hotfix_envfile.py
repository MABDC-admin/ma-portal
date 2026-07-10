import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

host = "92.113.151.24"
user = "admin"
password = "Denskie123"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

def run_cmd(cmd):
    print(f"--- {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip(): print(out.strip())
    if err.strip(): print("ERR:", err.strip())

# Stop and remove the old container (image is still intact)
run_cmd("echo 'Denskie123' | sudo -S docker stop ma-portal-frontend")
run_cmd("echo 'Denskie123' | sudo -S docker rm ma-portal-frontend")

# Re-run WITH --env-file so server-side env vars are available
run_cmd("echo 'Denskie123' | sudo -S docker run -d --name ma-portal-frontend --restart unless-stopped -p 3000:3000 --env-file /home/admin/frontend/.env ma-portal-frontend")

# Verify
run_cmd("echo 'Denskie123' | sudo -S docker logs --tail 20 ma-portal-frontend")

ssh.close()
print("Done!")
