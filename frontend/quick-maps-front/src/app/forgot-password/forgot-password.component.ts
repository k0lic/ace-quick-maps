import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {

  forgotForm: FormGroup;
  errorMessage: string = '';

  constructor(private loginService: LoginService, private fb: FormBuilder) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^\S+@\S+$/)]]
    });
  }

  ngOnInit(): void {
  }

  recover(): void {
    // Clear server error
    this.errorMessage = '';

    // Mark all input fields as touched so any possible errors can be shown
    this.forgotForm.markAllAsTouched();

    if (!this.forgotForm.valid) {
      // Just skip, the errors will already be shown
      return;
    }

    this.loginService.forgotPassword(this.forgotForm.value.email).subscribe(res => {
      // TODO
      this.errorMessage = 'Not yet implemented!';
    }, err => {
      console.log(err);

      // TODO: make real message
      this.errorMessage = 'Not yet implemented!';
    });
  }

}
