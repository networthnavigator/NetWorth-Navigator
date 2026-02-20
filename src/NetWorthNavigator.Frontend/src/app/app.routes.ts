import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./welcome/welcome.component').then(m => m.WelcomeComponent) },
  { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent), canActivate: [authGuard] },
  { path: 'bookings', loadComponent: () => import('./transacties/transacties.component').then(m => m.TransactiesComponent), canActivate: [authGuard] },
  { path: 'upload', loadComponent: () => import('./upload/upload.component').then(m => m.UploadComponent), canActivate: [authGuard] },
  { path: 'booking-rules', loadComponent: () => import('./booking-rules/booking-rules.component').then(m => m.BookingRulesComponent), canActivate: [authGuard] },
  { path: 'booking-rules/new', loadComponent: () => import('./booking-rules/booking-rule-form.component').then(m => m.BookingRuleFormComponent), canActivate: [authGuard] },
  { path: 'booking-rules/edit/:id', loadComponent: () => import('./booking-rules/booking-rule-form.component').then(m => m.BookingRuleFormComponent), canActivate: [authGuard] },
  { path: 'chart-of-accounts', loadComponent: () => import('./rekening-schema/rekening-schema.component').then(m => m.RekeningSchemaComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities', loadComponent: () => import('./assets-liabilities/assets-liabilities.component').then(m => m.AssetsLiabilitiesComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities/accounts/new', loadComponent: () => import('./assets-liabilities/add-account.component').then(m => m.AddAccountComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities/accounts/edit/:id', loadComponent: () => import('./assets-liabilities/add-account.component').then(m => m.AddAccountComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities/investment-accounts/new', loadComponent: () => import('./assets-liabilities/investment-account-form.component').then(m => m.InvestmentAccountFormComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities/investment-accounts/edit/:id', loadComponent: () => import('./assets-liabilities/investment-account-form.component').then(m => m.InvestmentAccountFormComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities/properties/new', loadComponent: () => import('./assets-liabilities/property-form.component').then(m => m.PropertyFormComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities/properties/edit/:id', loadComponent: () => import('./assets-liabilities/property-form.component').then(m => m.PropertyFormComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities/mortgages/new', loadComponent: () => import('./assets-liabilities/mortgage-form.component').then(m => m.MortgageFormComponent), canActivate: [authGuard] },
  { path: 'assets-liabilities/mortgages/edit/:id', loadComponent: () => import('./assets-liabilities/mortgage-form.component').then(m => m.MortgageFormComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'home' },
];
