import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { setTitle } from '../_helpers/titleHelper';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;
  errorMessage: boolean = false;

  constructor(
    private router: Router, 
    private fb: FormBuilder,
    private titleService: Title,
    private translateService: TranslateService,
    private loginService: LoginService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^\S+@\S+$/)]],
      name: ['', Validators.required],
      lastName: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      passwordConfirm: ['', ((control: AbstractControl) => {
        // Check if it matches the password input value
        if (control.value == control.parent?.value.password) {
          return null;
        }

        // Return error
        return {
          'confirm': true
        };
      })]
    });
  }

  ngOnInit(): void {
    setTitle('REGISTER.TITLE', this.titleService, this.translateService);
  }

  onPasswordInputChange() {
    // Validate passwordConfirm value again - since password changed they might match now
    this.registerForm.controls['passwordConfirm'].updateValueAndValidity();
  }

  register(): void {
    // Clear server error
    this.errorMessage = false;

    // Mark all input fields as touched so any possible errors can be shown
    this.registerForm.markAllAsTouched();

    if (!this.registerForm.valid) {
      // Just skip, the errors will already be shown
      return;
    }

    this.loginService.register(
      this.registerForm.value.email, 
      this.registerForm.value.password, 
      this.registerForm.value.name, 
      this.registerForm.value.lastName
    ).subscribe(res => { 
      // Show message that account request is pending approval
      this.router.navigate(['/message'], {state: {
        heading: 'REGISTER.SUCCESS_HEADING',
        message: 'REGISTER.SUCCESS_TEXT',
        linkName: 'LOGIN.TITLE',
        linkUrl: '/login'
      }});
    }, err => {
      console.log(err);

      this.errorMessage = true;
      this.registerForm.patchValue({
        password: '',
        passwordConfirm: ''
      });
    });
  }

}
