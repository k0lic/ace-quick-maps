import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(private loginService: LoginService, private router: Router) { }

  ngOnInit(): void {
  }

  register(): void {
    this.loginService.register(this.emailAddress, this.password, this.name, this.lastName).subscribe(res => {
      // TODO: show message that account request is pending approval
      this.router.navigate(['/login']);
    }, err => {
      // TODO: show errors
      console.log(err);
    });
  }

}
