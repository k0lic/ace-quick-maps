import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {

  forgotForm: FormGroup;
  errorMessage: boolean = false;

  constructor(private loginService: LoginService, private router: Router, private fb: FormBuilder) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^\S+@\S+$/)]]
    });
  }

  ngOnInit(): void {
  }

  recover(): void {
    // Clear server error
    this.errorMessage = false;

    // Mark all input fields as touched so any possible errors can be shown
    this.forgotForm.markAllAsTouched();

    if (!this.forgotForm.valid) {
      // Just skip, the errors will already be shown
      return;
    }

    this.loginService.forgotPassword(this.forgotForm.value.email).subscribe(res => {
      // Show message that reset code was successfully created and sent to the email address
      this.router.navigate(['/message'], {state: {
        heading: 'RECOVERY.SUCCESS_HEADING',
        message: 'RECOVERY.SUCCESS_TEXT',
        linkName: 'LOGIN.TITLE',
        linkUrl: '/login'
      }});
    }, err => {
      console.log(err);
      this.errorMessage = true;
    });
  }

}
