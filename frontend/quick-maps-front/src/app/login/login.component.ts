import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { setTitle } from '../_helpers/titleHelper';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  errorMessage: boolean = false;

  constructor(
    private router: Router, 
    private fb: FormBuilder, 
    private titleService: Title,
    private translateService: TranslateService,
    private loginService: LoginService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^\S+@\S+$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    setTitle('LOGIN.TITLE', this.titleService, this.translateService);
  }

  login(): void {
    // Clear server error
    this.errorMessage = false;

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

      this.errorMessage = true;
      this.loginForm.patchValue({
        password: ''
      });
    });
  }

}
