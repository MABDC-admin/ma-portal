import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('92.113.151.24', username='admin', password='Denskie123', timeout=10)

def run(cmd):
    stdin,stdout,stderr=ssh.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace')

# Find what URL TanStack Start uses for server functions
print(run("grep -o \"'/_server[^']*'\" /home/admin/frontend/.output/server/index.mjs | sort -u"))
print(run('grep -o \'\"/_server[^"]*\"\' /home/admin/frontend/.output/server/index.mjs | sort -u'))

# Look for the route pattern
print(run("grep -c 'listUsers' /home/admin/frontend/.output/server/index.mjs"))

# Check the server function route path 
print(run("grep -o '/_server[^,\"]*' /home/admin/frontend/.output/server/index.mjs | sort -u"))

ssh.close()
