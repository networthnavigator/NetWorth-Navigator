import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEnGb from '@angular/common/locales/en-GB';
import localeNl from '@angular/common/locales/nl';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

registerLocaleData(localeEnGb, 'en-GB');
registerLocaleData(localeNl, 'nl-NL');

// Apply stored theme and dark mode before bootstrap
const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('networth-navigator-theme') : null;
const theme = storedTheme && ['purple-green','indigo-pink','cyan-orange','azure-blue','green-teal'].includes(storedTheme)
  ? storedTheme : 'purple-green';
const darkThemes = ['purple-green', 'indigo-pink', 'cyan-orange', 'azure-blue', 'green-teal'];
const darkMode = typeof localStorage !== 'undefined' && localStorage.getItem('networth-navigator-darkMode') !== 'false';
const useDark = darkMode && darkThemes.includes(theme);
let link = document.getElementById('material-theme') as HTMLLinkElement;
if (link) link.href = `assets/themes/${theme}.css`;
document.documentElement.classList.toggle('theme-dark', useDark);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
