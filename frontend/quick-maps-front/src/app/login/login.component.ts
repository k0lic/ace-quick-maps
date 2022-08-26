import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  emailAddress: string = '';
  password: string = '';

  constructor(private loginService: LoginService, private router: Router) { }

  ngOnInit(): void {
  }

  login(): void {
    this.loginService.login(this.emailAddress, this.password).subscribe(res => {
      this.router.navigate(['/ok/date-map'])
    }, err => {
      // TODO: show error
      console.log(err);
    });
  }

}
