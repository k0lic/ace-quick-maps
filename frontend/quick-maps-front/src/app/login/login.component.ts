import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(private loginService: LoginService, private router: Router, private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^\S+@\S+$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
  }

  login(): void {
    // Clear server error
    this.errorMessage = '';

    // Mark all input fields as touched so any possible errors can be shown
    this.loginForm.markAllAsTouched();

    if (!this.loginForm.valid) {
      // Just skip, the errors will already be shown
      return;
    }

    this.loginService.login(this.loginForm.value.email, this.loginForm.value.password).subscribe(res => {
      this.router.navigate(['/ok/date-map']);
    }, err => {
      console.log(err);

      this.errorMessage = 'Incorrect username or password!';
      this.loginForm.patchValue({
        password: ''
      });
    });
  }

}
