import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JunkNavComponent } from './junk-nav.component';

describe('JunkNavComponent', () => {
  let component: JunkNavComponent;
  let fixture: ComponentFixture<JunkNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JunkNavComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JunkNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
