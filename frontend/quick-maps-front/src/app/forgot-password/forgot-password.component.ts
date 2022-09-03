import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { setTitle } from '../_helpers/titleHelper';
import { LoginService } from '../_services/login.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {

  forgotForm: FormGroup;
  errorMessage: boolean = false;

  constructor(
    private router: Router, 
    private fb: FormBuilder,
    private titleService: Title,
    private translateService: TranslateService,
    private loginService: LoginService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^\S+@\S+$/)]]
    });
  }

  ngOnInit(): void {
    setTitle('RECOVERY.TITLE', this.titleService, this.translateService);
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
