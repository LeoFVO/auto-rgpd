import { Command } from 'commander';
import figlet from 'figlet';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import nodemailer from 'nodemailer';
import pug from 'pug';
import { compilePugTemplate } from './utils/pug';
import {
  connectToImapServer,
  extractUniqueSenders,
  fetchEmails,
} from './utils/imap';

// Configuration de figlet
figlet.defaults({ font: 'Standard' });
const program = new Command();
console.log(figlet.textSync('Auto RGPD'));

function readWhitelistFromFile(file: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      const whitelist = data
        .split('\n')
        .map((domain) => domain.trim())
        .filter((domain) => domain !== ''); // Filter out empty lines

      resolve(whitelist);
    });
  });
}

// Fonction pour filtrer les émetteurs uniques en fonction de la whitelist
function filterByWhitelist(
  uniqueSenders: { email: string; name: string; domain: string }[],
  whitelist: string[]
) {
  return uniqueSenders.filter((sender) => !whitelist.includes(sender.domain));
}

program
  .command('grab')
  .description('Récupère toutes les adresses email qui vous ont écrit')
  .option('-e, --email  [value]', 'Votre adresse email')
  .option('-p, --password  [value]', 'Votre mot de passe')
  .option('-s, --server  [value]', 'Adresse du serveur IMAP')
  .option('-f, --save-to-file <file>', 'Sauvegarde le résultat dans un fichier')
  .option(
    '-w, --whitelist <file>',
    'Fichier de whitelist des domaines à ignorer'
  )
  .action(async (options) => {
    try {
      const imap = await connectToImapServer(
        options.email,
        options.password,
        options.server
      );
      const emails = await fetchEmails(imap);
      const uniqueSenders = extractUniqueSenders(emails);
      let filteredSenders = uniqueSenders;

      if (options.whitelist) {
        const whitelist = await readWhitelistFromFile(options.whitelist);
        filteredSenders = filterByWhitelist(uniqueSenders, whitelist);
      }
      console.log(`Nombre d'émetteurs uniques : ${uniqueSenders.length}`);
      console.log(`Nombre d'émetteurs filtrés : ${filteredSenders.length}`);

      if (options.saveToFile) {
        const jsonData = JSON.stringify(filteredSenders, null, 2);
        fs.writeFileSync(options.saveToFile, jsonData);
        console.log(
          `Résultat enregistré dans le fichier : ${options.saveToFile}`
        );
      }

      imap.end();
    } catch (error) {
      console.error('Erreur lors de la récupération des emails :', error);
    }
  });

// Définition de la commande "send"
program
  .command('send')
  .description(
    'Envois un email de demande de suppression de données à tous les emails dans le fichier'
  )
  .option('-e, --email  [value]', 'Votre adresse email')
  .option('-p, --password  [value]', 'Votre mot de passe')
  .option('-s, --server  [value]', 'Adresse du serveur SMTP')
  .option('-t, --template-file  [value]', 'Fichier de template de la lettre')
  .option('-f, --file  [value]', 'Fichier contenant les emails à contacter')
  .option('--firstname  [value]', "Votre prénom pour le corps de l'email")
  .option('--lastname  [value]', "Votre nom pour le corps de l'email")
  .action(async (options) => {
    try {
      const transporter = nodemailer.createTransport({
        host: options.server,
        port: 587,
        secure: false,
        auth: {
          user: options.email,
          pass: options.password,
        },
      });

      const rawData = fs.readFileSync(options.file, 'utf-8');
      const data = JSON.parse(rawData);

      const emailBody = compilePugTemplate(
        options.templateFile,
        options.firstname,
        options.lastname
      );

      for (const entry of data) {
        const mailOptions = {
          from: options.email,
          to: entry.email, // Replace with the recipient's email address from the JSON object
          subject: "Demande d'effacement de mes informations personnelles",
          html: emailBody, // Use html instead of text for the email body
        };

        try {
          const info = await transporter.sendMail(mailOptions);
          console.log(`Email envoyé à ${entry.email} :`, info.messageId);
        } catch (error) {
          console.error(
            `Erreur lors de l'envoi de l'email à ${entry.email} :`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi des emails :", error);
    }
  });

program
  .version('1.0.0')
  .name('auto-rgpd')
  .description('Automatisé vos demande de suppression de données.')
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
