import { Component, OnInit } from '@angular/core';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {

  emailAddress: string = '';

  constructor(private loginService: LoginService) { }

  ngOnInit(): void {
  }

  recover(): void {
    this.loginService.forgotPassword(this.emailAddress).subscribe(res => {
      // TODO
      console.log('success catcher');
      console.log(res);
    }, err => {
      // TODO: everything goes here
      console.log('err catcher');
      console.log(err);
    });
  }

}
