import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NakedLayoutComponent } from './naked-layout.component';

describe('NakedLayoutComponent', () => {
  let component: NakedLayoutComponent;
  let fixture: ComponentFixture<NakedLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NakedLayoutComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NakedLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
