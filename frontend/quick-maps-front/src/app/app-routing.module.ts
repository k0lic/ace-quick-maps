import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NewLocationsComponent } from './new-locations/new-locations.component';
import { JunkNavComponent } from './junk-nav/junk-nav.component';
import { ProgramEditorComponent } from './program-editor/program-editor.component';
import { TestComponent } from './test/test.component';
import { DateMapComponent } from './date-map/date-map.component';

const routes: Routes = [
  { path: 'date-map', component: DateMapComponent},
  { path: 'new-locations', component: NewLocationsComponent},
  { path: 'program-editor', component: ProgramEditorComponent},
  { path: 'test', component: TestComponent},
  { path: '**', component: JunkNavComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
