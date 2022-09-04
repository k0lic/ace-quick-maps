import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatMapComponent } from './stat-map.component';

describe('StatMapComponent', () => {
  let component: StatMapComponent;
  let fixture: ComponentFixture<StatMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StatMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
