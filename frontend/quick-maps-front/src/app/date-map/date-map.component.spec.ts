import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateMapComponent } from './date-map.component';

describe('DateMapComponent', () => {
  let component: DateMapComponent;
  let fixture: ComponentFixture<DateMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DateMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DateMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
