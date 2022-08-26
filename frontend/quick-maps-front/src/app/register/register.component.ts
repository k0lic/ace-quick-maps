import { Component, OnInit } from '@angular/core';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  emailAddress: string = '';
  name: string = '';
  lastName: string = '';
  password: string = '';
  passwordConfirm: string = '';

  constructor(private loginService: LoginService) { }

  ngOnInit(): void {
  }

  register(): void {
    this.loginService.register(this.emailAddress, this.password, this.name, this.lastName).subscribe(res => {
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
