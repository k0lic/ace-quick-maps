import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Secrets } from 'secrets';
import { UserShort } from '../_entities/user-short';
import { MeService } from '../_services/me.service';

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.css']
})
export class UserLayoutComponent implements OnInit {

  user: UserShort | null = null;

  constructor(private meService: MeService, private router: Router) { }

  ngOnInit(): void {
    this.meService.getInfo().subscribe((u: UserShort) => {
      this.user = u;
    });
  }

  logout(): void {
    this.meService.logout().subscribe(res => {
      this.router.navigate(['/login']);
    }, err => {
      console.log(err);
    });
  }

}
