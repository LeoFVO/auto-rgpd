import Imap from 'imap';
import { simpleParser } from 'mailparser';

// Fonction pour se connecter au serveur IMAP
export async function connectToImapServer(
  email: string,
  password: string,
  server: string
) {
  return new Promise<Imap>((resolve, reject) => {
    const imap = new Imap({
      user: email,
      password: password,
      host: server,
      port: 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false, // Ignore self-signed certificate validation
      },
    });

    imap.once('ready', () => {
      resolve(imap);
    });

    imap.once('error', (error) => {
      reject(error);
    });

    imap.connect();
  });
}

// Fonction pour récupérer les emails
export async function fetchEmails(imap: Imap): Promise<string[]> {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', false, (error, box) => {
      if (error) {
        reject(error);
        return;
      }

      const emails: string[] = [];

      imap.search(['ALL'], (searchError, results) => {
        if (searchError) {
          reject(searchError);
          return;
        }

        const fetch = imap.fetch(results, { bodies: '', markSeen: false });

        fetch.on('message', (msg, seqno) => {
          msg.on('body', (stream) => {
            simpleParser(stream, (parseError, mail) => {
              if (!parseError && mail.from && mail.from.text) {
                emails.push(mail.from.text);
              }
            });
          });

          msg.once('end', () => {
            console.log(`Message ${seqno} fully processed`);
          });
        });

        fetch.once('error', (fetchError) => {
          reject(fetchError);
        });

        fetch.once('end', () => {
          resolve(emails);
        });
      });
    });
  });
}

// Fonction pour extraire les émetteurs uniques
export function extractUniqueSenders(
  emails: string[]
): { email: string; name: string; domain: string }[] {
  const uniqueSenders: {
    [key: string]: { email: string; name: string; domain: string };
  } = {};

  emails.forEach((email) => {
    const parsedEmail = email.match(/(.*)<(.+@.+\..+)>/);
    if (parsedEmail) {
      const name = parsedEmail[1].trim();
      const email = parsedEmail[2].trim();
      const domain = extractMainDomain(email);
      uniqueSenders[domain] = { email, name, domain };
    } else {
      const domain = extractMainDomain(email);
      uniqueSenders[domain] = { email, name: '', domain };
    }
  });

  return Object.values(uniqueSenders);
}

function extractMainDomain(email: string): string | null {
  const domainMatch = RegExp(/@([^.]+(\.[^.]+)+)$/).exec(email);
  if (domainMatch) {
    const domainParts = domainMatch[1].split('.');
    if (domainParts.length >= 2) {
      return `${domainParts[domainParts.length - 2]}.${
        domainParts[domainParts.length - 1]
      }`;
    }
  }
  return null;
}
