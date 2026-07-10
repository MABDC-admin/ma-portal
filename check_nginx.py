import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('92.113.151.24', username='admin', password='Denskie123', timeout=10)

def run(cmd):
    stdin,stdout,stderr=ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

# Look at the nginx config to see how it proxies to the frontend
out, err = run("cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/conf.d/*.conf 2>/dev/null || echo 'no nginx config found'")
print("NGINX CONFIG:", out[:2000])

# Check what port the frontend is actually listening on inside the container via docker inspect
out, err = run("echo 'Denskie123' | sudo -S docker inspect ma-portal-frontend --format '{{json .NetworkSettings.Ports}}'")
print("PORT MAP:", out)

ssh.close()
