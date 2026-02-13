import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./welcome/welcome.component').then(m => m.WelcomeComponent) },
  { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent), canActivate: [authGuard] },
  { path: 'transactions', loadComponent: () => import('./transacties/transacties.component').then(m => m.TransactiesComponent), canActivate: [authGuard] },
  { path: 'upload', loadComponent: () => import('./upload/upload.component').then(m => m.UploadComponent), canActivate: [authGuard] },
  { path: 'wizard-poc', loadComponent: () => import('./wizard-poc/wizard-poc.component').then(m => m.WizardPocComponent), canActivate: [authGuard] },
  { path: 'chart-of-accounts', loadComponent: () => import('./rekening-schema/rekening-schema.component').then(m => m.RekeningSchemaComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities', loadComponent: () => import('./assets-liabilities/assets-liabilities.component').then(m => m.AssetsLiabilitiesComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'home' },
];
