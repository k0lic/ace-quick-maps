import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;
  errorMessage: string = '';

  constructor(private loginService: LoginService, private router: Router, private fb: FormBuilder) {
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
  }

  onPasswordInputChange() {
    // Validate passwordConfirm value again - since password changed they might match now
    this.registerForm.controls['passwordConfirm'].updateValueAndValidity();
  }

  register(): void {
    // Clear server error
    this.errorMessage = '';

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
        heading: 'Account successfully created',
        message: 'Account request has been successfully created, and is now pending approval from the staff. You should receive an email once your account is activated.',
        linkName: 'Login',
        linkUrl: '/login'
      }});
    }, err => {
      console.log(err);

      this.errorMessage = 'Email address already in use!';
      this.registerForm.patchValue({
        password: '',
        passwordConfirm: ''
      });
    });
  }

}
