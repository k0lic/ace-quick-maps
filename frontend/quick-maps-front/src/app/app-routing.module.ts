import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NewLocationsComponent } from './new-locations/new-locations.component';
import { ProgramEditorComponent } from './program-editor/program-editor.component';
import { DateMapComponent } from './date-map/date-map.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { NakedLayoutComponent } from './naked-layout/naked-layout.component';
import { UserLayoutComponent } from './user-layout/user-layout.component';
import { UserGuard } from './_guards/user-guard';
import { AdminGuard } from './_guards/admin-guard';
import { GuestGuard } from './_guards/guest-guard';
import { MessageComponent } from './message/message.component';
import { UserListsComponent } from './user-lists/user-lists.component';
import { HigherGuard } from './_guards/higher-guard';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { StatMapComponent } from './stat-map/stat-map.component';
import { TestComponent } from './test/test.component';

const routes: Routes = [
  {
    path: 'ok',
    component: UserLayoutComponent,
    children: [
      { path: 'date-map', component: DateMapComponent, canActivate: [UserGuard] },
      { path: 'new-locations', component: NewLocationsComponent, canActivate: [AdminGuard] },
      { path: 'program-editor', component: ProgramEditorComponent, canActivate: [AdminGuard] },
      { path: 'users', component: UserListsComponent, canActivate: [HigherGuard] },
      { path: 'stats', component: StatMapComponent, canActivate: [AdminGuard] },
      { path: 'message', component: MessageComponent, canActivate: [UserGuard] },
      // { path: 'test', component: TestComponent, canActivate: [AdminGuard] },  // FOR TESTING ONLY
      { path: '**', redirectTo: 'date-map' }
    ]
  },
  {
    path: '',
    component: NakedLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
      { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },
      { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [GuestGuard] },
      { path: 'reset-password/:code', component: ResetPasswordComponent, canActivate: [GuestGuard] },
      { path: 'message', component: MessageComponent, canActivate: [GuestGuard] },
      { path: '**', redirectTo: 'login' }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
