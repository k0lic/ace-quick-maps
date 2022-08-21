import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NewLocationsComponent } from './new-locations/new-locations.component';
import { JunkNavComponent } from './junk-nav/junk-nav.component';
import { AgmCoreModule } from '@agm/core';
import { Secrets } from 'secrets';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProgramEditorComponent } from './program-editor/program-editor.component';
import { TestComponent } from './test/test.component';

@NgModule({
  declarations: [
    AppComponent,
    NewLocationsComponent,
    JunkNavComponent,
    ProgramEditorComponent,
    TestComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    AgmCoreModule.forRoot({
      apiKey: Secrets.GOOGLE_MAP_API_KEY
    }),
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
