import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'users',
    title: 'Users · HttpClient Demo',
    loadComponent: () =>
      import('./features/users/user-list/user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: 'users/:id',
    title: 'User · HttpClient Demo',
    loadComponent: () =>
      import('./features/users/user-detail/user-detail.component').then(
        (m) => m.UserDetailComponent,
      ),
  },
  { path: '**', redirectTo: 'users' },
];
