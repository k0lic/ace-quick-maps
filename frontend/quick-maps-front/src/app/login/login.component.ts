import { Component, OnInit } from '@angular/core';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  emailAddress: string = '';
  password: string = '';

  constructor(private loginService: LoginService) { }

  ngOnInit(): void {
  }

  login(): void {
    this.loginService.login(this.emailAddress, this.password).subscribe(res => {
      // TODO
      console.log('success catcher');
      console.log(res);
    }, err => {
      // TODO: everything goes here
      console.log('err catcher');
      console.log(err);
      console.log(document.cookie);
    });
  }

}
