# Auto RGPD

Automatisé vos demande de suppression de données.

## How to use

Get all emails that sent you mail.
Here you can specify a whitelist of domain that you want to ignore.

```bash
pnpm run dev grab -e <YOUR_EMAIL> -p <YOUR_PASSWORD> --server <IMAP_SERVER> -f result.json -w whitelist.txt
```

Send email to all emails that you get from the previous command, and ask for delete all data that they have about you.

```bash
pnpm run dev send -e <YOUR_EMAIL> -p <YOUR_PASSWORD> --server <SMTP_SERVER> -t ./effacement_de_donnees.pug -f ./test.json --firstname leo --lastname heritier
```
