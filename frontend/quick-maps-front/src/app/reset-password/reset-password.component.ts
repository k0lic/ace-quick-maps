import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  resetForm: FormGroup;
  errorMessage: boolean = false;

  code: string | null = null;

  constructor(private loginService: LoginService, private router: Router, private fb: FormBuilder, private activatedRoute: ActivatedRoute) {
    this.resetForm = this.fb.group({
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
    // Get code from url and check if it's valid
    this.code = this.activatedRoute.snapshot.paramMap.get('code');

    if (this.code == null) {
      this.invalidCodeRedirect();
      return;
    }

    this.loginService.checkResetCode(this.code).subscribe(res => {
      // skip
    }, err => {
      // Code is not valid
      this.invalidCodeRedirect();
    });
  }

  invalidCodeRedirect(): void {
    this.router.navigate(['/message'], {state: {
      heading: 'RESET.FAILURE_HEADING',
      message: 'RESET.FAILURE_TEXT',
      linkName: 'RECOVERY.TITLE',
      linkUrl: '/forgot-password'
    }});
  }

  onPasswordInputChange() {
    // Validate passwordConfirm value again - since password changed they might match now
    this.resetForm.controls['passwordConfirm'].updateValueAndValidity();
  }

  resetPassword(): void {
    // Clear server error
    this.errorMessage = false;

    // Mark all input fields as touched so any possible errors can be shown
    this.resetForm.markAllAsTouched();

    if (!this.resetForm.valid) {
      // Just skip, the errors will already be shown
      return;
    }

    if (this.code == null) {
      // Show vague error - this should never trigger
      this.errorMessage = true;
      return;
    }

    this.loginService.resetPassword(
      this.code,
      this.resetForm.value.password
    ).subscribe(res => { 
      // Show message that password was successfully changed
      this.router.navigate(['/message'], {state: {
        heading: 'RESET.SUCCESS_HEADING',
        message: 'RESET.SUCCESS_TEXT',
        linkName: 'LOGIN.TITLE',
        linkUrl: '/login'
      }});
    }, err => {
      console.log(err);

      this.invalidCodeRedirect();
    });
  }

}
