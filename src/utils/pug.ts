import fs from 'fs';
import pug from 'pug';

export function compilePugTemplate(
  templateFile: string,
  firstname: string,
  lastname: string
): string {
  const templateContent = fs.readFileSync(templateFile, 'utf-8');
  const compiledTemplate = pug.compile(templateContent);
  return compiledTemplate({ firstname, lastname });
}
