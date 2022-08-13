import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewLocationsComponent } from './new-locations.component';

describe('NewLocationsComponent', () => {
  let component: NewLocationsComponent;
  let fixture: ComponentFixture<NewLocationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewLocationsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewLocationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
