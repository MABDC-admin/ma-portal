import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('92.113.151.24', username='admin', password='Denskie123', timeout=10)

def run(cmd):
    stdin,stdout,stderr=ssh.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace')

print("NGINX ACCESS LOG (tail 30):")
print(run("echo 'Denskie123' | sudo -S tail -n 30 /var/log/nginx/access.log"))

ssh.close()
