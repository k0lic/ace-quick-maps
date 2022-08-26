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

const routes: Routes = [
  {
    path: 'ok',
    component: UserLayoutComponent,
    children: [
      { path: 'date-map', component: DateMapComponent},
      { path: 'new-locations', component: NewLocationsComponent},
      { path: 'program-editor', component: ProgramEditorComponent},
    ]
  },
  { 
    path: '',
    component: NakedLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent},
      { path: 'register', component: RegisterComponent},
      { path: 'forgot-password', component: ForgotPasswordComponent},
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
