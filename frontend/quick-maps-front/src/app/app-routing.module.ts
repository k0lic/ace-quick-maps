import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NewLocationsComponent } from './new-locations/new-locations.component';
import { JunkNavComponent } from './junk-nav/junk-nav.component';
import { ProgramEditorComponent } from './program-editor/program-editor.component';
import { TestComponent } from './test/test.component';
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

const routes: Routes = [
  {
    path: 'ok',
    component: UserLayoutComponent,
    children: [
      { path: 'date-map', component: DateMapComponent, canActivate: [UserGuard]},
      { path: 'new-locations', component: NewLocationsComponent, canActivate: [AdminGuard]},
      { path: 'program-editor', component: ProgramEditorComponent, canActivate: [AdminGuard]},
      { path: 'users', component: UserListsComponent, canActivate: [HigherGuard]},
      { path: 'message', component: MessageComponent, canActivate: [UserGuard]}
    ]
  },
  { 
    path: '',
    component: NakedLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent, canActivate: [GuestGuard]},
      { path: 'register', component: RegisterComponent, canActivate: [GuestGuard]},
      { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [GuestGuard]},
      { path: 'message', component: MessageComponent, canActivate: [GuestGuard]},
      { path: 'test', component: TestComponent},
      { path: '**', component: JunkNavComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
