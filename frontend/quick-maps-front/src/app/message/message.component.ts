import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit {

  heading: string = '';
  message: string = '';

  // redirect to login by default
  linkName: string = 'Login';
  linkUrl: string = '/login';

  constructor(private router: Router, public translateService: TranslateService) {
    let state = router.getCurrentNavigation()?.extras.state;

    if (state != null) {
      this.heading = state.heading;
      this.message = state.message;

      this.linkName = state.linkName;
      this.linkUrl = state.linkUrl;
    }
  }

  ngOnInit(): void {
  }

}
