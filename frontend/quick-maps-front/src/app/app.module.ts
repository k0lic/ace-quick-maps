import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NewLocationsComponent } from './new-locations/new-locations.component';
import { JunkNavComponent } from './junk-nav/junk-nav.component';
import { AgmCoreModule } from '@agm/core';
import { Secrets } from 'secrets';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ProgramEditorComponent } from './program-editor/program-editor.component';
import { TestComponent } from './test/test.component';
import { DateMapComponent } from './date-map/date-map.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { NakedLayoutComponent } from './naked-layout/naked-layout.component';
import { UserLayoutComponent } from './user-layout/user-layout.component';
import { GuestGuard } from './_guards/guest-guard';
import { UserGuard } from './_guards/user-guard';
import { HigherGuard } from './_guards/higher-guard';
import { AdminGuard } from './_guards/admin-guard';
import { MessageComponent } from './message/message.component';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { UserListsComponent } from './user-lists/user-lists.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

@NgModule({
  declarations: [
    AppComponent,
    NewLocationsComponent,
    JunkNavComponent,
    ProgramEditorComponent,
    TestComponent,
    DateMapComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    NakedLayoutComponent,
    UserLayoutComponent,
    MessageComponent,
    UserListsComponent,
    ResetPasswordComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    AgmCoreModule.forRoot({
      apiKey: Secrets.GOOGLE_MAP_API_KEY
      // TODO: add language fetch
    }),
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      },
      defaultLanguage: 'sr-Latn'
    })
  ],
  providers: [GuestGuard, UserGuard, HigherGuard, AdminGuard],
  bootstrap: [AppComponent]
})
export class AppModule { }
