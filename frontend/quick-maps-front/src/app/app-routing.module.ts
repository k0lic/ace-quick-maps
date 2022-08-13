import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NewLocationsComponent } from './new-locations/new-locations.component';
import { JunkNavComponent } from './junk-nav/junk-nav.component';

const routes: Routes = [
  { path: 'new-locations', component: NewLocationsComponent},
  { path: '**', component: JunkNavComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
